// =========================================================
// CALENDAR GENERATION & ROTATION ALGORITHMS
// =========================================================

    function buildCalendarWeeksAndHolidays(yearAD, month) {
      const daysInMonth = new Date(yearAD, month, 0).getDate();
      const weeks = [];
      const holidays = [];
      let currentWeekDays = [];
      let currentWeekHolidays = [];

      const finalizeWeek = () => {
        if (currentWeekDays.length > 0) {
          let label = currentWeekDays.length === 1
            ? `${currentWeekDays[0]} ${THAI_MONTHS_SHORT[month]}`
            : `${currentWeekDays[0]} - ${currentWeekDays[currentWeekDays.length - 1]} ${THAI_MONTHS_SHORT[month]}`;
          if (currentWeekHolidays.length > 0) {
            label += ` (หยุด ${currentWeekHolidays.join(", ")})`;
          }
          weeks.push({ label, days: [...currentWeekDays] });
          currentWeekDays = [];
          currentWeekHolidays = [];
        }
      };

      for (let d = 1; d <= daysInMonth; d++) {
        const dt = new Date(yearAD, month - 1, d);
        const dow = dt.getDay(); // 0 = อาทิตย์, 6 = เสาร์
        const botName = getBotHoliday(yearAD, month, d);

        if (dow === 0 || dow === 6) {
          // Weekend day
          finalizeWeek();
          holidays.push({
            dayName: THAI_DAYS[dow],
            date: d,
            note: botName || "",
            isBankHoliday: !!botName,
            holidayName: botName || ""
          });
        } else if (botName) {
          // Weekday that is a Bank of Thailand Holiday!
          holidays.push({
            dayName: THAI_DAYS[dow],
            date: d,
            note: botName,
            isBankHoliday: true,
            holidayName: botName
          });
          currentWeekHolidays.push(`${d} ${THAI_MONTHS_SHORT[month]} ${botName}`);

          // Finalize week if Friday or last day of month
          if (dow === 5 || d === daysInMonth) {
            finalizeWeek();
          }
        } else {
          // Normal weekday working day
          currentWeekDays.push(d);
          if (dow === 5 || d === daysInMonth) {
            finalizeWeek();
          }
        }
      }

      // Safety net after loop in case month ended on weekday without finalize
      finalizeWeek();

      return { weeks, holidays };
    }

    
    function getOrInitMonthSchedule(yearAD, month) {
      const key = `${yearAD}-${month}`;
      if (monthSchedules[key]) {
        if (!monthSchedules[key].leaves) monthSchedules[key].leaves = {};
        if (!monthSchedules[key].dailySwaps) monthSchedules[key].dailySwaps = [];

        // Self-heal: If historical schedule has more weeks than saved schedule (e.g. Week 5 restored)
        if (HISTORICAL_SCHEDULES[key]) {
          const histWeeks = HISTORICAL_SCHEDULES[key].weeks;
          const curWeeks = monthSchedules[key].schedule && monthSchedules[key].schedule.weeks;
          if (Array.isArray(histWeeks) && Array.isArray(curWeeks) && curWeeks.length < histWeeks.length) {
            for (let i = curWeeks.length; i < histWeeks.length; i++) {
              curWeeks.push(JSON.parse(JSON.stringify(histWeeks[i])));
              if (monthSchedules[key].originalSchedule && Array.isArray(monthSchedules[key].originalSchedule.weeks)) {
                monthSchedules[key].originalSchedule.weeks.push(JSON.parse(JSON.stringify(histWeeks[i])));
              }
            }
          }
        }

        reconcileScheduleNames(monthSchedules[key].schedule);
        reconcileScheduleNames(monthSchedules[key].originalSchedule);
        return monthSchedules[key];
      }
      if (HISTORICAL_SCHEDULES[key]) {
        const hSched = JSON.parse(JSON.stringify(HISTORICAL_SCHEDULES[key]));
        reconcileScheduleNames(hSched);
        monthSchedules[key] = {
          schedule: hSched,
          originalSchedule: JSON.parse(JSON.stringify(hSched)),
          swapHistory: [],
          leaves: {},
          dailySwaps: []
        };
        return monthSchedules[key];
      }

      // Auto-generate for future months using authentic rotation matrices
      const cal = buildCalendarWeeksAndHolidays(yearAD, month);
      
      // Calculate continuous week offset from November 2026 (Nov 2026 = 5 weeks, Dec 2026 starts at cycle week 5)
      const monthDiff = (yearAD - 2026) * 12 + (month - 11);
      const approxWeeksBefore = monthDiff > 0 ? (5 + (monthDiff - 1) * 4) : 0;
      
      const generatedWeeks = cal.weeks.map((w, wIdx) => {
        const cycleIdx = (approxWeeksBefore + wIdx + customSpinSeed) % 20;
        const cycleAssignments = WEEKDAY_ROTATION_MATRIX[cycleIdx];
        return {
          label: w.label,
          assignments: JSON.parse(JSON.stringify(cycleAssignments))
        };
      });

      // Holiday rotation continues seamlessly from November's last holiday (indices 15, 12, 7, 3)
      // So first holiday day after Nov starts at offsets: [16, 13, 8, 4]
      const approxHolidaysBefore = monthDiff > 0 ? (monthDiff - 1) * 8 : 0;
      const generatedHolidays = cal.holidays.map((h, hIdx) => {
        const step = (approxHolidaysBefore + hIdx + customSpinSeed) % 20;
        const shifts = [
          HOLIDAY_ROTATION_AGENTS[(16 + step) % 20],
          HOLIDAY_ROTATION_AGENTS[(13 + step) % 20],
          HOLIDAY_ROTATION_AGENTS[(8 + step) % 20],
          HOLIDAY_ROTATION_AGENTS[(4 + step) % 20]
        ];
        return { ...h, shifts };
      });

      const sched = { weeks: generatedWeeks, holidays: generatedHolidays };
      reconcileScheduleNames(sched);
      monthSchedules[key] = {
        schedule: sched,
        originalSchedule: JSON.parse(JSON.stringify(sched)),
        swapHistory: [],
        leaves: {}
      };
      return monthSchedules[key];
    }



    function updateMonthSelectorPermissions() {
      const yearSelect = document.getElementById("yearSelect");
      const monthSelect = document.getElementById("monthSelect");
      if (!yearSelect || !monthSelect) return;

      const isAdmin = (typeof isAdminMode !== "undefined" && isAdminMode) || 
                      (typeof currentUser !== "undefined" && currentUser && currentUser.role === "ADMIN");

      const now = new Date();
      const curYear = now.getFullYear();
      const curMonth = now.getMonth() + 1;
      let maxAllowedYear = curYear;
      let maxAllowedMonth = curMonth + 2;
      if (maxAllowedMonth > 12) {
        maxAllowedMonth -= 12;
        maxAllowedYear += 1;
      }

      const selectedYear = parseInt(yearSelect.value, 10);

      // 1. Update Year Options
      Array.from(yearSelect.options).forEach(opt => {
        const yr = parseInt(opt.value, 10);
        if (isAdmin) {
          opt.disabled = false;
        } else {
          opt.disabled = (yr > maxAllowedYear);
        }
      });

      // 2. Update Month Options
      Array.from(monthSelect.options).forEach(opt => {
        const m = parseInt(opt.value, 10);
        if (isAdmin) {
          opt.disabled = false;
          opt.textContent = THAI_MONTHS[m];
        } else {
          const isExceeded = (selectedYear > maxAllowedYear) || (selectedYear === maxAllowedYear && m > maxAllowedMonth);
          opt.disabled = isExceeded;
          opt.textContent = isExceeded ? `${THAI_MONTHS[m]} 🔒` : THAI_MONTHS[m];
        }
      });
    }

    function onYearSelectChange() {
      updateMonthSelectorPermissions();
      generateScheduleForSelectedMonth();
    }

    function generateScheduleForSelectedMonth(forceRegen = false) {
      const yearSelect = document.getElementById("yearSelect");
      const monthSelect = document.getElementById("monthSelect");
      if (!yearSelect || !monthSelect) return;

      let yearAD = parseInt(yearSelect.value, 10);
      let month = parseInt(monthSelect.value, 10);

      // 2-Month Lookahead Limit for Non-Admin Members
      const isAdmin = (typeof isAdminMode !== "undefined" && isAdminMode) || 
                      (typeof currentUser !== "undefined" && currentUser && currentUser.role === "ADMIN");

      if (!isAdmin) {
        const now = new Date();
        const curYear = now.getFullYear();
        const curMonth = now.getMonth() + 1;
        let maxAllowedYear = curYear;
        let maxAllowedMonth = curMonth + 2;
        if (maxAllowedMonth > 12) {
          maxAllowedMonth -= 12;
          maxAllowedYear += 1;
        }

        const isExceeded = (yearAD > maxAllowedYear) || (yearAD === maxAllowedYear && month > maxAllowedMonth);
        if (isExceeded) {
          showToast(`🔒 สมาชิกทั่วไปสามารถดูตารางล่วงหน้าได้ไม่เกิน 2 เดือน (ถึงเดือน ${THAI_MONTHS[maxAllowedMonth]} ${maxAllowedYear + 543})`);
          yearSelect.value = curYear;
          monthSelect.value = Math.min(curMonth + 1, 12);
          yearAD = curYear;
          month = Math.min(curMonth + 1, 12);
        }
      }

      updateMonthSelectorPermissions();
      const key = `${yearAD}-${month}`;

      // Auto-save current month schedule to monthSchedules before switching
      if (currentlyLoadedMonthKey && currentSchedule && currentSchedule.weeks && currentSchedule.weeks.length > 0) {
        monthSchedules[currentlyLoadedMonthKey] = {
          schedule: currentSchedule,
          originalSchedule: originalSchedule,
          swapHistory: swapHistory,
          leaves: (monthSchedules[currentlyLoadedMonthKey] && monthSchedules[currentlyLoadedMonthKey].leaves) || {}
        };
      }

      if (forceRegen) {
        delete monthSchedules[key];
      }

      const mData = getOrInitMonthSchedule(yearAD, month);
      currentSchedule = mData.schedule;
      originalSchedule = mData.originalSchedule;
      swapHistory = mData.swapHistory || [];
      currentlyLoadedMonthKey = key;

      renderAllViews();
    }

    function shuffleCurrentMonth() {
      requestShuffle();
    }




    function calculateNextMonthFromBaselineLogic(nextYearAD, nextMonth, nextMonthName, nextYearTH) {
      // Base schedule to calculate from (MUST BE originalSchedule, ignoring user swaps!)
      const base = (originalSchedule && originalSchedule.weeks && originalSchedule.weeks.length > 0)
        ? originalSchedule
        : currentSchedule;

      const cal = buildCalendarWeeksAndHolidays(nextYearAD, nextMonth);

      // 1. Weekday rotation calculation from base.weeks
      let lastWeekStartAgent = "";
      if (base.weeks.length > 0) {
        lastWeekStartAgent = base.weeks[base.weeks.length - 1].assignments[0]?.[0] || AGENTS[0];
      }
      let baseIdx = BASE_ROTATION_ORDER_INDICES.findIndex(idx => AGENTS[idx] === lastWeekStartAgent);
      if (baseIdx === -1) baseIdx = 0;

      const generatedWeeks = cal.weeks.map((w, wIdx) => {
        const stepShift = (baseIdx + (wIdx + 1) * 3) % 20;
        const rotatedPool = [];
        for (let i = 0; i < 20; i++) {
          rotatedPool.push(AGENTS[BASE_ROTATION_ORDER_INDICES[(i + stepShift) % 20]]);
        }
        let ptr = 0;
        const assignments = WEEKDAY_COLUMNS.map(col => {
          const slotNames = [];
          for (let s = 0; s < col.slots; s++) slotNames.push(rotatedPool[ptr++]);
          return slotNames;
        });
        return { label: w.label, assignments };
      });

      // 2. Weekend / Holiday quota calculation from base.holidays (from baseline only!)
      const prevHolidayCounts = {};
      AGENTS.forEach(a => prevHolidayCounts[a] = 0);
      if (base.holidays) {
        base.holidays.forEach(h => {
          h.shifts.forEach(ag => {
            if (prevHolidayCounts[ag] !== undefined) prevHolidayCounts[ag]++;
          });
        });
      }

      const lastHol = base.holidays && base.holidays.length > 0 ? base.holidays[base.holidays.length - 1] : null;
      const lastHolAgents = lastHol ? lastHol.shifts : [];

      const nextHolCounts = {};
      AGENTS.forEach(a => nextHolCounts[a] = 0);

      let prevDayAssigned = [...lastHolAgents];
      const generatedHolidays = cal.holidays.map((h, hIdx) => {
        const shifts = [];
        const candidates = [...AGENTS].sort((a, b) => {
          const totalA = (prevHolidayCounts[a] || 0) + (nextHolCounts[a] || 0);
          const totalB = (prevHolidayCounts[b] || 0) + (nextHolCounts[b] || 0);
          if (totalA !== totalB) return totalA - totalB;
          return (nextHolCounts[a] || 0) - (nextHolCounts[b] || 0);
        });

        for (const cand of candidates) {
          if (shifts.length >= 4) break;
          if (shifts.includes(cand)) continue;
          if (hIdx > 0 && prevDayAssigned.includes(cand)) continue;
          if (hIdx === 0 && prevDayAssigned.includes(cand) && h.date === 1) continue;

          shifts.push(cand);
          nextHolCounts[cand]++;
        }

        if (shifts.length < 4) {
          for (const cand of candidates) {
            if (shifts.length >= 4) break;
            if (!shifts.includes(cand)) {
              shifts.push(cand);
              nextHolCounts[cand]++;
            }
          }
        }

        prevDayAssigned = [...shifts];
        return { ...h, shifts };
      });

      // Set new schedule and baseline
      currentSchedule = { weeks: generatedWeeks, holidays: generatedHolidays };
      originalSchedule = JSON.parse(JSON.stringify(currentSchedule));
      swapHistory = [];
      isViewingOriginal = false;

      const nextKey = `${nextYearAD}-${nextMonth}`;
      monthSchedules[nextKey] = {
        schedule: currentSchedule,
        originalSchedule: originalSchedule,
        swapHistory: []
      };
      currentlyLoadedMonthKey = nextKey;

      document.getElementById("yearSelect").value = nextYearAD;
      document.getElementById("monthSelect").value = nextMonth;

      renderAllViews();
      updateSwapPermissionUI();

      alert(`🎉 คำนวณตารางเวรเดือน ${nextMonthName} ${nextYearTH} สำเร็จ!\n\n` +
            `• คำนวณต่อเนื่องจาก "ตารางต้นฉบับ" ของเดือนก่อนหน้า (ไม่นำการสลับเวรมาคิดรวม)\n` +
            `• กะวันธรรมดาหมุนเวียนต่อเนื่องไร้รอยต่อ\n` +
            `• เกลี่ยโควตาวันหยุดให้คนที่ได้น้อยในเดือนก่อน ได้รับสิทธิ์เพิ่มขึ้นในเดือนนี้ตามกฎรอบ 2 เดือน\n` +
            `• ระบบได้บันทึกเป็นตารางต้นฉบับของเดือน ${nextMonthName} และซิงค์ขึ้น MongoDB Atlas เรียบร้อยแล้ว`);
      triggerAutoSaveToCloud(`คำนวณเดือน ${nextMonthName} ${nextYearTH}`);
    }

    
    // JD & Shift Times Management


    // Helper to find which week contains a given day
    function findWeekIndexForDay(sched, day) {
      if (!sched || !Array.isArray(sched.weeks)) return 0;
      const d = Number(day);
      for (let idx = 0; idx < sched.weeks.length; idx++) {
        const w = sched.weeks[idx];
        if (Array.isArray(w.days) && w.days.includes(d)) return idx;
        if (w.label) {
          const m = w.label.match(/(\d+)\s*-\s*(\d+)/);
          if (m) {
            const start = parseInt(m[1], 10);
            const end = parseInt(m[2], 10);
            if (d >= start && d <= end) return idx;
          } else {
            const single = w.label.match(/(\d+)/);
            if (single && parseInt(single[1], 10) === d) return idx;
          }
        }
      }
      return 0;
    }

    if (typeof window !== "undefined") {
      window.findWeekIndexForDay = findWeekIndexForDay;
      window.updateMonthSelectorPermissions = updateMonthSelectorPermissions;
      window.onYearSelectChange = onYearSelectChange;
    }
