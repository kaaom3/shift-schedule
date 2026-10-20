// =========================================================
// MASTER TABLES & JD TOOLTIP POPOVERS
// =========================================================

    function renderAllViews() {
      renderMasterWeekdayTable();
      renderMasterHolidayTable();
      renderIndividualCards((document.getElementById("cardFilterSelect") && document.getElementById("cardFilterSelect").value) || "ALL");
      renderSwapHistoryTable();
      renderHourlyHeadcountTable();
      renderMatrixTable();
      updateBadgesAndTitles();
      updateSwapPermissionUI();
    }



    // =========================================================================
    // INTERACTIVE JD HOVER POPOVER TOOLTIP
    // =========================================================================
    let jdTooltipEl = null;

    function getJdTooltipEl() {
      if (!jdTooltipEl) jdTooltipEl = document.getElementById("jdHoverTooltip");
      return jdTooltipEl;
    }

    function showJdTooltip(event, wIdx, cIdx) {
      const el = getJdTooltipEl();
      if (!el) return;

      const col = WEEKDAY_COLUMNS[cIdx];
      if (!col) return;

      const sched = isViewingOriginal ? originalSchedule : currentSchedule;
      const week = sched.weeks && sched.weeks[wIdx];
      const assigned = (week && week.assignments && week.assignments[cIdx]) || [];
      
      const custom = week && week.customTimes && week.customTimes[cIdx];
      const shiftTime = custom ? custom.time : col.time;
      const breakTime = custom ? custom.breakTime : col.breakTime;
      const isCustomTime = !!custom;

      const agentNames = assigned.map(a => {
        const th = AGENT_NAME_MAP[a] ? ` (${AGENT_NAME_MAP[a]})` : "";
        return `${a}${th}`;
      }).join(", ") || "ไม่มีผู้ปฏิบัติงาน";

      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const leaves = getMonthLeaves(yearAD, month);
      const leaveInfos = [];
      assigned.forEach((a, sIdx) => {
        const lKey = `W_${wIdx}_${cIdx}_${sIdx}`;
        if (leaves[lKey]) {
          leaveInfos.push(`🏖️ คุณ${a}: ${leaves[lKey].leaveType} ${leaves[lKey].note ? `(${leaves[lKey].note})` : ''}`);
        }
      });

      const jdItemsHtml = (col.jd && col.jd.length > 0)
        ? col.jd.map(item => `<li>${item}</li>`).join("")
        : `<li>ปฏิบัติหน้าที่ตามที่ได้รับมอบหมาย</li>`;

      let breakDisplayHtml = `<span>☕ เวลาพัก: ${breakTime}</span>`;
      let agentDisplayHtml = `<strong>👤 ผู้ปฏิบัติงาน:</strong> ${agentNames}`;
      if (cIdx === 9 && assigned.length >= 3) {
        breakDisplayHtml = `<span>☕ เวลาพัก: <strong style="color:#fde047;">พัก 13.00 น.</strong> (คนที่ 1-2) / <strong style="color:#fed7aa;">พัก 13.30 น.</strong> (คนที่ 3-4)</span>`;
        const p1Names = assigned.slice(0, 2).map(a => `${a}${AGENT_NAME_MAP[a] ? ` (${AGENT_NAME_MAP[a]})` : ''}`).join(", ");
        const p2Names = assigned.slice(2).map(a => `${a}${AGENT_NAME_MAP[a] ? ` (${AGENT_NAME_MAP[a]})` : ''}`).join(", ");
        agentDisplayHtml = `
          <strong>👤 ผู้ปฏิบัติงาน (แยกกลุ่มเวลาพัก):</strong>
          <div style="margin-top:2px; font-size:11.5px;">• ☕ <strong>พัก 13.00 น.:</strong> ${p1Names || '-'}</div>
          <div style="margin-top:2px; font-size:11.5px;">• ☕ <strong>พัก 13.30 น.:</strong> ${p2Names || '-'}</div>
        `;
      }

      el.innerHTML = `
        <div class="jd-tip-header">
          <span class="jd-tip-title">ช่องที่ ${cIdx + 1} (${col.code}) • ${col.role}</span>
          <span class="jd-tip-time">${shiftTime}</span>
        </div>
        <div class="jd-tip-role">
          ${breakDisplayHtml}
          ${isCustomTime ? `<span style="color:#fdba74; font-size:10px; margin-left:6px; font-weight:700;">(⚡ เวลาเฉพาะสัปดาห์นี้)</span>` : ''}
        </div>
        <div class="jd-tip-agent">
          ${agentDisplayHtml}
        </div>
        ${leaveInfos.length > 0 ? `<div class="jd-tip-leave">${leaveInfos.join("<br>")}</div>` : ''}
        <div style="font-size:11px; font-weight:700; color:#94a3b8; margin-bottom:4px; text-transform:uppercase;">ภาระหน้าที่ (Job Description):</div>
        <ul class="jd-tip-list">
          ${jdItemsHtml}
        </ul>
      `;

      moveJdTooltip(event);
      el.classList.add("visible");
    }

    function showHolidayJdTooltip(event, hIdx, sIdx) {
      const el = getJdTooltipEl();
      if (!el) return;

      const meta = HOLIDAY_SHIFT_META[sIdx];
      if (!meta) return;

      const sched = isViewingOriginal ? originalSchedule : currentSchedule;
      const hol = sched.holidays && sched.holidays[hIdx];
      const assigned = (hol && hol.shifts && hol.shifts[sIdx]) || "-";
      const th = AGENT_NAME_MAP[assigned] ? ` (${AGENT_NAME_MAP[assigned]})` : "";

      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const leaves = getMonthLeaves(yearAD, month);
      const lKey = `H_${hIdx}_${sIdx}`;
      const leaveInfo = leaves[lKey] ? `🏖️ คุณ${assigned}: ${leaves[lKey].leaveType} ${leaves[lKey].note ? `(${leaves[lKey].note})` : ''}` : "";

      const jdItemsHtml = (meta.jd && meta.jd.length > 0)
        ? meta.jd.map(item => `<li>${item}</li>`).join("")
        : `<li>ปฏิบัติหน้าที่ประจำเวรวันหยุด</li>`;

      el.innerHTML = `
        <div class="jd-tip-header">
          <span class="jd-tip-title">เวร ${meta.time}</span>
          <span class="jd-tip-time">${hol ? hol.dayName + ' ที่ ' + hol.date : ''}</span>
        </div>
        <div class="jd-tip-role">
          <span>☕ เวลาพัก: ${meta.breakTime}</span>
        </div>
        <div class="jd-tip-agent">
          <strong>👤 ผู้ปฏิบัติงาน:</strong> ${assigned}${th}
        </div>
        ${leaveInfo ? `<div class="jd-tip-leave">${leaveInfo}</div>` : ''}
        <div style="font-size:11px; font-weight:700; color:#94a3b8; margin-bottom:4px; text-transform:uppercase;">ภาระหน้าที่ (Job Description):</div>
        <ul class="jd-tip-list">
          ${jdItemsHtml}
        </ul>
      `;

      moveJdTooltip(event);
      el.classList.add("visible");
    }

    function moveJdTooltip(event) {
      const el = getJdTooltipEl();
      if (!el || !el.classList.contains("visible")) return;

      const x = event.clientX;
      const y = event.clientY;
      const tipWidth = el.offsetWidth || 300;
      const tipHeight = el.offsetHeight || 220;
      const pad = 15;

      let left = x + pad;
      let top = y + pad;

      if (left + tipWidth > window.innerWidth - 10) {
        left = x - tipWidth - pad;
      }
      if (top + tipHeight > window.innerHeight - 10) {
        top = y - tipHeight - pad;
      }
      if (left < 10) left = 10;
      if (top < 10) top = 10;

      el.style.left = left + "px";
      el.style.top = top + "px";
    }

    function hideJdTooltip() {
      const el = getJdTooltipEl();
      if (el) el.classList.remove("visible");
    }



    // =========================================================================
    // TAB 1: RENDER MASTER WEEKDAY TABLE
    // =========================================================================
    function renderMasterWeekdayTable() {
      const table = document.getElementById("masterWeekdayTable");
      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      let html = `
        <thead>
          <tr>
            <th rowspan="4" style="width: 110px;">สัปดาห์</th>
            ${WEEKDAY_COLUMNS.map((c, idx) => `<th>ช่องที่ ${idx + 1}</th>`).join("")}
          </tr>
          <tr>
            ${WEEKDAY_COLUMNS.map(c => `<th>${c.time}</th>`).join("")}
          </tr>
          <tr>
            ${WEEKDAY_COLUMNS.map((c, idx) => {
              if (idx === 9) {
                return `<th style="line-height:1.25; font-size:10.5px; padding: 4px 2px;"><span style="color:#b45309;">พัก 13.00 (2 คน)</span><br><span style="color:#d97706;">พัก 13.30 (2 คน)</span></th>`;
              }
              return `<th>${c.breakTime}</th>`;
            }).join("")}
          </tr>
          <tr>
            ${WEEKDAY_COLUMNS.map(c => `<th>${c.role}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
      `;

      const sched = isViewingOriginal ? originalSchedule : currentSchedule;
      const isLockedForUser = !allowUserSwap && !isAdminMode;
      const leaves = getMonthLeaves(yearAD, month);

      sched.weeks.forEach((w, wIdx) => {
        const customTimes = w.customTimes || {};
        const hasCustomTimes = Object.keys(customTimes).length > 0;

        let weekLabelHTML = formatWeekLabel(w.label);
        if (hasCustomTimes) {
          weekLabelHTML += `<br><span class="week-custom-badge" title="มีการปรับเปลี่ยนเวลาทำงานเฉพาะสัปดาห์นี้">⚡ ปรับเวลาพิเศษ</span>`;
        }
        if (isAdminMode) {
          weekLabelHTML += `<br><button class="btn btn-outline btn-sm" onclick="openWeekTimeModal(${wIdx})" style="font-size:10.5px; padding:2px 6px; margin-top:4px;" title="ปรับเวลาทำงานเฉพาะสัปดาห์นี้">⏱️ ปรับเวลา</button>`;
        }

        html += `<tr>`;
        html += `<td class="week-col-badge" rowspan="${showJD ? 2 : 1}">${weekLabelHTML}</td>`;

        WEEKDAY_COLUMNS.forEach((col, cIdx) => {
          const names = w.assignments[cIdx] || [];
          const colCustom = customTimes[cIdx];
          const shiftTime = colCustom ? colCustom.time : col.time;
          const isCustomTime = !!colCustom;

          let cellCustomBadge = "";
          if (isCustomTime) {
            cellCustomBadge = `<div class="week-custom-badge" style="margin-bottom:4px; display:block;">⏱️ ${shiftTime}</div>`;
          }

          const renderSingleSlotTag = (n, sIdx) => {
            if (!n) return "-";
            const isHighlight = highlightedAgent !== "ALL" && n === highlightedAgent ? "highlight-user" : "";
            const isSelected = pendingSwapSlot && pendingSwapSlot.yearAD === yearAD && pendingSwapSlot.month === month && pendingSwapSlot.type === "WEEKDAY" && pendingSwapSlot.wIdx === wIdx && pendingSwapSlot.cIdx === cIdx && pendingSwapSlot.sIdx === sIdx ? "selected-for-swap" : "";
            
            // Check if swapped from original
            const origName = originalSchedule.weeks?.[wIdx]?.assignments?.[cIdx]?.[sIdx];
            const isSwapped = !isViewingOriginal && origName && origName !== n;
            const swapClass = isSwapped ? "was-swapped" : "";
            const lockedClass = isLockedForUser || isViewingOriginal ? "name-tag-locked" : "";

            // Check Leave status
            const slotKey = `W_${wIdx}_${cIdx}_${sIdx}`;
            const leave = leaves[slotKey];
            const hasLeaveClass = leave ? "has-leave" : "";

            let leaveChipHTML = "";
            if (leave) {
              const icon = getLeaveIcon(leave.leaveType);
              const lClass = getLeaveClass(leave.leaveType);
              const leaveTitle = `${leave.leaveType}${leave.note ? ': ' + leave.note : ''}`;
              const clickAction = isAdminMode 
                ? `openLeaveRecordModal(${yearAD}, ${month}, 'WEEKDAY', ${wIdx}, ${cIdx}, ${sIdx}, '${n}', '${w.label}', '${col.code}')`
                : `showToast('🏖️ ${n}: ${leave.leaveType} ${leave.note || ''}')`;
              leaveChipHTML = `<span class="leave-chip leave-${lClass}" onclick="event.stopPropagation(); ${clickAction}" title="${leaveTitle}">${icon} ${leave.leaveType}</span>`;
            }

            let adminLeaveAddBtn = "";
            if (isAdminMode && !leave && n && n !== "-") {
              adminLeaveAddBtn = `<span class="btn-leave-add" onclick="event.stopPropagation(); openLeaveRecordModal(${yearAD}, ${month}, 'WEEKDAY', ${wIdx}, ${cIdx}, ${sIdx}, '${n}', '${w.label}', '${col.code}')" title="บันทึกการลา">+🏖️</span>`;
            }
            
            const thName = AGENT_NAME_MAP[n] ? ` (${AGENT_NAME_MAP[n]})` : "";
            const slotBreakLabel = (cIdx === 9) ? ` (พัก ${sIdx < 2 ? '13.00' : '13.30'} น.)` : "";
            let tagTitle = `คลิกเพื่อสลับเวร${thName}${slotBreakLabel}`;
            if (isViewingOriginal) tagTitle = `ตารางต้นฉบับ (โหมดดู)${slotBreakLabel}`;
            else if (isLockedForUser) tagTitle = `🔒 ปิดรับการสลับเวรแล้ว (ดูได้อย่างเดียว)${slotBreakLabel}`;
            else if (isSwapped) tagTitle = `สลับมาจากคุณ${origName}${slotBreakLabel} (คลิกเพื่อสลับต่อได้)`;

            const slotJson = JSON.stringify({ yearAD, month, type: "WEEKDAY", wIdx, cIdx, sIdx, agName: n, label: w.label, code: col.code }).replace(/"/g, '&quot;');
            return `<div style="margin-bottom:3px;"><span class="name-tag ${isHighlight} ${isSelected} ${swapClass} ${lockedClass} ${hasLeaveClass}" onclick="handleTagClickDirect(${slotJson})" title="${tagTitle}">${n}</span>${adminLeaveAddBtn} ${leaveChipHTML}</div>`;
          };

          let tagsHTML = "";
          if (cIdx === 9 && names.length >= 3) {
            const part1 = names.slice(0, 2).map((n, i) => renderSingleSlotTag(n, i)).join("");
            const part2 = names.slice(2).map((n, i) => renderSingleSlotTag(n, i + 2)).join("");
            tagsHTML = `
              <div style="margin-bottom:2px;"><span class="break-subgroup-pill">☕ พัก 13.00</span></div>
              ${part1}
              <div style="margin-top:4px; margin-bottom:2px;"><span class="break-subgroup-pill">☕ พัก 13.30</span></div>
              ${part2}
            `;
          } else {
            tagsHTML = names.map((n, sIdx) => renderSingleSlotTag(n, sIdx)).join("");
          }

          html += `<td onmouseenter="showJdTooltip(event, ${wIdx}, ${cIdx})" onmousemove="moveJdTooltip(event)" onmouseleave="hideJdTooltip()">${cellCustomBadge}${tagsHTML || "-"}</td>`;
        });
        html += `</tr>`;

        if (showJD) {
          html += `<tr class="jd-row">`;
          WEEKDAY_COLUMNS.forEach(col => {
            const formattedLines = col.jd.map(l => {
              const cleanL = escapeHtml(l)
                .replace(/(\d{1,2}\.\d{2})\s+น\./g, '$1&nbsp;น.')
                .replace(/\s+น\./g, '&nbsp;น.')
                .replace(/นาที\s+คู่/g, 'นาทีคู่')
                .replace(/นาที\s+คี่/g, 'นาทีคี่');
              return `<div class="jd-line-item">• ${cleanL}</div>`;
            }).join("");
            html += `<td>${formattedLines}</td>`;
          });
          html += `</tr>`;
        }
      });

      html += `</tbody>`;
      table.innerHTML = html;
    }

    // =========================================================================
    // TAB 1: RENDER MASTER HOLIDAY TABLE
    // =========================================================================
    function renderMasterHolidayTable() {
      const table = document.getElementById("masterHolidayTable");
      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const monthShort = THAI_MONTHS_SHORT[month];
      const leaves = getMonthLeaves(yearAD, month);

      let html = `
        <thead>
          <tr>
            <th style="width: 80px;">วัน</th>
            <th style="width: 80px;">วันที่</th>
            ${HOLIDAY_SHIFT_META.map(m => `<th>เวร ${m.time}<br><span style="color: #fde047; font-size: 11px;">${m.breakTime}</span></th>`).join("")}
            <th class="no-print admin-only" style="width: 50px;">ลบ</th>
          </tr>
        </thead>
        <tbody>
      `;

      const sched = isViewingOriginal ? originalSchedule : currentSchedule;
      const isLockedForUser = !allowUserSwap && !isAdminMode;

      sched.holidays.forEach((h, hIdx) => {
        const isSun = h.dayName === 'อาทิตย์';
        const isSat = h.dayName === 'เสาร์';
        const dayBadge = isSun ? 'badge-hol' : (isSat ? 'badge-early' : 'badge-call');

        let holidayNoteHTML = "";
        if (h.isBankHoliday || h.note) {
          const cleanHolidayName = (h.note || h.holidayName || 'วันหยุดพิเศษ').replace(/^วันหยุด\s*ธปท\.?\s*:\s*/i, '').replace(/\(ธปท\.?\)/i, '').trim();
          holidayNoteHTML = `<div style="font-size: 10px; color: #b45309; font-weight: 700; margin-top: 3px; line-height: 1.2;">🏦 ${cleanHolidayName}</div>`;
        }

        html += `<tr>`;
        html += `<td rowspan="${showJD ? 2 : 1}"><span class="badge ${dayBadge}">${h.dayName}</span></td>`;
        html += `<td rowspan="${showJD ? 2 : 1}"><strong>${h.date} ${monthShort}</strong>${holidayNoteHTML}</td>`;

        for (let s = 0; s < 4; s++) {
          const n = h.shifts[s] || "-";
          const isHighlight = highlightedAgent !== "ALL" && n === highlightedAgent ? "highlight-user" : "";
          const isSelected = pendingSwapSlot && pendingSwapSlot.yearAD === yearAD && pendingSwapSlot.month === month && pendingSwapSlot.type === "HOLIDAY" && pendingSwapSlot.hIdx === hIdx && pendingSwapSlot.sIdx === s ? "selected-for-swap" : "";
          
          const origName = originalSchedule.holidays?.[hIdx]?.shifts?.[s];
          const isSwapped = !isViewingOriginal && origName && origName !== n;
          const swapClass = isSwapped ? "was-swapped" : "";
          const lockedClass = isLockedForUser || isViewingOriginal ? "name-tag-locked" : "";

          // Check Leave status
          const slotKey = `H_${hIdx}_${s}`;
          const leave = leaves[slotKey];
          const hasLeaveClass = leave ? "has-leave" : "";

          let leaveChipHTML = "";
          if (leave) {
            const icon = getLeaveIcon(leave.leaveType);
            const lClass = getLeaveClass(leave.leaveType);
            const leaveTitle = `${leave.leaveType}${leave.note ? ': ' + leave.note : ''}`;
            const clickAction = isAdminMode 
              ? `openLeaveRecordModal(${yearAD}, ${month}, 'HOLIDAY', ${hIdx}, 0, ${s}, '${n}', '${h.date} ${monthShort}', '${HOLIDAY_SHIFT_META[s].time}')`
              : `showToast('🏖️ ${n}: ${leave.leaveType} ${leave.note || ''}')`;
            leaveChipHTML = `<span class="leave-chip leave-${lClass}" onclick="event.stopPropagation(); ${clickAction}" title="${leaveTitle}">${icon} ${leave.leaveType}</span>`;
          }

          let adminLeaveAddBtn = "";
          if (isAdminMode && !leave && n && n !== "-") {
            adminLeaveAddBtn = `<span class="btn-leave-add" onclick="event.stopPropagation(); openLeaveRecordModal(${yearAD}, ${month}, 'HOLIDAY', ${hIdx}, 0, ${s}, '${n}', '${h.date} ${monthShort}', '${HOLIDAY_SHIFT_META[s].time}')" title="บันทึกการลา">+🏖️</span>`;
          }

          const thName = AGENT_NAME_MAP[n] ? ` (${AGENT_NAME_MAP[n]})` : "";
          let tagTitle = `คลิกเพื่อสลับเวร${thName}`;
          if (isViewingOriginal) tagTitle = "ตารางต้นฉบับ (โหมดดู)";
          else if (isLockedForUser) tagTitle = "🔒 ปิดรับการสลับเวรแล้ว (ดูได้อย่างเดียว)";
          else if (isSwapped) tagTitle = `สลับมาจากคุณ${origName} (คลิกเพื่อสลับต่อได้)`;

          const slotJson = JSON.stringify({ yearAD, month, type: "HOLIDAY", hIdx, sIdx: s, agName: n, label: `${h.date} ${monthShort}`, shiftTime: HOLIDAY_SHIFT_META[s].time }).replace(/"/g, '&quot;');
          html += `<td onmouseenter="showHolidayJdTooltip(event, ${hIdx}, ${s})" onmousemove="moveJdTooltip(event)" onmouseleave="hideJdTooltip()"><span class="name-tag ${isHighlight} ${isSelected} ${swapClass} ${lockedClass} ${hasLeaveClass}" onclick="handleTagClickDirect(${slotJson})" title="${tagTitle}">${n}</span>${adminLeaveAddBtn} ${leaveChipHTML}</td>`;
        }

        html += `<td class="no-print admin-only" rowspan="${showJD ? 2 : 1}"><button class="btn btn-outline btn-sm" onclick="removeHoliday(${hIdx})" style="color: var(--danger); padding: 2px 6px;">✕</button></td>`;
        html += `</tr>`;

        if (showJD) {
          html += `<tr class="jd-row">`;
          for (let s = 0; s < 4; s++) {
            html += `<td>${HOLIDAY_SHIFT_META[s].jd.map(l => `• ${l}`).join("<br>")}</td>`;
          }
          html += `</tr>`;
        }
      });

      html += `</tbody>`;
      table.innerHTML = html;
    }


