// =========================================================
// SHIFT SWAP LOGIC & AUDIT HISTORY
// =========================================================

    // DIRECT CLICK TO SWAP LOGIC
    function handleTagClickDirect(slot) {
      if (isViewingOriginal) {
        showToast("ℹ️ กำลังดูตารางต้นฉบับ (ไม่สามารถสลับในหน้านี้ได้) กรุณาสลับกลับไปดูตารางปัจจุบัน");
        return;
      }
      if (!allowUserSwap && !isAdminMode) {
        showToast("🔒 ขณะนี้ระบบปิดรับการสลับเวรแล้ว (โหมดดูได้อย่างเดียว) หากจำเป็นต้องสลับกรุณาแจ้งหัวหน้างาน");
        return;
      }
      if (!pendingSwapSlot) {
        // Step 1: Select person A
        pendingSwapSlot = slot;
        const monthShort = THAI_MONTHS_SHORT[slot.month];
        document.getElementById("swapSelectedName").innerHTML = `คุณ${slot.agName} <span style="font-weight:normal; color:#fde047;">(${monthShort} ${slot.label || ''})</span>`;
        document.getElementById("floating-swap-bar").classList.add("show");
        renderMasterWeekdayTable();
        renderMasterHolidayTable();
      } else {
        // Step 2: Selected person B
        if (pendingSwapSlot.yearAD === slot.yearAD &&
            pendingSwapSlot.month === slot.month &&
            pendingSwapSlot.type === slot.type &&
            pendingSwapSlot.wIdx === slot.wIdx &&
            pendingSwapSlot.cIdx === slot.cIdx &&
            pendingSwapSlot.sIdx === slot.sIdx &&
            pendingSwapSlot.hIdx === slot.hIdx) {
          cancelPendingSwap();
          return;
        }
        executeSwapDirect(pendingSwapSlot, slot);
      }
    }

    function cancelPendingSwap() {
      pendingSwapSlot = null;
      document.getElementById("floating-swap-bar").classList.remove("show");
      renderMasterWeekdayTable();
      renderMasterHolidayTable();
    }

    function executeSwapDirect(slotA, slotB) {
      const mDataA = getOrInitMonthSchedule(slotA.yearAD, slotA.month);
      const mDataB = getOrInitMonthSchedule(slotB.yearAD, slotB.month);

      // 1. Retrieve Person A name
      let nameA = "";
      if (slotA.type === "WEEKDAY") {
        nameA = mDataA.schedule.weeks[slotA.wIdx].assignments[slotA.cIdx][slotA.sIdx];
      } else {
        nameA = mDataA.schedule.holidays[slotA.hIdx].shifts[slotA.sIdx];
      }

      // 2. Retrieve Person B name
      let nameB = "";
      if (slotB.type === "WEEKDAY") {
        nameB = mDataB.schedule.weeks[slotB.wIdx].assignments[slotB.cIdx][slotB.sIdx];
      } else {
        nameB = mDataB.schedule.holidays[slotB.hIdx].shifts[slotB.sIdx];
      }

      // 3. Execute swap across slots
      if (slotA.type === "WEEKDAY") {
        mDataA.schedule.weeks[slotA.wIdx].assignments[slotA.cIdx][slotA.sIdx] = nameB;
      } else {
        mDataA.schedule.holidays[slotA.hIdx].shifts[slotA.sIdx] = nameB;
      }

      if (slotB.type === "WEEKDAY") {
        mDataB.schedule.weeks[slotB.wIdx].assignments[slotB.cIdx][slotB.sIdx] = nameA;
      } else {
        mDataB.schedule.holidays[slotB.hIdx].shifts[slotB.sIdx] = nameA;
      }

      // 4. Construct descriptive swap log tag
      let swapTag = "[สลับเวร]";
      if (slotA.month !== slotB.month || slotA.yearAD !== slotB.yearAD) {
        swapTag = "[สลับข้ามเดือน]";
      } else if (slotA.type === "WEEKDAY" && slotB.type === "WEEKDAY" && slotA.wIdx !== slotB.wIdx) {
        swapTag = "[สลับข้ามสัปดาห์]";
      } else if (slotA.type === "HOLIDAY" && slotB.type === "HOLIDAY" && slotA.hIdx !== slotB.hIdx) {
        swapTag = "[สลับข้ามวันหยุด]";
      } else if (slotA.type !== slotB.type) {
        swapTag = "[สลับข้ามประเภทเวร]";
      }

      const now = new Date();
      const dateStr = now.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
      const timeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
      const recordId = "SWAP_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);

      // Slot A details
      let descA = "";
      let roleA = "";
      let timeA = "";
      let periodA = "";
      if (slotA.type === "WEEKDAY") {
        const colA = WEEKDAY_COLUMNS[slotA.cIdx];
        roleA = colA.role;
        timeA = colA.time;
        periodA = `${slotA.label || `สัปดาห์ที่ ${slotA.wIdx + 1}`} (ช่องที่ ${slotA.cIdx + 1})`;
        descA = `${periodA} • ${roleA} [${timeA}]`;
      } else {
        const hA = mDataA.schedule.holidays[slotA.hIdx];
        const metaA = HOLIDAY_SHIFT_META[slotA.sIdx] || {};
        roleA = (metaA && metaA.role) ? metaA.role : `เวรวันหยุด กะที่ ${slotA.sIdx + 1}`;
        timeA = (metaA && metaA.time) ? metaA.time : "09.00-18.00 น.";
        periodA = `${hA.dayName} ${hA.date} ${THAI_MONTHS_SHORT[slotA.month] || ''}`;
        descA = `วันหยุด ${periodA} • ${roleA} [${timeA}]`;
      }

      // Slot B details
      let descB = "";
      let roleB = "";
      let timeB = "";
      let periodB = "";
      if (slotB.type === "WEEKDAY") {
        const colB = WEEKDAY_COLUMNS[slotB.cIdx];
        roleB = colB.role;
        timeB = colB.time;
        periodB = `${slotB.label || `สัปดาห์ที่ ${slotB.wIdx + 1}`} (ช่องที่ ${slotB.cIdx + 1})`;
        descB = `${periodB} • ${roleB} [${timeB}]`;
      } else {
        const hB = mDataB.schedule.holidays[slotB.hIdx];
        const metaB = HOLIDAY_SHIFT_META[slotB.sIdx] || {};
        roleB = (metaB && metaB.role) ? metaB.role : `เวรวันหยุด กะที่ ${slotB.sIdx + 1}`;
        timeB = (metaB && metaB.time) ? metaB.time : "09.00-18.00 น.";
        periodB = `${hB.dayName} ${hB.date} ${THAI_MONTHS_SHORT[slotB.month] || ''}`;
        descB = `วันหยุด ${periodB} • ${roleB} [${timeB}]`;
      }

      let performedBy = "ผู้ใช้งานในระบบ";
      if (isAdminMode) {
        performedBy = "หัวหน้างาน (Admin)";
      } else if (highlightedAgent && highlightedAgent !== "ALL") {
        performedBy = `${highlightedAgent} (ผู้ใช้งาน)`;
      } else if (nameA) {
        performedBy = `${nameA} (ผู้สลับคนแรก)`;
      }

      const thNameA = AGENT_NAME_MAP[nameA] || nameA;
      const thNameB = AGENT_NAME_MAP[nameB] || nameB;
      const detailStr = `${swapTag} คุณ${nameA} (${THAI_MONTHS_SHORT[slotA.month]} ${slotA.label || ''}) ⇄ คุณ${nameB} (${THAI_MONTHS_SHORT[slotB.month]} ${slotB.label || ''})`;

      const swapRecord = {
        id: recordId,
        dateStr: dateStr,
        timeStr: timeStr,
        timestamp: now.toISOString(),
        swapTag: swapTag,
        performedBy: performedBy,
        yearAD_A: slotA.yearAD,
        month_A: slotA.month,
        yearAD_B: slotB.yearAD,
        month_B: slotB.month,
        agentA: {
          username: nameA,
          thName: thNameA,
          type: slotA.type,
          period: periodA,
          role: roleA,
          time: timeA,
          desc: descA
        },
        agentB: {
          username: nameB,
          thName: thNameB,
          type: slotB.type,
          period: periodB,
          role: roleB,
          time: timeB,
          desc: descB
        },
        summaryAtoB: `คุณ${nameA} (${thNameA}) ย้ายไปทำ ➔ ${descB}`,
        summaryBtoA: `คุณ${nameB} (${thNameB}) ย้ายไปทำ ➔ ${descA}`,
        // Legacy compatibility
        time: `${dateStr} ${timeStr}`,
        detail: detailStr
      };

      mDataA.swapHistory.unshift(swapRecord);
      if (mDataB !== mDataA) {
        mDataB.swapHistory.unshift(swapRecord);
      }

      // 5. Sync current view in case user is currently on either month
      const curYearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const curMonth = parseInt(document.getElementById("monthSelect").value, 10);
      const curData = getOrInitMonthSchedule(curYearAD, curMonth);
      currentSchedule = curData.schedule;
      originalSchedule = curData.originalSchedule;
      swapHistory = curData.swapHistory;

      cancelPendingSwap();
      renderAllViews();
      showToast(`สลับเวรสำเร็จ: คุณ${nameA} ⇄ คุณ${nameB} (${swapTag})`);
      triggerAutoSaveToCloud(detailStr);
    }



    // =========================================================================
    // SWAP HISTORY TABLE & AUDIT LOG VIEWER
    // =========================================================================
    function renderSwapHistoryTable() {
      const tbody = document.getElementById("swapHistoryTableBody");
      if (!tbody) return;

      const scope = (document.getElementById("swapScopeSelect") && document.getElementById("swapScopeSelect").value) || "CURRENT";
      const agentFilter = (document.getElementById("swapAgentFilterSelect") && document.getElementById("swapAgentFilterSelect").value) || "ALL";
      const typeFilter = (document.getElementById("swapTypeFilterSelect") && document.getElementById("swapTypeFilterSelect").value) || "ALL";
      const searchText = ((document.getElementById("swapSearchInput") && document.getElementById("swapSearchInput").value) || "").trim().toLowerCase();

      const curYearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const curMonth = parseInt(document.getElementById("monthSelect").value, 10);
      const curKey = `${curYearAD}-${curMonth}`;

      // Update Top Statistics Cards
      const curMonthHistory = (monthSchedules[curKey] && monthSchedules[curKey].swapHistory) || [];
      const curMonthCount = curMonthHistory.length;

      // Calculate total across all months
      let allMonthsList = [];
      const seenIds = new Set();

      Object.keys(monthSchedules).forEach(k => {
        const hList = monthSchedules[k].swapHistory || [];
        hList.forEach(item => {
          const itemKey = item.id || (item.time + "_" + item.detail);
          if (!seenIds.has(itemKey)) {
            seenIds.add(itemKey);
            allMonthsList.push(item);
          }
        });
      });

      const totalAllCount = allMonthsList.length;

      // Update stat cards
      const statCurEl = document.getElementById("statSwapCurrentMonth");
      if (statCurEl) statCurEl.innerText = curMonthCount;
      const statAllEl = document.getElementById("statSwapAllMonths");
      if (statAllEl) statAllEl.innerText = totalAllCount;
      const swapTabBadge = document.getElementById("swapTabBadge");
      if (swapTabBadge) swapTabBadge.innerText = curMonthCount;
      const swapHeaderBadge = document.getElementById("swapHeaderCountBadge");

      // Update system status stat
      const statStatusIcon = document.getElementById("statSwapStatusIcon");
      const statStatusText = document.getElementById("statSwapStatusText");
      if (statStatusIcon && statStatusText) {
        if (!allowUserSwap && !isAdminMode) {
          statStatusIcon.style.background = "#fef2f2";
          statStatusIcon.style.color = "#dc2626";
          statStatusIcon.innerText = "🔒";
          statStatusText.style.color = "#dc2626";
          statStatusText.innerText = "ปิดรับการสลับเวร (โหมดดูได้อย่างเดียว)";
        } else {
          statStatusIcon.style.background = "#ecfdf5";
          statStatusIcon.style.color = "#059669";
          statStatusIcon.innerText = "✅";
          statStatusText.style.color = "#059669";
          statStatusText.innerText = isAdminMode ? "โหมด Admin (สลับเวรได้อิสระ)" : "เปิดให้สมาชิกสลับเวรได้";
        }
      }

      // Select list to display based on scope
      let targetList = scope === "ALL" ? allMonthsList : curMonthHistory;

      // Filter by Agent
      if (agentFilter !== "ALL") {
        targetList = targetList.filter(item => {
          if (item.agentA && item.agentB) {
            return item.agentA.username === agentFilter || item.agentB.username === agentFilter;
          }
          if (item.detail) {
            return item.detail.includes(agentFilter);
          }
          return false;
        });
      }

      // Filter by Type
      if (typeFilter !== "ALL") {
        targetList = targetList.filter(item => {
          const tag = item.swapTag || (item.detail && item.detail.match(/\[(.*?)\]/) ? `[${item.detail.match(/\[(.*?)\]/)[1]}]` : "");
          return tag.includes(typeFilter);
        });
      }

      // Filter by Search Query
      if (searchText) {
        targetList = targetList.filter(item => {
          const str = JSON.stringify(item).toLowerCase();
          return str.includes(searchText);
        });
      }

      if (swapHeaderBadge) {
        swapHeaderBadge.innerText = `${targetList.length} รายการ`;
      }

      // Render table rows
      if (targetList.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7">
              <div class="swap-empty-state">
                <div style="font-size: 32px; margin-bottom: 8px;">🔄</div>
                <div style="font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 4px;">ไม่พบประวัติการสลับเวรตามเงื่อนไขที่เลือก</div>
                <div style="font-size: 12px; color: var(--muted);">เมื่อมีการคลิกสลับเวรในตาราง รายการจะถูกบันทึกและแสดงที่นี่แบบเรียลไทม์</div>
              </div>
            </td>
          </tr>
        `;
        return;
      }

      let html = "";
      targetList.forEach((item, idx) => {
        const isRich = !!(item.agentA && item.agentB);
        const tag = item.swapTag || (item.detail && item.detail.match(/\[(.*?)\]/) ? `[${item.detail.match(/\[(.*?)\]/)[1]}]` : "[สลับเวร]");

        let badgeClass = "swap-badge-general";
        if (tag.includes("สัปดาห์")) badgeClass = "swap-badge-week";
        else if (tag.includes("วันหยุด")) badgeClass = "swap-badge-holiday";
        else if (tag.includes("เดือน")) badgeClass = "swap-badge-month";
        else if (tag.includes("ประเภท")) badgeClass = "swap-badge-type";

        const timeDisplay = item.dateStr ? `${item.dateStr} <span style="color:var(--muted); font-size:11px;">(${item.timeStr || ''})</span>` : (item.time || "-");

        let colA = "";
        let colB = "";
        let colResult = "";
        let colDetail = "";

        if (isRich) {
          const agA = item.agentA;
          const agB = item.agentB;

          colA = `
            <div class="swap-agent-cell">
              <div class="swap-agent-name">
                <span>👤</span> <strong>${agA.username}</strong>
                <span style="color:var(--muted); font-weight:normal; font-size:11px;">(${agA.thName})</span>
              </div>
              <div class="swap-agent-detail">📍 <strong>เดิม:</strong> ${agA.period}</div>
              <div class="swap-agent-time">⏱️ ${agA.role} • เวลา ${agA.time}</div>
            </div>
          `;

          colB = `
            <div class="swap-agent-cell">
              <div class="swap-agent-name">
                <span>👤</span> <strong>${agB.username}</strong>
                <span style="color:var(--muted); font-weight:normal; font-size:11px;">(${agB.thName})</span>
              </div>
              <div class="swap-agent-detail">📍 <strong>เดิม:</strong> ${agB.period}</div>
              <div class="swap-agent-time">⏱️ ${agB.role} • เวลา ${agB.time}</div>
            </div>
          `;

          colResult = `
            <div class="swap-result-box">
              <div style="margin-bottom: 4px; color: #1e3a8a;">
                <strong>${agA.username}:</strong> ➔ สลับไปทำ: <span style="font-weight:600; color:#1e40af;">${agB.desc}</span>
              </div>
              <div style="color: #065f46;">
                <strong>${agB.username}:</strong> ➔ สลับไปทำ: <span style="font-weight:600; color:#047857;">${agA.desc}</span>
              </div>
            </div>
          `;

          const performedByText = item.performedBy || (isAdminMode ? 'หัวหน้างาน (Admin)' : (agA ? agA.username : 'ผู้ใช้งานในระบบ'));
          const isByAdmin = performedByText.includes('Admin');
          colDetail = `
            <div style="font-size: 11px; color: var(--muted); line-height: 1.4;">
              <div style="margin-bottom: 5px;">
                <span class="badge" style="font-size: 11px; padding: 3px 8px; background: ${isByAdmin ? '#fee2e2; color:#991b1b; border: 1px solid #fecaca;' : '#e0e7ff; color:#3730a3; border: 1px solid #c7d2fe;'} font-weight: 700; border-radius: 4px; display:inline-block;">
                  👤 ผู้ทำรายการ: <strong>${performedByText}</strong>
                </span>
              </div>
              <div>🆔 <code>${item.id || '-'}</code></div>
              <div style="color: #64748b; margin-top: 2px;">${item.detail || '-'}</div>
            </div>
          `;
        } else {
          // Legacy string parse
          colA = `<div class="swap-agent-cell"><div class="swap-agent-name">${item.detail || '-'}</div></div>`;
          colB = `<div style="color:var(--muted); font-size:11px;">(ข้อมูลรุ่นเก่า)</div>`;
          colResult = `<div class="swap-result-box">${item.detail || '-'}</div>`;
          colDetail = `<span style="font-size:11px; color:var(--muted);">บันทึกก่อนหน้า</span>`;
        }

        const rowBg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
        html += `
          <tr style="background: ${rowBg};">
            <td style="font-weight: 700; color: var(--muted);">${idx + 1}</td>
            <td style="font-size: 11.5px; white-space: nowrap;">${timeDisplay}</td>
            <td><span class="badge ${badgeClass}" style="font-size: 11px; padding: 3px 8px;">${tag}</span></td>
            <td style="padding: 8px 12px;">${colA}</td>
            <td style="padding: 8px 12px;">${colB}</td>
            <td style="padding: 8px 12px;">${colResult}</td>
            <td style="padding: 8px 12px;">${colDetail}</td>
          </tr>
        `;
      });

      tbody.innerHTML = html;
    }

    function clearSwapHistoryPrompt() {
      if (!isAdminMode) {
        showToast("🔒 เฉพาะหัวหน้างาน (Admin) เท่านั้นที่สามารถล้างประวัติการสลับเวรได้");
        return;
      }
      const curYearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const curMonth = parseInt(document.getElementById("monthSelect").value, 10);
      const curKey = `${curYearAD}-${curMonth}`;
      const curCount = (monthSchedules[curKey] && monthSchedules[curKey].swapHistory) ? monthSchedules[curKey].swapHistory.length : 0;

      if (curCount === 0) {
        showToast("ℹ️ ไม่มีประวัติการสลับเวรในเดือนนี้ให้ลบ");
        return;
      }

      openSafetyModal({
        title: "ยืนยันการล้างประวัติการสลับเวร (Clear Swap History)",
        icon: "🗑️",
        alertHTML: `
          <div style="background:#fef2f2; border:1px solid #fecaca; color:#991b1b; padding:12px; border-radius:8px;">
            <div style="font-size:14px; font-weight:700; margin-bottom:6px;">⚠️ คำเตือน: คุณกำลังจะลบประวัติบันทึกการสลับเวร</div>
            <ul style="margin:0; padding-left:18px; line-height:1.5;">
              <li>ระบบจะลบ <strong>ประวัติการสลับเวร (${curCount} รายการ)</strong> ของเดือนนี้ทั้งหมด</li>
              <li>ตารางเวรปัจจุบันที่สลับไปแล้ว <strong>จะไม่ถูกรีเซ็ต</strong> (คงสภาพตารางปัจจุบันไว้)</li>
            </ul>
          </div>
        `,
        checkboxText: "ฉันเข้าใจและยืนยันต้องการล้างบันทึกประวัติการสลับเวรนี้",
        confirmBtnText: "🗑️ ยืนยันล้างประวัติ",
        actionFn: () => {
          if (monthSchedules[curKey]) {
            monthSchedules[curKey].swapHistory = [];
          }
          swapHistory = [];
          renderSwapHistoryTable();
          updateBadgesAndTitles();
          showToast("🗑️ ล้างประวัติการสลับเวรของเดือนนี้เรียบร้อยแล้ว");
          triggerAutoSaveToCloud("ล้างประวัติการสลับเวร");
        }
      });
    }

    // TAB 2: INDIVIDUAL CARDS (Redesigned without '1. คุณ' prefix)

