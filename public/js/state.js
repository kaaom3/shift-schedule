// =========================================================
// APPLICATION STATE & STATE HELPER FUNCTIONS
// =========================================================

    // Admin Mode & PIN Management
    let isAdminMode = false;
    let currentAdminPin = "1234";


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
      if (customBreak) return customBreak;
      if (cIdx === 9) {
        return sIdx < 2 ? "พัก 13.00 น." : "พัก 13.30 น.";
      }
      return (WEEKDAY_COLUMNS[cIdx] && WEEKDAY_COLUMNS[cIdx].breakTime) || "";
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


