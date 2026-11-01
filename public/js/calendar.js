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

    
    // =========================================================================
    // SMART CONSTRAINT-SATISFACTION SHIFT GENERATOR
    // =========================================================================
    const LATE_SHIFT_COLUMNS = [12, 13, 14, 15]; // Col 13 (10.00-19.00), Col 14 (11.00-20.00), Col 15 (12.00-21.00), Col 16 (13.30-22.30)

    function generateSmartMonthWeeks(calWeeks, prevWeekAssignments, carryOverLateCounts = null, baseShift = 0, extraLateAgentsLastWeek = null, past2MonthCols = null) {
      const resultWeeks = [];
      const monthLateCounts = {};
      const monthColCounts = {};
      AGENTS.forEach(a => {
        monthLateCounts[a] = 0;
        monthColCounts[a] = Array(16).fill(0);
      });

      let prevWeek = prevWeekAssignments;

      for (let wIdx = 0; wIdx < calWeeks.length; wIdx++) {
        const w = calWeeks[wIdx];
        
        // Check who worked late (Col 12..15) in prevWeek
        const workedLateLastWeek = new Set();
        if (prevWeek) {
          LATE_SHIFT_COLUMNS.forEach(c => {
            (prevWeek[c] || []).forEach(ag => workedLateLastWeek.add(ag));
          });
        }
        if (wIdx === 0 && extraLateAgentsLastWeek) {
          extraLateAgentsLastWeek.forEach(ag => workedLateLastWeek.add(ag));
        }

        // Map each agent's column in prevWeek
        const prevColMap = {};
        if (prevWeek) {
          prevWeek.forEach((colAgents, c) => {
            colAgents.forEach(ag => prevColMap[ag] = c);
          });
        }

        const weekAssigned = new Set();
        const currentAssignments = Array.from({ length: 16 }, () => []);

        const spinOffset = (typeof customSpinSeed !== "undefined") ? customSpinSeed : 0;
        const weekOffset = (baseShift + wIdx * 3 + spinOffset) % 20;
        const getAgentPriority = (a) => {
          const idx = BASE_ROTATION_ORDER_INDICES.indexOf(AGENTS.indexOf(a));
          return (idx - weekOffset + 20) % 20;
        };

        // 1. Assign Late Shifts: Col 15 (13.30), 14 (12.00), 13 (11.00), 12 (10.00)
        const lateColumnsOrder = [15, 14, 13, 12];
        for (const c of lateColumnsOrder) {
          const candidates = [...AGENTS].filter(a => !weekAssigned.has(a));
          candidates.sort((a, b) => {
            // Priority A: Strict No Back-to-Back Late Shift
            const lateLastA = workedLateLastWeek.has(a) ? 1 : 0;
            const lateLastB = workedLateLastWeek.has(b) ? 1 : 0;
            if (lateLastA !== lateLastB) return lateLastA - lateLastB;

            // Priority B: Least late count in current month
            if (monthLateCounts[a] !== monthLateCounts[b]) {
              return monthLateCounts[a] - monthLateCounts[b];
            }

            // Priority C: Least late count carried over
            if (carryOverLateCounts) {
              const carryA = carryOverLateCounts[a] || 0;
              const carryB = carryOverLateCounts[b] || 0;
              if (carryA !== carryB) return carryA - carryB;
            }

            // Priority D: 2-Month Cooldown on same late column (Rule 3)
            if (past2MonthCols) {
              const pastA = past2MonthCols[a]?.has(c) ? 1 : 0;
              const pastB = past2MonthCols[b]?.has(c) ? 1 : 0;
              if (pastA !== pastB) return pastA - pastB;
            }

            // Priority E: Prioritize agents who were in Col 9 (4 slots) or Col 2 (2 slots) last week
            const wasMultiA = (prevColMap[a] === 9 || prevColMap[a] === 2) ? 0 : 1;
            const wasMultiB = (prevColMap[b] === 9 || prevColMap[b] === 2) ? 0 : 1;
            if (wasMultiA !== wasMultiB) return wasMultiA - wasMultiB;

            return getAgentPriority(a) - getAgentPriority(b);
          });

          const chosen = candidates[0];
          currentAssignments[c].push(chosen);
          weekAssigned.add(chosen);
          monthLateCounts[chosen]++;
          monthColCounts[chosen][c]++;
        }

        // 2. Assign Day Single-slot Columns: 0, 1, 3, 4, 5, 6, 7, 8, 10, 11
        const daySingleCols = [0, 1, 3, 4, 5, 6, 7, 8, 10, 11];
        for (const c of daySingleCols) {
          const candidates = [...AGENTS].filter(a => !weekAssigned.has(a));
          candidates.sort((a, b) => {
            // Strict Priority: Did not work this column last week
            const sameColA = prevColMap[a] === c ? 1 : 0;
            const sameColB = prevColMap[b] === c ? 1 : 0;
            if (sameColA !== sameColB) return sameColA - sameColB;

            // Prioritize agents who were in Col 9 last week
            const wasCol9A = prevColMap[a] === 9 ? 0 : 1;
            const wasCol9B = prevColMap[b] === 9 ? 0 : 1;
            if (wasCol9A !== wasCol9B) return wasCol9A - wasCol9B;

            // Prioritize agents who were in Col 2 last week
            const wasCol2A = prevColMap[a] === 2 ? 0 : 1;
            const wasCol2B = prevColMap[b] === 2 ? 0 : 1;
            if (wasCol2A !== wasCol2B) return wasCol2A - wasCol2B;

            if (monthColCounts[a][c] !== monthColCounts[b][c]) {
              return monthColCounts[a][c] - monthColCounts[b][c];
            }

            return getAgentPriority(a) - getAgentPriority(b);
          });

          const chosen = candidates[0];
          currentAssignments[c].push(chosen);
          weekAssigned.add(chosen);
          monthColCounts[chosen][c]++;
        }

        // 3. Assign Remaining 6 Agents to Col 2 (2 slots) and Col 9 (4 slots)
        const remaining = [...AGENTS].filter(a => !weekAssigned.has(a));

        // Col 2 (2 slots)
        for (let s = 0; s < 2; s++) {
          remaining.sort((a, b) => {
            const sameColA = prevColMap[a] === 2 ? 1 : 0;
            const sameColB = prevColMap[b] === 2 ? 1 : 0;
            if (sameColA !== sameColB) return sameColA - sameColB;

            if (monthColCounts[a][2] !== monthColCounts[b][2]) {
              return monthColCounts[a][2] - monthColCounts[b][2];
            }

            return getAgentPriority(a) - getAgentPriority(b);
          });
          const chosen = remaining.shift();
          currentAssignments[2].push(chosen);
          weekAssigned.add(chosen);
          monthColCounts[chosen][2]++;
        }

        // Col 9 (4 slots)
        for (let s = 0; s < 4; s++) {
          remaining.sort((a, b) => {
            const sameColA = prevColMap[a] === 9 ? 1 : 0;
            const sameColB = prevColMap[b] === 9 ? 1 : 0;
            if (sameColA !== sameColB) return sameColA - sameColB;

            if (monthColCounts[a][9] !== monthColCounts[b][9]) {
              return monthColCounts[a][9] - monthColCounts[b][9];
            }

            return getAgentPriority(a) - getAgentPriority(b);
          });
          const chosen = remaining.shift();
          currentAssignments[9].push(chosen);
          weekAssigned.add(chosen);
          monthColCounts[chosen][9]++;
        }

        resultWeeks.push({
          label: w.label,
          days: w.days,
          assignments: currentAssignments
        });

        prevWeek = currentAssignments;
      }

      return { weeks: resultWeeks, monthLateCounts, lastWeek: resultWeeks[resultWeeks.length - 1].assignments };
    }

    function generateSmartMonthSchedule(yearAD, month, baseSchedule, actualSchedule = null) {
      const cal = buildCalendarWeeksAndHolidays(yearAD, month);
      let prevWeekAssignments = null;
      let carryOverLateCounts = null;
      let baseShift = 0;
      let baseHolidays = null;
      const extraLateAgentsLastWeek = new Set();

      if (baseSchedule && baseSchedule.weeks && baseSchedule.weeks.length > 0) {
        const lastW = baseSchedule.weeks[baseSchedule.weeks.length - 1];
        prevWeekAssignments = lastW.assignments;
        const lastCol0Agent = lastW.assignments[0]?.[0];
        const lastIdx = BASE_ROTATION_ORDER_INDICES.indexOf(AGENTS.indexOf(lastCol0Agent));
        baseShift = (lastIdx !== -1 ? lastIdx + 3 : 0) % 20;

        carryOverLateCounts = {};
        AGENTS.forEach(a => carryOverLateCounts[a] = 0);
        baseSchedule.weeks.forEach(w => {
          LATE_SHIFT_COLUMNS.forEach(c => {
            (w.assignments[c] || []).forEach(a => carryOverLateCounts[a]++);
          });
        });
        baseHolidays = baseSchedule.holidays || null;

        LATE_SHIFT_COLUMNS.forEach(c => {
          (lastW.assignments[c] || []).forEach(a => extraLateAgentsLastWeek.add(a));
        });
      }

      if (actualSchedule && actualSchedule.weeks && actualSchedule.weeks.length > 0) {
        const lastW = actualSchedule.weeks[actualSchedule.weeks.length - 1];
        LATE_SHIFT_COLUMNS.forEach(c => {
          (lastW.assignments[c] || []).forEach(a => extraLateAgentsLastWeek.add(a));
        });
      }

      // Collect past 2 months column history to enforce 2-Month Cooldown rule (Rule 3)
      const past2MonthCols = {};
      const lookbackKeys = [];
      let y = yearAD, m = month - 1;
      if (m < 1) { m += 12; y -= 1; }
      lookbackKeys.push(`${y}-${m}`);
      m -= 1;
      if (m < 1) { m += 12; y -= 1; }
      lookbackKeys.push(`${y}-${m}`);

      lookbackKeys.forEach(k => {
        const pastSched = (typeof monthSchedules !== "undefined" && monthSchedules[k]?.schedule) || 
                          (typeof HISTORICAL_SCHEDULES !== "undefined" && HISTORICAL_SCHEDULES[k]);
        if (pastSched && Array.isArray(pastSched.weeks)) {
          pastSched.weeks.forEach(w => {
            w.assignments.forEach((col, c) => {
              col.forEach(ag => {
                if (!past2MonthCols[ag]) past2MonthCols[ag] = new Set();
                past2MonthCols[ag].add(c);
              });
            });
          });
        }
      });

      const { weeks } = generateSmartMonthWeeks(cal.weeks, prevWeekAssignments, carryOverLateCounts, baseShift, extraLateAgentsLastWeek, past2MonthCols);

      // Holidays quota & balancing (2-month cycle)
      const prevHolidayCounts = {};
      AGENTS.forEach(a => prevHolidayCounts[a] = 0);
      if (baseHolidays) {
        baseHolidays.forEach(h => {
          (h.shifts || []).forEach(ag => {
            if (prevHolidayCounts[ag] !== undefined) prevHolidayCounts[ag]++;
          });
        });
      }

      const lastHol = baseHolidays && baseHolidays.length > 0 ? baseHolidays[baseHolidays.length - 1] : null;
      const lastHolAgents = lastHol ? (lastHol.shifts || []) : [];

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

      return { weeks, holidays: generatedHolidays };
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

      // Auto-generate for future months using smart constraint solver
      let prevYear = yearAD;
      let prevMonth = month - 1;
      if (prevMonth < 1) {
        prevMonth = 12;
        prevYear -= 1;
      }
      const prevKey = `${prevYear}-${prevMonth}`;
      let baseSched = null;
      let actualSched = null;
      if (monthSchedules[prevKey]) {
        baseSched = monthSchedules[prevKey].originalSchedule || monthSchedules[prevKey].schedule;
        actualSched = monthSchedules[prevKey].schedule || null;
      } else if (HISTORICAL_SCHEDULES[prevKey]) {
        baseSched = HISTORICAL_SCHEDULES[prevKey];
        actualSched = HISTORICAL_SCHEDULES[prevKey];
      } else if (prevYear >= 2026 && (prevYear > 2026 || prevMonth >= 9)) {
        const prevMData = getOrInitMonthSchedule(prevYear, prevMonth);
        baseSched = prevMData ? (prevMData.originalSchedule || prevMData.schedule) : null;
        actualSched = prevMData ? prevMData.schedule : null;
      }

      const generated = generateSmartMonthSchedule(yearAD, month, baseSched, actualSched);
      reconcileScheduleNames(generated);
      monthSchedules[key] = {
        schedule: generated,
        originalSchedule: JSON.parse(JSON.stringify(generated)),
        swapHistory: [],
        leaves: {},
        dailySwaps: []
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
      const actual = (currentSchedule && currentSchedule.weeks && currentSchedule.weeks.length > 0)
        ? currentSchedule
        : null;

      const generated = generateSmartMonthSchedule(nextYearAD, nextMonth, base, actual);

      // Set new schedule and baseline
      currentSchedule = { weeks: generated.weeks, holidays: generated.holidays };
      originalSchedule = JSON.parse(JSON.stringify(currentSchedule));
      swapHistory = [];
      isViewingOriginal = false;

      const nextKey = `${nextYearAD}-${nextMonth}`;
      monthSchedules[nextKey] = {
        schedule: currentSchedule,
        originalSchedule: originalSchedule,
        swapHistory: [],
        leaves: (monthSchedules[nextKey] && monthSchedules[nextKey].leaves) || {},
        dailySwaps: (monthSchedules[nextKey] && monthSchedules[nextKey].dailySwaps) || []
      };
      currentlyLoadedMonthKey = nextKey;

      document.getElementById("yearSelect").value = nextYearAD;
      document.getElementById("monthSelect").value = nextMonth;

      renderAllViews();
      updateSwapPermissionUI();

      alert(`🎉 คำนวณตารางเวรเดือน ${nextMonthName} ${nextYearTH} สำเร็จ!\n\n` +
            `• คำนวณต่อเนื่องจาก "ตารางต้นฉบับ" ของเดือนก่อนหน้า (ไม่นำการสลับเวรมาคิดรวม)\n` +
            `• ไร้การอยู่เวรดึกซ้ำติดกัน 2 สัปดาห์ (Back-to-Back Late Shift: 0%)\n` +
            `• ไร้การอยู่กะ/คอลัมน์เดิมซ้ำสัปดาห์ติดกัน (Same Column Repeat: 0%)\n` +
            `• เกลี่ยโควตากะดึกและวันหยุดเท่าเทียมครบทุกคนตามกฎรอบ 2 เดือน\n` +
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
