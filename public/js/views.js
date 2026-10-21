// =========================================================
// INDIVIDUAL CARDS, HOURLY HEADCOUNT, MATRIX & LINE BRIEF
// =========================================================

    // =========================================================================
    // DAILY LINE BRIEF GENERATOR
    // =========================================================================
    function openLineBriefModal() {
      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const daysInMonth = new Date(yearAD, month, 0).getDate();
      const select = document.getElementById("lineBriefDateSelect");
      
      select.innerHTML = "";
      const cal = buildCalendarWeeksAndHolidays(yearAD, month);
      
      for (let d = 1; d <= daysInMonth; d++) {
        const dt = new Date(yearAD, month - 1, d);
        const dow = dt.getDay();
        const dayName = THAI_DAYS[dow];
        const isHol = cal.holidays.some(h => h.date === d);
        const holType = isHol ? " [วันหยุด]" : "";
        
        const opt = document.createElement("option");
        opt.value = d;
        opt.textContent = `วันที่ ${d} ${THAI_MONTHS_SHORT[month]} (${dayName})${holType}`;
        select.appendChild(opt);
      }

      const today = new Date();
      if (today.getFullYear() === yearAD && (today.getMonth() + 1) === month) {
        select.value = today.getDate();
      } else {
        select.value = 1;
      }

      updateLineBriefPreview();
      document.getElementById("lineBriefModal").classList.add("show");
    }

    function closeLineBriefModal() {
      document.getElementById("lineBriefModal").classList.remove("show");
    }

    function findWeekIndexForDay(sched, day) {
      if (!sched || !Array.isArray(sched.weeks)) return 0;
      for (let idx = 0; idx < sched.weeks.length; idx++) {
        const w = sched.weeks[idx];
        if (Array.isArray(w.days) && w.days.includes(day)) return idx;
        if (w.label) {
          const m = w.label.match(/(\d+)\s*-\s*(\d+)/);
          if (m) {
            const start = parseInt(m[1], 10);
            const end = parseInt(m[2], 10);
            if (day >= start && day <= end) return idx;
          } else {
            const single = w.label.match(/(\d+)/);
            if (single && parseInt(single[1], 10) === day) return idx;
          }
        }
      }
      return 0;
    }

    let DEFAULT_LINE_EXTRA_STAFF = [
      { time: "07.00-16.00", name: "อนัญญา", role: "" },
      { time: "08.30-17.30", name: "สมเกียรติ", role: "" },
      { time: "08.30-17.30", name: "นุสรา", role: "" },
      { time: "08.30-17.30", name: "กชกร", role: "" },
      { time: "08.30-17.30", name: "เสกสรร", role: "" },
      { time: "11.30-20.30", name: "กิติภูมิ", role: "" }
    ];

    function getLineExtraStaff() {
      try {
        const saved = localStorage.getItem("LINE_EXTRA_STAFF");
        if (saved) return JSON.parse(saved);
      } catch (e) {}
      return DEFAULT_LINE_EXTRA_STAFF;
    }

    function saveLineExtraStaff(staffList) {
      try {
        localStorage.setItem("LINE_EXTRA_STAFF", JSON.stringify(staffList));
      } catch (e) {}
    }

    function getLineBriefRoleTag(cIdx, col) {
      const defaultRoleTags = {
        0: "(รับ Call/ECE)",
        1: "(รับ Mail/Self Service/PK)",
        2: "(รับ Call)",
        3: "(รับ Self Service)",
        4: "(รับ ECE)",
        5: "(รับ Mail/PK)",
        6: "(รับ Follow)",
        7: "(รับ ECE)",
        8: "(รับ Follow)",
        9: "(รับ Call)",
        10: "(รับ Self Service)",
        11: "(รับ ECE/Call)",
        12: "(รับ ECE)",
        13: "(รับ Call)",
        14: "(รับ Self Service/PK/Mail)",
        15: "(รับ Call)"
      };
      if (defaultRoleTags[cIdx]) return defaultRoleTags[cIdx];
      if (!col || !col.role) return "";
      const r = col.role.trim();
      return r.startsWith("รับ") ? `(${r})` : `(รับ ${r})`;
    }

    function formatLineShiftHeader(timeStr) {
      let cleanTime = String(timeStr || "").replace(/ น\.?$/, "").trim();
      cleanTime = cleanTime.replace(/^0(\d\.)/, "$1");
      return `ช่วงเวลา ${cleanTime} น.`;
    }

    function getAgentLineName(ag) {
      if (!ag) return "";
      if (typeof AGENT_NAME_MAP !== 'undefined' && AGENT_NAME_MAP[ag]) {
        return AGENT_NAME_MAP[ag];
      }
      return ag;
    }

    function generateLineBriefText(day) {
      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const dStr = String(day).padStart(2, '0');
      const mStr = String(month).padStart(2, '0');
      const sched = isViewingOriginal ? originalSchedule : currentSchedule;
      const leaves = getMonthLeaves(yearAD, month);

      const holiday = sched.holidays && sched.holidays.find(h => h.date === day);

      if (holiday) {
        let text = `เรียนทีม   แจ้งรายชื่อทีมงานประจำวันที่ ${dStr}/${mStr}/${yearAD} (${holiday.dayName} - วันหยุด${holiday.note ? ': ' + holiday.note : ''})\n`;
        const holShiftsDef = [
          { time: "08.00-17.00", label: "เวร 1", sIdx: 0 },
          { time: "09.00-18.00", label: "เวร 2", sIdx: 1 },
          { time: "10.00-19.00", label: "เวร 3", sIdx: 2 },
          { time: "13.30-22.30", label: "เวร 4", sIdx: 3 }
        ];

        const holidayLeaves = [];
        const hIdx = sched.holidays.indexOf(holiday);

        let isFirstGroup = true;
        holShiftsDef.forEach(sh => {
          const ag = holiday.shifts[sh.sIdx];
          const thName = getAgentLineName(ag);
          const lKey = `H_${hIdx}_${sh.sIdx}`;
          const leave = leaves[lKey];

          if (!isFirstGroup) text += "\n";
          text += `${formatLineShiftHeader(sh.time)}\n`;
          if (leave) {
            text += `- ${thName} (${sh.label}) [${leave.leaveType}]\n`;
            holidayLeaves.push(`${thName} (${leave.leaveType}${leave.note ? ': ' + leave.note : ''})`);
          } else {
            text += `- ${thName} (${sh.label})\n`;
          }
          isFirstGroup = false;
        });

        text += `\nแจ้งรายชื่อการลา\n`;
        if (holidayLeaves.length > 0) {
          holidayLeaves.forEach(l => { text += `- ${l}\n`; });
        } else {
          text += `-\n`;
        }
        return text;
      }

      // WEEKDAY
      const matchedWIdx = findWeekIndexForDay(sched, day);
      const week = (sched && sched.weeks) ? (sched.weeks[matchedWIdx] || sched.weeks[0]) : null;
      const customTimes = (week && week.customTimes) || {};

      let text = `เรียนทีม   แจ้งรายชื่อทีมงานประจำวันที่ ${dStr}/${mStr}/${yearAD}(WFH)\n`;

      const extraStaffList = getLineExtraStaff();

      const shiftTimeOrder = [
        "07.00-16.00",
        "08.00-17.00",
        "08.30-17.30",
        "09.00-18.00",
        "10.00-19.00",
        "11.00-20.00",
        "11.30-20.30",
        "12.00-21.00",
        "13.30-22.30"
      ];

      const timeGroups = {};
      shiftTimeOrder.forEach(t => {
        timeGroups[t] = { time: t, columns: [], extraStaff: [] };
      });

      extraStaffList.forEach(extra => {
        let cleanTime = String(extra.time || "").replace(/ น\.?$/, "").trim();
        if (!cleanTime.startsWith("0") && cleanTime.length === 10) cleanTime = "0" + cleanTime;
        if (!timeGroups[cleanTime]) {
          timeGroups[cleanTime] = { time: cleanTime, columns: [], extraStaff: [] };
          shiftTimeOrder.push(cleanTime);
        }
        timeGroups[cleanTime].extraStaff.push(extra);
      });

      WEEKDAY_COLUMNS.forEach((col, cIdx) => {
        let shiftTime = customTimes[cIdx]?.time || col.time;
        shiftTime = String(shiftTime || "").replace(/ น\.?$/, "").trim();
        if (!shiftTime.startsWith("0") && shiftTime.length === 10) shiftTime = "0" + shiftTime;
        if (!timeGroups[shiftTime]) {
          timeGroups[shiftTime] = { time: shiftTime, columns: [], extraStaff: [] };
          shiftTimeOrder.push(shiftTime);
        }
        timeGroups[shiftTime].columns.push({ col, cIdx });
      });

      const weekdayLeaves = [];
      let isFirst = true;

      shiftTimeOrder.forEach(shiftKey => {
        const group = timeGroups[shiftKey];
        if (!group) return;

        const lines = [];

        group.extraStaff.forEach(ex => {
          const roleStr = ex.role ? (` ${ex.role}`) : "";
          lines.push(`- ${ex.name}${roleStr}`);
        });

        let orderedColumns = group.columns;
        if (shiftKey === "08.30-17.30") {
          orderedColumns = [...group.columns].sort((a, b) => {
            const order = { 6: 1, 8: 2, 7: 3, 9: 4 };
            return (order[a.cIdx] || 99) - (order[b.cIdx] || 99);
          });
        }

        const effectiveAssignments = (typeof getEffectiveAssignmentsForDay === 'function')
          ? getEffectiveAssignmentsForDay(yearAD, month, day, sched)
          : ((week && week.assignments) || []);

        orderedColumns.forEach(({ col, cIdx }) => {
          const agents = effectiveAssignments[cIdx] || [];
          agents.forEach((ag, sIdx) => {
            if (!ag || ag === "-") return;
            const thName = getAgentLineName(ag);
            const lKey = `W_${matchedWIdx}_${cIdx}_${sIdx}`;
            const leave = leaves[lKey];
            const roleTag = getLineBriefRoleTag(cIdx, col);

            const isTodayLeave = isLeaveOnDay(leave, day);
            if (isTodayLeave) {
              const noteStr = leave.note ? `: ${leave.note}` : "";
              weekdayLeaves.push(`${thName} (${leave.leaveType}${noteStr})`);
            } else {
              lines.push(`- ${thName} ${roleTag}`);
            }
          });
        });

        if (lines.length > 0) {
          if (!isFirst) text += "\n";
          text += `${formatLineShiftHeader(group.time)}\n`;
          text += lines.join("\n") + "\n";
          isFirst = false;
        }
      });

      text += `\nแจ้งรายชื่อการลา\n`;
      if (weekdayLeaves.length > 0) {
        weekdayLeaves.forEach(l => { text += `- ${l}\n`; });
      } else {
        text += `-\n`;
      }

      return text;
    }

    function toggleExtraStaffEditor() {
      const container = document.getElementById("extraStaffEditorContainer");
      if (!container) return;
      if (container.style.display === "none" || container.style.display === "") {
        container.style.display = "block";
        const staff = getLineExtraStaff();
        const area = document.getElementById("extraStaffInputArea");
        if (area) area.value = staff.map(s => `${s.time},${s.name},${s.role || ''}`).join("\n");
      } else {
        container.style.display = "none";
      }
    }

    function saveExtraStaffFromEditor() {
      const area = document.getElementById("extraStaffInputArea");
      if (!area) return;
      const lines = area.value.split("\n");
      const list = [];
      lines.forEach(l => {
        const parts = l.split(",");
        if (parts.length >= 2 && parts[1].trim()) {
          list.push({
            time: parts[0].trim(),
            name: parts[1].trim(),
            role: (parts[2] || "").trim()
          });
        }
      });
      saveLineExtraStaff(list);
      if (typeof showToast === "function") showToast("บันทึกรายชื่อทีมงานประจำกะเรียบร้อยแล้ว");
      document.getElementById("extraStaffEditorContainer").style.display = "none";
      updateLineBriefPreview();
    }

    function resetExtraStaffToDefault() {
      saveLineExtraStaff(DEFAULT_LINE_EXTRA_STAFF);
      if (typeof showToast === "function") showToast("คืนค่ารายชื่อทีมงานประจำกะเป็นค่าเริ่มต้นแล้ว");
      const container = document.getElementById("extraStaffEditorContainer");
      if (container) container.style.display = "none";
      updateLineBriefPreview();
    }

    function updateLineBriefPreview() {
      const select = document.getElementById("lineBriefDateSelect");
      const day = parseInt(select.value, 10);
      const text = generateLineBriefText(day);
      document.getElementById("lineBriefTextArea").value = text;
    }

    async function copyLineBriefText() {
      const textarea = document.getElementById("lineBriefTextArea");
      const text = textarea.value;
      if (!text) return;

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          textarea.select();
          document.execCommand("copy");
        }
        showToast("📋 คัดลอกข้อความสรุปส่ง LINE เรียบร้อยแล้ว!");
      } catch (err) {
        textarea.select();
        document.execCommand("copy");
        showToast("📋 คัดลอกข้อความสรุปส่ง LINE เรียบร้อยแล้ว!");
      }
    }



    function renderIndividualCards(filterAgent = "ALL") {
      const grid = document.getElementById("individualCardsGrid");
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const monthShort = THAI_MONTHS_SHORT[month];
      const sched = isViewingOriginal ? originalSchedule : currentSchedule;
      const targetAgents = filterAgent === "ALL" ? AGENTS : AGENTS.filter(a => a === filterAgent);
      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const leaves = getMonthLeaves(yearAD, month);

      grid.innerHTML = targetAgents.map(ag => {
        let holCount = 0;
        let callCount = 0;
        let wfhCount = 0;
        let workingWeeksCount = 0;

        // 1. Weekday shifts for this agent
        const weekdayItems = sched.weeks.map((w, wIdx) => {
          let matchedCol = null;
          let matchedCIdx = -1;
          let matchedSIdx = -1;

          WEEKDAY_COLUMNS.forEach((col, cIdx) => {
            const list = w.assignments[cIdx] || [];
            const idx = list.indexOf(ag);
            if (idx !== -1) {
              matchedCol = col;
              matchedCIdx = cIdx;
              matchedSIdx = idx;
              if (col.code === "8C" || col.code === "8.3C") callCount++;
              if (col.wfh) wfhCount++;
            }
          });

          if (!matchedCol) {
            return `
              <div class="shift-box" style="opacity: 0.65;">
                <div class="shift-box-top">
                  <span class="shift-box-week">📅 สัปดาห์ ${w.label}</span>
                  <span style="color:#94a3b8; font-size:11px;">ไม่มีกะวันทำการ</span>
                </div>
              </div>
            `;
          }

          workingWeeksCount++;
          const customTimes = w.customTimes || {};
          const colCustom = customTimes[matchedCIdx];
          const shiftTime = colCustom ? colCustom.time : matchedCol.time.replace(" (WFH)", "");
          const breakTime = getWeekdaySlotBreakTime(matchedCIdx, matchedSIdx, colCustom ? colCustom.breakTime : null);
          const isCustomTime = !!colCustom;

          // Check daily swaps for this agent in this week
          let dailySwapChipHtml = "";
          const weekDays = (w && Array.isArray(w.days) && w.days.length > 0) ? w.days : [];
          const mDailySwaps = (typeof getDailySwapsForMonth === 'function') ? getDailySwapsForMonth(yearAD, month) : [];
          const agentSwapsInWeek = mDailySwaps.filter(sw => {
            const isAg = sw.agentA === ag || sw.agentB === ag;
            const wA = (typeof findWeekIndexForDay === 'function') ? findWeekIndexForDay(sched, sw.dateA) : -1;
            const wB = (typeof findWeekIndexForDay === 'function') ? findWeekIndexForDay(sched, sw.dateB) : -1;
            const inWeek = (weekDays.length > 0) ? (weekDays.includes(sw.dateA) || weekDays.includes(sw.dateB)) : (wA === wIdx || wB === wIdx);
            return isAg && inWeek;
          });

          if (agentSwapsInWeek.length > 0) {
            dailySwapChipHtml = agentSwapsInWeek.map(sw => {
              const isA = sw.agentA === ag;
              const myDate = isA ? sw.dateA : sw.dateB;
              const partner = isA ? sw.agentBName : sw.agentAName;
              const newTime = isA ? sw.shiftB.time : sw.shiftA.time;
              const newRole = isA ? sw.shiftB.role : sw.shiftA.role;
              return `<div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:4px; padding:3px 7px; margin-top:4px; font-size:10.5px; color:#15803d;">
                🔀 <strong>วันที่ ${myDate} ${monthShort}:</strong> เปลี่ยนเป็นกะ <strong>${newTime}</strong> (${newRole}) <em>[สลับกับคุณ${partner}]</em>
              </div>`;
            }).join("");
          }

          // Check leave
          const lKey = `W_${wIdx}_${matchedCIdx}_${matchedSIdx}`;
          const leave = leaves[lKey];
          let leaveChipHtml = "";
          if (leave) {
            const mShort = (typeof THAI_MONTHS_SHORT !== "undefined" && THAI_MONTHS_SHORT[month]) ? THAI_MONTHS_SHORT[month] : "";
            const dText = getLeaveDatesBadgeText(leave, mShort);
            const dLabel = dText ? ` (${dText})` : "";
            leaveChipHtml = `
              <div style="margin-top:6px;">
                <span class="leave-chip leave-${getLeaveClass(leave.leaveType)}" 
                      onclick="openLeaveRecordModal(${yearAD}, ${month}, 'WEEKDAY', ${wIdx}, ${matchedCIdx}, ${matchedSIdx}, '${ag}', '${w.label}', 'ช่องที่ ${matchedCIdx + 1}')" 
                      title="คลิกเพื่อแก้ไขหรือยกเลิกการลา">
                  ${getLeaveIcon(leave.leaveType)} ${leave.leaveType}${dLabel}${leave.note ? ': ' + leave.note : ''} ✏️
                </span>
              </div>`;
          } else {
            leaveChipHtml = `
              <div style="margin-top:6px;">
                <button type="button" class="btn btn-outline btn-sm" 
                        onclick="openLeaveRecordModal(${yearAD}, ${month}, 'WEEKDAY', ${wIdx}, ${matchedCIdx}, ${matchedSIdx}, '${ag}', '${w.label}', 'ช่องที่ ${matchedCIdx + 1}')" 
                        style="font-size:10.5px; padding:2px 7px; color:#c2410c; border-color:#fed7aa; background:#fff7ed;" 
                        title="คลิกเพื่อลงลาในสัปดาห์นี้">
                  🏖️ ลงลา
                </button>
              </div>`;
          }

          const jdPreview = (matchedCol.jd && matchedCol.jd.length > 0)
            ? `<div style="font-size:11.5px; font-weight:600; color:#0f172a; margin-top:6px; background:#f8fafc; border:1px solid #bfdbfe; border-left:3.5px solid #2563eb; border-radius:6px; padding:6px 8px; line-height:1.45;">
                <div style="font-size:9.5px; font-weight:700; color:#2563eb; margin-bottom:3px; text-transform:uppercase;">📋 หน้าที่งาน (JD):</div>
                ${matchedCol.jd.map(j => `<div style="position:relative; padding-left:12px; margin-bottom:2px;"><span style="position:absolute; left:0; color:#2563eb; font-weight:800;">•</span>${j}</div>`).join("")}
               </div>`
            : "";

          return `
            <div class="shift-box">
              <div class="shift-box-top">
                <span class="shift-box-week">📅 สัปดาห์ ${w.label}</span>
                ${isCustomTime ? `<span class="week-custom-badge">⚡ เวลาเฉพาะสัปดาห์</span>` : ''}
              </div>
              <div class="shift-box-details" style="margin-top: 4px;">
                <span>⏰ <strong>${shiftTime} น.</strong></span>
                <span style="color: #b45309; font-weight:700;">☕ ${breakTime}</span>
              </div>
              <div class="shift-box-role" style="font-weight:600; color:var(--text); margin-top:3px;">
                💼 ช่องที่ ${matchedCIdx + 1} • ${matchedCol.role}
              </div>
              ${leaveChipHtml}
              ${dailySwapChipHtml}
              ${jdPreview}
            </div>
          `;
        }).join("");

        // 2. Holiday shifts for this agent
        const holChipsArr = [];
        sched.holidays.forEach((h, hIdx) => {
          h.shifts.forEach((shName, sIdx) => {
            if (shName === ag) {
              holCount++;
              const meta = HOLIDAY_SHIFT_META[sIdx] || { time: "เวรวันหยุด", breakTime: "" };
              const isBank = h.isBankHoliday;
              const icon = isBank ? "🏦" : "🏖️";
              const noteText = isBank && h.holidayName ? ` (${h.holidayName})` : "";
              const breakText = meta.breakTime ? ` • ${meta.breakTime}` : "";

              // Check leave
              const lKey = `H_${hIdx}_${sIdx}`;
              const leave = leaves[lKey];
              let leaveChipHtml = "";
              if (leave) {
                leaveChipHtml = `<div class="leave-chip leave-${getLeaveClass(leave.leaveType)}" style="margin-top:4px; font-size:10px; padding:2px 6px;">${getLeaveIcon(leave.leaveType)} ${leave.leaveType}${leave.note ? ': ' + leave.note : ''}</div>`;
              }

              holChipsArr.push(`
                <div style="background:#ffffff; border:1px solid ${isBank ? '#fde047' : '#fecdd3'}; border-radius:6px; padding:6px 10px; margin-bottom:4px; font-size:11.5px;">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="color:${isBank ? '#854d0e' : '#9f1239'};">${icon} ${h.dayName}ที่ ${h.date} ${monthShort}${noteText}</strong>
                    <span style="font-size:10.5px; color:#b45309; font-weight:600;">${breakText}</span>
                  </div>
                  <div style="color:var(--text); font-size:11px; margin-top:2px;">
                    ⏰ <strong>${meta.time}</strong>
                  </div>
                  ${leaveChipHtml}
                </div>
              `);
            }
          });
        });

        const holBoxHTML = holChipsArr.length > 0 ? `
          <div class="holiday-box-wrap">
            <div class="agent-card-section-label" style="color: #9f1239;">
              <span>🏖️ เวรวันหยุด & วันพิเศษ (${holCount} วัน)</span>
            </div>
            <div class="holiday-chips-container" style="display:flex; flex-direction:column; gap:2px;">
              ${holChipsArr.join("")}
            </div>
          </div>
        ` : `
          <div style="background:#f8fafc; border:1px dashed var(--border); border-radius:8px; padding:10px; text-align:center; font-size:11.5px; color:var(--muted);">
            ✨ ไม่มีเวรวันหยุดในเดือนนี้
          </div>
        `;

        const avatarInitial = ag ? ag.substring(0, 2) : "ทีม";

        const isMe = (typeof currentUser !== "undefined" && currentUser && currentUser.username === ag);
        const cardMeBadge = isMe ? `<span class="badge" style="background:#0284c7; color:white; font-size:10px; margin-left:6px; padding:2px 7px; border-radius:10px;">👤 การ์ดของคุณ</span>` : "";

        return `
          <div class="agent-card" style="${isMe ? 'border: 2px solid #0284c7; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.2); background: #f0fdfa;' : ''}">
            <!-- Card Header: Clean Name, NO number prefix, NO 'คุณ' -->
            <div class="agent-card-header" style="${isMe ? 'background: linear-gradient(135deg, #0369a1, #0284c7); color: white;' : ''}">
              <div class="agent-card-profile">
                <div class="agent-avatar-badge" style="${isMe ? 'background: white; color: #0284c7;' : ''}">${avatarInitial}</div>
                <div>
                  <h4 class="agent-card-name" style="${isMe ? 'color: white;' : ''}">${ag} ${cardMeBadge}</h4>
                  <div class="agent-card-team-label">${AGENT_NAME_MAP[ag] ? AGENT_NAME_MAP[ag] + " • " : ""}First Tier Support</div>
                </div>
              </div>
              <div class="agent-card-stats">
                <span class="agent-stat-chip" title="จำนวนเวรวันหยุดในเดือนนี้">🏖️ ${holCount} วัน</span>
                ${callCount > 0 ? `<span class="agent-stat-chip" style="background:rgba(234,179,8,0.2); border-color:rgba(250,204,21,0.35); color:#fef08a;" title="กะรับสาย Call">📞 ${callCount} สัปดาห์</span>` : ''}
              </div>
            </div>

            <!-- Card Body -->
            <div class="agent-card-body">
              <div>
                <div class="agent-card-section-label">
                  <span>🏢 เวรวันทำการ (จันทร์ - ศุกร์)</span>
                </div>
                <div class="weekday-shifts-list">
                  ${weekdayItems}
                </div>
              </div>

              ${holBoxHTML}
            </div>

            <!-- Card Footer -->
            <div class="agent-card-footer" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button class="btn btn-outline btn-sm" onclick="openDailySwapModal('${ag}')" style="color:#0369a1; border-color:#bae6fd; background:#f0f9ff; font-weight:700; padding:3px 9px; font-size:11px; display:inline-flex; align-items:center; gap:4px;" title="ขอสลับเวรเฉพาะรายวัน">
                  <span>🔀</span> สลับกะรายวัน
                </button>
                <button class="btn btn-outline btn-sm" onclick="openCalendarSyncModal('${ag}')" style="color:#0284c7; border-color:#93c5fd; background:#f0f9ff; font-weight:700; padding:3px 9px; font-size:11px; display:inline-flex; align-items:center; gap:4px;" title="ซิงค์ตารางเวรคุณ ${ag} เข้า iPhone, Google, Outlook, หรือ MS Teams">
                  <span>📅</span> ซิงค์ปฏิทิน
                </button>
              </div>
              <button class="btn btn-outline btn-sm" onclick="highlightAndJumpToMaster('${ag}')" style="padding:3px 8px; font-size:11px;" title="ไฮไลท์ชื่อ ${ag} ในหน้าตารางรวม">
                🔍 ไฮไลท์ในตารางรวม
              </button>
            </div>
          </div>
        `;
      }).join("");
    }

    function highlightAndJumpToMaster(agentName) {
      highlightedAgent = agentName;
      const userSel = document.getElementById("userFilterSelect");
      if (userSel) userSel.value = agentName;
      switchTab("masterTab", document.getElementById("tabBtnMaster"));
      renderMasterWeekdayTable();
      renderMasterHolidayTable();
      showToast(`🔍 ไฮไลท์คุณ${agentName} ในตารางรวมเรียบร้อยแล้ว`);
    }

    // =========================================================================
    // CALENDAR SYNC MODAL CONTROLLER (Apple Calendar, Outlook, MS Teams)
    // =========================================================================
    let currentCalendarSyncAgent = "";

    function openCalendarSyncModal(agentName) {
      currentCalendarSyncAgent = agentName || (AGENTS && AGENTS[0]) || "";
      const nameElem = document.getElementById("calendarModalAgentName");
      if (nameElem) {
        const th = (typeof AGENT_NAME_MAP !== "undefined" && AGENT_NAME_MAP[currentCalendarSyncAgent])
          ? `คุณ${AGENT_NAME_MAP[currentCalendarSyncAgent]}`
          : currentCalendarSyncAgent;
        nameElem.textContent = `${th} (${currentCalendarSyncAgent})`;
      }

      let apiHost = window.location.host;
      let apiProtocol = window.location.protocol;

      // Always route to live Vercel backend if running on GitHub Pages (static) or local file
      if (typeof window !== "undefined" && window.location) {
        if (window.location.hostname && (window.location.hostname.includes("github.io") || window.location.protocol === "file:")) {
          apiHost = "shift-schedule-f6di.vercel.app";
          apiProtocol = "https:";
        } else if (typeof mongoApiEndpoint === "string" && mongoApiEndpoint.startsWith("http")) {
          try {
            const u = new URL(mongoApiEndpoint);
            apiHost = u.host;
            apiProtocol = u.protocol;
          } catch (e) {}
        }
      }

      const isHttps = apiProtocol === "https:";
      // Base URL for API
      const baseUrl = `${apiProtocol}//${apiHost}/api/calendar?agent=${encodeURIComponent(currentCalendarSyncAgent)}`;
      // Webcal URL for iOS / macOS 1-tap subscription
      const webcalUrl = isHttps 
        ? `webcal://${apiHost}/api/calendar?agent=${encodeURIComponent(currentCalendarSyncAgent)}`
        : baseUrl;

      const iphoneBtn = document.getElementById("calendarIphoneBtn");
      if (iphoneBtn) {
        iphoneBtn.href = webcalUrl;
      }

      const feedInput = document.getElementById("calendarFeedUrlInput");
      if (feedInput) {
        feedInput.value = baseUrl;
      }

      const googleBtn = document.getElementById("calendarGoogleBtn");
      if (googleBtn) {
        googleBtn.href = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(baseUrl)}`;
      }

      const modal = document.getElementById("calendarSyncModal");
      if (modal) {
        modal.classList.add("show");
      }
    }

    function openCalendarSyncFromCardFilter() {
      const select = document.getElementById("cardFilterSelect");
      const val = select ? select.value : "ALL";
      if (val && val !== "ALL") {
        openCalendarSyncModal(val);
      } else {
        const firstAgent = (AGENTS && AGENTS.length > 0) ? AGENTS[0] : "";
        if (firstAgent) {
          showToast("💡 คุณกำลังดูตารางรวม: กำลังเปิดหน้าต่างซิงค์ (สามารถเลือกชื่ออื่นจากการ์ดด้านล่างได้ครับ)");
          openCalendarSyncModal(firstAgent);
        } else {
          showToast("⚠️ ไม่พบข้อมูลเจ้าหน้าที่");
        }
      }
    }

    function closeCalendarSyncModal() {
      const modal = document.getElementById("calendarSyncModal");
      if (modal) {
        modal.classList.remove("show");
      }
    }

    function copyCalendarSyncUrl() {
      const input = document.getElementById("calendarFeedUrlInput");
      if (!input || !input.value) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(input.value).then(() => {
          showToast("📋 คัดลอกลิงก์สำหรับ Outlook / Teams เรียบร้อยแล้ว!");
        }).catch(() => {
          fallbackCopyText(input.value);
        });
      } else {
        fallbackCopyText(input.value);
      }
    }

    function fallbackCopyText(text) {
      const input = document.getElementById("calendarFeedUrlInput");
      if (input) {
        input.select();
        input.setSelectionRange(0, 99999);
        try {
          document.execCommand("copy");
          showToast("📋 คัดลอกลิงก์เรียบร้อยแล้ว!");
        } catch (e) {
          showToast("⚠️ กรุณากดคัดลอกข้อความในช่องด้วยตนเอง");
        }
      }
    }

    function downloadCurrentAgentICS() {
      if (!currentCalendarSyncAgent) return;
      let apiBase = "";
      if (typeof window !== "undefined" && window.location && (window.location.hostname.includes("github.io") || window.location.protocol === "file:")) {
        apiBase = "https://shift-schedule-f6di.vercel.app";
      } else if (typeof mongoApiEndpoint === "string" && mongoApiEndpoint.startsWith("http")) {
        try {
          const u = new URL(mongoApiEndpoint);
          apiBase = `${u.protocol}//${u.host}`;
        } catch (e) {}
      }
      const url = `${apiBase}/api/calendar?agent=${encodeURIComponent(currentCalendarSyncAgent)}&download=1`;
      const a = document.createElement("a");
      a.href = url;
      a.download = `ตารางเวร_${currentCalendarSyncAgent}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(`📥 กำลังดาวน์โหลดไฟล์ตารางเวรคุณ ${currentCalendarSyncAgent}...`);
    }




    // =========================================================================
    // TAB 3: ตารางเช็คจำนวนคนแต่ละช่วงเวลา (Hourly Headcount & Staffing Check)
    // =========================================================================
    let currentHourlyMode = "WEEKDAY"; // "WEEKDAY" or "HOLIDAY"
    let selectedHourlyWeekIndex = 0;
    let selectedHourlyHolidayIndex = 0;

    function safeEscape(str) {
      if (typeof escapeHtml === 'function') return escapeHtml(str);
      if (str === null || str === undefined) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function setHourlyMode(mode) {
      currentHourlyMode = mode;
      const wkBtn = document.getElementById("hourlyModeWeekdayBtn");
      const holBtn = document.getElementById("hourlyModeHolidayBtn");
      const wkContainer = document.getElementById("hourlyWeekSelectContainer");
      const holContainer = document.getElementById("hourlyHolidaySelectContainer");
      const wkMetrics = document.getElementById("hourlyWeekdayMetricsContainer");
      const wkFootnote = document.getElementById("hourlyWeekdayFootnote");

      const dayContainer = document.getElementById("hourlyDaySelectContainer");

      if (mode === "WEEKDAY") {
        if (wkBtn) { wkBtn.className = "btn btn-sm btn-primary"; wkBtn.style.background = ""; wkBtn.style.color = ""; }
        if (holBtn) { holBtn.className = "btn btn-sm"; holBtn.style.background = "transparent"; holBtn.style.color = "var(--muted)"; }
        if (wkContainer) wkContainer.style.display = "flex";
        if (dayContainer) dayContainer.style.display = "flex";
        if (holContainer) holContainer.style.display = "none";
        if (wkMetrics) wkMetrics.style.display = "block";
        if (wkFootnote) wkFootnote.style.display = "block";
      } else {
        if (wkBtn) { wkBtn.className = "btn btn-sm"; wkBtn.style.background = "transparent"; wkBtn.style.color = "var(--muted)"; }
        if (holBtn) { holBtn.className = "btn btn-sm btn-primary"; holBtn.style.background = ""; holBtn.style.color = ""; }
        if (wkContainer) wkContainer.style.display = "none";
        if (dayContainer) dayContainer.style.display = "none";
        if (holContainer) holContainer.style.display = "flex";
        if (wkMetrics) wkMetrics.style.display = "none";
        if (wkFootnote) wkFootnote.style.display = "none";
      }
      renderHourlyHeadcountTable();
    }

    const HORIZONTAL_SUMMARY_SPEC = {
  "time_slots": [
    "07:00",
    "07:30",
    "08:00",
    "08:30",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
    "18:00",
    "18:30",
    "19:00",
    "19:30",
    "20:00",
    "20:30",
    "21:00",
    "21:30",
    "22:00",
    "22:30"
  ],
  "agent_slots": [
    {
      "no": 1,
      "role": "รับสาย 1 (7.00)",
      "shift": "07:00-16:00",
      "break": "11:00",
      "colIdx": 0,
      "slotIdx": 0,
      "intervals": [
        "Call+ECE",
        "Call+ECE",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Break",
        "Break",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
      ]
    },
    {
      "no": 2,
      "role": "Mixed/All 1(7.00)",
      "shift": "08:00-17:00",
      "break": "12:00",
      "colIdx": 1,
      "slotIdx": 0,
      "intervals": [
        "Mail/Self/RT",
        "Mail/Self/RT",
        "Self",
        "Self",
        "Self",
        "Self",
        "Self",
        "Self",
        "Self",
        "Self",
        "Break",
        "Break",
        "Self",
        "Self",
        "Self",
        "Self",
        "Self",
        "Self",
        "Self",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
      ]
    },
    {
      "no": 3,
      "role": "รับสาย 2 (8.00)",
      "shift": "08:00-17:00",
      "break": "11:30",
      "colIdx": 2,
      "slotIdx": 0,
      "intervals": [
        "",
        "",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Break",
        "Break",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
      ]
    },
    {
      "no": 4,
      "role": "รับสาย 3 (8.00)",
      "shift": "08:00-17:00",
      "break": "11:30",
      "colIdx": 2,
      "slotIdx": 1,
      "intervals": [
        "",
        "",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Break",
        "Break",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
      ]
    },
    {
      "no": 5,
      "role": "Mixed/All 2(8.00)",
      "shift": "08:00-17:00",
      "break": "13:00",
      "colIdx": 3,
      "slotIdx": 0,
      "intervals": [
        "",
        "",
        "Self",
        "Self",
        "Self",
        "Self",
        "Self",
        "Self",
        "Self",
        "Self",
        "Self",
        "Self",
        "Break",
        "Break",
        "Self",
        "Self",
        "Self",
        "Self",
        "Self",
        "Self",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
      ]
    },
    {
      "no": 6,
      "role": "ECE 1 (8.00)",
      "shift": "08:00-17:00",
      "break": "12:00",
      "colIdx": 4,
      "slotIdx": 0,
      "intervals": [
        "",
        "",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "Break",
        "Break",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
      ]
    },
    {
      "no": 7,
      "role": "Mail  (8.00)",
      "shift": "08:00-17:00",
      "break": "13:30",
      "colIdx": 5,
      "slotIdx": 0,
      "intervals": [
        "",
        "",
        "Mail/RT",
        "Mail/RT",
        "Mail/RT",
        "Mail/RT",
        "Mail/RT",
        "Mail/RT",
        "Mail/RT",
        "Mail/RT",
        "Mail/RT",
        "Mail/RT",
        "Mail/RT",
        "Break",
        "Break",
        "Mail/RT",
        "Mail/RT",
        "Mail/RT",
        "Mail/RT",
        "Mail/RT",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
      ]
    },
    {
      "no": 8,
      "role": "Mixed/All 3(8.30)",
      "shift": "08:30-17:30",
      "break": "12:30",
      "colIdx": 6,
      "slotIdx": 0,
      "intervals": [
        "",
        "",
        "",
        "FU Ex/16App/FU SR/FU SOS",
        "FU Ex/16App/FU SR/FU SOS",
        "FU Ex/16App/FU SR/FU SOS",
        "FU Ex/16App/FU SR/FU SOS",
        "FU Ex/16App/FU SR/FU SOS",
        "FU Ex/16App/FU SR/FU SOS",
        "FU Ex/16App/FU SR/FU SOS",
        "FU Ex/16App/FU SR/FU SOS",
        "Break",
        "Break",
        "FU Ex/16App/FU SR/FU SOS",
        "FU Ex/16App/FU SR/FU SOS",
        "FU Ex/16App/FU SR/FU SOS",
        "FU Ex/16App/FU SR/FU SOS",
        "FU Ex/16App/FU SR/FU SOS",
        "FU Ex/16App/FU SR/FU SOS",
        "FU Ex/16App/FU SR/FU SOS",
        "FU Ex/16App/FU SR/FU SOS",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
      ]
    },
    {
      "no": 9,
      "role": "ECE 2 (8.30)",
      "shift": "08:30-17:30",
      "break": "13:00",
      "colIdx": 7,
      "slotIdx": 0,
      "intervals": [
        "",
        "",
        "",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "Break",
        "Break",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
      ]
    },
    {
      "no": 10,
      "role": "Mixed/All 3(8.30)",
      "shift": "08:30-17:30",
      "break": "13:30",
      "colIdx": 8,
      "slotIdx": 0,
      "intervals": [
        "",
        "",
        "",
        "FU Ex/16App/FU SR/FU SOS",
        "FU Ex/16App/FU SR/FU SOS",
        "FU Ex/16App/FU SR/FU SOS",
        "FU Ex/16App/FU SR/FU SOS",
        "FU Ex/16App/FU SR/FU SOS",
        "FU Ex/16App/FU SR/FU SOS",
        "FU Ex/16App/FU SR/FU SOS",
        "FU Ex/16App/FU SR/FU SOS",
        "FU Ex/16App/FU SR/FU SOS",
        "FU Ex/16App/FU SR/FU SOS",
        "Break",
        "Break",
        "FU Ex/16App/FU SR/FU SOS",
        "FU Ex/16App/FU SR/FU SOS",
        "FU Ex/16App/FU SR/FU SOS",
        "FU Ex/16App/FU SR/FU SOS",
        "FU Ex/16App/FU SR/FU SOS",
        "FU Ex/16App/FU SR/FU SOS",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
      ]
    },
    {
      "no": 11,
      "role": "รับสาย 5 (8.30)",
      "shift": "08:30-17:30",
      "break": "13:00",
      "colIdx": 9,
      "slotIdx": 0,
      "intervals": [
        "",
        "",
        "",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Break",
        "Break",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
      ]
    },
    {
      "no": 12,
      "role": "รับสาย 6 (8.30)",
      "shift": "08:30-17:30",
      "break": "13:00",
      "colIdx": 9,
      "slotIdx": 1,
      "intervals": [
        "",
        "",
        "",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Break",
        "Break",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
      ]
    },
    {
      "no": 13,
      "role": "รับสาย 7 (8.30)",
      "shift": "08:30-17:30",
      "break": "13:30",
      "colIdx": 9,
      "slotIdx": 2,
      "intervals": [
        "",
        "",
        "",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Break",
        "Break",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
      ]
    },
    {
      "no": 14,
      "role": "รับสาย 8 (8.30)",
      "shift": "08:30-17:30",
      "break": "13:30",
      "colIdx": 9,
      "slotIdx": 3,
      "intervals": [
        "",
        "",
        "",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Break",
        "Break",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
      ]
    },
    {
      "no": 15,
      "role": "Mixed/All 4 (9.00)",
      "shift": "09:00-18:00",
      "break": "14:00",
      "colIdx": 10,
      "slotIdx": 0,
      "intervals": [
        "",
        "",
        "",
        "",
        "Self",
        "Self",
        "Self",
        "Self",
        "Self",
        "Self",
        "Self",
        "Self",
        "Self",
        "Self",
        "Break",
        "Break",
        "Self",
        "Self",
        "Self",
        "Self",
        "Self",
        "Self",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
      ]
    },
    {
      "no": 16,
      "role": "Mixed/All 5 (9.00)",
      "shift": "09:00-18:00",
      "break": "14:00",
      "colIdx": 11,
      "slotIdx": 0,
      "intervals": [
        "",
        "",
        "",
        "",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "Break",
        "Break",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
      ]
    },
    {
      "no": 17,
      "role": "ECE 3 (10.00)",
      "shift": "10:00-19:00",
      "break": "13:30",
      "colIdx": 12,
      "slotIdx": 0,
      "intervals": [
        "",
        "",
        "",
        "",
        "",
        "",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "Break",
        "Break",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "ECE",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
      ]
    },
    {
      "no": 18,
      "role": "รับสาย 9 (11.00)",
      "shift": "11:00-20:00",
      "break": "14:00",
      "colIdx": 13,
      "slotIdx": 0,
      "intervals": [
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Break",
        "Break",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "",
        "",
        "",
        "",
        "",
        ""
      ]
    },
    {
      "no": 19,
      "role": "Mixed/All 8 (12.00)",
      "shift": "12:00-21:00",
      "break": "15:00",
      "colIdx": 14,
      "slotIdx": 0,
      "intervals": [
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Self",
        "Self",
        "Self",
        "Self",
        "Self",
        "Self",
        "Break",
        "Break",
        "Self",
        "Self",
        "Mail/Self/RT",
        "Mail/Self/RT",
        "Mail/Self/RT",
        "Mail/Self/RT",
        "Mail/Self/RT",
        "Mail/Self/RT",
        "Mail/Self/RT",
        "Mail/Self/RT",
        "",
        "",
        "",
        ""
      ]
    },
    {
      "no": 20,
      "role": "Mixed/All 9 (13.30)",
      "shift": "13:30-22:30",
      "break": "16:00",
      "colIdx": 15,
      "slotIdx": 0,
      "intervals": [
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Mail/RT",
        "Mail/RT",
        "Call",
        "Call",
        "Call",
        "Break",
        "Break",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call",
        "Call+ECE",
        "Call+ECE",
        "All (Call+Mail+ECE+Self Service +Realtime)",
        "All (Call+Mail+ECE+Self Service +Realtime)",
        "All (Call+Mail+ECE+Self Service +Realtime)",
        "All (Call+Mail+ECE+Self Service +Realtime)"
      ]
    }
  ],
  "summary_rows": [
    {
      "category": "1. Total Active",
      "counts": [
        2,
        2,
        7,
        14,
        16,
        16,
        17,
        17,
        17,
        15,
        15,
        17,
        14,
        11,
        12,
        17,
        19,
        19,
        18,
        17,
        13,
        6,
        4,
        4,
        3,
        3,
        2,
        2,
        1,
        1,
        1,
        1
      ]
    },
    {
      "category": "    •  Call",
      "counts": [
        1,
        1,
        3,
        7,
        7,
        7,
        7,
        7,
        7,
        5,
        6,
        8,
        6,
        4,
        5,
        8,
        10,
        10,
        9,
        8,
        6,
        3,
        1,
        2,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1
      ]
    },
    {
      "category": "    • ECE",
      "counts": [
        1,
        1,
        1,
        2,
        3,
        3,
        4,
        4,
        4,
        3,
        3,
        3,
        3,
        2,
        2,
        3,
        3,
        3,
        3,
        3,
        2,
        2,
        1,
        1,
        0,
        0,
        1,
        1,
        1,
        1,
        1,
        1
      ]
    },
    {
      "category": "    • Self Service ",
      "counts": [
        1,
        1,
        2,
        2,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        2,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1
      ]
    },
    {
      "category": "    •Realtime/Mail (Monitor)",
      "counts": [
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1
      ]
    },
    {
      "category": "    • FollowEx/16App/Follow /Follow SR/",
      "counts": [
        0,
        0,
        0,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        1,
        1,
        1,
        2,
        2,
        2,
        2,
        2,
        2,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ]
    },
    {
      "category": "2. รวมคนที่ไปพัก (On Break)",
      "counts": [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        1,
        3,
        4,
        2,
        5,
        9,
        8,
        3,
        1,
        1,
        1,
        1,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ]
    },
    {
      "category": "3. พนักงานที่ยังไม่เข้า / ออกกะแล้ว (Off-Shift)",
      "counts": [
        18,
        18,
        13,
        6,
        4,
        4,
        3,
        3,
        2,
        2,
        1,
        1,
        1,
        0,
        0,
        0,
        0,
        0,
        1,
        2,
        7,
        14,
        16,
        16,
        17,
        17,
        18,
        18,
        19,
        19,
        19,
        19
      ]
    }
  ]
};

    const HOURLY_TIME_SLOTS_HOLIDAY = [
      { label: "08.00-09.00", start: 8.0, end: 9.0, text: "08:00 - 09:00" },
      { label: "09.00-10.00", start: 9.0, end: 10.0, text: "09:00 - 10:00" },
      { label: "10.00-11.00", start: 10.0, end: 11.0, text: "10:00 - 11:00" },
      { label: "11.00-12.00", start: 11.0, end: 12.0, text: "11:00 - 12:00" },
      { label: "12.00-13.00", start: 12.0, end: 13.0, text: "12:00 - 13:00" },
      { label: "13.00-13.30", start: 13.0, end: 13.5, text: "13:00 - 13:30" },
      { label: "13.30-14.00", start: 13.5, end: 14.0, text: "13:30 - 14:00" },
      { label: "14.00-14.30", start: 14.0, end: 14.5, text: "14:00 - 14:30" },
      { label: "14.30-15.00", start: 14.5, end: 15.0, text: "14:30 - 15:00" },
      { label: "15.00-15.30", start: 15.0, end: 15.5, text: "15:00 - 15:30" },
      { label: "15.30-16.00", start: 15.5, end: 16.0, text: "15:30 - 16:00" },
      { label: "16.00-17.00", start: 16.0, end: 17.0, text: "16:00 - 17:00" },
      { label: "17.00-18.00", start: 17.0, end: 18.0, text: "17:00 - 18:00" },
      { label: "18.00-19.00", start: 18.0, end: 19.0, text: "18:00 - 19:00" },
      { label: "19.00-20.00", start: 19.0, end: 20.0, text: "19:00 - 20:00" },
      { label: "20.00-21.00", start: 20.0, end: 21.0, text: "20:00 - 21:00" },
      { label: "21.00-22.30", start: 21.0, end: 22.5, text: "21:00 - 22:30" }
    ];

    function onHourlyWeekChange() {
      const weekSelect = document.getElementById("hourlyWeekSelect");
      if (weekSelect) {
        selectedHourlyWeekIndex = parseInt(weekSelect.value, 10) || 0;
      }
      updateHourlyDaySelectOptions();
      renderHourlyHeadcountTable();
    }

    function updateHourlyDaySelectOptions(forceVal) {
      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const sched = isViewingOriginal ? originalSchedule : currentSchedule;
      const daySelect = document.getElementById("hourlyDaySelect");
      if (!daySelect || !sched || !sched.weeks) return;

      const week = sched.weeks[selectedHourlyWeekIndex] || sched.weeks[0];
      const weekDays = getWeekWorkingDays(week, yearAD, month, sched);
      const curVal = forceVal !== undefined ? forceVal : daySelect.value;

      const THAI_DAY_NAMES_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
      const mShort = (typeof THAI_MONTHS_SHORT !== "undefined" && THAI_MONTHS_SHORT[month]) ? THAI_MONTHS_SHORT[month] : "";

      let dayOpts = `<option value="ALL">📅 ภาพรวมสัปดาห์ (แสดงคนลาทุกวัน)</option>`;
      weekDays.forEach(d => {
        const dt = new Date(yearAD, month - 1, d);
        const dayName = THAI_DAY_NAMES_SHORT[dt.getDay()] || "";
        dayOpts += `<option value="${d}">${dayName} ${d} ${mShort} (คำนวณหักคนลา)</option>`;
      });
      daySelect.innerHTML = dayOpts;

      if (curVal && (curVal === "ALL" || weekDays.includes(parseInt(curVal, 10)))) {
        daySelect.value = curVal;
      } else {
        daySelect.value = "ALL";
      }
    }

    function renderHourlyHeadcountTable() {
      const sched = isViewingOriginal ? originalSchedule : currentSchedule;
      if (!sched || !sched.weeks) return;

      const weekSelect = document.getElementById("hourlyWeekSelect");
      const daySelect = document.getElementById("hourlyDaySelect");
      const holSelect = document.getElementById("hourlyHolidaySelect");

      // 1. Update week dropdown options
      if (weekSelect && sched.weeks.length > 0) {
        const curVal = weekSelect.value;
        weekSelect.innerHTML = sched.weeks.map((w, idx) => `<option value="${idx}">${w.label}</option>`).join("");
        if (curVal !== "" && parseInt(curVal, 10) < sched.weeks.length) {
          weekSelect.value = curVal;
        } else {
          weekSelect.value = "0";
        }
        selectedHourlyWeekIndex = parseInt(weekSelect.value, 10) || 0;
      }

      // Update day select options if needed
      if (daySelect && (!daySelect.options || daySelect.options.length <= 1)) {
        updateHourlyDaySelectOptions();
      }

      // 2. Update holiday dropdown options
      if (holSelect && sched.holidays && sched.holidays.length > 0) {
        const curHVal = holSelect.value;
        holSelect.innerHTML = sched.holidays.map((h, idx) => `<option value="${idx}">${h.dayName}ที่ ${h.date} ${h.note ? `(${h.note})` : ''}</option>`).join("");
        if (curHVal !== "" && parseInt(curHVal, 10) < sched.holidays.length) {
          holSelect.value = curHVal;
        } else {
          holSelect.value = "0";
        }
        selectedHourlyHolidayIndex = parseInt(holSelect.value, 10) || 0;
      }

      const thead = document.getElementById("hourlyHead");
      const tbody = document.getElementById("hourlyBody");
      const tfoot = document.getElementById("hourlyFoot");
      const timelineDiv = document.getElementById("hourlyCapacityTimeline");

      if (currentHourlyMode === "WEEKDAY") {
        renderHourlyWeekdayView(sched, thead, tbody, tfoot, timelineDiv);
      } else {
        renderHourlyHolidayView(sched, thead, tbody, tfoot, timelineDiv);
      }
    }

    function renderHourlyWeekdayView(sched, thead, tbody, tfoot, timelineDiv) {
      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const leaves = getMonthLeaves(yearAD, month);

      const daySelect = document.getElementById("hourlyDaySelect");
      const selectedDayVal = daySelect ? daySelect.value : "ALL";
      const isSpecificDay = (selectedDayVal !== "ALL" && !isNaN(parseInt(selectedDayVal, 10)));
      const targetDay = isSpecificDay ? parseInt(selectedDayVal, 10) : null;

      const week = (sched && sched.weeks) ? (sched.weeks[selectedHourlyWeekIndex] || sched.weeks[0]) : null;
      const timeSlots = HORIZONTAL_SUMMARY_SPEC.time_slots;
      const agentSlots = HORIZONTAL_SUMMARY_SPEC.agent_slots;
      const summaryRows = HORIZONTAL_SUMMARY_SPEC.summary_rows;

      // 1. Table Header
      let headHtml = `
        <tr>
          <th class="sticky-col-no" style="width: 36px;">No.</th>
          <th class="sticky-col-role" style="text-align: left;">Agent Role (หน้าที่งาน)</th>
          <th class="sticky-col-shift">Shift (เวลางาน)</th>
          <th class="sticky-col-break">Break</th>
          <th class="sticky-col-agent" style="text-align: left; color: #fde047;">เจ้าหน้าที่ (Agent)</th>
          ${timeSlots.map(t => `<th style="min-width: 46px; font-size: 11px; padding: 6px 2px;">${t}</th>`).join("")}
        </tr>
      `;
      thead.innerHTML = headHtml;

      const effectiveAssignments = (isSpecificDay && typeof getEffectiveAssignmentsForDay === 'function')
        ? getEffectiveAssignmentsForDay(yearAD, month, targetDay, sched)
        : ((week && week.assignments) || []);

      // Pre-evaluate slot leave status
      const slotLeaveStatus = agentSlots.map(slot => {
        let agentName = "-";
        if (effectiveAssignments && effectiveAssignments[slot.colIdx]) {
          agentName = effectiveAssignments[slot.colIdx][slot.slotIdx] || "-";
        }
        if (!agentName || agentName.trim() === "") agentName = "-";

        const slotKey = `W_${selectedHourlyWeekIndex}_${slot.colIdx}_${slot.slotIdx}`;
        const leave = leaves[slotKey];
        const isSlotOnLeave = isSpecificDay ? isLeaveOnDay(leave, targetDay) : false;

        return { agentName, leave, isSlotOnLeave };
      });

      // 2. Table Body (20 Duty Slots from Active_Agents_Horizontal_Summary)
      let bodyHtml = "";
      agentSlots.forEach((slot, rowIdx) => {
        const { agentName, leave, isSlotOnLeave } = slotLeaveStatus[rowIdx];

        // Format agent cell HTML
        let agentBadgeHtml = "";
        if (isSpecificDay) {
          if (isSlotOnLeave) {
            agentBadgeHtml = `<span class="leave-chip leave-${getLeaveClass(leave.leaveType)}" style="font-size:9.5px; padding:1px 5px; margin-left:3px;" title="${leave.leaveType}${leave.note ? ': ' + leave.note : ''}">${getLeaveIcon(leave.leaveType)} ${leave.leaveType}</span>`;
          }
        } else {
          if (leave) {
            const mShort = (typeof THAI_MONTHS_SHORT !== "undefined" && THAI_MONTHS_SHORT[month]) ? THAI_MONTHS_SHORT[month] : "";
            const dText = getLeaveDatesBadgeText(leave, mShort);
            agentBadgeHtml = `<span class="leave-chip leave-${getLeaveClass(leave.leaveType)}" style="font-size:9.5px; padding:1px 5px; margin-left:3px;" title="${leave.leaveType} (${dText})">${getLeaveIcon(leave.leaveType)} ${dText}</span>`;
          }
        }

        bodyHtml += `<tr>`;
        bodyHtml += `<td class="sticky-col-no" style="font-weight: 700; color: var(--muted);">${slot.no}</td>`;
        bodyHtml += `<td class="sticky-col-role" style="font-weight: 600; text-align: left;">${safeEscape(slot.role)}</td>`;
        bodyHtml += `<td class="sticky-col-shift" style="color: var(--muted); font-size: 11px;">${slot.shift}</td>`;
        bodyHtml += `<td class="sticky-col-break" style="color: #c2410c; font-weight: 600; font-size: 11px;">${slot.break}</td>`;
        bodyHtml += `<td class="sticky-col-agent" style="font-weight: 700; color: #1e3a8a; text-align: left;">${safeEscape(agentName)} ${agentBadgeHtml}</td>`;

        for (let tIdx = 0; tIdx < timeSlots.length; tIdx++) {
          if (slot.no === 20 && tIdx === 28) {
            if (isSlotOnLeave) {
              bodyHtml += `<td colspan="4" class="duty-pill-leave" style="padding: 4px 2px; font-size: 10px; font-weight: 700; text-align:center;" title="ลางาน">${getLeaveIcon(leave.leaveType)} ลา (${leave.leaveType})</td>`;
            } else {
              bodyHtml += `<td colspan="4" class="duty-pill-voice" style="padding: 4px 2px; font-size: 10px; font-weight: 700; background: #e3f2fd; color: #1e40af; border: 1px solid #bfdbfe;" title="All (Call+Mail+ECE+Self Service +Realtime)">All (Mixed)</td>`;
            }
            tIdx += 3;
            continue;
          }

          const val = slot.intervals[tIdx];
          let cellHtml = "";

          if (isSlotOnLeave) {
            if (!val || val === "") {
              cellHtml = `<span class="duty-offshift">-</span>`;
            } else {
              cellHtml = `<span class="duty-pill duty-pill-leave" title="${safeEscape(leave.leaveType)}">${getLeaveIcon(leave.leaveType)} ลา</span>`;
            }
          } else {
            if (!val || val === "") {
              cellHtml = `<span class="duty-offshift">-</span>`;
            } else if (val === "Break") {
              cellHtml = `<span class="duty-pill duty-pill-break">Break</span>`;
            } else if (val.includes("Call")) {
              let label = val;
              if (val === "Call") label = "Call";
              else if (val === "Call+ECE") label = "Call+ECE";
              else if (val.startsWith("All (Call+")) label = "All (Mixed)";
              cellHtml = `<span class="duty-pill duty-pill-voice" title="${safeEscape(val)}">${safeEscape(label)}</span>`;
            } else {
              let label = val;
              if (val.startsWith("FU Ex/16App")) label = "FU Ex/16App";
              cellHtml = `<span class="duty-pill duty-pill-nonvoice" title="${safeEscape(val)}">${safeEscape(label)}</span>`;
            }
          }

          bodyHtml += `<td style="padding: 3px 2px;">${cellHtml}</td>`;
        }

        bodyHtml += `</tr>`;
      });
      tbody.innerHTML = bodyHtml;

      // 3. Dynamic Calculation for Staffing Summary Rows (Rows 32-41 from Excel)
      const dynamicCounts = summaryRows.map(r => [...r.counts]);
      const leaveCounts = new Array(32).fill(0);

      if (isSpecificDay) {
        agentSlots.forEach((slot, rowIdx) => {
          const { isSlotOnLeave } = slotLeaveStatus[rowIdx];
          if (isSlotOnLeave) {
            slot.intervals.forEach((val, tIdx) => {
              if (val && val !== "") {
                if (val === "Break") {
                  dynamicCounts[6][tIdx] = Math.max(0, dynamicCounts[6][tIdx] - 1);
                  leaveCounts[tIdx]++;
                } else {
                  dynamicCounts[0][tIdx] = Math.max(0, dynamicCounts[0][tIdx] - 1); // Total Active
                  leaveCounts[tIdx]++;
                  if (val.includes("Call")) {
                    dynamicCounts[1][tIdx] = Math.max(0, dynamicCounts[1][tIdx] - 1);
                  } else if (val.includes("ECE")) {
                    dynamicCounts[2][tIdx] = Math.max(0, dynamicCounts[2][tIdx] - 1);
                  } else if (val.includes("Self")) {
                    dynamicCounts[3][tIdx] = Math.max(0, dynamicCounts[3][tIdx] - 1);
                  } else if (val.includes("Mail") || val.includes("Monitor") || val.includes("Realtime")) {
                    dynamicCounts[4][tIdx] = Math.max(0, dynamicCounts[4][tIdx] - 1);
                  } else {
                    dynamicCounts[5][tIdx] = Math.max(0, dynamicCounts[5][tIdx] - 1);
                  }
                }
              }
            });
          }
        });
      }

      // 4. Table Footer
      const daySummaryTitle = isSpecificDay ? `ประจำวันที่ระบุ (คำนวณหักยอดคนลาจริง)` : `ภาพรวมสัปดาห์ (Base Staffing Template)`;
      let footHtml = `
        <tr class="summary-header-row">
          <th colspan="37" style="background: #102a43; color: #ffffff; text-align: left; padding: 8px 14px; font-size: 12px; font-weight: 800;">
            📊 สรุปความจุผู้ปฏิบัติงานและช่วงพัก (${daySummaryTitle})
          </th>
        </tr>
        <tr class="summary-subhead-row">
          <th colspan="5" class="summary-sticky-label" style="background: #243b53; color: #ffffff; font-weight: 700; padding: 6px 12px;">Staffing Category</th>
          ${timeSlots.map(t => `<th style="background: #243b53; color: #ffffff; font-size: 11px; padding: 6px 2px;">${t}</th>`).join("")}
        </tr>
      `;

      summaryRows.forEach((sRow, rIdx) => {
        const cat = sRow.category.trim();
        let trClass = "";
        let labelStyle = "";
        let cellStyle = "";

        if (cat.includes("Total Active")) {
          trClass = "summary-row-active";
          labelStyle = "background: #dceefb; color: #102a43; font-weight: 800; font-size: 12px;";
          cellStyle = "font-weight: 800; font-size: 12px; color: #102a43;";
        } else if (cat.includes("Call")) {
          trClass = "summary-row-voice";
          labelStyle = "background: #e3f2fd; color: #1e40af; font-weight: 700; padding-left: 24px !important;";
          cellStyle = "font-weight: 700; color: #1e40af;";
        } else if (cat.includes("On Break")) {
          trClass = "summary-row-break";
          labelStyle = "background: #fff3e0; color: #c2410c; font-weight: 700;";
          cellStyle = "font-weight: 700; color: #c2410c;";
        } else if (cat.includes("Off-Shift")) {
          trClass = "summary-row-offshift";
          labelStyle = "background: #f0f4f8; color: #64748b; font-weight: 500;";
          cellStyle = "color: #64748b;";
        } else {
          trClass = "summary-row-nonvoice";
          labelStyle = "background: #e8f5e9; color: #15803d; font-weight: 600; padding-left: 24px !important;";
          cellStyle = "color: #15803d; font-weight: 600;";
        }

        footHtml += `<tr class="${trClass}">`;
        footHtml += `<td colspan="5" class="summary-sticky-label" style="${labelStyle}">${safeEscape(sRow.category)}</td>`;
        dynamicCounts[rIdx].forEach(cnt => {
          footHtml += `<td style="${cellStyle}">${cnt > 0 ? cnt : '-'}</td>`;
        });
        footHtml += `</tr>`;

        // Insert "On Leave" row right after Non-Voice rows (before Break row) if someone is on leave
        if (rIdx === 5 && leaveCounts.some(c => c > 0)) {
          footHtml += `<tr class="summary-row-leave">`;
          footHtml += `<td colspan="5" class="summary-sticky-label" style="background:#fff7ed; color:#c2410c; font-weight:700; padding-left:24px !important;">  • 🏖️ พนักงานที่ลางาน (On Leave)</td>`;
          leaveCounts.forEach(cnt => {
            footHtml += `<td style="font-weight:700; color:#c2410c;">${cnt > 0 ? cnt : '-'}</td>`;
          });
          footHtml += `</tr>`;
        }
      });

      tfoot.innerHTML = footHtml;

      // 5. Render Visual Capacity Timeline (Active staff per 30 mins)
      if (dynamicCounts.length > 0) {
        renderTimelineBars(timeSlots, dynamicCounts[0], timelineDiv);
      }

      // 6. Update KPI Cards above the table
      const totalStaffEl = document.getElementById("hourlyKpiTotalStaff");
      const staffSubEl = document.getElementById("hourlyKpiStaffSub");
      const peakActiveEl = document.getElementById("hourlyKpiPeakActive");
      const maxVoiceEl = document.getElementById("hourlyKpiMaxVoice");
      const peakBreakEl = document.getElementById("hourlyKpiPeakBreak");

      if (totalStaffEl) {
        const maxLeave = Math.max(...leaveCounts);
        if (maxLeave > 0) {
          totalStaffEl.innerHTML = `<span style="color:#ea580c;">${20 - maxLeave} คน</span>`;
          if (staffSubEl) staffSubEl.innerHTML = `<span style="color:#c2410c; font-weight:600;">(ลางาน ${maxLeave} คน จาก 20 กะ)</span>`;
        } else {
          totalStaffEl.innerText = "20 คน";
          if (staffSubEl) staffSubEl.innerText = "กำลังพล First Tier ประจำวัน (20 กะงาน)";
        }
      }

      if (peakActiveEl) {
        const maxAct = Math.max(...dynamicCounts[0]);
        peakActiveEl.innerText = `${maxAct} คน`;
      }
      if (maxVoiceEl) {
        const maxV = Math.max(...dynamicCounts[1]);
        maxVoiceEl.innerText = `${maxV} คน`;
      }
      if (peakBreakEl) {
        const maxB = Math.max(...dynamicCounts[6]);
        peakBreakEl.innerText = `${maxB} คน`;
      }
    }

    function renderHourlyHolidayView(sched, thead, tbody, tfoot, timelineDiv) {
      const holidays = sched.holidays || [];
      const hol = holidays[selectedHourlyHolidayIndex] || holidays[0];
      const slots = HOURLY_TIME_SLOTS_HOLIDAY;

      let headHtml = `
        <tr>
          <th class="sticky-col-no" style="width: 36px;">No.</th>
          <th class="sticky-col-role" style="text-align: left;">กะงานวันหยุด (Holiday Shift)</th>
          <th class="sticky-col-shift">เวลาทำงาน</th>
          <th class="sticky-col-break">เวลาพัก</th>
          <th class="sticky-col-agent" style="text-align: left; color: #fde047;">เจ้าหน้าที่ (Agent)</th>
          ${slots.map(s => `<th style="min-width: 52px; padding: 6px 2px; font-size: 11px;">${s.label}</th>`).join("")}
        </tr>
      `;
      thead.innerHTML = headHtml;

      const holShiftsDef = [
        { no: 1, name: "เวร 1 (08.00-17.00 น.)", timeStr: "08.00-17.00", breakStr: "13.30-14.30", start: 8.0, end: 17.0, bStart: 13.5, bEnd: 14.5, sIdx: 0 },
        { no: 2, name: "เวร 2 (09.00-18.00 น.)", timeStr: "09.00-18.00", breakStr: "14.30-15.30", start: 9.0, end: 18.0, bStart: 14.5, bEnd: 15.5, sIdx: 1 },
        { no: 3, name: "เวร 3 (10.00-19.00 น.)", timeStr: "10.00-19.00", breakStr: "14.00-15.00", start: 10.0, end: 19.0, bStart: 14.0, bEnd: 15.0, sIdx: 2 },
        { no: 4, name: "เวร 4 (13.30-22.30 น.)", timeStr: "13.30-22.30", breakStr: "16.00-17.00", start: 13.5, end: 22.5, bStart: 16.0, bEnd: 17.0, sIdx: 3 }
      ];

      const colWorking = new Array(slots.length).fill(0);
      const colBreak = new Array(slots.length).fill(0);

      let bodyHtml = "";
      holShiftsDef.forEach(hDef => {
        let agentName = "-";
        if (hol && hol.shifts) agentName = hol.shifts[hDef.sIdx] || "-";
        if (!agentName || agentName.trim() === "") agentName = "-";

        bodyHtml += `<tr>`;
        bodyHtml += `<td class="sticky-col-no" style="font-weight: 700; color: var(--muted);">${hDef.no}</td>`;
        bodyHtml += `<td class="sticky-col-role" style="text-align: left; font-weight: 600; font-size: 11.5px; white-space: nowrap;">${hDef.name}</td>`;
        bodyHtml += `<td class="sticky-col-shift" style="color: var(--muted); font-size: 11px;">${hDef.timeStr}</td>`;
        bodyHtml += `<td class="sticky-col-break" style="color: #c2410c; font-weight: 600; font-size: 11px;">${hDef.breakStr}</td>`;
        bodyHtml += `<td class="sticky-col-agent" style="font-weight: 700; color: #1e3a8a; text-align: left;">${safeEscape(agentName)}</td>`;

        slots.forEach((s, sIdx) => {
          const mid = (s.start + s.end) / 2.0;
          const isWorkingTime = (hDef.start <= mid && mid < hDef.end);
          const isBreakTime = (hDef.bStart <= mid && mid < hDef.bEnd);

          if (isWorkingTime) {
            if (isBreakTime) {
              colBreak[sIdx]++;
              bodyHtml += `<td style="background: rgba(245,158,11,0.12); padding: 4px 2px;"><span class="duty-pill duty-pill-break">Break</span></td>`;
            } else {
              colWorking[sIdx]++;
              bodyHtml += `<td style="background: rgba(59,130,246,0.06); padding: 4px 2px;"><span class="duty-pill duty-pill-voice">Call</span></td>`;
            }
          } else {
            bodyHtml += `<td style="color: #cbd5e1; font-size: 11px;">-</td>`;
          }
        });
        bodyHtml += `</tr>`;
      });
      tbody.innerHTML = bodyHtml;

      let footHtml = `
        <tr style="background: rgba(59,130,246,0.08); font-weight: 700;">
          <td colspan="5" class="summary-sticky-label" style="text-align: left; padding-left: 12px; color: var(--text);">รวมปฏิบัติงาน (Total Working)</td>
          ${colWorking.map((w, i) => `<td style="font-size: 12px; color: var(--primary); font-weight: 700;">${w + colBreak[i]}</td>`).join("")}
        </tr>
        <tr style="background: rgba(245,158,11,0.08); font-weight: 700;">
          <td colspan="5" class="summary-sticky-label" style="text-align: left; padding-left: 12px; color: #d97706;">รวมคนที่พัก (Staff on Break)</td>
          ${colBreak.map(b => `<td style="font-size: 12px; color: #d97706;">${b > 0 ? b : '-'}</td>`).join("")}
        </tr>
        <tr style="background: #1e293b; color: #38bdf8; font-weight: 800; font-size: 12.5px;">
          <td colspan="5" class="summary-sticky-label" style="text-align: left; padding-left: 12px; color: #fde047; background: #0f172a;">⚡ รวมรับสายสุทธิ (Net On-Duty Staff)</td>
          ${colWorking.map(w => `<td style="color: #38bdf8; font-size: 13px;">${w}</td>`).join("")}
        </tr>
      `;
      tfoot.innerHTML = footHtml;

      renderTimelineBars(slots, colWorking, timelineDiv);
    }

    function renderTimelineBars(slots, netCounts, timelineDiv) {
      if (!timelineDiv) return;
      let html = "";
      slots.forEach((s, idx) => {
        const label = typeof s === 'string' ? s : (s.label || s);
        const cnt = netCounts[idx] || 0;
        let color = "#8b5cf6"; // 1 person
        let bg = "rgba(139,92,246,0.12)";
        if (cnt >= 14) {
          color = "#10b981"; // peak
          bg = "rgba(16,185,129,0.15)";
        } else if (cnt >= 7) {
          color = "#3b82f6"; // normal
          bg = "rgba(59,130,246,0.15)";
        } else if (cnt >= 2) {
          color = "#f59e0b"; // light
          bg = "rgba(245,158,11,0.15)";
        }

        const heightPct = Math.max(14, Math.min(100, (cnt / 20) * 100));

        html += `
          <div style="flex: 1; min-width: 32px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 90px; background: ${bg}; border-radius: 6px; padding: 4px 1px; position: relative;" title="${label}: ${cnt} คน">
            <span style="font-size: 11px; font-weight: 800; color: ${color}; margin-bottom: 3px;">${cnt}</span>
            <div style="width: 70%; height: ${heightPct}%; background: ${color}; border-radius: 4px 4px 0 0; transition: height 0.3s;"></div>
            <span style="font-size: 9px; color: var(--muted); margin-top: 4px; white-space: nowrap; transform: scale(0.9);">${label}</span>
          </div>
        `;
      });
      timelineDiv.innerHTML = html;
    }

    // TAB 4: MATRIX BALANCE CHECK
    function renderMatrixTable() {
      const thead = document.getElementById("matrixHead");
      const tbody = document.getElementById("matrixBody");

      const sched = isViewingOriginal ? originalSchedule : currentSchedule;

      let headHTML = `<tr><th style="width:40px;">#</th><th style="text-align:left; width:130px;">ชื่อพนักงาน</th>`;
      sched.weeks.forEach(w => { headHTML += `<th>${formatWeekLabel(w.label)}</th>`; });
      headHTML += `<th>รวมกะ Call<br><span style="font-size:10.5px; font-weight:normal; color:#fde047;">(ต้นฉบับ | ปัจจุบัน)</span></th><th>รวมเวรวันหยุด<br><span style="font-size:10.5px; font-weight:normal; color:#fde047;">(ต้นฉบับ | ปัจจุบัน)</span></th></tr>`;
      thead.innerHTML = headHTML;

      tbody.innerHTML = "";
      AGENTS.forEach((ag, idx) => {
        let currCallCount = 0, currHolCount = 0;
        let origCallCount = 0, origHolCount = 0;
        let rowCells = "";

        // Current schedule metrics
        currentSchedule.weeks.forEach(w => {
          WEEKDAY_COLUMNS.forEach((col, cIdx) => {
            if ((w.assignments[cIdx] || []).includes(ag)) {
              if (col.code === "8C" || col.code === "8.3C") currCallCount++;
            }
          });
        });
        currentSchedule.holidays.forEach(h => { if (h.shifts.includes(ag)) currHolCount++; });

        // Baseline schedule metrics (Used for next month calculation!)
        originalSchedule.weeks.forEach(w => {
          WEEKDAY_COLUMNS.forEach((col, cIdx) => {
            if ((w.assignments[cIdx] || []).includes(ag)) {
              if (col.code === "8C" || col.code === "8.3C") origCallCount++;
            }
          });
        });
        originalSchedule.holidays.forEach(h => { if (h.shifts.includes(ag)) origHolCount++; });

        sched.weeks.forEach(w => {
          let codes = [];
          WEEKDAY_COLUMNS.forEach((col, cIdx) => {
            if ((w.assignments[cIdx] || []).includes(ag)) {
              codes.push(col.code);
            }
          });
          rowCells += `<td>${codes.map(c => getCodeBadge(c)).join(" ") || "-"}</td>`;
        });

        const callDisplay = origCallCount === currCallCount 
          ? `<strong>${origCallCount}</strong>` 
          : `<strong>${origCallCount}</strong> <span style="font-size:11px; color:#d97706;">(${currCallCount})</span>`;
          
        const holDisplay = origHolCount === currHolCount 
          ? `<strong>${origHolCount}</strong>` 
          : `<strong>${origHolCount}</strong> <span style="font-size:11px; color:#d97706;">(${currHolCount})</span>`;

        tbody.innerHTML += `<tr><td>${idx+1}</td><td style="text-align:left;font-weight:700;">${ag}</td>${rowCells}<td>${callDisplay}</td><td>${holDisplay}</td></tr>`;
      });
    }

    // TAB 4: AGENTS MANAGER

