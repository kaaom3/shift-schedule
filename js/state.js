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
      // Fallback for legacy records without dates array
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


