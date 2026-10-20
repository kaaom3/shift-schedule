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

    function generateLineBriefText(day) {
      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const yearTH = yearAD + 543;
      const dt = new Date(yearAD, month - 1, day);
      const dow = dt.getDay();
      const dayName = THAI_DAYS[dow];
      const sched = isViewingOriginal ? originalSchedule : currentSchedule;
      const leaves = getMonthLeaves(yearAD, month);

      const holiday = sched.holidays.find(h => h.date === day);

      let text = "";
      if (holiday) {
        text += `📢 รายงานเวรปฏิบัติงาน First Tier (วันหยุด)\n`;
        text += `📅 วัน${dayName}ที่ ${day} ${THAI_MONTHS[month]} ${yearTH}\n`;
        if (holiday.note) {
          text += `🏦 วันหยุดพิเศษ: ${holiday.note}\n`;
        } else {
          text += `🏢 ประจำวันหยุดสุดสัปดาห์ (${holiday.dayName})\n`;
        }
        text += `━━━━━━━━━━━━━━━━━━━━\n`;

        const holidayLeaves = [];
        holiday.shifts.forEach((ag, sIdx) => {
          const meta = HOLIDAY_SHIFT_META[sIdx];
          const thName = AGENT_NAME_MAP[ag] ? ` (${AGENT_NAME_MAP[ag]})` : "";
          const hIdx = sched.holidays.indexOf(holiday);
          const lKey = `H_${hIdx}_${sIdx}`;
          const leave = leaves[lKey];

          text += `⏰ เวร ${meta.time} น. (พัก ${meta.breakTime})\n`;
          if (leave) {
            text += `• ${ag}${thName} ⚠️ [${leave.leaveType}${leave.note ? ': ' + leave.note : ''}]\n\n`;
            holidayLeaves.push(`${ag}${thName} - ${leave.leaveType} ${leave.note ? `(${leave.note})` : ''}`);
          } else {
            text += `• ${ag}${thName} | ประจำเวร\n\n`;
          }
        });

        text += `━━━━━━━━━━━━━━━━━━━━\n`;
        text += `🏖️ สรุปพนักงานแจ้งลาวันนี้:\n`;
        if (holidayLeaves.length > 0) {
          holidayLeaves.forEach(l => { text += `• ${l}\n`; });
        } else {
          text += `(ไม่มีพนักงานแจ้งลา ปฏิบัติงานครบทุกท่าน)\n`;
        }
        text += `━━━━━━━━━━━━━━━━━━━━\n`;
        text += `✨ ขอให้ทุกคนปฏิบัติงานด้วยความราบรื่นและปลอดภัยครับ ✨`;
      } else {
        const cal = buildCalendarWeeksAndHolidays(yearAD, month);
        let matchedWIdx = 0;
        cal.weeks.forEach((w, wIdx) => {
          if (w.days && w.days.includes(day)) {
            matchedWIdx = wIdx;
          }
        });

        const week = sched.weeks[matchedWIdx] || sched.weeks[0];
        const customTimes = (week && week.customTimes) || {};

        text += `📢 รายงานเวรปฏิบัติงาน First Tier\n`;
        text += `📅 วัน${dayName}ที่ ${day} ${THAI_MONTHS[month]} ${yearTH}\n`;
        text += `🏢 ประจำสัปดาห์: ${week ? week.label : ''}\n`;
        if (week && week.customTimes && Object.keys(week.customTimes).length > 0) {
          text += `⚡ (สัปดาห์นี้มีกะเวลาพิเศษเฉพาะสัปดาห์)\n`;
        }
        text += `━━━━━━━━━━━━━━━━━━━━\n`;

        const timeGroups = {};
        WEEKDAY_COLUMNS.forEach((col, cIdx) => {
          const shiftTime = customTimes[cIdx]?.time || col.time;
          const breakTime = customTimes[cIdx]?.breakTime || col.breakTime;
          const key = `${shiftTime}__${breakTime}`;
          if (!timeGroups[key]) {
            timeGroups[key] = { time: shiftTime, breakTime: breakTime, columns: [] };
          }
          timeGroups[key].columns.push({ col, cIdx });
        });

        const weekdayLeaves = [];

        Object.values(timeGroups).forEach(group => {
          text += `⏰ เวลา ${group.time} น. (พัก ${group.breakTime})\n`;
          group.columns.forEach(({ col, cIdx }) => {
            const agents = (week && week.assignments && week.assignments[cIdx]) || [];
            agents.forEach((ag, sIdx) => {
              const thName = AGENT_NAME_MAP[ag] ? ` (${AGENT_NAME_MAP[ag]})` : "";
              const lKey = `W_${matchedWIdx}_${cIdx}_${sIdx}`;
              const leave = leaves[lKey];
              const slotBreak = (cIdx === 9) ? (sIdx < 2 ? " [พัก 13.00 น.]" : " [พัก 13.30 น.]") : "";

              if (leave) {
                text += `• ช่อง ${col.code}: ${ag}${thName}${slotBreak} | ${col.role} ⚠️ [${leave.leaveType}${leave.note ? ': ' + leave.note : ''}]\n`;
                weekdayLeaves.push(`ช่อง ${col.code}: ${ag}${thName}${slotBreak} - ${leave.leaveType} ${leave.note ? `(${leave.note})` : ''}`);
              } else {
                text += `• ช่อง ${col.code}: ${ag}${thName}${slotBreak} | ${col.role}\n`;
              }
            });
          });
          text += `\n`;
        });

        text += `━━━━━━━━━━━━━━━━━━━━\n`;
        text += `🏖️ สรุปพนักงานแจ้งลาวันนี้:\n`;
        if (weekdayLeaves.length > 0) {
          weekdayLeaves.forEach(l => { text += `• ${l}\n`; });
        } else {
          text += `(ไม่มีพนักงานแจ้งลา ปฏิบัติงานครบทุกท่าน)\n`;
        }
        text += `━━━━━━━━━━━━━━━━━━━━\n`;
        text += `✨ ขอให้ทุกคนปฏิบัติงานด้วยความราบรื่นและปลอดภัยครับ ✨`;
      }

      return text;
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

          // Check leave
          const lKey = `W_${wIdx}_${matchedCIdx}_${matchedSIdx}`;
          const leave = leaves[lKey];
          let leaveChipHtml = "";
          if (leave) {
            leaveChipHtml = `<div class="leave-chip leave-${getLeaveClass(leave.leaveType)}" style="margin-top:5px; font-size:10px; padding:2px 6px;">${getLeaveIcon(leave.leaveType)} ${leave.leaveType}${leave.note ? ': ' + leave.note : ''}</div>`;
          }

          const jdPreview = (matchedCol.jd && matchedCol.jd.length > 0)
            ? `<div style="font-size:10.5px; color:#64748b; margin-top:5px; border-top:1px dashed #e2e8f0; padding-top:4px; line-height:1.4;">
                ${matchedCol.jd.map(j => `<div>• ${j}</div>`).join("")}
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
                💼 ช่องที่ ${matchedCIdx + 1} (${matchedCol.code}) • ${matchedCol.role}
              </div>
              ${leaveChipHtml}
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

        return `
          <div class="agent-card">
            <!-- Card Header: Clean Name, NO number prefix, NO 'คุณ' -->
            <div class="agent-card-header">
              <div class="agent-card-profile">
                <div class="agent-avatar-badge">${avatarInitial}</div>
                <div>
                  <h4 class="agent-card-name">${ag}</h4>
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
            <div class="agent-card-footer">
              <span style="color:var(--muted); font-size:11px;">เข้างานตรงเวลาตามกะที่กำหนด</span>
              <button class="btn btn-outline btn-sm" onclick="highlightAndJumpToMaster('${ag}')" style="padding:2px 8px; font-size:11px;" title="ไฮไลท์ชื่อ ${ag} ในหน้าตารางรวม">
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
    // TAB 3: ตารางเช็คจำนวนคนแต่ละช่วงเวลา (Hourly Headcount & Staffing Check)
    // =========================================================================
    let currentHourlyMode = "WEEKDAY"; // "WEEKDAY" or "HOLIDAY"
    let selectedHourlyWeekIndex = 0;
    let selectedHourlyHolidayIndex = 0;

    function setHourlyMode(mode) {
      currentHourlyMode = mode;
      const wkBtn = document.getElementById("hourlyModeWeekdayBtn");
      const holBtn = document.getElementById("hourlyModeHolidayBtn");
      const wkContainer = document.getElementById("hourlyWeekSelectContainer");
      const holContainer = document.getElementById("hourlyHolidaySelectContainer");

      if (mode === "WEEKDAY") {
        if (wkBtn) { wkBtn.className = "btn btn-sm btn-primary"; wkBtn.style.background = ""; wkBtn.style.color = ""; }
        if (holBtn) { holBtn.className = "btn btn-sm"; holBtn.style.background = "transparent"; holBtn.style.color = "var(--muted)"; }
        if (wkContainer) wkContainer.style.display = "flex";
        if (holContainer) holContainer.style.display = "none";
      } else {
        if (wkBtn) { wkBtn.className = "btn btn-sm"; wkBtn.style.background = "transparent"; wkBtn.style.color = "var(--muted)"; }
        if (holBtn) { holBtn.className = "btn btn-sm btn-primary"; holBtn.style.background = ""; holBtn.style.color = ""; }
        if (wkContainer) wkContainer.style.display = "none";
        if (holContainer) holContainer.style.display = "flex";
      }
      renderHourlyHeadcountTable();
    }

    const HOURLY_TIME_SLOTS_WEEKDAY = [
      { label: "07.00", start: 7.0, end: 8.0, text: "07:00 - 08:00" },
      { label: "08.00", start: 8.0, end: 8.5, text: "08:00 - 08:30" },
      { label: "08.30", start: 8.5, end: 9.0, text: "08:30 - 09:00" },
      { label: "09.00", start: 9.0, end: 9.5, text: "09:00 - 09:30" },
      { label: "09.30", start: 9.5, end: 10.0, text: "09:30 - 10:00" },
      { label: "10.00", start: 10.0, end: 10.5, text: "10:00 - 10:30" },
      { label: "10.30", start: 10.5, end: 11.0, text: "10:30 - 11:00" },
      { label: "11.00", start: 11.0, end: 11.5, text: "11:00 - 11:30" },
      { label: "11.30", start: 11.5, end: 12.0, text: "11:30 - 12:00" },
      { label: "12.00", start: 12.0, end: 12.5, text: "12:00 - 12:30" },
      { label: "12.30", start: 12.5, end: 13.0, text: "12:30 - 13:00" },
      { label: "13.00", start: 13.0, end: 13.5, text: "13:00 - 13:30" },
      { label: "13.30", start: 13.5, end: 14.0, text: "13:30 - 14:00" },
      { label: "14.00", start: 14.0, end: 14.5, text: "14:00 - 14:30" },
      { label: "14.30", start: 14.5, end: 15.0, text: "14:30 - 15:00" },
      { label: "15.00-16.00", start: 15.0, end: 16.0, text: "15:00 - 16:00" },
      { label: "16.00", start: 16.0, end: 16.5, text: "16:00 - 16:30" },
      { label: "16.30", start: 16.5, end: 17.0, text: "16:30 - 17:00" },
      { label: "17.00", start: 17.0, end: 17.5, text: "17:00 - 17:30" },
      { label: "17.30", start: 17.5, end: 18.0, text: "17:30 - 18:00" },
      { label: "18.00", start: 18.0, end: 19.0, text: "18:00 - 19:00" },
      { label: "19.00", start: 19.0, end: 20.0, text: "19:00 - 20:00" },
      { label: "20.00", start: 20.0, end: 21.0, text: "20:00 - 21:00" },
      { label: "21.00-22.30", start: 21.0, end: 22.5, text: "21:00 - 22:30" }
    ];

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

    // 20 Individual Duty Slots for Weekday Check
    const WEEKDAY_DUTY_SLOTS = [
      { name: "รับสาย 1 (07.00 Call)", colIdx: 0, slotIdx: 0, timeStr: "07.00-16.00", breakStr: "พัก 11.00-12.00", start: 7.0, end: 16.0, bStart: 11.0, bEnd: 12.0 },
      { name: "รับสาย 2 (07.00 Mail)", colIdx: 1, slotIdx: 0, timeStr: "07.00-16.00", breakStr: "พัก 12.00-13.00", start: 7.0, end: 16.0, bStart: 12.0, bEnd: 13.0 },
      { name: "รับสาย 3 (08.00 Call 1)", colIdx: 2, slotIdx: 0, timeStr: "08.00-17.00", breakStr: "พัก 11.30-12.30", start: 8.0, end: 17.0, bStart: 11.5, bEnd: 12.5 },
      { name: "รับสาย 4 (08.00 Call 2)", colIdx: 2, slotIdx: 1, timeStr: "08.00-17.00", breakStr: "พัก 12.00-13.00", start: 8.0, end: 17.0, bStart: 12.0, bEnd: 13.0 },
      { name: "รับสาย 5 (08.00 Self)", colIdx: 3, slotIdx: 0, timeStr: "08.00-17.00", breakStr: "พัก 13.00-14.00", start: 8.0, end: 17.0, bStart: 13.0, bEnd: 14.0 },
      { name: "รับสาย 6 (08.00 ECE)", colIdx: 4, slotIdx: 0, timeStr: "08.00-17.00", breakStr: "พัก 12.00-13.00", start: 8.0, end: 17.0, bStart: 12.0, bEnd: 13.0 },
      { name: "รับสาย 7 (08.00 Mail)", colIdx: 5, slotIdx: 0, timeStr: "08.00-17.00", breakStr: "พัก 13.00-14.00", start: 8.0, end: 17.0, bStart: 13.0, bEnd: 14.0 },
      { name: "รับสาย 8 (08.30 Aging คู่)", colIdx: 6, slotIdx: 0, timeStr: "08.30-17.30", breakStr: "พัก 12.30-13.30", start: 8.5, end: 17.5, bStart: 12.5, bEnd: 13.5 },
      { name: "รับสาย 9 (08.30 ECE)", colIdx: 7, slotIdx: 0, timeStr: "08.30-17.30", breakStr: "พัก 13.00-14.00", start: 8.5, end: 17.5, bStart: 13.0, bEnd: 14.0 },
      { name: "รับสาย 10 (08.30 Aging คี่)", colIdx: 8, slotIdx: 0, timeStr: "08.30-17.30", breakStr: "พัก 13.30-14.30", start: 8.5, end: 17.5, bStart: 13.5, bEnd: 14.5 },
      { name: "รับสาย 11 (08.30 Call 1)", colIdx: 9, slotIdx: 0, timeStr: "08.30-17.30", breakStr: "พัก 13.00-14.00", start: 8.5, end: 17.5, bStart: 13.0, bEnd: 14.0 },
      { name: "รับสาย 12 (08.30 Call 2)", colIdx: 9, slotIdx: 1, timeStr: "08.30-17.30", breakStr: "พัก 13.00-14.00", start: 8.5, end: 17.5, bStart: 13.0, bEnd: 14.0 },
      { name: "รับสาย 13 (08.30 Call 3)", colIdx: 9, slotIdx: 2, timeStr: "08.30-17.30", breakStr: "พัก 13.30-14.30", start: 8.5, end: 17.5, bStart: 13.5, bEnd: 14.5 },
      { name: "รับสาย 14 (08.30 Call 4)", colIdx: 9, slotIdx: 3, timeStr: "08.30-17.30", breakStr: "พัก 13.30-14.30", start: 8.5, end: 17.5, bStart: 13.5, bEnd: 14.5 },
      { name: "รับสาย 15 (09.00 Self)", colIdx: 10, slotIdx: 0, timeStr: "09.00-18.00", breakStr: "พัก 14.00-15.00", start: 9.0, end: 18.0, bStart: 14.0, bEnd: 15.0 },
      { name: "รับสาย 16 (09.00 C+Ef)", colIdx: 11, slotIdx: 0, timeStr: "09.00-18.00", breakStr: "พัก 14.00-15.00", start: 9.0, end: 18.0, bStart: 14.0, bEnd: 15.0 },
      { name: "รับสาย 17 (10.00)", colIdx: 12, slotIdx: 0, timeStr: "10.00-19.00", breakStr: "พัก 13.30-14.30", start: 10.0, end: 19.0, bStart: 13.5, bEnd: 14.5 },
      { name: "รับสาย 18 (11.00)", colIdx: 13, slotIdx: 0, timeStr: "11.00-20.00", breakStr: "พัก 14.00-15.00", start: 11.0, end: 20.0, bStart: 14.0, bEnd: 15.0 },
      { name: "รับสาย 19 (12.00)", colIdx: 14, slotIdx: 0, timeStr: "12.00-21.00", breakStr: "พัก 15.00-16.00", start: 12.0, end: 21.0, bStart: 15.0, bEnd: 16.0 },
      { name: "รับสาย 20 (13.30)", colIdx: 15, slotIdx: 0, timeStr: "13.30-22.30", breakStr: "พัก 16.00-17.00", start: 13.5, end: 22.5, bStart: 16.0, bEnd: 17.0 }
    ];

    function renderHourlyHeadcountTable() {
      const sched = isViewingOriginal ? originalSchedule : currentSchedule;
      if (!sched || !sched.weeks) return;

      const weekSelect = document.getElementById("hourlyWeekSelect");
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
      const week = sched.weeks[selectedHourlyWeekIndex] || sched.weeks[0];
      const slots = HOURLY_TIME_SLOTS_WEEKDAY;

      // Table Header
      let headHtml = `
        <tr>
          <th style="min-width: 140px; text-align: left;">กะงาน (Shift)</th>
          <th style="min-width: 90px;">เวลาทำงาน</th>
          <th style="min-width: 105px;">เวลาพัก</th>
          <th style="min-width: 110px; color: #fde047;">เจ้าหน้าที่ (Agent)</th>
          ${slots.map(s => `<th style="min-width: 48px; padding: 4px 2px; font-size: 11px;">${s.label}</th>`).join("")}
        </tr>
      `;
      thead.innerHTML = headHtml;

      // Track sums per slot
      const colWorking = new Array(slots.length).fill(0);
      const colBreak = new Array(slots.length).fill(0);

      // Table Body
      let bodyHtml = "";
      WEEKDAY_DUTY_SLOTS.forEach(duty => {
        let agentName = "-";
        if (week && week.assignments && week.assignments[duty.colIdx]) {
          agentName = week.assignments[duty.colIdx][duty.slotIdx] || "-";
        }

        bodyHtml += `<tr>`;
        bodyHtml += `<td style="text-align: left; font-weight: 600; font-size: 11.5px; white-space: nowrap;">${duty.name}</td>`;
        bodyHtml += `<td style="color: var(--muted); font-size: 11px;">${duty.timeStr}</td>`;
        bodyHtml += `<td style="color: #d97706; font-size: 11px;">${duty.breakStr}</td>`;
        bodyHtml += `<td style="font-weight: 700; color: var(--primary); font-size: 12px;">${agentName}</td>`;

        slots.forEach((s, sIdx) => {
          const mid = (s.start + s.end) / 2.0;
          const isWorkingTime = (duty.start <= mid && mid < duty.end);
          const isBreakTime = (duty.bStart <= mid && mid < duty.bEnd);

          if (isWorkingTime) {
            if (isBreakTime) {
              colBreak[sIdx]++;
              bodyHtml += `<td style="background: rgba(245,158,11,0.12); padding: 4px 2px;"><span style="display:inline-block; padding: 2px 4px; background:#fef3c7; color:#b45309; border-radius:4px; font-size:10px; font-weight:700;">พัก</span></td>`;
            } else {
              colWorking[sIdx]++;
              bodyHtml += `<td style="background: rgba(16,185,129,0.06); padding: 4px 2px;"><span style="display:inline-block; padding: 2px 6px; background:#dcfce7; color:#15803d; border-radius:4px; font-weight:700; font-size:11px;">1</span></td>`;
            }
          } else {
            bodyHtml += `<td style="color: rgba(148,163,184,0.3); font-size: 11px;">-</td>`;
          }
        });

        bodyHtml += `</tr>`;
      });
      tbody.innerHTML = bodyHtml;

      // Table Footer with Totals
      let footHtml = `
        <tr style="background: rgba(59,130,246,0.08); font-weight: 700;">
          <td colspan="4" style="text-align: right; padding-right: 12px; color: var(--text);">รวมปฏิบัติงาน (Total Working)</td>
          ${colWorking.map((w, i) => `<td style="font-size: 12px; color: var(--primary); font-weight: 700;">${w + colBreak[i]}</td>`).join("")}
        </tr>
        <tr style="background: rgba(245,158,11,0.08); font-weight: 700;">
          <td colspan="4" style="text-align: right; padding-right: 12px; color: #d97706;">รวมคนที่พัก (Staff on Break)</td>
          ${colBreak.map(b => `<td style="font-size: 12px; color: #d97706;">${b > 0 ? b : '-'}</td>`).join("")}
        </tr>
        <tr style="background: #1e293b; color: #38bdf8; font-weight: 800; font-size: 12.5px;">
          <td colspan="4" style="text-align: right; padding-right: 12px; color: #fde047;">⚡ รวมรับสายสุทธิ (Net On-Duty Staff)</td>
          ${colWorking.map(w => `<td style="color: #38bdf8; font-size: 13px;">${w}</td>`).join("")}
        </tr>
      `;
      tfoot.innerHTML = footHtml;

      // Render Visual Timeline
      renderTimelineBars(slots, colWorking, timelineDiv);
    }

    function renderHourlyHolidayView(sched, thead, tbody, tfoot, timelineDiv) {
      const holidays = sched.holidays || [];
      const hol = holidays[selectedHourlyHolidayIndex] || holidays[0];
      const slots = HOURLY_TIME_SLOTS_HOLIDAY;

      let headHtml = `
        <tr>
          <th style="min-width: 140px; text-align: left;">กะงานวันหยุด (Holiday Shift)</th>
          <th style="min-width: 90px;">เวลาทำงาน</th>
          <th style="min-width: 105px;">เวลาพัก</th>
          <th style="min-width: 110px; color: #fde047;">เจ้าหน้าที่ (Agent)</th>
          ${slots.map(s => `<th style="min-width: 52px; padding: 4px 2px; font-size: 11px;">${s.label}</th>`).join("")}
        </tr>
      `;
      thead.innerHTML = headHtml;

      const holShiftsDef = [
        { name: "เวร 1 (08.00-17.00 น.)", timeStr: "08.00-17.00", breakStr: "พัก 13.30-14.30", start: 8.0, end: 17.0, bStart: 13.5, bEnd: 14.5, sIdx: 0 },
        { name: "เวร 2 (09.00-18.00 น.)", timeStr: "09.00-18.00", breakStr: "พัก 14.30-15.30", start: 9.0, end: 18.0, bStart: 14.5, bEnd: 15.5, sIdx: 1 },
        { name: "เวร 3 (10.00-19.00 น.)", timeStr: "10.00-19.00", breakStr: "พัก 14.00-15.00", start: 10.0, end: 19.0, bStart: 14.0, bEnd: 15.0, sIdx: 2 },
        { name: "เวร 4 (13.30-22.30 น.)", timeStr: "13.30-22.30", breakStr: "พัก 16.00-17.00", start: 13.5, end: 22.5, bStart: 16.0, bEnd: 17.0, sIdx: 3 }
      ];

      const colWorking = new Array(slots.length).fill(0);
      const colBreak = new Array(slots.length).fill(0);

      let bodyHtml = "";
      holShiftsDef.forEach(hDef => {
        let agentName = "-";
        if (hol && hol.shifts) agentName = hol.shifts[hDef.sIdx] || "-";

        bodyHtml += `<tr>`;
        bodyHtml += `<td style="text-align: left; font-weight: 600; font-size: 11.5px; white-space: nowrap;">${hDef.name}</td>`;
        bodyHtml += `<td style="color: var(--muted); font-size: 11px;">${hDef.timeStr}</td>`;
        bodyHtml += `<td style="color: #d97706; font-size: 11px;">${hDef.breakStr}</td>`;
        bodyHtml += `<td style="font-weight: 700; color: var(--primary); font-size: 12px;">${agentName}</td>`;

        slots.forEach((s, sIdx) => {
          const mid = (s.start + s.end) / 2.0;
          const isWorkingTime = (hDef.start <= mid && mid < hDef.end);
          const isBreakTime = (hDef.bStart <= mid && mid < hDef.bEnd);

          if (isWorkingTime) {
            if (isBreakTime) {
              colBreak[sIdx]++;
              bodyHtml += `<td style="background: rgba(245,158,11,0.12); padding: 4px 2px;"><span style="display:inline-block; padding: 2px 4px; background:#fef3c7; color:#b45309; border-radius:4px; font-size:10px; font-weight:700;">พัก</span></td>`;
            } else {
              colWorking[sIdx]++;
              bodyHtml += `<td style="background: rgba(16,185,129,0.06); padding: 4px 2px;"><span style="display:inline-block; padding: 2px 6px; background:#dcfce7; color:#15803d; border-radius:4px; font-weight:700; font-size:11px;">1</span></td>`;
            }
          } else {
            bodyHtml += `<td style="color: rgba(148,163,184,0.3); font-size: 11px;">-</td>`;
          }
        });
        bodyHtml += `</tr>`;
      });
      tbody.innerHTML = bodyHtml;

      let footHtml = `
        <tr style="background: rgba(59,130,246,0.08); font-weight: 700;">
          <td colspan="4" style="text-align: right; padding-right: 12px; color: var(--text);">รวมปฏิบัติงาน (Total Working)</td>
          ${colWorking.map((w, i) => `<td style="font-size: 12px; color: var(--primary); font-weight: 700;">${w + colBreak[i]}</td>`).join("")}
        </tr>
        <tr style="background: rgba(245,158,11,0.08); font-weight: 700;">
          <td colspan="4" style="text-align: right; padding-right: 12px; color: #d97706;">รวมคนที่พัก (Staff on Break)</td>
          ${colBreak.map(b => `<td style="font-size: 12px; color: #d97706;">${b > 0 ? b : '-'}</td>`).join("")}
        </tr>
        <tr style="background: #1e293b; color: #38bdf8; font-weight: 800; font-size: 12.5px;">
          <td colspan="4" style="text-align: right; padding-right: 12px; color: #fde047;">⚡ รวมรับสายสุทธิ (Net On-Duty Staff)</td>
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
        const cnt = netCounts[idx];
        let color = "#8b5cf6"; // 1 person
        let bg = "rgba(139,92,246,0.15)";
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

        const heightPct = Math.max(16, Math.min(100, (cnt / 20) * 100));

        html += `
          <div style="flex: 1; min-width: 36px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 90px; background: ${bg}; border-radius: 6px; padding: 4px 2px; position: relative;">
            <span style="font-size: 11px; font-weight: 800; color: ${color}; margin-bottom: 4px;">${cnt}</span>
            <div style="width: 70%; height: ${heightPct}%; background: ${color}; border-radius: 4px 4px 0 0; transition: height 0.3s;"></div>
            <span style="font-size: 9.5px; color: var(--muted); margin-top: 4px; white-space: nowrap; transform: scale(0.9);">${s.label}</span>
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

