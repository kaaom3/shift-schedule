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

  const sched = isViewingOriginal ? originalSchedule : currentSchedule;
  const week = sched.weeks && sched.weeks[wIdx];
  if (!week) return;

  const col = WEEKDAY_COLUMNS[cIdx];
  if (!col) return;

  const assigned = (week.assignments && week.assignments[cIdx]) || [];
  const custom = week.customTimes && week.customTimes[cIdx];
  const isCustomTime = !!custom;

  const roles = getShiftRoles(col);
  const times = getShiftTimes(col);
  const breaks = getShiftBreakTimes(col);
  const shiftTime = isCustomTime ? custom.time : times.join(" / ");

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

  let breakDisplayHtml = `<span>☕ เวลาพัก: ${breaks.join(" / ")}</span>`;
  let agentDisplayHtml = `<strong>👤 ผู้ปฏิบัติงาน:</strong> ${agentNames}`;

  if (breaks.length > 1 && assigned.length > 1) {
    const slotsPerBreak = Math.ceil(assigned.length / breaks.length);
    const groupItems = breaks.map((bText, bIdx) => {
      const start = bIdx * slotsPerBreak;
      const end = Math.min(start + slotsPerBreak, assigned.length);
      const subNames = assigned.slice(start, end).map(a => `${a}${AGENT_NAME_MAP[a] ? ` (${AGENT_NAME_MAP[a]})` : ''}`).join(", ");
      return `<div style="margin-top:3px; font-size:11.5px;">• ☕ <strong style="color:#fde047;">${bText}:</strong> ${subNames || '-'}</div>`;
    }).join("");
    agentDisplayHtml = `
      <strong>👤 ผู้ปฏิบัติงาน (แยกกลุ่มเวลาพัก):</strong>
      ${groupItems}
    `;
  }

  el.innerHTML = `
    <div class="jd-tip-header">
      <span class="jd-tip-title">ช่องที่ ${cIdx + 1} • ${roles.join(" / ")}</span>
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

  const roles = getShiftRoles(meta);
  const times = getShiftTimes(meta);
  const breaks = getShiftBreakTimes(meta);

  const jdItemsHtml = (meta.jd && meta.jd.length > 0)
    ? meta.jd.map(item => `<li>${item}</li>`).join("")
    : `<li>ปฏิบัติหน้าที่ประจำเวรวันหยุด</li>`;

  el.innerHTML = `
    <div class="jd-tip-header">
      <span class="jd-tip-title">กะวันหยุดที่ ${sIdx + 1} • ${roles.join(" / ")}</span>
      <span class="jd-tip-time">${hol ? hol.dayName + ' ที่ ' + hol.date : ''}</span>
    </div>
    <div class="jd-tip-role">
      <span>⏱️ เวลาทำงาน: ${times.join(" / ")}</span><br>
      <span>☕ เวลาพัก: ${breaks.join(" / ")}</span>
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
  if (!table) return;
  const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
  const month = parseInt(document.getElementById("monthSelect").value, 10);
  let html = `
    <thead>
      <tr>
        <th rowspan="4" style="width: 110px;">สัปดาห์</th>
        ${WEEKDAY_COLUMNS.map((c, idx) => `<th>ช่องที่ ${idx + 1}</th>`).join("")}
      </tr>
      <tr>
        ${WEEKDAY_COLUMNS.map(c => {
          const times = getShiftTimes(c);
          if (times.length > 1) {
            return `<th style="line-height:1.2; font-size:10.5px; padding:3px 2px;">${times.map(t => `<div style="white-space:nowrap; margin:1px 0;">⏱️ ${t}</div>`).join("")}</th>`;
          }
          return `<th>${c.time || (times[0] || '')}</th>`;
        }).join("")}
      </tr>
      <tr>
        ${WEEKDAY_COLUMNS.map((c, idx) => {
          const breaks = getShiftBreakTimes(c);
          if (breaks.length > 1) {
            const totalSlots = c.slots || 1;
            return `<th style="line-height:1.25; font-size:10.5px; padding: 4px 2px;">${breaks.map((b, bIdx) => {
              let countNote = "";
              if (totalSlots > 1) {
                const slotsPerBreak = Math.ceil(totalSlots / breaks.length);
                const count = Math.min(slotsPerBreak, totalSlots - bIdx * slotsPerBreak);
                if (count > 0 && totalSlots > breaks.length) countNote = ` (${count} คน)`;
              }
              return `<div style="color:${bIdx === 0 ? '#b45309' : '#d97706'}; font-weight:600; margin:1px 0;">☕ ${b}${countNote}</div>`;
            }).join("")}</th>`;
          }
          return `<th>${c.breakTime || (breaks[0] || '')}</th>`;
        }).join("")}
      </tr>
      <tr>
        ${WEEKDAY_COLUMNS.map(c => {
          const roles = getShiftRoles(c);
          if (roles.length > 1) {
            return `<th style="line-height:1.25; padding:3px 2px;">${roles.map(r => `<span class="badge" style="background:#e0e7ff; color:#3730a3; font-size:10.5px; padding:1px 5px; margin:1px; display:inline-block; border-radius:4px;">${r}</span>`).join("")}</th>`;
          }
          return `<th>${c.role || (roles[0] || '')}</th>`;
        }).join("")}
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
      const times = getShiftTimes(col);
      const shiftTime = colCustom ? colCustom.time : times.join(" / ");
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
          const mShort = (typeof THAI_MONTHS_SHORT !== "undefined" && THAI_MONTHS_SHORT[month]) ? THAI_MONTHS_SHORT[month] : "";
          const dText = getLeaveDatesBadgeText(leave, mShort);
          const dLabel = dText ? ` (${dText})` : "";
          const leaveTitle = `${leave.leaveType}${dLabel}${leave.note ? ': ' + leave.note : ''} (คลิกเพื่อแก้ไข/ยกเลิกการลา)`;
          const clickAction = `openLeaveRecordModal(${yearAD}, ${month}, 'WEEKDAY', ${wIdx}, ${cIdx}, ${sIdx}, '${n}', '${w.label}', 'ช่องที่ ${cIdx + 1}')`;
          leaveChipHTML = `<span class="leave-chip leave-${lClass}" onclick="event.stopPropagation(); ${clickAction}" title="${leaveTitle}">${icon} ${leave.leaveType}${dLabel}</span>`;
        }

        // เปิดให้น้องลงลาเองได้เลย (+🏖️)
        let leaveAddBtn = "";
        if (!leave && n && n !== "-") {
          leaveAddBtn = `<span class="btn-leave-add" onclick="event.stopPropagation(); openLeaveRecordModal(${yearAD}, ${month}, 'WEEKDAY', ${wIdx}, ${cIdx}, ${sIdx}, '${n}', '${w.label}', 'ช่องที่ ${cIdx + 1}')" title="ลงลา (คลิกเพื่อบันทึกการลา)">+🏖️</span>`;
        }
        
        const thName = AGENT_NAME_MAP[n] ? ` (${AGENT_NAME_MAP[n]})` : "";
        const slotBreak = getWeekdaySlotBreakTime(cIdx, sIdx, colCustom?.breakTime);
        const slotBreakLabel = slotBreak ? ` (${slotBreak})` : "";
        let tagTitle = `คลิกเพื่อสลับเวร${thName}${slotBreakLabel}`;
        if (isViewingOriginal) tagTitle = `ตารางต้นฉบับ (โหมดดู)${slotBreakLabel}`;
        else if (isLockedForUser) tagTitle = `🔒 ปิดรับการสลับเวรแล้ว (ดูได้อย่างเดียว)${slotBreakLabel}`;
        else if (isSwapped) tagTitle = `สลับมาจากคุณ${origName}${slotBreakLabel} (คลิกเพื่อสลับต่อได้)`;

        const slotJson = JSON.stringify({ yearAD, month, type: "WEEKDAY", wIdx, cIdx, sIdx, agName: n, label: w.label, code: col.code }).replace(/"/g, '&quot;');
        return `<div style="margin-bottom:3px;"><span class="name-tag ${isHighlight} ${isSelected} ${swapClass} ${lockedClass} ${hasLeaveClass}" onclick="handleTagClickDirect(${slotJson})" title="${tagTitle}">${n}</span>${leaveAddBtn} ${leaveChipHTML}</div>`;
      };

      let tagsHTML = "";
      const breaks = getShiftBreakTimes(col);
      if (breaks.length > 1 && names.length > 1 && col.slots > 1) {
        const slotsPerBreak = Math.ceil(names.length / breaks.length);
        const parts = [];
        breaks.forEach((bText, bIdx) => {
          const start = bIdx * slotsPerBreak;
          const end = Math.min(start + slotsPerBreak, names.length);
          const subNames = names.slice(start, end);
          if (subNames.length > 0) {
            const partTags = subNames.map((n, i) => renderSingleSlotTag(n, start + i)).join("");
            parts.push(`
              <div style="margin-top:${bIdx > 0 ? '4px' : '0'}; margin-bottom:2px;"><span class="break-subgroup-pill">☕ ${bText}</span></div>
              ${partTags}
            `);
          }
        });
        tagsHTML = parts.join("");
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
          return `<div class="jd-line-item"><span class="jd-bullet">•</span>${cleanL}</div>`;
        }).join("");
        html += `<td><div class="jd-card-inner"><div class="jd-card-header">📋 หน้าที่งาน (JD)</div>${formattedLines}</div></td>`;
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
  if (!table) return;
  const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
  const month = parseInt(document.getElementById("monthSelect").value, 10);
  const monthShort = THAI_MONTHS_SHORT[month];
  const leaves = getMonthLeaves(yearAD, month);

  let html = `
    <thead>
      <tr>
        <th style="width: 80px;">วัน</th>
        <th style="width: 80px;">วันที่</th>
        ${HOLIDAY_SHIFT_META.map((m, sIdx) => {
          const times = getShiftTimes(m);
          const breaks = getShiftBreakTimes(m);
          const roles = getShiftRoles(m);
          const roleText = roles.length > 0 ? `<div style="font-size:11px; font-weight:700; color:var(--primary); margin-bottom:2px;">${roles.join(" / ")}</div>` : "";
          const timeText = times.length > 1 ? times.map(t => `⏱️ ${t}`).join(" | ") : `เวร ${m.time || (times[0] || '')}`;
          const breakText = breaks.length > 1 ? breaks.map(b => `☕ ${b}`).join("<br>") : `${m.breakTime || (breaks[0] || '')}`;
          return `<th>${roleText}${timeText}<br><span style="color: #fde047; font-size: 11px;">${breakText}</span></th>`;
        }).join("")}
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

      const slotKey = `H_${hIdx}_${s}`;
      const leave = leaves[slotKey];
      const hasLeaveClass = leave ? "has-leave" : "";

      let leaveChipHTML = "";
      if (leave) {
        const icon = getLeaveIcon(leave.leaveType);
        const lClass = getLeaveClass(leave.leaveType);
        const leaveTitle = `${leave.leaveType}${leave.note ? ': ' + leave.note : ''}`;
        leaveChipHTML = `<span class="leave-chip leave-${lClass}" onclick="event.stopPropagation(); showToast('⚠️ เวรวันหยุดไม่สามารถลงลาได้')" title="${leaveTitle}">${icon} ${leave.leaveType}</span>`;
      }

      // เวรวันหยุดไม่สามารถลาได้ -> ไม่มีปุ่มลงลา
      let adminLeaveAddBtn = "";

      const thName = AGENT_NAME_MAP[n] ? ` (${AGENT_NAME_MAP[n]})` : "";
      let tagTitle = `คลิกเพื่อสลับเวร${thName}`;
      if (isViewingOriginal) tagTitle = `ตารางต้นฉบับ (โหมดดู)`;
      else if (isLockedForUser) tagTitle = `🔒 ปิดรับการสลับเวรแล้ว (ดูได้อย่างเดียว)`;
      else if (isSwapped) tagTitle = `สลับมาจากคุณ${origName} (คลิกเพื่อสลับต่อได้)`;

      const slotJson = JSON.stringify({ yearAD, month, type: "HOLIDAY", hIdx, sIdx: s, agName: n, label: `${h.dayName} ${h.date}`, code: `H${s+1}` }).replace(/"/g, '&quot;');
      html += `<td onmouseenter="showHolidayJdTooltip(event, ${hIdx}, ${s})" onmousemove="moveJdTooltip(event)" onmouseleave="hideJdTooltip()">
        <div style="margin-bottom:3px;"><span class="name-tag ${isHighlight} ${isSelected} ${swapClass} ${lockedClass} ${hasLeaveClass}" onclick="handleTagClickDirect(${slotJson})" title="${tagTitle}">${n}</span>${adminLeaveAddBtn} ${leaveChipHTML}</div>
      </td>`;
    }

    if (isAdminMode) {
      html += `<td class="no-print admin-only" rowspan="${showJD ? 2 : 1}">
        <button class="btn btn-outline btn-sm" onclick="removeHoliday('${h.date}')" style="color:var(--danger); padding:2px 6px;" title="ลบวันหยุดนี้">✕</button>
      </td>`;
    }

    html += `</tr>`;

    if (showJD) {
      html += `<tr class="jd-row">`;
      HOLIDAY_SHIFT_META.forEach(meta => {
        const formattedLines = meta.jd.map(l => {
          const cleanL = escapeHtml(l)
            .replace(/(\d{1,2}\.\d{2})\s+น\./g, '$1&nbsp;น.')
            .replace(/\s+น\./g, '&nbsp;น.');
          return `<div class="jd-line-item"><span class="jd-bullet">•</span>${cleanL}</div>`;
        }).join("");
        html += `<td><div class="jd-card-inner"><div class="jd-card-header">📋 หน้าที่งาน (JD)</div>${formattedLines}</div></td>`;
      });
      if (isAdminMode) html += `<td></td>`;
      html += `</tr>`;
    }
  });

  html += `</tbody>`;
  table.innerHTML = html;
}
