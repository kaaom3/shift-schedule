// =========================================================
// APPLICATION STATE & STATE HELPER FUNCTIONS
// =========================================================

    // Admin Mode & PIN Management
    let isAdminMode = false;
    let currentAdminPin = "1234";

    // User Authentication & Session State
    let currentUser = null; // { username: "jutharat.ka", nameTH: "จุฑารัตน์", role: "MEMBER" | "ADMIN", loginTime: ISO }

    function getSavedCurrentUser() {
      try {
        const raw = localStorage.getItem("ft_roster_current_user");
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    }

    function saveCurrentUserToStorage(user) {
      try {
        if (user) {
          localStorage.setItem("ft_roster_current_user", JSON.stringify(user));
        } else {
          localStorage.removeItem("ft_roster_current_user");
        }
      } catch (e) {}
    }

    function getUserStoredPin(username) {
      try {
        const pins = JSON.parse(localStorage.getItem("ft_user_pins") || "{}");
        return pins[username] || "1234";
      } catch (e) {
        return "1234";
      }
    }

    function setUserStoredPin(username, newPin) {
      try {
        const pins = JSON.parse(localStorage.getItem("ft_user_pins") || "{}");
        pins[username] = String(newPin).trim();
        localStorage.setItem("ft_user_pins", JSON.stringify(pins));
        return true;
      } catch (e) {
        return false;
      }
    }

    function getCurrentOperatorName() {
      if (isAdminMode || (currentUser && currentUser.role === "ADMIN")) {
        return "หัวหน้างาน (Admin)";
      }
      if (currentUser) {
        const thName = currentUser.nameTH || (typeof AGENT_NAME_MAP !== "undefined" && AGENT_NAME_MAP[currentUser.username]) || currentUser.username;
        return `คุณ${thName} (${currentUser.username})`;
      }
      return "ผู้ใช้งานในระบบ";
    }

    function updateUserProfileHeaderUI() {
      const nameEl = document.getElementById("headerUserName");
      const roleEl = document.getElementById("headerUserRoleBadge");
      const avatarEl = document.getElementById("headerUserAvatar");
      if (!nameEl) return;

      if (currentUser) {
        const thName = currentUser.nameTH || (typeof AGENT_NAME_MAP !== "undefined" && AGENT_NAME_MAP[currentUser.username]) || currentUser.username;
        nameEl.innerText = `คุณ${thName}`;
        if (avatarEl) {
          avatarEl.innerText = thName ? thName.charAt(0) : "👤";
        }
        if (roleEl) {
          if (currentUser.role === "ADMIN" || isAdminMode) {
            roleEl.innerText = "หัวหน้า (Admin)";
            roleEl.className = "user-role-badge user-role-admin";
          } else {
            roleEl.innerText = "สมาชิกทีม";
            roleEl.className = "user-role-badge user-role-member";
          }
        }
      } else {
        nameEl.innerText = "เข้าสู่ระบบ";
        if (avatarEl) avatarEl.innerText = "👤";
        if (roleEl) {
          roleEl.innerText = "ยังไม่ระบุตัวตน";
          roleEl.className = "user-role-badge";
        }
      }
    }

    function checkLoginGate() {
      if (!currentUser) {
        currentUser = getSavedCurrentUser();
      }
      if (currentUser) {
        if (currentUser.role === "ADMIN") {
          isAdminMode = true;
          if (typeof updateAdminModeUI === "function") updateAdminModeUI();
        } else {
          isAdminMode = false;
        }
        updateUserProfileHeaderUI();
        if (currentUser.username && (!highlightedAgent || highlightedAgent === "ALL")) {
          highlightedAgent = currentUser.username;
          const filterSel = document.getElementById("userFilterSelect");
          if (filterSel) filterSel.value = currentUser.username;
        }
        return true;
      } else {
        openLoginGateModal();
        return false;
      }
    }

    function openLoginGateModal() {
      const modal = document.getElementById("loginGateModal");
      if (!modal) return;

      const sel = document.getElementById("loginGateMemberSelect");
      if (sel && typeof AGENTS !== "undefined") {
        sel.innerHTML = AGENTS.map(ag => {
          const th = (typeof AGENT_NAME_MAP !== "undefined" && AGENT_NAME_MAP[ag]) ? AGENT_NAME_MAP[ag] : ag;
          return `<option value="${ag}">คุณ${th} (${ag})</option>`;
        }).join("");
      }

      const memberPin = document.getElementById("loginGateMemberPin");
      if (memberPin) memberPin.value = "";
      const adminPin = document.getElementById("loginGateAdminPin");
      if (adminPin) adminPin.value = "";
      const err = document.getElementById("loginGateError");
      if (err) { err.style.display = "none"; err.innerText = ""; }

      modal.classList.add("show");
    }

    function closeLoginGateModal() {
      const modal = document.getElementById("loginGateModal");
      if (modal) modal.classList.remove("show");
    }

    function switchLoginGateTab(mode) {
      const tabStaff = document.getElementById("loginTabBtnStaff");
      const tabAdmin = document.getElementById("loginTabBtnAdmin");
      const formStaff = document.getElementById("loginFormStaff");
      const formAdmin = document.getElementById("loginFormAdmin");
      const err = document.getElementById("loginGateError");
      if (err) { err.style.display = "none"; err.innerText = ""; }

      if (mode === "ADMIN") {
        if (tabStaff) tabStaff.classList.remove("active");
        if (tabAdmin) tabAdmin.classList.add("active");
        if (formStaff) formStaff.style.display = "none";
        if (formAdmin) formAdmin.style.display = "block";
        setTimeout(() => {
          const pin = document.getElementById("loginGateAdminPin");
          if (pin) pin.focus();
        }, 100);
      } else {
        if (tabStaff) tabStaff.classList.add("active");
        if (tabAdmin) tabAdmin.classList.remove("active");
        if (formStaff) formStaff.style.display = "block";
        if (formAdmin) formAdmin.style.display = "none";
        setTimeout(() => {
          const pin = document.getElementById("loginGateMemberPin");
          if (pin) pin.focus();
        }, 100);
      }
    }

    function submitStaffLogin() {
      const sel = document.getElementById("loginGateMemberSelect");
      const pinInput = document.getElementById("loginGateMemberPin");
      const remCheck = document.getElementById("loginGateRemember");
      const err = document.getElementById("loginGateError");

      if (!sel || !sel.value) {
        if (err) { err.style.display = "block"; err.innerText = "กรุณาเลือกชื่อผู้ใช้งาน"; }
        return;
      }
      const username = sel.value;
      const enteredPin = (pinInput ? pinInput.value : "").trim();
      const expectedPin = getUserStoredPin(username);

      if (enteredPin !== expectedPin && enteredPin !== currentAdminPin) {
        if (err) {
          err.style.display = "block";
          err.innerText = "❌ รหัส PIN ไม่ถูกต้อง (ค่าเริ่มต้นคือ 1234 หรือสอบถามหัวหน้างาน)";
        }
        if (pinInput) pinInput.focus();
        return;
      }

      const thName = (typeof AGENT_NAME_MAP !== "undefined" && AGENT_NAME_MAP[username]) ? AGENT_NAME_MAP[username] : username;
      currentUser = {
        username: username,
        nameTH: thName,
        role: "MEMBER",
        loginTime: new Date().toISOString()
      };

      const remember = remCheck ? remCheck.checked : true;
      if (remember) saveCurrentUserToStorage(currentUser);
      else saveCurrentUserToStorage(null);

      isAdminMode = false;
      if (typeof updateAdminModeUI === "function") updateAdminModeUI();
      updateUserProfileHeaderUI();
      closeLoginGateModal();

      highlightedAgent = username;
      const filterSel = document.getElementById("userFilterSelect");
      if (filterSel) filterSel.value = username;

      if (typeof renderAllViews === "function") renderAllViews();
      if (typeof showToast === "function") {
        showToast(`👋 ยินดีต้อนรับ คุณ${thName} เข้าสู่ระบบ`);
      }
    }

    function submitAdminLoginGate() {
      const pinInput = document.getElementById("loginGateAdminPin");
      const remCheck = document.getElementById("loginGateRemember");
      const err = document.getElementById("loginGateError");

      const enteredPin = (pinInput ? pinInput.value : "").trim();
      if (enteredPin !== currentAdminPin) {
        if (err) {
          err.style.display = "block";
          err.innerText = "❌ รหัส PIN หัวหน้างานไม่ถูกต้อง";
        }
        if (pinInput) pinInput.focus();
        return;
      }

      currentUser = {
        username: "admin",
        nameTH: "หัวหน้างาน",
        role: "ADMIN",
        loginTime: new Date().toISOString()
      };

      const remember = remCheck ? remCheck.checked : true;
      if (remember) saveCurrentUserToStorage(currentUser);
      else saveCurrentUserToStorage(null);

      isAdminMode = true;
      if (typeof updateAdminModeUI === "function") updateAdminModeUI();
      updateUserProfileHeaderUI();
      closeLoginGateModal();

      if (typeof renderAllViews === "function") renderAllViews();
      if (typeof showToast === "function") {
        showToast("🔓 เข้าสู่ระบบในโหมดหัวหน้างาน (Admin) เรียบร้อย");
      }
    }

    function handleUserLogout() {
      if (confirm("ต้องการออกจากระบบหรือไม่?")) {
        currentUser = null;
        saveCurrentUserToStorage(null);
        isAdminMode = false;
        if (typeof updateAdminModeUI === "function") updateAdminModeUI();
        updateUserProfileHeaderUI();
        closeUserProfileModal();
        openLoginGateModal();
        if (typeof showToast === "function") {
          showToast("🔒 ออกจากระบบเรียบร้อยแล้ว");
        }
      }
    }

    function openUserProfileModal() {
      if (!currentUser) {
        openLoginGateModal();
        return;
      }
      const modal = document.getElementById("userProfileModal");
      if (!modal) return;

      const nameEl = document.getElementById("profileModalName");
      const userEl = document.getElementById("profileModalUsername");
      const roleEl = document.getElementById("profileModalRole");
      const avatarEl = document.getElementById("profileModalAvatar");

      if (nameEl) nameEl.innerText = `คุณ${currentUser.nameTH}`;
      if (userEl) userEl.innerText = currentUser.username;
      if (roleEl) roleEl.innerText = (currentUser.role === "ADMIN" || isAdminMode) ? "หัวหน้างาน (Admin)" : "สมาชิกทีม (Staff)";
      if (avatarEl) avatarEl.innerText = currentUser.nameTH ? currentUser.nameTH.charAt(0) : "👤";

      const oldPin = document.getElementById("profileOldPin");
      const newPin = document.getElementById("profileNewPin");
      const err = document.getElementById("profilePinMsg");
      if (oldPin) oldPin.value = "";
      if (newPin) newPin.value = "";
      if (err) { err.style.display = "none"; err.innerText = ""; }

      modal.classList.add("show");
    }

    function closeUserProfileModal() {
      const modal = document.getElementById("userProfileModal");
      if (modal) modal.classList.remove("show");
    }

    function saveUserPinChange() {
      if (!currentUser || currentUser.role === "ADMIN") {
        showToast("ℹ️ โหมดหัวหน้างาน กรุณาเปลี่ยน PIN ผ่านเมนูโหมดหัวหน้า");
        return;
      }
      const oldPinInput = document.getElementById("profileOldPin");
      const newPinInput = document.getElementById("profileNewPin");
      const msg = document.getElementById("profilePinMsg");

      const oldPin = (oldPinInput ? oldPinInput.value : "").trim();
      const newPin = (newPinInput ? newPinInput.value : "").trim();

      const expectedOld = getUserStoredPin(currentUser.username);
      if (oldPin !== expectedOld && oldPin !== currentAdminPin) {
        if (msg) {
          msg.style.display = "block";
          msg.style.color = "#dc2626";
          msg.innerText = "❌ รหัส PIN ปัจจุบันไม่ถูกต้อง";
        }
        return;
      }
      if (newPin.length < 4) {
        if (msg) {
          msg.style.display = "block";
          msg.style.color = "#dc2626";
          msg.innerText = "⚠️ รหัส PIN ใหม่ต้องมีอย่างน้อย 4 หลัก";
        }
        return;
      }

      setUserStoredPin(currentUser.username, newPin);
      if (msg) {
        msg.style.display = "block";
        msg.style.color = "#16a34a";
        msg.innerText = "✅ เปลี่ยนรหัส PIN สำเร็จเรียบร้อย";
      }
      if (oldPinInput) oldPinInput.value = "";
      if (newPinInput) newPinInput.value = "";
      showToast("✅ เปลี่ยนรหัส PIN ส่วนตัวสำเร็จ");
    }

    let currentSchedule = { weeks: [], holidays: [] };
    let originalSchedule = { weeks: [], holidays: [] };
    let monthSchedules = {}; // Stores multi-month state: { "2026-9": { schedule, originalSchedule, swapHistory }, "2026-10": ... }
    let allowUserSwap = true;
    try {
      const cachedAllowSwap = localStorage.getItem("ft_allow_user_swap");
      if (cachedAllowSwap !== null) {
        allowUserSwap = (cachedAllowSwap === "true");
      }
    } catch(e) {}
    let isViewingOriginal = false;
    let showJD = false;
    let customSpinSeed = 0;
    let swapHistory = [];
    let pendingSwapSlot = null;
    let highlightedAgent = "ALL";

    let currentlyLoadedMonthKey = "";

    // Helper to get exact slot break time for Column 10 or custom
    function getWeekdaySlotBreakTime(cIdx, sIdx, customBreak) {
      const col = WEEKDAY_COLUMNS[cIdx];
      const totalSlots = (col && col.slots) || 1;

      if (customBreak) {
        let customList = [];
        if (customBreak.includes(' / ')) customList = customBreak.split(' / ').map(s => s.trim()).filter(Boolean);
        else if (customBreak.includes('/')) customList = customBreak.split('/').map(s => s.trim()).filter(Boolean);
        else if (customBreak.includes(',')) customList = customBreak.split(',').map(s => s.trim()).filter(Boolean);
        else customList = [customBreak.trim()];

        if (customList.length > 1 && totalSlots > 1) {
          const slotsPerBreak = Math.ceil(totalSlots / customList.length);
          const bIdx = Math.min(Math.floor(sIdx / slotsPerBreak), customList.length - 1);
          return customList[bIdx];
        }
        return customBreak;
      }

      if (!col) return '';
      const breaks = getShiftBreakTimes(col);
      if (breaks.length === 0) return col.breakTime || '';
      if (breaks.length === 1) return breaks[0];

      if (totalSlots > 1) {
        const slotsPerBreak = Math.ceil(totalSlots / breaks.length);
        const breakIdx = Math.min(Math.floor(sIdx / slotsPerBreak), breaks.length - 1);
        return breaks[breakIdx];
      }
      return breaks.join(', ');
    }

    // Reconcile slot capacities (Col 3 -> 2 slots, Col 10 -> 4 slots) across all month schedules
    function reconcileSlotCapacities() {
      if (WEEKDAY_COLUMNS[2]) WEEKDAY_COLUMNS[2].slots = 2;
      if (WEEKDAY_COLUMNS[9]) {
        WEEKDAY_COLUMNS[9].slots = 4;
        WEEKDAY_COLUMNS[9].breakTime = "พัก 13.00 (2 คน) / 13.30 (2 คน)";
      }
      if (Array.isArray(HOLIDAY_SHIFT_META)) {
        HOLIDAY_SHIFT_META.forEach((m, idx) => {
          if (!m.role || m.role === "undefined") m.role = `เวรวันหยุด กะที่ ${idx + 1}`;
        });
      }

      Object.keys(monthSchedules).forEach(k => {
        const data = monthSchedules[k];
        if (!data) return;
        [data.schedule, data.originalSchedule].forEach(sch => {
          if (!sch || !Array.isArray(sch.weeks)) return;
          sch.weeks.forEach(w => {
            if (!Array.isArray(w.assignments)) return;
            while (w.assignments[2] && w.assignments[2].length > 2 && w.assignments[9] && w.assignments[9].length < 4) {
              const moved = w.assignments[2].pop();
              w.assignments[9].push(moved);
            }
          });
        });
      });
    }

    // Clean up undefined strings and ensure performedBy is set on past swap records
    function sanitizeSwapHistory() {
      Object.keys(monthSchedules).forEach(k => {
        const data = monthSchedules[k];
        if (!data || !Array.isArray(data.swapHistory)) return;
        data.swapHistory.forEach(item => {
          if (!item) return;
          if (item.agentA) {
            if (!item.agentA.role || item.agentA.role === "undefined") item.agentA.role = "เวรวันหยุด";
            if (typeof item.agentA.desc === "string") item.agentA.desc = item.agentA.desc.replace(/undefined/g, "เวรวันหยุด");
          }
          if (item.agentB) {
            if (!item.agentB.role || item.agentB.role === "undefined") item.agentB.role = "เวรวันหยุด";
            if (typeof item.agentB.desc === "string") item.agentB.desc = item.agentB.desc.replace(/undefined/g, "เวรวันหยุด");
          }
          if (typeof item.summaryAtoB === "string") item.summaryAtoB = item.summaryAtoB.replace(/undefined/g, "เวรวันหยุด");
          if (typeof item.summaryBtoA === "string") item.summaryBtoA = item.summaryBtoA.replace(/undefined/g, "เวรวันหยุด");
          if (typeof item.detail === "string") item.detail = item.detail.replace(/undefined/g, "เวรวันหยุด");
          if (!item.performedBy) {
            item.performedBy = (item.agentA && item.agentA.username) ? `${item.agentA.username} (ผู้สลับ)` : "ผู้ใช้งานในระบบ";
          }
        });
      });
    }

    // =========================================================================
    // LEAVE & OVERRIDE STATE HELPERS
    // =========================================================================
    function getMonthLeaves(yearAD, month) {
      const key = `${yearAD}-${month}`;
      if (!monthSchedules[key]) return {};
      if (!monthSchedules[key].leaves) monthSchedules[key].leaves = {};
      return monthSchedules[key].leaves;
    }

    function getSlotLeave(yearAD, month, slotKey) {
      const leaves = getMonthLeaves(yearAD, month);
      return leaves[slotKey] || null;
    }

    function setSlotLeave(yearAD, month, slotKey, leaveData) {
      const leaves = getMonthLeaves(yearAD, month);
      if (leaveData) {
        leaves[slotKey] = leaveData;
      } else {
        delete leaves[slotKey];
      }
    }

    function getWeekWorkingDays(w, yearAD, month, sched) {
      if (Array.isArray(w && w.days) && w.days.length > 0) {
        return [...w.days];
      }
      const days = [];
      if (!w || !w.label) return days;

      const mRange = w.label.match(/(\d+)\s*-\s*(\d+)/);
      if (mRange) {
        const start = parseInt(mRange[1], 10);
        const end = parseInt(mRange[2], 10);
        const holidayDates = new Set();
        if (sched && Array.isArray(sched.holidays)) {
          sched.holidays.forEach(h => holidayDates.add(Number(h.date)));
        }
        for (let d = start; d <= end; d++) {
          const dt = new Date(yearAD, month - 1, d);
          const dayOfWeek = dt.getDay(); // 0: Sun, 6: Sat
          if (dayOfWeek >= 1 && dayOfWeek <= 5 && !holidayDates.has(d)) {
            days.push(d);
          }
        }
      } else {
        const mSingle = w.label.match(/(\d+)/);
        if (mSingle) {
          days.push(parseInt(mSingle[1], 10));
        }
      }
      return days;
    }

    function formatLeaveDatesLabel(days, isAllWeek, month) {
      if (!days || days.length === 0) return "";
      if (isAllWeek) return "ทั้งสัปดาห์";
      const mShort = (typeof THAI_MONTHS_SHORT !== "undefined" && THAI_MONTHS_SHORT[month]) ? THAI_MONTHS_SHORT[month] : "";
      if (days.length === 1) return `${days[0]} ${mShort}`.trim();

      let isSeq = true;
      for (let i = 0; i < days.length - 1; i++) {
        if (days[i+1] !== days[i] + 1) { isSeq = false; break; }
      }
      if (isSeq) {
        return `${days[0]}-${days[days.length - 1]} ${mShort}`.trim();
      }
      return `${days.join(", ")} ${mShort}`.trim();
    }

    function isLeaveOnDay(leave, day) {
      if (!leave) return false;
      if (leave.allWeek) return true;
      if (Array.isArray(leave.dates) && leave.dates.length > 0) {
        return leave.dates.includes(Number(day));
      }
      return true;
    }

    function getLeaveDatesBadgeText(leave, monthShort) {
      if (!leave) return "";
      if (leave.datesText) return leave.datesText;
      if (leave.allWeek) return "ทั้งสัปดาห์";
      if (Array.isArray(leave.dates) && leave.dates.length > 0) {
        if (leave.dates.length === 1) return `${leave.dates[0]} ${monthShort || ''}`.trim();
        return `${leave.dates.join(', ')} ${monthShort || ''}`.trim();
      }
      return "";
    }

    // Window bindings for inline handlers
    if (typeof window !== "undefined") {
      window.currentUser = currentUser;
      window.getCurrentOperatorName = getCurrentOperatorName;
      window.checkLoginGate = checkLoginGate;
      window.openLoginGateModal = openLoginGateModal;
      window.closeLoginGateModal = closeLoginGateModal;
      window.switchLoginGateTab = switchLoginGateTab;
      window.submitStaffLogin = submitStaffLogin;
      window.submitAdminLoginGate = submitAdminLoginGate;
      window.handleUserLogout = handleUserLogout;
      window.openUserProfileModal = openUserProfileModal;
      window.closeUserProfileModal = closeUserProfileModal;
      window.saveUserPinChange = saveUserPinChange;
      window.updateUserProfileHeaderUI = updateUserProfileHeaderUI;
      window.getUserStoredPin = getUserStoredPin;
      window.setUserStoredPin = setUserStoredPin;
    }
