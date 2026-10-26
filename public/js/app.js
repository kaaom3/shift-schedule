// =========================================================
// APPLICATION ENTRYPOINT & GLOBAL UI EVENT BINDINGS
// =========================================================

    // App Initialization
    function initApp() {
      Object.keys(HISTORICAL_SCHEDULES).forEach(key => {
        if (!monthSchedules[key]) {
          monthSchedules[key] = {
            schedule: JSON.parse(JSON.stringify(HISTORICAL_SCHEDULES[key])),
            originalSchedule: JSON.parse(JSON.stringify(HISTORICAL_SCHEDULES[key])),
            swapHistory: []
          };
        }
      });

      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const curData = getOrInitMonthSchedule(yearAD, month);
      reconcileScheduleNames(curData.schedule);
      reconcileScheduleNames(curData.originalSchedule);
      currentSchedule = curData.schedule;
      originalSchedule = curData.originalSchedule;
      swapHistory = curData.swapHistory || [];
      reconcileSlotCapacities();
      sanitizeSwapHistory();
      currentlyLoadedMonthKey = `${yearAD}-${month}`;

      if (typeof updateMonthSelectorPermissions === "function") updateMonthSelectorPermissions();
      updateAdminModeUI();
      updateSwapPermissionUI();
      populateFilterDropdowns();
      renderAgentsEditor();
      renderWeekdayJdEditor();
      renderHolidayJdEditor();
      renderAllViews();

      // Check User Authentication / Login Gate
      if (typeof checkLoginGate === "function") {
        checkLoginGate();
      }

      // Launch MongoDB Atlas Cloud Sync & Live Real-time Polling
      initMongoCloudSync();
      if (typeof startLiveSyncPolling === "function") {
        startLiveSyncPolling();
      }
    }


    


    function updateBadgesAndTitles() {
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const yearTH = parseInt(document.getElementById("yearSelect").value, 10) + 543;
      const badge = document.getElementById("weekdayMonthBadge");
      if (badge) badge.innerText = `${THAI_MONTHS[month]} ${yearTH}`;

      // Update swap badge counts
      const swapBadge = document.getElementById("swapTabBadge");
      if (swapBadge) {
        swapBadge.innerText = (swapHistory || []).length;
      }
      const statCurEl = document.getElementById("statSwapCurrentMonth");
      if (statCurEl) {
        statCurEl.innerText = (swapHistory || []).length;
      }

      // Update schedule mode badges and indicators
      const typeBadge = document.getElementById("scheduleTypeBadge");
      const holTypeBadge = document.getElementById("holScheduleTypeBadge");
      const cardTypeBadge = document.getElementById("cardScheduleTypeBadge");
      const swapHint = document.getElementById("swapHintText");

      if (isViewingOriginal) {
        if (typeBadge) {
          typeBadge.innerHTML = "📜 ตารางต้นฉบับ Master (Baseline)";
          typeBadge.className = "badge badge-master-mode";
        }
        if (holTypeBadge) {
          holTypeBadge.innerHTML = "📜 ตารางต้นฉบับ Master (Baseline)";
          holTypeBadge.className = "badge badge-master-mode";
        }
        if (cardTypeBadge) {
          cardTypeBadge.innerHTML = "📜 ข้อมูลอิงจากตารางต้นฉบับ Master";
          cardTypeBadge.className = "badge badge-master-mode";
        }
        if (swapHint) {
          swapHint.innerHTML = "🔒 <strong>ตารางต้นฉบับ Master:</strong> แสดงฐานข้อมูลตั้งต้นตามสูตรหมุนวน (โหมดดูตรวจสอบ ไม่สามารถสลับเวรได้)";
        }
      } else {
        if (typeBadge) {
          typeBadge.innerHTML = "🟢 ตารางปฏิบัติงานจริง (Active)";
          typeBadge.className = "badge badge-active-mode";
        }
        if (holTypeBadge) {
          holTypeBadge.innerHTML = "🟢 ตารางปฏิบัติงานจริง (Active)";
          holTypeBadge.className = "badge badge-active-mode";
        }
        if (cardTypeBadge) {
          cardTypeBadge.innerHTML = "🟢 ข้อมูลอิงจากตารางปฏิบัติงานจริง";
          cardTypeBadge.className = "badge badge-active-mode";
        }
        if (swapHint) {
          swapHint.innerHTML = "💡 <strong>วิธีสลับเวร:</strong> คลิกชื่อคนที่ 1 แล้วคลิกชื่อคนที่ 2 เพื่อสลับเวร (หรือเปลี่ยนเดือนเพื่อสลับข้ามเดือน)";
        }
      }
    }



    function populateFilterDropdowns() {
      const userSel = document.getElementById("userFilterSelect");
      const cardSel = document.getElementById("cardFilterSelect");
      const swapAgentSel = document.getElementById("swapAgentFilterSelect");

      let opts = `<option value="ALL">-- ทุกคน --</option>`;
      AGENTS.forEach(a => { const th = AGENT_NAME_MAP[a] ? ` (${AGENT_NAME_MAP[a]})` : ""; opts += `<option value="${a}">${a}${th}</option>`; });

      if (userSel) userSel.innerHTML = opts;
      if (cardSel) cardSel.innerHTML = `<option value="ALL">-- แสดงครบทุกคน (20 คน) --</option>` + opts.replace('<option value="ALL">-- ทุกคน --</option>', '');
      if (swapAgentSel) swapAgentSel.innerHTML = opts;
    }

    function applyUserHighlight(val) {
      highlightedAgent = val;
      renderMasterWeekdayTable();
      renderMasterHolidayTable();
    }

    function toggleJD() {
      showJD = !showJD;
      document.getElementById("jdToggleText").innerText = showJD ? "ซ่อน JD ในแถว" : "แสดง JD ในแถว";
      renderMasterWeekdayTable();
      renderMasterHolidayTable();
    }

    function switchTab(tabId, btnEl) {
      document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.getElementById(tabId).classList.add("active");
      if (btnEl) btnEl.classList.add("active");
    }

    function addCustomHolidayQuick() {
      const dateVal = parseInt(document.getElementById("quickHolDate").value, 10);
      const noteVal = document.getElementById("quickHolName").value.trim() || "วันหยุดพิเศษ";
      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      if (!dateVal || dateVal < 1 || dateVal > 31) return;

      const dt = new Date(yearAD, month - 1, dateVal);
      const dowName = THAI_DAYS[dt.getDay()];
      const shifts = [AGENTS[(dateVal*3)%20], AGENTS[(dateVal*3+5)%20], AGENTS[(dateVal*3+10)%20], AGENTS[(dateVal*3+15)%20]];
      currentSchedule.holidays.push({ dayName: dowName, date: dateVal, note: noteVal, shifts });
      currentSchedule.holidays.sort((a, b) => a.date - b.date);

      document.getElementById("quickHolDate").value = "";
      document.getElementById("quickHolName").value = "";
      renderMasterHolidayTable();
      showToast("เพิ่มวันหยุดพิเศษเรียบร้อยแล้ว");
      triggerAutoSaveToCloud("เพิ่มวันหยุดพิเศษ");
    }

    function removeHoliday(idx) {
      if (confirm("คุณต้องการลบวันหยุดนี้หรือไม่?")) {
        currentSchedule.holidays.splice(idx, 1);
        renderMasterHolidayTable();
        showToast("ลบวันหยุดเรียบร้อย");
        triggerAutoSaveToCloud("ลบวันหยุด");
      }
    }



// Initialize application when DOM is ready
window.addEventListener('DOMContentLoaded', initApp);

// Initialize application when DOM is ready
window.addEventListener('DOMContentLoaded', initApp);
window.onload = initApp;
