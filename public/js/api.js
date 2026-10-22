// =========================================================
// MONGODB ATLAS CLOUD SYNC ENGINE & ENDPOINT HANDLERS
// =========================================================

    // =========================================================================
    // MONGODB ATLAS CLOUD SYNC ENGINE
    // =========================================================================
    let defaultApiEndpoint = "/api/schedule";
    if (typeof window !== "undefined" && window.location && window.location.hostname && window.location.hostname.includes("github.io")) {
      defaultApiEndpoint = "https://shift-schedule-f6di.vercel.app/api/schedule";
    }
    let mongoApiEndpoint = localStorage.getItem("ft_mongo_api_endpoint") || defaultApiEndpoint;
    let mongoSyncStatus = "disconnected"; // connected, syncing, error, disconnected
    let lastMongoSyncTime = null;
    let mongoAutoSyncTimer = null;
    let lastKnownServerUpdatedAt = null;
    let isFetchingCloudSync = false;
    let liveSyncIntervalTimer = null;
    let syncBroadcastChannel = null;

    try {
      if (typeof BroadcastChannel !== "undefined") {
        syncBroadcastChannel = new BroadcastChannel("shift_roster_live_channel");
        syncBroadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === "SCHEDULE_CHANGED") {
            initMongoCloudSync(true);
          }
        };
      }
    } catch (e) {}

    function showLiveSyncNotice(message) {
      let pill = document.getElementById("liveSyncNoticePill");
      if (!pill) {
        pill = document.createElement("div");
        pill.id = "liveSyncNoticePill";
        pill.className = "live-sync-pill";
        document.body.appendChild(pill);
      }
      pill.innerHTML = `<span>⚡</span> <span>${message}</span>`;
      pill.classList.add("show");
      setTimeout(() => {
        if (pill) pill.classList.remove("show");
      }, 3500);
    }

    function updateMongoSyncBadge(status, text, detail = "") {
      mongoSyncStatus = status;
      const badge = document.getElementById("mongoSyncBadge");
      const dot = document.getElementById("mongoSyncDot");
      const textEl = document.getElementById("mongoSyncText");
      if (!badge || !dot || !textEl) return;

      dot.className = "sync-dot " + status;
      textEl.innerText = text;
      if (detail) badge.title = detail;
    }

    function buildSystemPayload(lastAction = "") {
      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const curKey = `${yearAD}-${month}`;
      const existingLeaves = (monthSchedules[curKey] && monthSchedules[curKey].leaves) || {};
      const existingDailySwaps = (monthSchedules[curKey] && monthSchedules[curKey].dailySwaps) || [];
      monthSchedules[curKey] = {
        schedule: currentSchedule,
        originalSchedule: originalSchedule,
        swapHistory: swapHistory,
        leaves: existingLeaves,
        dailySwaps: existingDailySwaps
      };

      return {
        yearAD: yearAD,
        month: month,
        monthSchedules: monthSchedules,
        agents: AGENTS,
        agentNameMap: AGENT_NAME_MAP,
        users: (typeof getSystemUsers === "function") ? getSystemUsers() : [],
        adminPin: currentAdminPin,
        allowUserSwap: allowUserSwap,
        weekdayColumns: WEEKDAY_COLUMNS,
        holidayShiftMeta: HOLIDAY_SHIFT_META,
        lastAction: lastAction,
        clientTimestamp: new Date().toISOString()
      };
    }

    async function initMongoCloudSync(isBackground = false) {
      if (isFetchingCloudSync) return;
      isFetchingCloudSync = true;
      if (!isBackground) {
        updateMongoSyncBadge("syncing", "กำลังเชื่อมต่อ MongoDB...");
      }
      try {
        const res = await fetch(mongoApiEndpoint, { method: "GET" });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const result = await res.json();

        if (result && result.success) {
          const serverUpdatedAt = result.updatedAt;

          // In background polling mode, skip re-rendering if data has not changed
          if (isBackground && lastKnownServerUpdatedAt && serverUpdatedAt === lastKnownServerUpdatedAt) {
            isFetchingCloudSync = false;
            return;
          }

          // If user is currently in the middle of picking a swap slot or has an active modal open, defer re-render
          const isUserBusy = (typeof pendingSwapSlot !== "undefined" && pendingSwapSlot !== null) ||
                             Boolean(document.querySelector(".modal-backdrop.show"));
          if (isBackground && isUserBusy) {
            isFetchingCloudSync = false;
            return;
          }

          const hadPreviousState = !!lastKnownServerUpdatedAt;
          lastKnownServerUpdatedAt = serverUpdatedAt;

          if (result.data) {
            const cloudData = result.data;
            if (cloudData.agentNameMap && typeof cloudData.agentNameMap === 'object') {
              AGENT_NAME_MAP = Object.assign({}, AGENT_NAME_MAP, cloudData.agentNameMap);
            }
            if (Array.isArray(cloudData.agents) && cloudData.agents.length > 0) {
              AGENTS = cloudData.agents;
            }
            if (Array.isArray(cloudData.users) && cloudData.users.length > 0) {
              systemUsers = cloudData.users;
              systemUsers.forEach(u => {
                if (u.nameTH) AGENT_NAME_MAP[u.username] = u.nameTH;
              });
              AGENTS = systemUsers.map(u => u.username);
            } else if (typeof getSystemUsers === "function") {
              getSystemUsers();
            }
            if (cloudData.monthSchedules && typeof cloudData.monthSchedules === 'object') {
              monthSchedules = cloudData.monthSchedules;
              Object.keys(monthSchedules).forEach(k => {
                if (monthSchedules[k]) {
                  reconcileScheduleNames(monthSchedules[k].schedule);
                  reconcileScheduleNames(monthSchedules[k].originalSchedule);
                }
              });
            }
            if (Array.isArray(cloudData.weekdayColumns) && cloudData.weekdayColumns.length > 0) {
              WEEKDAY_COLUMNS = cloudData.weekdayColumns;
              try { localStorage.setItem("ft_weekday_columns", JSON.stringify(WEEKDAY_COLUMNS)); } catch(e) {}
            }
            if (Array.isArray(cloudData.holidayShiftMeta) && cloudData.holidayShiftMeta.length > 0) {
              HOLIDAY_SHIFT_META = cloudData.holidayShiftMeta;
              try { localStorage.setItem("ft_holiday_shift_meta", JSON.stringify(HOLIDAY_SHIFT_META)); } catch(e) {}
            }
            if (cloudData.adminPin) {
              currentAdminPin = cloudData.adminPin;
            }
            if (cloudData.allowUserSwap !== undefined) {
              allowUserSwap = Boolean(cloudData.allowUserSwap);
              try {
                localStorage.setItem("ft_allow_user_swap", allowUserSwap ? "true" : "false");
              } catch(e) {}
            }

            const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
            const month = parseInt(document.getElementById("monthSelect").value, 10);
            const curData = getOrInitMonthSchedule(yearAD, month);
            currentSchedule = curData.schedule;
            originalSchedule = curData.originalSchedule;
            swapHistory = curData.swapHistory || [];

            reconcileSlotCapacities();
            sanitizeSwapHistory();

            renderAgentsEditor();
            renderWeekdayJdEditor();
            renderHolidayJdEditor();
            populateFilterDropdowns();
            renderAllViews();

            // Display live sync notice if updated in background
            if (isBackground && hadPreviousState) {
              showLiveSyncNotice("🔄 มีการสลับเวร/แก้ไขข้อมูลล่าสุด ตารางอัปเดตเรียบร้อยแล้ว");
            }
          } else {
            await saveScheduleToCloud("Initial Schedule Baseline Seed");
          }

          lastMongoSyncTime = new Date();
          const timeStr = lastMongoSyncTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
          updateMongoSyncBadge("connected", `MongoDB เรียลไทม์ (${timeStr})`, `เชื่อมต่อกับ MongoDB Atlas แล้ว • ซิงค์อัตโนมัติ: ${timeStr}`);
        } else {
          throw new Error(result.error || "Unknown server response");
        }
      } catch (err) {
        if (!isBackground) {
          console.warn("MongoDB Atlas Sync Notice:", err);
          updateMongoSyncBadge("error", "MongoDB ออฟไลน์ (ข้อมูลเครื่อง)", `ไม่สามารถเชื่อมต่อ MongoDB API (${err.message}) • กำลังใช้ข้อมูลในเครื่อง`);
        }
      } finally {
        isFetchingCloudSync = false;
      }
    }

    async function saveScheduleToCloud(actionDetail = "") {
      updateMongoSyncBadge("syncing", "กำลังบันทึกลง MongoDB...");
      try {
        const payload = buildSystemPayload(actionDetail);
        const res = await fetch(mongoApiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result && result.success) {
          lastKnownServerUpdatedAt = result.updatedAt || new Date().toISOString();
          lastMongoSyncTime = new Date();
          const timeStr = lastMongoSyncTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
          updateMongoSyncBadge("connected", `บันทึก MongoDB แล้ว (${timeStr})`, `บันทึกสำเร็จเมื่อ ${timeStr}`);

          // Broadcast to other tabs on same device/browser
          if (syncBroadcastChannel) {
            try {
              syncBroadcastChannel.postMessage({ type: "SCHEDULE_CHANGED", updatedAt: lastKnownServerUpdatedAt });
            } catch(e) {}
          }
        } else {
          throw new Error(result.error || "Save failed");
        }
      } catch (err) {
        console.error("Save to MongoDB failed:", err);
        updateMongoSyncBadge("error", "บันทึก MongoDB ไม่สำเร็จ", `ข้อผิดพลาด: ${err.message}`);
      }
    }

    function triggerAutoSaveToCloud(actionDetail = "") {
      if (mongoAutoSyncTimer) clearTimeout(mongoAutoSyncTimer);
      mongoAutoSyncTimer = setTimeout(() => {
        saveScheduleToCloud(actionDetail);
      }, 400);
    }

    function startLiveSyncPolling() {
      if (liveSyncIntervalTimer) clearInterval(liveSyncIntervalTimer);
      
      // Auto-poll every 5 seconds for instant real-time sync across devices
      liveSyncIntervalTimer = setInterval(() => {
        if (document.visibilityState === "visible") {
          initMongoCloudSync(true);
        }
      }, 5000);

      // Immediately sync when mobile screen turns on or user switches back to browser tab
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          initMongoCloudSync(true);
        }
      });
      window.addEventListener("focus", () => {
        initMongoCloudSync(true);
      });
    }

    function openCloudConfigModal() {
      const modal = document.getElementById("cloudConfigModal");
      const input = document.getElementById("cloudApiEndpointInput");
      if (input) input.value = mongoApiEndpoint;
      updateCloudModalStatus();
      if (modal) modal.classList.add("show");
    }

    function closeCloudConfigModal() {
      const modal = document.getElementById("cloudConfigModal");
      if (modal) modal.classList.remove("show");
    }

    function updateCloudModalStatus() {
      const dot = document.getElementById("cloudModalStatusDot");
      const title = document.getElementById("cloudModalStatusTitle");
      const detail = document.getElementById("cloudModalStatusDetail");
      if (!dot || !title || !detail) return;

      dot.className = "sync-dot " + mongoSyncStatus;
      if (mongoSyncStatus === "connected") {
        title.innerText = "สถานะ: เชื่อมต่อ MongoDB Atlas สำเร็จ 🟢";
        const timeStr = lastMongoSyncTime ? lastMongoSyncTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "-";
        detail.innerHTML = `เชื่อมต่อกับคลัสเตอร์เรียบร้อยแล้ว • ซิงค์ล่าสุด: <strong>${timeStr} น.</strong><br>Database: <code>shift_schedule</code> | Collection: <code>system_state</code>`;
      } else if (mongoSyncStatus === "syncing") {
        title.innerText = "สถานะ: กำลังซิงค์ข้อมูลกับ MongoDB... 🟡";
        detail.innerText = "ระบบกำลังรับ-ส่งข้อมูลกับ MongoDB Atlas กรุณารอสักครู่";
      } else {
        title.innerText = "สถานะ: ออฟไลน์ / ไม่สามารถติดต่อ API ได้ 🔴";
        detail.innerHTML = `กำลังใช้งานข้อมูลสำรองในเครื่อง (Offline Mode)<br>หากใช้งานบน GitHub Pages โปรดตรวจสอบว่าได้ใส่ URL ของ Vercel API แล้วหรือยัง`;
      }
    }

    function saveCloudConfigEndpoint() {
      const input = document.getElementById("cloudApiEndpointInput");
      if (!input) return;
      const val = input.value.trim() || "/api/schedule";
      mongoApiEndpoint = val;
      localStorage.setItem("ft_mongo_api_endpoint", val);
      showToast("💾 บันทึก API Endpoint เรียบร้อยแล้ว");
      initMongoCloudSync();
      setTimeout(updateCloudModalStatus, 600);
    }

    async function testMongoConnectionModal() {
      showToast("🔄 กำลังทดสอบการเชื่อมต่อ...");
      const healthUrl = mongoApiEndpoint.replace(/\/schedule\/?$/, "/health");
      try {
        const res = await fetch(healthUrl);
        const data = await res.json();
        if (data.status === "connected") {
          alert(`✅ เชื่อมต่อ MongoDB Atlas สำเร็จสมบูรณ์!\n\n` +
                `• สถานะ: ${data.message}\n` +
                `• Database: shift_schedule\n` +
                `• Ping: ${JSON.stringify(data.ping)}`);
          mongoSyncStatus = "connected";
          lastMongoSyncTime = new Date();
        } else if (data.status === "unconfigured") {
          alert(`⚠️ API ทำงานได้ แต่ยังไม่ได้ตั้งค่า MONGODB_URI ใน Environment Variables\n\n` +
                `กรุณานำ Connection String (mongodb+srv://...) ไปใส่ใน Environment Variables ของ Vercel`);
          mongoSyncStatus = "error";
        } else {
          alert(`❌ เชื่อมต่อ MongoDB ไม่สำเร็จ:\n${data.message}`);
          mongoSyncStatus = "error";
        }
      } catch (e) {
        alert(`❌ ไม่สามารถเรียก API ได้ (${e.message})\n\nหากเปิดเว็บจาก GitHub Pages ต้องใส่ URL เต็มของ Vercel เช่น https://...vercel.app/api/schedule`);
        mongoSyncStatus = "error";
      }
      updateCloudModalStatus();
    }


