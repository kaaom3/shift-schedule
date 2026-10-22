// =========================================================
// SHIFT SWAP LOGIC & AUDIT HISTORY
// =========================================================

    // DIRECT CLICK TO SWAP LOGIC
    function handleTagClickDirect(slot) {
      // Holiday Shift Handover (1-Way Substitution)
      if (slot.type === "HOLIDAY") {
        if (pendingSwapSlot) cancelPendingSwap();
        if (!currentUser) {
          showToast("🔒 กรุณาเข้าสู่ระบบ (Login) ก่อนดำเนินการแลกเวรวันหยุด");
          if (typeof openLoginGateModal === "function") openLoginGateModal();
          return;
        }
        if (isViewingOriginal) {
          showToast("ℹ️ กำลังดูตารางต้นฉบับ ไม่สามารถแลกเวรได้");
          return;
        }
        if (!allowUserSwap && !isAdminMode && currentUser.role !== "ADMIN") {
          showToast("🔒 ขณะนี้ระบบปิดรับการแลกเวรแล้ว (หากจำเป็นกรุณาติดต่อ Admin)");
          return;
        }

        const agName = slot.agName || slot.agent;
        if (!isAdminMode && currentUser.role !== "ADMIN") {
          const isMine = (typeof isCurrentUserAgent === "function") 
            ? (isCurrentUserAgent(agName) || isCurrentUserAgent(slot.agent)) 
            : (agName === currentUser.username || slot.agent === currentUser.username);
          if (!isMine) {
            const myName = currentUser.nameTH || currentUser.username;
            showToast(`⚠️ ท่านสามารถขอแลกเวรวันหยุดเฉพาะเวรของตนเอง (คุณ${myName}) ออกให้เพื่อนร่วมงานเท่านั้น`);
            return;
          }
        }

        openHolidayTransferModal(slot);
        return;
      }

      if (!currentUser) {
        showToast("🔒 กรุณาเข้าสู่ระบบ (Login) ก่อนดำเนินการสลับเวร");
        if (typeof openLoginGateModal === "function") openLoginGateModal();
        return;
      }
      if (isViewingOriginal) {
        showToast("ℹ️ กำลังดูตารางต้นฉบับ (ไม่สามารถสลับในหน้านี้ได้) กรุณาสลับกลับไปดูตารางปัจจุบัน");
        return;
      }
      if (!allowUserSwap && !isAdminMode) {
        showToast("🔒 ขณะนี้ระบบปิดรับการสลับเวรแล้ว (โหมดดูได้อย่างเดียว) หากจำเป็นต้องสลับกรุณาแจ้งหัวหน้างาน");
        return;
      }
      // Member mode: First selected slot must be the user's own shift
      if (!isAdminMode && currentUser.role !== "ADMIN" && !pendingSwapSlot) {
        const slotAgent = slot.agName || slot.agent;
        if (typeof isCurrentUserAgent === "function" ? !isCurrentUserAgent(slotAgent) : (slotAgent !== currentUser.username)) {
          const myName = currentUser.nameTH || currentUser.username;
          showToast(`⚠️ ท่านสามารถเลือกสลับเฉพาะกะของตนเอง (คุณ${myName}) เท่านั้น`);
          return;
        }
      }
      if (!pendingSwapSlot) {
        // Step 1: Select person A
        pendingSwapSlot = slot;
        const monthShort = THAI_MONTHS_SHORT[slot.month];
        const displayAgName = slot.agName || slot.agent;
        const thDisplay = (typeof AGENT_NAME_MAP !== "undefined" && AGENT_NAME_MAP[displayAgName]) ? AGENT_NAME_MAP[displayAgName] : displayAgName;
        document.getElementById("swapSelectedName").innerHTML = `คุณ${thDisplay} <span style="font-weight:normal; color:#fde047;">(${monthShort} ${slot.label || ''})</span>`;
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
      if (!currentUser) {
        showToast("🔒 กรุณาเข้าสู่ระบบ (Login) ก่อนดำเนินการสลับเวร");
        if (typeof openLoginGateModal === "function") openLoginGateModal();
        return;
      }

      const mDataA = getOrInitMonthSchedule(slotA.yearAD, slotA.month);
      const mDataB = getOrInitMonthSchedule(slotB.yearAD, slotB.month);

      // 1. Retrieve Person A name
      let nameA = "";
      if (slotA.type === "WEEKDAY") {
        nameA = mDataA.schedule.weeks[slotA.wIdx]?.assignments?.[slotA.cIdx]?.[slotA.sIdx] || slotA.agent || slotA.agName || "";
      } else {
        nameA = mDataA.schedule.holidays[slotA.hIdx]?.shifts?.[slotA.sIdx] || slotA.agent || slotA.agName || "";
      }

      // 2. Retrieve Person B name
      let nameB = "";
      if (slotB.type === "WEEKDAY") {
        nameB = mDataB.schedule.weeks[slotB.wIdx]?.assignments?.[slotB.cIdx]?.[slotB.sIdx] || slotB.agent || slotB.agName || "";
      } else {
        nameB = mDataB.schedule.holidays[slotB.hIdx]?.shifts?.[slotB.sIdx] || slotB.agent || slotB.agName || "";
      }

      if (!isAdminMode && currentUser.role !== "ADMIN") {
        const isUserA = (typeof isCurrentUserAgent === "function")
          ? (isCurrentUserAgent(nameA) || isCurrentUserAgent(slotA.agName) || isCurrentUserAgent(slotA.agent))
          : (slotA.agent === currentUser.username || nameA === currentUser.username);
        const isUserB = (typeof isCurrentUserAgent === "function")
          ? (isCurrentUserAgent(nameB) || isCurrentUserAgent(slotB.agName) || isCurrentUserAgent(slotB.agent))
          : (slotB.agent === currentUser.username || nameB === currentUser.username);
        if (!isUserA && !isUserB) {
          const myName = currentUser.nameTH || currentUser.username;
          showToast(`⚠️ ท่านสามารถเลือกสลับเฉพาะกะของตนเอง (คุณ${myName}) กับเพื่อนร่วมงานเท่านั้น`);
          return;
        }
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
      const performedBy = typeof getCurrentOperatorName === "function" ? getCurrentOperatorName() : "ผู้ใช้งานในระบบ";
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
        slotA: { yearAD: slotA.yearAD, month: slotA.month, type: slotA.type, wIdx: slotA.wIdx, cIdx: slotA.cIdx, sIdx: slotA.sIdx, hIdx: slotA.hIdx, agent: nameA },
        slotB: { yearAD: slotB.yearAD, month: slotB.month, type: slotB.type, wIdx: slotB.wIdx, cIdx: slotB.cIdx, sIdx: slotB.sIdx, hIdx: slotB.hIdx, agent: nameB },
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
    
        // Universal History Item Normalizer (Works for legacy strings, rich objects, and new hub swaps)
    function normalizeHistoryItem(item) {
      if (!item) return { nameA: "-", nameB: "-", thA: "-", thB: "-", descA: "-", descB: "-", performedBy: "ผู้ใช้งานในระบบ", isCancellation: false, canRevert: false };

      let nameA = "", nameB = "", thA = "", thB = "";
      let descA = "", descB = "";
      let performedBy = item.performedBy || "ผู้ใช้งานในระบบ";
      let canRevert = false;

      // Object formats (executeSwapDirect / rich entries)
      if (item.agentA && typeof item.agentA === "object") {
        nameA = item.agentA.username || "";
        thA = item.agentA.thName || (AGENT_NAME_MAP[nameA] || nameA);
        descA = item.agentA.desc || ((item.agentA.period || "") + " • " + (item.agentA.role || "") + " [" + (item.agentA.time || "") + "]");
      } else if (item.agentA && typeof item.agentA === "string") {
        nameA = item.agentA;
        thA = AGENT_NAME_MAP[nameA] || nameA;
      }

      if (item.agentB && typeof item.agentB === "object") {
        nameB = item.agentB.username || "";
        thB = item.agentB.thName || (AGENT_NAME_MAP[nameB] || nameB);
        descB = item.agentB.desc || ((item.agentB.period || "") + " • " + (item.agentB.role || "") + " [" + (item.agentB.time || "") + "]");
      } else if (item.agentB && typeof item.agentB === "string") {
        nameB = item.agentB;
        thB = AGENT_NAME_MAP[nameB] || nameB;
      }

      // Person fields (Weekly / Daily / Holiday hub swaps)
      if (item.type === "HOLIDAY_TRANSFER" || (item.tag && item.tag.includes("แลกเวรวันหยุด"))) {
        nameA = item.personA || "";
        thA = item.thA || (AGENT_NAME_MAP[nameA] || nameA);
        descA = item.descA || "";
        nameB = item.personB || "";
        thB = item.thB || (AGENT_NAME_MAP[nameB] || nameB);
        descB = item.descB || "";
      } else if (!nameA && item.personA) {
        nameA = item.personA;
        thA = AGENT_NAME_MAP[nameA] || nameA;
        descA = item.descA || "";
      }
      if (!nameB && item.personB) {
        nameB = item.personB;
        thB = AGENT_NAME_MAP[nameB] || nameB;
        descB = item.descB || "";
      }

      // agentAName / agentBName fields
      if (!nameA && item.agentAName) {
        nameA = item.agentAName;
        thA = AGENT_NAME_MAP[nameA] || item.agentAName;
        descA = item.shiftA ? (item.shiftA.time + " (" + item.shiftA.role + ")") : (item.descA || "");
      }
      if (!nameB && item.agentBName) {
        nameB = item.agentBName;
        thB = AGENT_NAME_MAP[nameB] || item.agentBName;
        descB = item.shiftB ? (item.shiftB.time + " (" + item.shiftB.role + ")") : (item.descB || "");
      }

      // Fallback: Parse detail string e.g. "[สลับเวร] คุณpantip.to (พ.ย. สัปดาห์ 1) ⇄ คุณjutharat.ka (พ.ย. สัปดาห์ 2)"
      if ((!nameA || !nameB) && item.detail) {
        const m = item.detail.match(/คุณ([^\s(]+).*?⇄.*?คุณ([^\s(]+)/);
        if (m) {
          nameA = nameA || m[1].trim();
          nameB = nameB || m[2].trim();
          thA = thA || (AGENT_NAME_MAP[nameA] || nameA);
          thB = thB || (AGENT_NAME_MAP[nameB] || nameB);
          const parts = item.detail.split("⇄");
          descA = descA || (parts[0] ? parts[0].replace(/.*?คุณ[^\s(]+/, '').trim() : "");
          descB = descB || (parts[1] ? parts[1].replace(/.*?คุณ[^\s(]+/, '').trim() : "");
        } else {
          nameA = nameA || item.detail;
          thA = thA || item.detail;
        }
      }

      const tag = item.tag || item.swapTag || "";
      const detailStr = item.detail || "";
      const isCancellation = tag.includes("ยกเลิก") || detailStr.includes("ยกเลิก") || (item.id && String(item.id).startsWith("CAN_"));

      if (!isCancellation) {
        canRevert = true;
      }

      return {
        nameA: nameA || "-",
        nameB: nameB || "-",
        thA: thA || nameA || "-",
        thB: thB || nameB || "-",
        descA: descA || "-",
        descB: descB || "-",
        performedBy: performedBy,
        isCancellation: isCancellation,
        canRevert: canRevert
      };
    }

function renderSwapHistoryTable() {
      if (typeof initSwapHub === "function") initSwapHub();
      if (typeof renderActiveSwapsHub === "function") renderActiveSwapsHub();

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
      if (swapHeaderBadge) swapHeaderBadge.innerText = `${scope === "ALL" ? totalAllCount : curMonthCount} รายการ`;

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
          const norm = normalizeHistoryItem(item);
          return norm.nameA === agentFilter || norm.nameB === agentFilter || norm.thA === agentFilter || norm.thB === agentFilter || JSON.stringify(item).includes(agentFilter);
        });
      }

      // Filter by Type
      if (typeFilter !== "ALL") {
        targetList = targetList.filter(item => {
          const tag = item.tag || item.swapTag || (item.detail && item.detail.match(/\[(.*?)\]/) ? `[${item.detail.match(/\[(.*?)\]/)[1]}]` : "");
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

      if (targetList.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 36px 16px; color: var(--muted);">
              <div style="font-size: 32px; margin-bottom: 8px;">📭</div>
              <div>
                <div style="font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 4px;">ไม่พบประวัติการสลับเวรตามเงื่อนไขที่เลือก</div>
                <div style="font-size: 12px; color: var(--muted);">เมื่อมีการทำรายการสลับเวร รายการจะถูกบันทึกและแสดงที่นี่แบบเรียลไทม์</div>
              </div>
            </td>
          </tr>
        `;
        return;
      }

      let html = "";
      targetList.forEach((item, idx) => {
        const norm = normalizeHistoryItem(item);
        const tag = item.tag || item.swapTag || (item.detail && item.detail.match(/\[(.*?)\]/) ? `[${item.detail.match(/\[(.*?)\]/)[1]}]` : "[สลับเวร]");

        let badgeClass = "swap-badge-general";
        if (tag.includes("สัปดาห์")) badgeClass = "swap-badge-week";
        else if (tag.includes("วันหยุด")) badgeClass = "swap-badge-holiday";
        else if (tag.includes("รายวัน")) badgeClass = "swap-badge-type";
        else if (tag.includes("ยกเลิก")) badgeClass = "badge-danger";

        const timeDisplay = item.dateStr ? `${item.dateStr} <span style="color:var(--muted); font-size:11px;">(${item.timeStr || ''})</span>` : (item.date ? `${item.date} <span style="color:var(--muted); font-size:11px;">(${item.time || ''})</span>` : (item.time || "-"));

        // Column A: Requester / Origin
        const colA = `
          <div class="swap-agent-cell">
            <div class="swap-agent-name">
              <span>👤</span> <strong>${norm.thA}</strong>
              ${norm.nameA && norm.nameA !== norm.thA ? `<span style="color:var(--muted); font-weight:normal; font-size:11px;">(${norm.nameA})</span>` : ''}
            </div>
            ${norm.descA && norm.descA !== '-' ? `<div class="swap-agent-detail">📍 ${norm.descA}</div>` : ''}
          </div>
        `;

        // Column B: Partner / Target
        const colB = norm.isCancellation ? `
          <div style="color: #64748b; font-size: 11.5px; font-style: italic;">
            (คืนค่ากะเดิม)
          </div>
        ` : `
          <div class="swap-agent-cell">
            <div class="swap-agent-name">
              <span>👥</span> <strong>${norm.thB}</strong>
              ${norm.nameB && norm.nameB !== norm.thB ? `<span style="color:var(--muted); font-weight:normal; font-size:11px;">(${norm.nameB})</span>` : ''}
            </div>
            ${norm.descB && norm.descB !== '-' ? `<div class="swap-agent-detail">📍 ${norm.descB}</div>` : ''}
          </div>
        `;

        // Column Result: Work Exchange Summary
        let colResult = "";
        if (norm.isCancellation) {
          colResult = `
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 6px 10px; font-size: 11.5px; color: #991b1b;">
              ↩️ <strong>ยกเลิกการสลับเวร:</strong> คืนค่ากะเดิมให้ทั้งสองฝ่ายเรียบร้อยแล้ว
              ${item.note ? `<div style="font-size:10.5px; color:#b91c1c; margin-top:2px;">${item.note}</div>` : ''}
            </div>
          `;
        } else {
          colResult = `
            <div class="swap-result-box">
              <div style="margin-bottom: 4px; color: #1e3a8a;">
                <strong>${norm.thA}:</strong> ➔ สลับไปทำ: <span style="font-weight:600; color:#1e40af;">${norm.descB}</span>
              </div>
              <div style="color: #065f46;">
                <strong>${norm.thB}:</strong> ➔ สลับไปทำ: <span style="font-weight:600; color:#047857;">${norm.descA}</span>
              </div>
              ${item.note ? `<div style="font-size:10.5px; color:#64748b; margin-top:4px; font-style:italic;">💬 ${item.note}</div>` : ''}
            </div>
          `;
        }

        // Column Detail: Operator + Action Button
        const isByAdmin = norm.performedBy.includes('Admin');
        const revertBtnHtml = (!norm.isCancellation && norm.canRevert) ? `
          <div style="margin-top: 6px;">
            <button type="button" class="btn btn-outline btn-sm" onclick="revertSwapRecord('${item.id}')" style="color: #ef4444; border-color: #fca5a5; background: white; font-size: 11px; padding: 3px 8px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;" title="ยกเลิกการสลับนี้และคืนค่ากะเดิม">
              <span>↩️</span> ยกเลิกการสลับนี้
            </button>
          </div>
        ` : '';

        const colDetail = `
          <div style="font-size: 11px; color: var(--muted); line-height: 1.4;">
            <div style="margin-bottom: 4px;">
              <span class="badge" style="font-size: 11px; padding: 3px 8px; background: ${isByAdmin ? '#fee2e2; color:#991b1b; border: 1px solid #fecaca;' : '#e0e7ff; color:#3730a3; border: 1px solid #c7d2fe;'} font-weight: 700; border-radius: 4px; display:inline-block;">
                👤 ผู้ทำรายการ: <strong>${norm.performedBy}</strong>
              </span>
            </div>
            <div>🆔 <code>${item.id || '-'}</code></div>
            ${revertBtnHtml}
          </div>
        `;

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
      if (!currentUser || (!isAdminMode && currentUser.role !== "ADMIN")) {
        showToast("🔒 เฉพาะหัวหน้างาน (Admin) เท่านั้นที่สามารถล้างประวัติการสลับเวรได้");
        if (typeof openLoginGateModal === "function") openLoginGateModal();
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

    // =========================================================================
    // DAILY SHIFT SWAP CONTROLLER (Daily Exceptions / Overrides)
    // =========================================================================

    function getDailySwapsForMonth(yearAD, month) {
      const key = `${yearAD}-${month}`;
      const mData = monthSchedules[key];
      if (!mData) return [];
      if (!mData.dailySwaps) mData.dailySwaps = [];
      return mData.dailySwaps;
    }

    /**
     * Given a month, day, and schedule, return effective assignments for each weekday column
     * where any active daily swap on this day has been applied.
     */
    function getEffectiveAssignmentsForDay(yearAD, month, day, sched) {
      if (!sched || !Array.isArray(sched.weeks)) return [];
      const wIdx = findWeekIndexForDay(sched, day);
      const week = sched.weeks[wIdx];
      if (!week || !Array.isArray(week.assignments)) return [];

      // Deep clone assignments for this week: [col0: [agent...], col1: [...], ...]
      const eff = week.assignments.map(arr => Array.isArray(arr) ? [...arr] : []);

      const swaps = getDailySwapsForMonth(yearAD, month);
      if (!swaps || swaps.length === 0) return eff;

      swaps.forEach(sw => {
        // Same-day swap: both dateA and dateB match day
        if (sw.dateA === day && sw.dateB === day) {
          if (sw.shiftA && sw.shiftB) {
            const { cIdx: cA, sIdx: sA } = sw.shiftA;
            const { cIdx: cB, sIdx: sB } = sw.shiftB;
            if (eff[cA] && eff[cB]) {
              eff[cA][sA] = sw.agentB;
              eff[cB][sB] = sw.agentA;
            }
          }
        } else {
          // Cross-day swap
          if (sw.dateA === day && sw.shiftA) {
            const { cIdx: cA, sIdx: sA } = sw.shiftA;
            if (eff[cA]) eff[cA][sA] = sw.agentB;
          }
          if (sw.dateB === day && sw.shiftB) {
            const { cIdx: cB, sIdx: sB } = sw.shiftB;
            if (eff[cB]) eff[cB][sB] = sw.agentA;
          }
        }
      });

      return eff;
    }

    /**
     * Open Daily Swap Modal
     */
    function openDailySwapModal(preselectAgent = "", preselectDate = null) {
      if (!currentUser) {
        showToast("🔒 กรุณาเข้าสู่ระบบ (Login) ก่อนดำเนินการสลับกะรายวัน");
        if (typeof openLoginGateModal === "function") openLoginGateModal();
        return;
      }
      if (isViewingOriginal) {
        showToast("ℹ️ กำลังดูตารางต้นฉบับ ไม่สามารถสลับเวรได้ กรุณาสลับไปดูตารางปัจจุบัน");
        return;
      }
      if (!allowUserSwap && !isAdminMode) {
        showToast("🔒 ขณะนี้ระบบปิดรับการสลับเวรแล้ว หากจำเป็นต้องสลับกรุณาแจ้งหัวหน้างาน");
        return;
      }
      if (!preselectAgent && currentUser && currentUser.role !== "ADMIN") {
        preselectAgent = currentUser.username;
      }

      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const sched = currentSchedule;

      // 1. Populate Date Select with working days
      const dateSelect = document.getElementById("dailySwapDateSelect");
      const dateBSelect = document.getElementById("dailySwapDateBSelect");
      if (!dateSelect) return;

      dateSelect.innerHTML = "";
      if (dateBSelect) dateBSelect.innerHTML = "";

      const cal = buildCalendarWeeksAndHolidays(yearAD, month);
      const holidayDates = new Set((sched.holidays || []).map(h => Number(h.date)));
      const daysInMonth = new Date(yearAD, month, 0).getDate();

      const workingDays = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dt = new Date(yearAD, month - 1, d);
        const dow = dt.getDay();
        if (dow >= 1 && dow <= 5 && !holidayDates.has(d)) {
          workingDays.push(d);
          const dowName = THAI_DAYS[dow];
          const mShort = THAI_MONTHS_SHORT[month];
          const wIdx = findWeekIndexForDay(sched, d);
          const opt = document.createElement("option");
          opt.value = d;
          opt.textContent = `วันที่ ${d} ${mShort} (${dowName}) - สัปดาห์ที่ ${wIdx + 1}`;
          dateSelect.appendChild(opt);

          if (dateBSelect) {
            const optB = document.createElement("option");
            optB.value = d;
            optB.textContent = `วันที่ ${d} ${mShort} (${dowName}) - สัปดาห์ที่ ${wIdx + 1}`;
            dateBSelect.appendChild(optB);
          }
        }
      }

      // Default date selection
      if (preselectDate && workingDays.includes(Number(preselectDate))) {
        dateSelect.value = preselectDate;
      } else {
        const today = new Date();
        if (today.getFullYear() === yearAD && (today.getMonth() + 1) === month && workingDays.includes(today.getDate())) {
          dateSelect.value = today.getDate();
        } else if (workingDays.length > 0) {
          dateSelect.value = workingDays[0];
        }
      }

      // Reset radio to SAME_DAY
      const radios = document.getElementsByName("dailySwapType");
      radios.forEach(r => { if (r.value === "SAME_DAY") r.checked = true; });
      toggleDailySwapCrossDayUI(false);

      // Reset reason
      const reasonInput = document.getElementById("dailySwapReason");
      if (reasonInput) reasonInput.value = "";

      // Populate Agents for selected Date
      onDailySwapDateChange(preselectAgent);

      // Render Active Swaps List
      renderActiveDailySwapsList();

      // Show modal
      document.getElementById("dailySwapModal").classList.add("show");
    }

    function closeDailySwapModal() {
      const modal = document.getElementById("dailySwapModal");
      if (modal) modal.classList.remove("show");
    }

    function toggleDailySwapCrossDayUI(isCrossDay) {
      const wrap = document.getElementById("dailySwapCrossDayWrap");
      if (wrap) {
        wrap.style.display = isCrossDay ? "block" : "none";
      }
    }

    function onDailySwapDateChange(desiredAgentA = "") {
      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const day = parseInt(document.getElementById("dailySwapDateSelect").value, 10);
      const sched = currentSchedule;

      const wIdx = findWeekIndexForDay(sched, day);
      const week = sched.weeks && sched.weeks[wIdx];
      const customTimes = (week && week.customTimes) || {};

      const selectA = document.getElementById("dailySwapAgentA");
      if (!selectA) return;
      selectA.innerHTML = "";

      // Gather all working slots in this week
      const rosterList = [];
      WEEKDAY_COLUMNS.forEach((col, cIdx) => {
        const list = (week && week.assignments && week.assignments[cIdx]) || [];
        const shiftTime = customTimes[cIdx]?.time || col.time;
        list.forEach((ag, sIdx) => {
          if (ag && ag !== "-") {
            rosterList.push({
              agent: ag,
              cIdx,
              sIdx,
              wIdx,
              time: shiftTime,
              role: col.role,
              breakTime: customTimes[cIdx]?.breakTime || col.breakTime
            });
          }
        });
      });

      // Sort by agent Thai name
      rosterList.sort((a, b) => {
        const nameA = AGENT_NAME_MAP[a.agent] || a.agent;
        const nameB = AGENT_NAME_MAP[b.agent] || b.agent;
        return nameA.localeCompare(nameB, 'th');
      });

      rosterList.forEach(item => {
        const th = AGENT_NAME_MAP[item.agent] || item.agent;
        const opt = document.createElement("option");
        opt.value = JSON.stringify(item);
        opt.textContent = `คุณ${th} • กะ ${item.time} (${item.role})`;
        selectA.appendChild(opt);
      });

      // If desiredAgentA is specified, select it
      if (desiredAgentA) {
        for (let i = 0; i < selectA.options.length; i++) {
          try {
            const data = JSON.parse(selectA.options[i].value);
            if ((typeof isSameAgent === "function" && isSameAgent(data.agent, desiredAgentA)) || data.agent === desiredAgentA) {
              selectA.selectedIndex = i;
              break;
            }
          } catch (e) {}
        }
      }

      onDailySwapAgentAChange();
    }

    function onDailySwapAgentAChange() {
      const selectA = document.getElementById("dailySwapAgentA");
      const selectB = document.getElementById("dailySwapAgentB");
      const prevA = document.getElementById("dailySwapShiftAPreview");
      if (!selectA || !selectB) return;

      let itemA = null;
      try {
        itemA = JSON.parse(selectA.value);
      } catch (e) {}

      if (prevA && itemA) {
        prevA.innerHTML = `⏰ เวลากะ: <strong>${itemA.time}</strong> • หน้าที่: <strong>${itemA.role}</strong> ${itemA.breakTime ? `(พัก ${itemA.breakTime})` : ''}`;
      }

      // Populate selectB excluding itemA.agent
      selectB.innerHTML = "";
      for (let i = 0; i < selectA.options.length; i++) {
        try {
          const item = JSON.parse(selectA.options[i].value);
          if (!itemA || item.agent !== itemA.agent) {
            const th = AGENT_NAME_MAP[item.agent] || item.agent;
            const opt = document.createElement("option");
            opt.value = selectA.options[i].value;
            opt.textContent = `คุณ${th} • กะ ${item.time} (${item.role})`;
            selectB.appendChild(opt);
          }
        } catch (e) {}
      }

      onDailySwapAgentBChange();
    }

    function onDailySwapAgentBChange() {
      const selectB = document.getElementById("dailySwapAgentB");
      const prevB = document.getElementById("dailySwapShiftBPreview");
      if (!selectB) return;

      let itemB = null;
      try {
        itemB = JSON.parse(selectB.value);
      } catch (e) {}

      if (prevB && itemB) {
        prevB.innerHTML = `⏰ เวลากะ: <strong>${itemB.time}</strong> • หน้าที่: <strong>${itemB.role}</strong> ${itemB.breakTime ? `(พัก ${itemB.breakTime})` : ''}`;
      }
    }

    function executeDailySwap() {
      if (!currentUser) {
        showToast("🔒 กรุณาเข้าสู่ระบบ (Login) ก่อนดำเนินการสลับกะรายวัน");
        if (typeof openLoginGateModal === "function") openLoginGateModal();
        return;
      }
      if (!allowUserSwap && !isAdminMode) {
        showToast("🔒 ขณะนี้ระบบปิดรับการสลับเวรแล้ว");
        return;
      }

      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const dayA = parseInt(document.getElementById("dailySwapDateSelect").value, 10);

      const selectA = document.getElementById("dailySwapAgentA");
      const selectB = document.getElementById("dailySwapAgentB");
      if (!selectA || !selectB || !selectA.value || !selectB.value) {
        showToast("⚠️ กรุณาเลือกคู่ที่ต้องการสลับกะ");
        return;
      }

      let itemA = null;
      let itemB = null;
      try {
        itemA = JSON.parse(selectA.value);
        itemB = JSON.parse(selectB.value);
      } catch (e) {
        showToast("⚠️ เกิดข้อผิดพลาดในการอ่านข้อมูลกะ");
        return;
      }

      if (itemA.agent === itemB.agent) {
        showToast("⚠️ ไม่สามารถสลับกะกับตนเองได้");
        return;
      }

      // Member mode: must involve current user
      if (!isAdminMode && currentUser.role !== "ADMIN") {
        const isUserA = (typeof isCurrentUserAgent === "function") ? isCurrentUserAgent(itemA.agent) : (itemA.agent === currentUser.username);
        const isUserB = (typeof isCurrentUserAgent === "function") ? isCurrentUserAgent(itemB.agent) : (itemB.agent === currentUser.username);
        if (!isUserA && !isUserB) {
          const myName = currentUser.nameTH || currentUser.username;
          showToast(`⚠️ ท่านสามารถเลือกสลับเฉพาะกะของตนเอง (คุณ${myName}) กับเพื่อนร่วมงานเท่านั้น`);
          return;
        }
      }

      let isCrossDay = false;
      const typeRadios = document.getElementsByName("dailySwapType");
      for (const r of typeRadios) {
        if (r.checked && r.value === "CROSS_DAY") isCrossDay = true;
      }

      let dayB = dayA;
      if (isCrossDay) {
        dayB = parseInt(document.getElementById("dailySwapDateBSelect").value, 10) || dayA;
      }

      const reason = (document.getElementById("dailySwapReason").value || "").trim();
      const performedBy = typeof getCurrentOperatorName === "function" ? getCurrentOperatorName() : "ผู้ใช้งานในระบบ";

      const thA = AGENT_NAME_MAP[itemA.agent] || itemA.agent;
      const thB = AGENT_NAME_MAP[itemB.agent] || itemB.agent;
      const mShort = THAI_MONTHS_SHORT[month];

      const swapRecord = {
        id: "DSWAP_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        yearAD,
        month,
        dateA: dayA,
        dateB: dayB,
        isCrossDay,
        agentA: itemA.agent,
        agentB: itemB.agent,
        agentAName: thA,
        agentBName: thB,
        shiftA: {
          wIdx: itemA.wIdx,
          cIdx: itemA.cIdx,
          sIdx: itemA.sIdx,
          time: itemA.time,
          role: itemA.role
        },
        shiftB: {
          wIdx: itemB.wIdx,
          cIdx: itemB.cIdx,
          sIdx: itemB.sIdx,
          time: itemB.time,
          role: itemB.role
        },
        reason,
        performedBy,
        createdAt: new Date().toISOString()
      };

      const key = `${yearAD}-${month}`;
      const mData = getOrInitMonthSchedule(yearAD, month);
      if (!mData.dailySwaps) mData.dailySwaps = [];
      mData.dailySwaps.push(swapRecord);

      // Add to audit swapHistory
      const now = new Date();
      const dateStr = now.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
      const timeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

      const dayText = isCrossDay 
        ? `วันที่ ${dayA} และ ${dayB} ${mShort}` 
        : `วันที่ ${dayA} ${mShort}`;

      const historyItem = {
        id: swapRecord.id,
        tag: "[สลับเวรรายวัน]",
        date: dateStr,
        time: timeStr,
        personA: thA,
        descA: `กะเดิม: ${itemA.time} (${itemA.role})`,
        personB: thB,
        descB: `กะเดิม: ${itemB.time} (${itemB.role})`,
        month: month,
        yearAD: yearAD,
        performedBy: performedBy,
        note: `สลับเฉพาะ${dayText}${reason ? ' • ' + reason : ''}`
      };

      if (!swapHistory) swapHistory = [];
      swapHistory.unshift(historyItem);
      mData.swapHistory = swapHistory;

      // Trigger Cloud Auto-Save
      triggerAutoSaveToCloud(`สลับเวรรายวัน: คุณ${thA} 🔁 คุณ${thB} (${dayText})`);

      // Refresh Views
      renderMasterWeekdayTable();
      renderIndividualCards();
      renderHourlyHeadcountTable();
      renderSwapHistoryTable();

      showToast(`🔀 บันทึกการสลับกะรายวัน (${dayText}) คุณ${thA} 🔁 คุณ${thB} เรียบร้อยแล้ว`);
      closeDailySwapModal();
    }

    
        function deleteDailySwap(swapId) {
      if (!currentUser) {
        showToast("🔒 กรุณาเข้าสู่ระบบ (Login) ก่อนดำเนินการยกเลิกการสลับเวร");
        if (typeof openLoginGateModal === "function") openLoginGateModal();
        return;
      }
      let targetMonthKey = null;
      let removed = null;

      // 1. Remove from dailySwaps
      for (const k of Object.keys(monthSchedules)) {
        const dSwaps = monthSchedules[k].dailySwaps;
        if (Array.isArray(dSwaps)) {
          const idx = dSwaps.findIndex(s => s.id === swapId);
          if (idx !== -1) {
            targetMonthKey = k;
            removed = dSwaps.splice(idx, 1)[0];
            break;
          }
        }
      }

      // 2. Remove matching original record from swapHistory across all months
      for (const k of Object.keys(monthSchedules)) {
        const hList = monthSchedules[k].swapHistory;
        if (Array.isArray(hList)) {
          const origIdx = hList.findIndex(h => h.id === swapId);
          if (origIdx !== -1) {
            hList.splice(origIdx, 1);
          }
        }
      }

      if (!removed) {
        showToast("⚠️ ไม่พบรายการสลับกะรายวัน หรือรายการนี้ถูกยกเลิกไปแล้ว");
        return;
      }

      // Member mode: Can only delete swap involving self
      if (!isAdminMode && currentUser.role !== "ADMIN") {
        const myUser = currentUser.username;
        const myName = currentUser.nameTH;
        const involved = (typeof isCurrentUserAgent === "function") ? (isCurrentUserAgent(removed.agentAName) || isCurrentUserAgent(removed.agentBName) || isCurrentUserAgent(removed.agentA) || isCurrentUserAgent(removed.agentB)) : (removed.agentAName === myUser || removed.agentBName === myUser || removed.agentAName === myName || removed.agentBName === myName);
        if (!involved) {
          showToast(`⚠️ ท่านสามารถยกเลิกได้เฉพาะรายการสลับเวรที่ตนเอง (คุณ${myName || myUser}) มีส่วนเกี่ยวข้องเท่านั้น`);
          // Restore back
          const mData = monthSchedules[targetMonthKey];
          if (mData && Array.isArray(mData.dailySwaps)) mData.dailySwaps.push(removed);
          return;
        }
      }

      const now = new Date();
      const dateStr = now.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
      const timeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
      const performedBy = typeof getCurrentOperatorName === "function" ? getCurrentOperatorName() : "ผู้ใช้งานในระบบ";

      const historyItem = {
        id: "CAN_" + Date.now(),
        tag: "[ยกเลิกสลับเวรรายวัน]",
        date: dateStr,
        time: timeStr,
        personA: removed.agentAName,
        descA: "คืนค่ากะเดิม: " + ((removed.shiftA && removed.shiftA.time) || "-"),
        personB: removed.agentBName,
        descB: "คืนค่ากะเดิม: " + ((removed.shiftB && removed.shiftB.time) || "-"),
        month: removed.month,
        yearAD: removed.yearAD,
        performedBy: performedBy,
        note: "ยกเลิกการสลับเวรของวันที่ " + removed.dateA
      };

      const mData = monthSchedules[targetMonthKey] || getOrInitMonthSchedule(removed.yearAD, removed.month);
      if (!mData.swapHistory) mData.swapHistory = [];
      mData.swapHistory.unshift(historyItem);
      swapHistory = mData.swapHistory;

      triggerAutoSaveToCloud("ยกเลิกการสลับเวรรายวัน: คุณ" + removed.agentAName + " 🔁 คุณ" + removed.agentBName + " โดย " + performedBy);

      if (typeof renderAllViews === "function") renderAllViews();
      renderActiveDailySwapsList();
      renderActiveSwapsHub();
      renderSwapHistoryTable();

      showToast("🗑️ ยกเลิกการสลับกะรายวันวันที่ " + removed.dateA + " เรียบร้อยแล้ว (คืนค่ากะเดิม)");
    }

function renderActiveDailySwapsList() {
      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const container = document.getElementById("dailySwapsListContainer");
      const badge = document.getElementById("dailySwapCountBadge");
      if (!container) return;

      const swaps = getDailySwapsForMonth(yearAD, month);
      if (badge) badge.textContent = `${swaps.length} รายการ`;

      if (swaps.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:12px; color:var(--muted); font-size:11.5px; background:#f8fafc; border-radius:6px;">✨ ยังไม่มีการสลับเวรรายวันในเดือนนี้</div>`;
        return;
      }

      const mShort = THAI_MONTHS_SHORT[month];
      container.innerHTML = swaps.map(sw => {
        const dText = sw.isCrossDay ? `วันที่ ${sw.dateA} และ ${sw.dateB} ${mShort}` : `วันที่ ${sw.dateA} ${mShort}`;
        return `
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 10px; font-size:11.5px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
            <div>
              <div style="font-weight:700; color:#0369a1;">
                📅 ${dText}: <strong>คุณ${sw.agentAName}</strong> (${sw.shiftA.time}) 🔁 <strong>คุณ${sw.agentBName}</strong> (${sw.shiftB.time})
              </div>
              <div style="font-size:10.5px; color:#64748b; margin-top:2px;">
                หน้าที่: ${sw.shiftA.role} 🔁 ${sw.shiftB.role} ${sw.reason ? `• <em>${sw.reason}</em>` : ''}
              </div>
            </div>
            <button class="btn btn-outline btn-sm" onclick="deleteDailySwap('${sw.id}')" style="color:#ef4444; border-color:#fca5a5; background:white; font-size:11px; padding:2px 8px; white-space:nowrap;" title="ยกเลิกการสลับนี้และคืนค่ากะเดิม">
              🗑️ ยกเลิก
            </button>
          </div>
        `;
      }).join("");
    }


    
    // =========================================================================
    // HOLIDAY SHIFT TRANSFER (1-WAY HANDOVER / SUBSTITUTION) CONTROLLER
    // =========================================================================

    function openHolidayTransferModal(preselectedSlot = null) {
      if (!currentUser) {
        showToast("🔒 กรุณาเข้าสู่ระบบ (Login) ก่อนดำเนินการแลกเวรวันหยุด");
        if (typeof openLoginGateModal === "function") openLoginGateModal();
        return;
      }
      if (isViewingOriginal) {
        showToast("ℹ️ กำลังดูตารางต้นฉบับ ไม่สามารถแลกเวรได้ กรุณาสลับไปดูตารางปัจจุบัน");
        return;
      }
      if (!allowUserSwap && !isAdminMode && currentUser.role !== "ADMIN") {
        showToast("🔒 ขณะนี้ระบบปิดรับการแลกเวรแล้ว (หากจำเป็นต้องแลกกรุณาติดต่อ Admin)");
        return;
      }

      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const curData = getOrInitMonthSchedule(yearAD, month);
      const sched = curData.schedule;

      if (!sched || !Array.isArray(sched.holidays) || sched.holidays.length === 0) {
        showToast("ℹ️ เดือนนี้ไม่มีตารางเวรวันหยุด");
        return;
      }

      const dateSelect = document.getElementById("holTransferDateSelect");
      if (!dateSelect) return;
      dateSelect.innerHTML = "";

      const mShort = THAI_MONTHS_SHORT[month];
      sched.holidays.forEach((h, hIdx) => {
        const opt = document.createElement("option");
        opt.value = hIdx;
        opt.textContent = `${h.dayName}ที่ ${h.date} ${mShort} (${h.holidayName || 'วันหยุด'})`;
        dateSelect.appendChild(opt);
      });

      if (preselectedSlot && preselectedSlot.hIdx !== undefined) {
        dateSelect.value = preselectedSlot.hIdx;
      }

      const reasonInput = document.getElementById("holTransferReasonInput");
      if (reasonInput) reasonInput.value = "";

      onHolidayTransferDateChange(preselectedSlot);

      const modal = document.getElementById("holidayTransferModal");
      if (modal) modal.classList.add("show");
    }

    function closeHolidayTransferModal() {
      const modal = document.getElementById("holidayTransferModal");
      if (modal) modal.classList.remove("show");
    }

    function onHolidayTransferDateChange(preselectedSlot = null) {
      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const curData = getOrInitMonthSchedule(yearAD, month);
      const sched = curData.schedule;
      const dateSelect = document.getElementById("holTransferDateSelect");
      const shiftSelect = document.getElementById("holTransferShiftSelect");
      if (!dateSelect || !shiftSelect) return;

      const hIdx = parseInt(dateSelect.value, 10);
      const h = sched.holidays && sched.holidays[hIdx];
      if (!h || !Array.isArray(h.shifts)) return;

      shiftSelect.innerHTML = "";
      let defaultShiftIdx = 0;
      let foundMyShift = false;

      h.shifts.forEach((ag, sIdx) => {
        const thName = (typeof AGENT_NAME_MAP !== "undefined" && AGENT_NAME_MAP[ag]) ? AGENT_NAME_MAP[ag] : (ag || "-");
        const meta = (typeof HOLIDAY_SHIFT_META !== "undefined" && HOLIDAY_SHIFT_META[sIdx]) ? HOLIDAY_SHIFT_META[sIdx] : {};
        const time = meta.time || "09.00-18.00 น.";
        const role = meta.role || `กะที่ ${sIdx + 1}`;
        const opt = document.createElement("option");
        opt.value = sIdx;
        opt.textContent = `กะที่ ${sIdx + 1} (${time}): คุณ${thName} [${role}]`;
        shiftSelect.appendChild(opt);

        if (currentUser && (typeof isCurrentUserAgent === "function" ? isCurrentUserAgent(ag) : ag === currentUser.username)) {
          defaultShiftIdx = sIdx;
          foundMyShift = true;
        }
      });

      if (preselectedSlot && preselectedSlot.sIdx !== undefined && preselectedSlot.hIdx === hIdx) {
        shiftSelect.value = preselectedSlot.sIdx;
      } else if (foundMyShift) {
        shiftSelect.value = defaultShiftIdx;
      }

      onHolidayTransferShiftChange();
    }

    function onHolidayTransferShiftChange() {
      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const curData = getOrInitMonthSchedule(yearAD, month);
      const sched = curData.schedule;
      const dateSelect = document.getElementById("holTransferDateSelect");
      const shiftSelect = document.getElementById("holTransferShiftSelect");
      const infoBox = document.getElementById("holTransferShiftInfoBox");
      const subSelect = document.getElementById("holTransferSubstituteSelect");
      if (!dateSelect || !shiftSelect || !subSelect) return;

      const hIdx = parseInt(dateSelect.value, 10);
      const sIdx = parseInt(shiftSelect.value, 10);
      const h = sched.holidays && sched.holidays[hIdx];
      if (!h) return;

      const curAgent = h.shifts[sIdx];
      const thCurr = (typeof AGENT_NAME_MAP !== "undefined" && AGENT_NAME_MAP[curAgent]) ? AGENT_NAME_MAP[curAgent] : (curAgent || "-");
      const meta = (typeof HOLIDAY_SHIFT_META !== "undefined" && HOLIDAY_SHIFT_META[sIdx]) ? HOLIDAY_SHIFT_META[sIdx] : {};

      if (infoBox) {
        infoBox.innerHTML = `
          <div style="font-size:12px; color:#0369a1; font-weight:600;">
            🕒 เวลาทำงาน: <strong>${meta.time || '09.00-18.00 น.'}</strong> | 📌 บทบาท: <strong>${meta.role || ''}</strong>
          </div>
          <div style="font-size:11.5px; color:#64748b; margin-top:2px;">
            ☕ เวลาพัก: ${meta.breakTime || '-'} ${meta.jd ? `| <span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:10.5px;">JD: ${meta.jd}</span>` : ''}
          </div>
        `;
      }

      // Identify all agents currently on duty on this holiday
      const workingSet = new Set((h.shifts || []).filter(x => x && x !== "-"));

      // Available substitutes: agents NOT working today (typically 16 agents)
      const freeAgents = (typeof AGENTS !== "undefined" ? AGENTS : []).filter(a => !workingSet.has(a));
      freeAgents.sort((a, b) => {
        const nameA = (typeof AGENT_NAME_MAP !== "undefined" && AGENT_NAME_MAP[a]) ? AGENT_NAME_MAP[a] : a;
        const nameB = (typeof AGENT_NAME_MAP !== "undefined" && AGENT_NAME_MAP[b]) ? AGENT_NAME_MAP[b] : b;
        return nameA.localeCompare(nameB, 'th');
      });

      subSelect.innerHTML = "";
      if (freeAgents.length === 0) {
        subSelect.innerHTML = `<option value="">-- ไม่มีเพื่อนร่วมงานที่ว่างในวันนี้ --</option>`;
      } else {
        freeAgents.forEach(ag => {
          const th = (typeof AGENT_NAME_MAP !== "undefined" && AGENT_NAME_MAP[ag]) ? AGENT_NAME_MAP[ag] : ag;
          const opt = document.createElement("option");
          opt.value = ag;
          opt.textContent = `คุณ${th} (${ag}) - [ไม่มีเวรวันนี้ พร้อมเข้าแทน]`;
          subSelect.appendChild(opt);
        });
      }

      updateHolidayTransferPreview();
    }

    function updateHolidayTransferPreview() {
      const dateSelect = document.getElementById("holTransferDateSelect");
      const shiftSelect = document.getElementById("holTransferShiftSelect");
      const subSelect = document.getElementById("holTransferSubstituteSelect");
      const prevBox = document.getElementById("holTransferPreviewBox");
      if (!prevBox || !dateSelect || !shiftSelect || !subSelect) return;

      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const curData = getOrInitMonthSchedule(yearAD, month);
      const sched = curData.schedule;
      const hIdx = parseInt(dateSelect.value, 10);
      const sIdx = parseInt(shiftSelect.value, 10);
      const subAgent = subSelect.value;
      const h = sched.holidays && sched.holidays[hIdx];

      if (!h || !subAgent) {
        prevBox.innerHTML = `<div style="color:var(--muted);">กรุณาเลือกข้อมูลให้ครบถ้วน</div>`;
        return;
      }

      const curAgent = h.shifts[sIdx];
      const thCurr = (typeof AGENT_NAME_MAP !== "undefined" && AGENT_NAME_MAP[curAgent]) ? AGENT_NAME_MAP[curAgent] : curAgent;
      const thSub = (typeof AGENT_NAME_MAP !== "undefined" && AGENT_NAME_MAP[subAgent]) ? AGENT_NAME_MAP[subAgent] : subAgent;
      const meta = (typeof HOLIDAY_SHIFT_META !== "undefined" && HOLIDAY_SHIFT_META[sIdx]) ? HOLIDAY_SHIFT_META[sIdx] : {};

      prevBox.innerHTML = `
        <div style="font-weight:700; color:#0369a1; margin-bottom:4px; font-size:12.5px;">
          📋 สรุปการแลกเวรออก:
        </div>
        <div style="color:#475569; margin-bottom:3px;">
          • <strong>ผู้ขอแลกออก:</strong> คุณ${thCurr} (ถอนตัวออกจากเวรนี้)
        </div>
        <div style="color:#15803d; font-weight:700; margin-bottom:3px;">
          • <strong>ผู้เข้าเวรแทน:</strong> คุณ${thSub} (เข้าปฏิบัติหน้าที่แทนในกะ ${meta.time || '09.00-18.00 น.'})
        </div>
        <div style="font-size:11.5px; color:#64748b; margin-top:4px;">
          📅 วันที่: ${h.dayName}ที่ ${h.date} (${h.holidayName || 'วันหยุด'}) • บทบาท: ${meta.role || ''}
        </div>
      `;
    }

    function submitHolidayTransfer() {
      if (!currentUser) {
        showToast("🔒 กรุณาเข้าสู่ระบบ (Login) ก่อนดำเนินการ");
        if (typeof openLoginGateModal === "function") openLoginGateModal();
        return;
      }
      if (isViewingOriginal) {
        showToast("ℹ️ กำลังดูตารางต้นฉบับ ไม่สามารถแลกเวรได้");
        return;
      }
      if (!allowUserSwap && !isAdminMode && currentUser.role !== "ADMIN") {
        showToast("🔒 ขณะนี้ระบบปิดรับการแลกเวรแล้ว (หากจำเป็นกรุณาติดต่อ Admin)");
        return;
      }

      const dateSelect = document.getElementById("holTransferDateSelect");
      const shiftSelect = document.getElementById("holTransferShiftSelect");
      const subSelect = document.getElementById("holTransferSubstituteSelect");
      const reasonInput = document.getElementById("holTransferReasonInput");
      if (!dateSelect || !shiftSelect || !subSelect) return;

      const hIdx = parseInt(dateSelect.value, 10);
      const sIdx = parseInt(shiftSelect.value, 10);
      const subAgent = subSelect.value;
      const reason = (reasonInput ? reasonInput.value : "").trim();

      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const mData = getOrInitMonthSchedule(yearAD, month);
      const sched = mData.schedule;
      const h = sched.holidays && sched.holidays[hIdx];

      if (!h || !subAgent) {
        showToast("⚠️ ข้อมูลการแลกเวรไม่ครบถ้วน");
        return;
      }

      const origAgent = h.shifts[sIdx];
      if (!origAgent || origAgent === "-") {
        showToast("⚠️ ไม่พบข้อมูลผู้เข้าเวรในกะนี้");
        return;
      }

      // Member mode authorization: must be user's own shift
      if (!isAdminMode && currentUser.role !== "ADMIN") {
        const isMine = (typeof isCurrentUserAgent === "function")
          ? (isCurrentUserAgent(origAgent) || isCurrentUserAgent(currentUser.username))
          : (origAgent === currentUser.username);
        if (!isMine) {
          const myName = currentUser.nameTH || currentUser.username;
          showToast(`⚠️ ท่านสามารถขอแลกเวรวันหยุดเฉพาะเวรของตนเอง (คุณ${myName}) ออกให้เพื่อนเท่านั้น`);
          return;
        }
      }

      // Validate subAgent is not already working
      if (h.shifts.includes(subAgent)) {
        showToast("⚠️ เพื่อนร่วมงานคนนี้มีเวรในวันดังกล่าวอยู่แล้ว");
        return;
      }

      // Execute substitution
      h.shifts[sIdx] = subAgent;

      const thOrig = (typeof AGENT_NAME_MAP !== "undefined" && AGENT_NAME_MAP[origAgent]) ? AGENT_NAME_MAP[origAgent] : origAgent;
      const thSub = (typeof AGENT_NAME_MAP !== "undefined" && AGENT_NAME_MAP[subAgent]) ? AGENT_NAME_MAP[subAgent] : subAgent;
      const meta = (typeof HOLIDAY_SHIFT_META !== "undefined" && HOLIDAY_SHIFT_META[sIdx]) ? HOLIDAY_SHIFT_META[sIdx] : {};
      const performedBy = typeof getCurrentOperatorName === "function" ? getCurrentOperatorName() : "ผู้ใช้งานในระบบ";
      const now = new Date();
      const dateStr = now.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
      const timeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

      const recordId = "HTRANS_" + Date.now();
      const historyItem = {
        id: recordId,
        type: "HOLIDAY_TRANSFER",
        tag: "[แลกเวรวันหยุด]",
        date: dateStr,
        time: timeStr,
        timestamp: now.toISOString(),
        performedBy: performedBy,
        yearAD: yearAD,
        month: month,
        personA: origAgent,
        thA: thOrig,
        descA: `${h.dayName} ${h.date} • กะที่ ${sIdx + 1} [${meta.time || '09.00-18.00 น.'}]`,
        personB: subAgent,
        thB: thSub,
        descB: `เข้าเวรแทน (${meta.role || ''})`,
        note: reason || `ส่งมอบเวรให้คุณ${thSub} เข้าเวรแทน (${h.holidayName || ''})`,
        holidaySlot: {
          yearAD: yearAD,
          month: month,
          hIdx: hIdx,
          sIdx: sIdx,
          origAgent: origAgent,
          subAgent: subAgent
        }
      };

      if (!swapHistory) swapHistory = [];
      swapHistory.unshift(historyItem);
      mData.swapHistory = swapHistory;

      currentSchedule = sched;

      triggerAutoSaveToCloud(`แลกเวรวันหยุด: คุณ${thOrig} ส่งมอบเวรให้คุณ${thSub} (${h.dayName} ${h.date}) โดย ${performedBy}`);
      closeHolidayTransferModal();

      if (typeof renderMasterHolidayTable === "function") renderMasterHolidayTable();
      if (typeof renderIndividualCards === "function") renderIndividualCards();
      if (typeof renderHourlyHeadcountTable === "function") renderHourlyHeadcountTable();
      if (typeof renderSwapHistoryTable === "function") renderSwapHistoryTable();
      if (typeof renderActiveSwapsHub === "function") renderActiveSwapsHub();

      showToast(`✅ แลกเวรสำเร็จ: คุณ${thOrig} ส่งมอบเวรให้คุณ${thSub} เรียบร้อยแล้ว`);
    }


    // =========================================================================
    // SHIFT SWAP HUB CONTROLLER (TAB 3 INTEGRATED WORKSPACE)
    // =========================================================================
    let currentSwapHubType = "DAILY"; // "DAILY" | "WEEKLY" | "HOLIDAY"
    let swapHubWorkingAgents = [];

    function initSwapHub(force = false) {
      const dateSelect = document.getElementById("swapHubDailyDateSelect");
      if (!dateSelect) return;
      if (!force && dateSelect.options && dateSelect.options.length > 0) {
        renderActiveSwapsHub();
        return;
      }
      onSwapHubTypeChange(currentSwapHubType, false);
      renderActiveSwapsHub();
    }

    function onSwapHubTypeChange(type, triggerChange = true) {
      currentSwapHubType = type;

      const btnDaily = document.getElementById("swapTypeBtnDaily");
      const btnWeekly = document.getElementById("swapTypeBtnWeekly");
      const btnHoliday = document.getElementById("swapTypeBtnHoliday");
      if (btnDaily) btnDaily.classList.toggle("active", type === "DAILY");
      if (btnWeekly) btnWeekly.classList.toggle("active", type === "WEEKLY");
      if (btnHoliday) btnHoliday.classList.toggle("active", type === "HOLIDAY");

      const dailyControls = document.getElementById("swapHubDailyControls");
      const weeklyControls = document.getElementById("swapHubWeeklyControls");
      const holidayControls = document.getElementById("swapHubHolidayControls");
      if (dailyControls) dailyControls.style.display = type === "DAILY" ? "flex" : "none";
      if (weeklyControls) weeklyControls.style.display = type === "WEEKLY" ? "flex" : "none";
      if (holidayControls) holidayControls.style.display = type === "HOLIDAY" ? "flex" : "none";

      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const curData = getOrInitMonthSchedule(yearAD, month);
      const sched = curData.schedule;

      if (type === "DAILY") {
        populateSwapHubDailyDates(yearAD, month, sched);
      } else if (type === "WEEKLY") {
        populateSwapHubWeeks(yearAD, month, sched);
      } else if (type === "HOLIDAY") {
        populateSwapHubHolidays(yearAD, month, sched);
      }
    }

    function populateSwapHubDailyDates(yearAD, month, sched) {
      const dateSelect = document.getElementById("swapHubDailyDateSelect");
      const dateBSelect = document.getElementById("swapHubDailyDateBSelect");
      if (!dateSelect) return;

      dateSelect.innerHTML = "";
      if (dateBSelect) dateBSelect.innerHTML = "";

      const cal = (typeof buildCalendarWeeksAndHolidays === "function") 
        ? buildCalendarWeeksAndHolidays(yearAD, month) 
        : { weeks: [], holidayList: [] };

      const workingDays = [];
      cal.weeks.forEach((w, wIdx) => {
        const days = (typeof getWeekWorkingDays === "function") 
          ? getWeekWorkingDays(w, yearAD, month, sched) 
          : [];
        days.forEach(d => {
          const dt = new Date(yearAD, month - 1, d);
          workingDays.push({
            day: d,
            dayName: THAI_DAYS[dt.getDay()],
            wIdx: wIdx,
            weekLabel: w.label
          });
        });
      });

      const mShort = THAI_MONTHS_SHORT[month];
      workingDays.forEach(item => {
        const opt = document.createElement("option");
        opt.value = item.day;
        opt.textContent = `${item.dayName}ที่ ${item.day} ${mShort} (${item.weekLabel})`;
        dateSelect.appendChild(opt);

        if (dateBSelect) {
          const optB = document.createElement("option");
          optB.value = item.day;
          optB.textContent = `${item.dayName}ที่ ${item.day} ${mShort} (${item.weekLabel})`;
          dateBSelect.appendChild(optB);
        }
      });

      onSwapHubDailyDateChange();
    }

    function toggleSwapHubDailyCrossDay() {
      const check = document.getElementById("swapHubDailyCrossDayCheck");
      const containerB = document.getElementById("swapHubDailyDateBContainer");
      if (containerB) {
        containerB.style.display = (check && check.checked) ? "flex" : "none";
      }
      onSwapHubDailyDateChange();
    }

    function onSwapHubDailyDateChange() {
      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const curData = getOrInitMonthSchedule(yearAD, month);
      const sched = curData.schedule;

      const dateSelect = document.getElementById("swapHubDailyDateSelect");
      if (!dateSelect || !dateSelect.value) return;
      const day = parseInt(dateSelect.value, 10);

      const effAssignments = getEffectiveAssignmentsForDay(yearAD, month, day, sched);
      const wIdx = (typeof findWeekIndexForDay === "function") ? findWeekIndexForDay(sched, day) : 0;
      const week = (sched.weeks && sched.weeks[wIdx]) ? sched.weeks[wIdx] : null;

      swapHubWorkingAgents = [];
      WEEKDAY_COLUMNS.forEach((col, cIdx) => {
        const agentsInCol = effAssignments[cIdx] || [];
        agentsInCol.forEach((ag, sIdx) => {
          if (!ag || ag === "-") return;
          const thName = AGENT_NAME_MAP[ag] || ag;
          const time = col.time || "";
          const role = col.role || "";
          const breakTime = (typeof getWeekdaySlotBreakTime === "function") 
            ? getWeekdaySlotBreakTime(cIdx, sIdx, col.breakTime) 
            : (col.breakTime || "");
          const jd = (week && week.colJDs && week.colJDs[cIdx]) ? week.colJDs[cIdx] : (col.jd || "");

          swapHubWorkingAgents.push({
            agent: ag,
            thName: thName,
            wIdx: wIdx,
            cIdx: cIdx,
            sIdx: sIdx,
            time: time,
            role: role,
            breakTime: breakTime,
            jd: jd
          });
        });
      });

      // Populate Agent A select
      const selA = document.getElementById("swapHubAgentASelect");
      if (!selA) return;
      selA.innerHTML = "";

      swapHubWorkingAgents.sort((a, b) => a.thName.localeCompare(b.thName, 'th'));

      swapHubWorkingAgents.forEach(item => {
        const opt = document.createElement("option");
        opt.value = item.agent;
        opt.textContent = `คุณ${item.thName} [${item.time}]`;
        selA.appendChild(opt);
      });

      if (currentUser && currentUser.username) {
        const match = swapHubWorkingAgents.find(it => (typeof isCurrentUserAgent === "function" ? isCurrentUserAgent(it.agent) : it.agent === currentUser.username));
        if (match) {
          selA.value = currentUser.username;
        }
      }

      onSwapHubAgentAChange();
    }

    function onSwapHubAgentAChange() {
      const selA = document.getElementById("swapHubAgentASelect");
      const selB = document.getElementById("swapHubAgentBSelect");
      const boxA = document.getElementById("swapHubAgentAShiftBox");
      if (!selA) return;

      const agA = selA.value;
      const itemA = swapHubWorkingAgents.find(it => it.agent === agA);

      if (itemA && boxA) {
        boxA.innerHTML = `
          <div style="font-size:13px; font-weight:700; color:#0369a1; margin-bottom:3px;">
            🕒 เวลาทำงาน: ${itemA.time}
          </div>
          <div style="color:#334155; margin-bottom:2px;">
            📌 บทบาท/กะ: <strong>${itemA.role}</strong>
          </div>
          <div style="color:#64748b; font-size:11.5px;">
            ☕ เวลาพัก: ${itemA.breakTime || '-'}
          </div>
          ${itemA.jd ? `<div style="margin-top:4px;"><span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:10.5px;">JD: ${itemA.jd}</span></div>` : ''}
        `;
      } else if (boxA) {
        boxA.innerHTML = `<div style="color:var(--muted);">ไม่พบข้อมูลกะ</div>`;
      }

      // Populate Agent B select with all agents EXCEPT Agent A
      if (selB) {
        selB.innerHTML = "";
        if (currentSwapHubType === "HOLIDAY") {
          // Off-duty colleagues available to substitute
          const workingSet = new Set(swapHubWorkingAgents.map(it => it.agent));
          const freeAgents = (typeof AGENTS !== "undefined" ? AGENTS : []).filter(a => !workingSet.has(a));
          freeAgents.sort((a, b) => {
            const nameA = (typeof AGENT_NAME_MAP !== "undefined" && AGENT_NAME_MAP[a]) ? AGENT_NAME_MAP[a] : a;
            const nameB = (typeof AGENT_NAME_MAP !== "undefined" && AGENT_NAME_MAP[b]) ? AGENT_NAME_MAP[b] : b;
            return nameA.localeCompare(nameB, 'th');
          });
          freeAgents.forEach(ag => {
            const th = (typeof AGENT_NAME_MAP !== "undefined" && AGENT_NAME_MAP[ag]) ? AGENT_NAME_MAP[ag] : ag;
            const opt = document.createElement("option");
            opt.value = ag;
            opt.textContent = `คุณ${th} (${ag}) - [ไม่มีเวรวันนี้ พร้อมเข้าแทน]`;
            selB.appendChild(opt);
          });
        } else {
          const partners = swapHubWorkingAgents.filter(it => it.agent !== agA);
          partners.forEach(item => {
            const opt = document.createElement("option");
            opt.value = item.agent;
            opt.textContent = `คุณ${item.thName} [${item.time} - ${item.role}]`;
            selB.appendChild(opt);
          });
        }
      }

      onSwapHubAgentBChange();
    }

    function onSwapHubAgentBChange() {
      const selB = document.getElementById("swapHubAgentBSelect");
      const boxB = document.getElementById("swapHubAgentBShiftBox");
      if (!selB) return;

      const agB = selB.value;
      const itemB = swapHubWorkingAgents.find(it => it.agent === agB);

      if (currentSwapHubType === "HOLIDAY" && boxB) {
        const thB = (typeof AGENT_NAME_MAP !== "undefined" && AGENT_NAME_MAP[agB]) ? AGENT_NAME_MAP[agB] : agB;
        const selA = document.getElementById("swapHubAgentASelect");
        const agA = selA ? selA.value : "";
        const itemA = swapHubWorkingAgents.find(it => it.agent === agA);
        boxB.innerHTML = `
          <div style="font-size:13px; font-weight:700; color:#15803d; margin-bottom:3px;">
            🤝 ผู้มารับหน้าที่แทน: คุณ${thB}
          </div>
          <div style="color:#334155; margin-bottom:2px;">
            📌 สถานะวันนี้: <strong>ไม่มีเวร (พร้อมปฏิบัติหน้าที่แทน)</strong>
          </div>
          <div style="color:#64748b; font-size:11.5px;">
            ✨ จะได้รับมอบหมายกะ: ${itemA ? itemA.time : ''} (${itemA ? itemA.role : ''})
          </div>
        `;
      } else if (itemB && boxB) {
        boxB.innerHTML = `
          <div style="font-size:13px; font-weight:700; color:#1e40af; margin-bottom:3px;">
            🕒 เวลาทำงาน: ${itemB.time}
          </div>
          <div style="color:#334155; margin-bottom:2px;">
            📌 บทบาท/กะ: <strong>${itemB.role}</strong>
          </div>
          <div style="color:#64748b; font-size:11.5px;">
            ☕ เวลาพัก: ${itemB.breakTime || '-'}
          </div>
          ${itemB.jd ? `<div style="margin-top:4px;"><span class="badge" style="background:#f1f5f9; color:#334155; font-size:10.5px;">JD: ${itemB.jd}</span></div>` : ''}
        `;
      } else if (boxB) {
        boxB.innerHTML = `<div style="color:var(--muted);">ยังไม่ได้เลือกเพื่อนร่วมงาน</div>`;
      }

      updateSwapHubPreview();
    }

    function populateSwapHubWeeks(yearAD, month, sched) {
      const weekSelect = document.getElementById("swapHubWeeklyWeekSelect");
      if (!weekSelect) return;
      weekSelect.innerHTML = "";

      if (!sched || !Array.isArray(sched.weeks)) return;
      sched.weeks.forEach((w, wIdx) => {
        const opt = document.createElement("option");
        opt.value = wIdx;
        opt.textContent = `สัปดาห์ที่ ${wIdx + 1}: ${w.label}`;
        weekSelect.appendChild(opt);
      });

      onSwapHubWeeklyWeekChange();
    }

    function onSwapHubWeeklyWeekChange() {
      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const curData = getOrInitMonthSchedule(yearAD, month);
      const sched = curData.schedule;

      const weekSelect = document.getElementById("swapHubWeeklyWeekSelect");
      if (!weekSelect) return;
      const wIdx = parseInt(weekSelect.value, 10);
      const week = sched.weeks[wIdx];
      if (!week || !Array.isArray(week.assignments)) return;

      swapHubWorkingAgents = [];
      WEEKDAY_COLUMNS.forEach((col, cIdx) => {
        const agents = week.assignments[cIdx] || [];
        agents.forEach((ag, sIdx) => {
          if (!ag || ag === "-") return;
          const thName = AGENT_NAME_MAP[ag] || ag;
          const time = col.time || "";
          const role = col.role || "";
          const breakTime = (typeof getWeekdaySlotBreakTime === "function") 
            ? getWeekdaySlotBreakTime(cIdx, sIdx, col.breakTime) 
            : (col.breakTime || "");
          const jd = (week.colJDs && week.colJDs[cIdx]) ? week.colJDs[cIdx] : (col.jd || "");

          swapHubWorkingAgents.push({
            agent: ag,
            thName: thName,
            wIdx: wIdx,
            cIdx: cIdx,
            sIdx: sIdx,
            time: time,
            role: role,
            breakTime: breakTime,
            jd: jd
          });
        });
      });

      const selA = document.getElementById("swapHubAgentASelect");
      if (!selA) return;
      selA.innerHTML = "";
      swapHubWorkingAgents.sort((a, b) => a.thName.localeCompare(b.thName, 'th'));

      swapHubWorkingAgents.forEach(item => {
        const opt = document.createElement("option");
        opt.value = item.agent;
        opt.textContent = `คุณ${item.thName} [${item.time} - ${item.role}]`;
        selA.appendChild(opt);
      });

      if (currentUser && currentUser.username) {
        const match = swapHubWorkingAgents.find(it => (typeof isCurrentUserAgent === "function" ? isCurrentUserAgent(it.agent) : it.agent === currentUser.username));
        if (match) selA.value = currentUser.username;
      }

      onSwapHubAgentAChange();
    }

    function populateSwapHubHolidays(yearAD, month, sched) {
      const holSelect = document.getElementById("swapHubHolidaySelect");
      if (!holSelect) return;
      holSelect.innerHTML = "";

      if (!sched || !Array.isArray(sched.holidays) || sched.holidays.length === 0) {
        holSelect.innerHTML = `<option value="">-- เดือนนี้ไม่มีเวรวันหยุด --</option>`;
        return;
      }

      const mShort = THAI_MONTHS_SHORT[month];
      sched.holidays.forEach((h, hIdx) => {
        const opt = document.createElement("option");
        opt.value = hIdx;
        opt.textContent = `${h.dayName}ที่ ${h.date} ${mShort} (${h.holidayName || 'วันหยุด'})`;
        holSelect.appendChild(opt);
      });

      onSwapHubHolidayChange();
    }

    function onSwapHubHolidayChange() {
      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const curData = getOrInitMonthSchedule(yearAD, month);
      const sched = curData.schedule;

      const holSelect = document.getElementById("swapHubHolidaySelect");
      if (!holSelect || holSelect.value === "") return;
      const hIdx = parseInt(holSelect.value, 10);
      const h = sched.holidays[hIdx];
      if (!h || !Array.isArray(h.shifts)) return;

      swapHubWorkingAgents = [];
      h.shifts.forEach((ag, sIdx) => {
        if (!ag || ag === "-") return;
        const thName = AGENT_NAME_MAP[ag] || ag;
        const meta = (typeof HOLIDAY_SHIFT_META !== "undefined" && HOLIDAY_SHIFT_META[sIdx]) ? HOLIDAY_SHIFT_META[sIdx] : {};
        const time = meta.time || "09.00-18.00 น.";
        const role = meta.role || `เวรวันหยุด กะที่ ${sIdx + 1}`;

        swapHubWorkingAgents.push({
          agent: ag,
          thName: thName,
          hIdx: hIdx,
          sIdx: sIdx,
          time: time,
          role: role,
          breakTime: meta.breakTime || "",
          jd: meta.jd || ""
        });
      });

      const selA = document.getElementById("swapHubAgentASelect");
      if (!selA) return;
      selA.innerHTML = "";
      swapHubWorkingAgents.forEach(item => {
        const opt = document.createElement("option");
        opt.value = item.agent;
        opt.textContent = `คุณ${item.thName} [${item.time} - ${item.role}]`;
        selA.appendChild(opt);
      });

      if (currentUser && currentUser.username) {
        const match = swapHubWorkingAgents.find(it => (typeof isCurrentUserAgent === "function" ? isCurrentUserAgent(it.agent) : it.agent === currentUser.username));
        if (match) selA.value = currentUser.username;
      }

      onSwapHubAgentAChange();
    }

    function updateSwapHubPreview() {
      const selA = document.getElementById("swapHubAgentASelect");
      const selB = document.getElementById("swapHubAgentBSelect");
      const prevEl = document.getElementById("swapHubPreviewText");
      if (!prevEl) return;

      const agA = selA ? selA.value : "";
      const agB = selB ? selB.value : "";

      if (!agA || !agB || agA === agB) {
        prevEl.innerHTML = `<span style="color:var(--muted);">กรุณาเลือกผู้ขอสลับ และ เพื่อนร่วมงานให้ครบถ้วน</span>`;
        return;
      }

      const itemA = swapHubWorkingAgents.find(it => it.agent === agA);
      if (currentSwapHubType === "HOLIDAY") {
        if (!itemA || !agB) {
          prevEl.innerHTML = `<span style="color:var(--muted);">ข้อมูลไม่ครบถ้วน</span>`;
          return;
        }
        const thA = itemA.thName;
        const thB = (typeof AGENT_NAME_MAP !== "undefined" && AGENT_NAME_MAP[agB]) ? AGENT_NAME_MAP[agB] : agB;
        prevEl.innerHTML = `
          <div style="margin-bottom: 6px; color:#0369a1;">
            👤 <strong>คุณ${thA}</strong>: ขอแลกเวรออก (ถอนตัวออกจากเวรนี้)
          </div>
          <div style="color:#15803d; font-weight:700;">
            🤝 <strong>คุณ${thB}</strong>: จะมารับหน้าที่เข้าเวรแทน ➔ <span>${itemA.time}</span> (${itemA.role})
          </div>
        `;
        return;
      }
      const itemB = swapHubWorkingAgents.find(it => it.agent === agB);
      if (!itemA || !itemB) {
        prevEl.innerHTML = `<span style="color:var(--muted);">ข้อมูลไม่ครบถ้วน</span>`;
        return;
      }

      prevEl.innerHTML = `
        <div style="margin-bottom: 6px;">
          🟢 <strong>คุณ${itemA.thName}</strong> จะเปลี่ยนไปปฏิบัติงาน: 
          <span style="font-weight:700; color:#0369a1;">${itemB.time}</span> (${itemB.role})
        </div>
        <div>
          🔵 <strong>คุณ${itemB.thName}</strong> จะเปลี่ยนไปปฏิบัติงาน: 
          <span style="font-weight:700; color:#1e40af;">${itemA.time}</span> (${itemA.role})
        </div>
      `;
    }

    function executeSwapHubSwap() {
      if (!currentUser) {
        showToast("🔒 กรุณาเข้าสู่ระบบ (Login) ก่อนดำเนินการสลับเวร");
        if (typeof openLoginGateModal === "function") openLoginGateModal();
        return;
      }
      if (!allowUserSwap && !isAdminMode) {
        showToast("🔒 ขณะนี้ระบบปิดรับการสลับเวร (หากจำเป็นต้องสลับ กรุณาแจ้งหัวหน้างาน)");
        return;
      }

      const selA = document.getElementById("swapHubAgentASelect");
      const selB = document.getElementById("swapHubAgentBSelect");
      if (!selA || !selB) return;

      const agA = selA.value;
      const agB = selB.value;
      if (!agA || !agB || agA === agB) {
        showToast("⚠️ กรุณาเลือกผู้ขอสลับ และ เพื่อนร่วมงานที่ต้องการสลับด้วยให้ถูกต้อง");
        return;
      }

      // Member mode: Must involve the logged-in user
      if (!isAdminMode && currentUser.role !== "ADMIN") {
        const isUserA = (typeof isCurrentUserAgent === "function") ? isCurrentUserAgent(agA) : (agA === currentUser.username);
        const isUserB = (typeof isCurrentUserAgent === "function") ? isCurrentUserAgent(agB) : (agB === currentUser.username);
        if (!isUserA && !isUserB) {
          const myName = currentUser.nameTH || currentUser.username;
          showToast(`⚠️ ท่านสามารถเลือกสลับเฉพาะกะของตนเอง (คุณ${myName}) กับเพื่อนร่วมงานเท่านั้น`);
          return;
        }
      }

      const itemA = swapHubWorkingAgents.find(it => it.agent === agA);
      const itemB = swapHubWorkingAgents.find(it => it.agent === agB);
      if (!itemA || !itemB) {
        showToast("⚠️ ข้อมูลกะการทำงานไม่ถูกต้อง");
        return;
      }

      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const key = `${yearAD}-${month}`;
      const mData = getOrInitMonthSchedule(yearAD, month);
      const reason = (document.getElementById("swapHubReasonInput").value || "").trim();
      const performedBy = typeof getCurrentOperatorName === "function" ? getCurrentOperatorName() : "ผู้ใช้งานในระบบ";
      const now = new Date();
      const dateStr = now.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
      const timeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
      const mShort = THAI_MONTHS_SHORT[month];

      if (currentSwapHubType === "DAILY") {
        const dateSelect = document.getElementById("swapHubDailyDateSelect");
        const dayA = parseInt(dateSelect.value, 10);
        let isCrossDay = false;
        let dayB = dayA;
        const crossCheck = document.getElementById("swapHubDailyCrossDayCheck");
        if (crossCheck && crossCheck.checked) {
          isCrossDay = true;
          const dateBSel = document.getElementById("swapHubDailyDateBSelect");
          if (dateBSel) dayB = parseInt(dateBSel.value, 10) || dayA;
        }

        const dayText = isCrossDay ? `วันที่ ${dayA} และ ${dayB} ${mShort}` : `วันที่ ${dayA} ${mShort}`;
        const swapRecord = {
          id: "DSWAP_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
          yearAD,
          month,
          dateA: dayA,
          dateB: dayB,
          isCrossDay,
          agentA: itemA.agent,
          agentB: itemB.agent,
          agentAName: itemA.thName,
          agentBName: itemB.thName,
          performedBy: performedBy,
          shiftA: { wIdx: itemA.wIdx, cIdx: itemA.cIdx, sIdx: itemA.sIdx, time: itemA.time, role: itemA.role },
          shiftB: { wIdx: itemB.wIdx, cIdx: itemB.cIdx, sIdx: itemB.sIdx, time: itemB.time, role: itemB.role },
          reason,
          createdAt: now.toISOString()
        };

        if (!mData.dailySwaps) mData.dailySwaps = [];
        mData.dailySwaps.push(swapRecord);

        const historyItem = {
          id: swapRecord.id,
          tag: "[สลับเวรรายวัน]",
          date: dateStr,
          time: timeStr,
          personA: itemA.thName,
          descA: `กะเดิม: ${itemA.time} (${itemA.role})`,
          personB: itemB.thName,
          descB: `กะเดิม: ${itemB.time} (${itemB.role})`,
          month: month,
          yearAD: yearAD,
          performedBy: performedBy,
          note: `สลับเฉพาะ${dayText}${reason ? ' • ' + reason : ''}`
        };

        if (!swapHistory) swapHistory = [];
        swapHistory.unshift(historyItem);
        mData.swapHistory = swapHistory;

        triggerAutoSaveToCloud(`สลับเวรรายวัน: คุณ${itemA.thName} 🔁 คุณ${itemB.thName} (${dayText}) โดย ${performedBy}`);
        showToast(`✅ บันทึกสลับเวรรายวัน (${dayText}) คุณ${itemA.thName} 🔁 คุณ${itemB.thName} เรียบร้อยแล้ว`);

      } else if (currentSwapHubType === "WEEKLY") {
        const week = mData.schedule.weeks[itemA.wIdx];
        if (!week) return;

        // Perform weekly swap
        week.assignments[itemA.cIdx][itemA.sIdx] = itemB.agent;
        week.assignments[itemB.cIdx][itemB.sIdx] = itemA.agent;

        const recordId = "WSWAP_" + Date.now();
        const historyItem = {
          id: recordId,
          tag: "[สลับเวรทั้งสัปดาห์]",
          date: dateStr,
          time: timeStr,
          timestamp: now.toISOString(),
          performedBy: performedBy,
          yearAD: yearAD,
          month: month,
          personA: itemA.thName,
          descA: `สัปดาห์ที่ ${itemA.wIdx + 1} • ${itemA.role} [${itemA.time}]`,
          personB: itemB.thName,
          descB: `สัปดาห์ที่ ${itemB.wIdx + 1} • ${itemB.role} [${itemB.time}]`,
          note: reason || `สลับเวรทั้งสัปดาห์ ${week.label}`,
          slotA: { wIdx: itemA.wIdx, cIdx: itemA.cIdx, sIdx: itemA.sIdx, agent: itemA.agent },
          slotB: { wIdx: itemB.wIdx, cIdx: itemB.cIdx, sIdx: itemB.sIdx, agent: itemB.agent }
        };

        if (!swapHistory) swapHistory = [];
        swapHistory.unshift(historyItem);
        mData.swapHistory = swapHistory;

        triggerAutoSaveToCloud(`สลับเวรทั้งสัปดาห์: คุณ${itemA.thName} 🔁 คุณ${itemB.thName} โดย ${performedBy}`);
        showToast(`✅ บันทึกสลับเวรทั้งสัปดาห์ (${week.label}) คุณ${itemA.thName} 🔁 คุณ${itemB.thName} เรียบร้อยแล้ว`);

      } else if (currentSwapHubType === "HOLIDAY") {
        const h = mData.schedule.holidays[itemA.hIdx];
        if (!h) return;

        // Check if agB already has duty that day
        if (h.shifts.includes(agB)) {
          showToast("⚠️ เพื่อนร่วมงานคนนี้มีเวรในวันดังกล่าวอยู่แล้ว");
          return;
        }

        // 1-way handover: agB replaces itemA
        h.shifts[itemA.sIdx] = agB;

        const thA = itemA.thName;
        const thB = (typeof AGENT_NAME_MAP !== "undefined" && AGENT_NAME_MAP[agB]) ? AGENT_NAME_MAP[agB] : agB;
        const recordId = "HTRANS_" + Date.now();
        const historyItem = {
          id: recordId,
          type: "HOLIDAY_TRANSFER",
          tag: "[แลกเวรวันหยุด]",
          date: dateStr,
          time: timeStr,
          timestamp: now.toISOString(),
          performedBy: performedBy,
          yearAD: yearAD,
          month: month,
          personA: itemA.agent,
          thA: thA,
          descA: `${h.dayName} ${h.date} • ${itemA.role} [${itemA.time}]`,
          personB: agB,
          thB: thB,
          descB: `เข้าเวรแทน (${itemA.role})`,
          note: reason || `ส่งมอบเวรให้คุณ${thB} เข้าเวรแทน (${h.holidayName || ''})`,
          holidaySlot: {
            yearAD: yearAD,
            month: month,
            hIdx: itemA.hIdx,
            sIdx: itemA.sIdx,
            origAgent: itemA.agent,
            subAgent: agB
          }
        };

        if (!swapHistory) swapHistory = [];
        swapHistory.unshift(historyItem);
        mData.swapHistory = swapHistory;

        triggerAutoSaveToCloud(`แลกเวรวันหยุด: คุณ${thA} ส่งมอบเวรให้คุณ${thB} โดย ${performedBy}`);
        showToast(`✅ บันทึกแลกเวรวันหยุด (${h.dayName} ${h.date}) คุณ${thA} ➔ คุณ${thB} เข้าแทน เรียบร้อยแล้ว`);
      }

      // Reset Reason
      const reasonEl = document.getElementById("swapHubReasonInput");
      if (reasonEl) reasonEl.value = "";

      // Refresh Views
      if (typeof renderMasterWeekdayTable === "function") renderMasterWeekdayTable();
      if (typeof renderMasterHolidayTable === "function") renderMasterHolidayTable();
      if (typeof renderIndividualCards === "function") renderIndividualCards();
      if (typeof renderHourlyHeadcountTable === "function") renderHourlyHeadcountTable();
      if (typeof renderSwapHistoryTable === "function") renderSwapHistoryTable();
      renderActiveSwapsHub();

      // Refresh Swap Hub Selectors
      onSwapHubTypeChange(currentSwapHubType, false);
    }

    
    
        function revertSwapRecord(swapId) {
      if (!swapId) return;
      if (!currentUser) {
        showToast("🔒 กรุณาเข้าสู่ระบบ (Login) ก่อนดำเนินการยกเลิกการสลับเวร");
        if (typeof openLoginGateModal === "function") openLoginGateModal();
        return;
      }

      // 1. Check if it's in dailySwaps across any month
      for (const k of Object.keys(monthSchedules)) {
        const dSwaps = monthSchedules[k].dailySwaps;
        if (Array.isArray(dSwaps)) {
          const idx = dSwaps.findIndex(s => s.id === swapId);
          if (idx !== -1) {
            deleteDailySwap(swapId);
            return;
          }
        }
      }

      // 2. Check if it's in swapHistory across any month
      for (const k of Object.keys(monthSchedules)) {
        const hList = monthSchedules[k].swapHistory;
        if (Array.isArray(hList)) {
          const idx = hList.findIndex(h => h.id === swapId || (h.time && (h.time + "_" + (h.detail || h.date)) === swapId));
          if (idx !== -1) {
            const item = hList[idx];

            // Revert Weekday/Holiday slots if available
            if (item.slotA && item.slotB) {
              const mKeyA = (item.slotA.yearAD && item.slotA.month) ? (item.slotA.yearAD + "-" + item.slotA.month) : k;
              const mKeyB = (item.slotB.yearAD && item.slotB.month) ? (item.slotB.yearAD + "-" + item.slotB.month) : k;
              const mA = monthSchedules[mKeyA];
              const mB = monthSchedules[mKeyB];

              const origAgentA = item.slotA.agent || (item.agentA && item.agentA.username) || item.personA;
              const origAgentB = item.slotB.agent || (item.agentB && item.agentB.username) || item.personB;

              // Restore slot A
              if (mA && mA.schedule) {
                if (item.slotA.type === "WEEKDAY" || item.slotA.wIdx !== undefined) {
                  if (mA.schedule.weeks && mA.schedule.weeks[item.slotA.wIdx] && mA.schedule.weeks[item.slotA.wIdx].assignments && mA.schedule.weeks[item.slotA.wIdx].assignments[item.slotA.cIdx]) {
                    mA.schedule.weeks[item.slotA.wIdx].assignments[item.slotA.cIdx][item.slotA.sIdx] = origAgentA;
                  }
                } else if (item.slotA.type === "HOLIDAY" || item.slotA.hIdx !== undefined) {
                  if (mA.schedule.holidays && mA.schedule.holidays[item.slotA.hIdx] && mA.schedule.holidays[item.slotA.hIdx].shifts) {
                    mA.schedule.holidays[item.slotA.hIdx].shifts[item.slotA.sIdx] = origAgentA;
                  }
                }
              }

              // Restore slot B
              if (mB && mB.schedule) {
                if (item.slotB.type === "WEEKDAY" || item.slotB.wIdx !== undefined) {
                  if (mB.schedule.weeks && mB.schedule.weeks[item.slotB.wIdx] && mB.schedule.weeks[item.slotB.wIdx].assignments && mB.schedule.weeks[item.slotB.wIdx].assignments[item.slotB.cIdx]) {
                    mB.schedule.weeks[item.slotB.wIdx].assignments[item.slotB.cIdx][item.slotB.sIdx] = origAgentB;
                  }
                } else if (item.slotB.type === "HOLIDAY" || item.slotB.hIdx !== undefined) {
                  if (mB.schedule.holidays && mB.schedule.holidays[item.slotB.hIdx] && mB.schedule.holidays[item.slotB.hIdx].shifts) {
                    mB.schedule.holidays[item.slotB.hIdx].shifts[item.slotB.sIdx] = origAgentB;
                  }
                }
              }
            } else if (item.holidaySlot) {
              const hs = item.holidaySlot;
              const mKey = (hs.yearAD && hs.month) ? (hs.yearAD + "-" + hs.month) : k;
              const targetSched = (monthSchedules[mKey] && monthSchedules[mKey].schedule) ? monthSchedules[mKey].schedule : (sched || currentSchedule);
              if (targetSched && targetSched.holidays && targetSched.holidays[hs.hIdx] && targetSched.holidays[hs.hIdx].shifts) {
                targetSched.holidays[hs.hIdx].shifts[hs.sIdx] = hs.origAgent;
              }
            } else if (item.holidaySlotA && item.holidaySlotB) {
              const h = monthSchedules[k].schedule.holidays[item.holidaySlotA.hIdx];
              if (h && h.shifts) {
                h.shifts[item.holidaySlotA.sIdx] = item.holidaySlotA.agent || item.personA;
                h.shifts[item.holidaySlotB.sIdx] = item.holidaySlotB.agent || item.personB;
              }
            }

            // Remove the swap item from swapHistory
            hList.splice(idx, 1);

            // Add cancellation audit record
            const now = new Date();
            const performedBy = typeof getCurrentOperatorName === "function" ? getCurrentOperatorName() : "ผู้ใช้งานในระบบ";
            const dateStr = now.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
            const timeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

            const norm = normalizeHistoryItem(item);
            const cancelItem = {
              id: "CAN_" + Date.now(),
              tag: "[ยกเลิกสลับเวร]",
              date: dateStr,
              time: timeStr,
              personA: norm.thA,
              descA: "คืนค่ากะเดิม",
              personB: norm.thB,
              descB: "คืนค่ากะเดิม",
              month: item.month,
              yearAD: item.yearAD,
              performedBy: performedBy,
              note: "ยกเลิกการสลับเวร: คุณ" + norm.thA + " ⇄ คุณ" + norm.thB
            };
            hList.unshift(cancelItem);

            currentSchedule = monthSchedules[k].schedule;
            triggerAutoSaveToCloud("ยกเลิกการสลับเวร: คุณ" + norm.thA + " ⇄ คุณ" + norm.thB + " โดย " + performedBy);
            if (typeof renderAllViews === "function") renderAllViews();
            renderActiveSwapsHub();
            renderSwapHistoryTable();
            showToast("🗑️ ยกเลิกการสลับเวรเรียบร้อยแล้ว (คืนค่ากะเดิม)");
            return;
          }
        }
      }

      showToast("⚠️ ไม่พบรายการสลับเวรนี้ในระบบ หรืออาจถูกยกเลิกไปแล้ว");
    }

function revertWeeklySwap(historyId) {
      if (!currentUser) {
        showToast("🔒 กรุณาเข้าสู่ระบบ (Login) ก่อนดำเนินการยกเลิกการสลับเวร");
        if (typeof openLoginGateModal === "function") openLoginGateModal();
        return;
      }
      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const key = `${yearAD}-${month}`;
      const mData = monthSchedules[key];
      if (!mData || !Array.isArray(mData.swapHistory)) return;

      const idx = mData.swapHistory.findIndex(h => h.id === historyId);
      if (idx === -1) return;

      const item = mData.swapHistory[idx];
      if (item.slotA && item.slotB) {
        const week = mData.schedule.weeks[item.slotA.wIdx];
        if (week && week.assignments) {
          week.assignments[item.slotA.cIdx][item.slotA.sIdx] = item.slotA.agent;
          week.assignments[item.slotB.cIdx][item.slotB.sIdx] = item.slotB.agent;
        }
      }

      mData.swapHistory.splice(idx, 1);

      const now = new Date();
      const performedBy = typeof getCurrentOperatorName === "function" ? getCurrentOperatorName() : "ผู้ใช้งานในระบบ";
      const dateStr = now.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
      const timeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

      const cancelAudit = {
        id: "CAN_" + Date.now(),
        tag: "[ยกเลิกสลับเวรทั้งสัปดาห์]",
        date: dateStr,
        time: timeStr,
        personA: item.personA,
        descA: "คืนค่ากะเดิม",
        personB: item.personB,
        descB: "คืนค่ากะเดิม",
        month: month,
        yearAD: yearAD,
        performedBy: performedBy,
        note: `ยกเลิกการสลับเวรทั้งสัปดาห์: คุณ${item.personA} ⇄ คุณ${item.personB}`
      };
      mData.swapHistory.unshift(cancelAudit);

      currentSchedule = mData.schedule;
      triggerAutoSaveToCloud(`ยกเลิกสลับเวรทั้งสัปดาห์: คุณ${item.personA} ⇄ คุณ${item.personB} โดย ${performedBy}`);
      if (typeof renderAllViews === "function") renderAllViews();
      renderActiveSwapsHub();
      showToast(`🗑️ ยกเลิกการสลับเวรทั้งสัปดาห์เรียบร้อยแล้ว (คืนค่ากะเดิม)`);
    }
  
        function renderActiveSwapsHub() {
      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const container = document.getElementById("swapHubActiveListContainer");
      const badge = document.getElementById("swapHubActiveCountBadge");
      if (!container) return;

      const dailySwaps = getDailySwapsForMonth(yearAD, month) || [];
      const mShort = THAI_MONTHS_SHORT[month];

      const mData = monthSchedules[`${yearAD}-${month}`];
      const otherSwaps = (mData && Array.isArray(mData.swapHistory)) 
        ? mData.swapHistory.filter(h => {
            if (!h) return false;
            const tag = h.tag || h.swapTag || "";
            if (tag.includes("ยกเลิก") || (h.id && String(h.id).startsWith("CAN_"))) return false;
            if (tag.includes("รายวัน")) return false; // Handled in dailySwaps
            return true;
          }) 
        : [];

      const totalActiveCount = dailySwaps.length + otherSwaps.length;
      if (badge) badge.textContent = `${totalActiveCount} รายการ`;

      if (totalActiveCount === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 18px; color: var(--muted); font-size: 12px; grid-column: 1 / -1; background: #f8fafc; border-radius: 8px;">✨ ยังไม่มีรายการสลับเวรในเดือนนี้</div>`;
        return;
      }

      let html = "";

      // 1. Daily Swaps
      html += dailySwaps.map(sw => {
        const dText = sw.isCrossDay ? `วันที่ ${sw.dateA} และ ${sw.dateB} ${mShort}` : `วันที่ ${sw.dateA} ${mShort}`;
        const opText = sw.performedBy || "ผู้ใช้งานในระบบ";
        const tA = (sw.shiftA && sw.shiftA.time) || "-";
        const rA = (sw.shiftA && sw.shiftA.role) || "-";
        const tB = (sw.shiftB && sw.shiftB.time) || "-";
        const rB = (sw.shiftB && sw.shiftB.role) || "-";
        return `
          <div class="active-swap-card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
              <div>
                <span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:10.5px; margin-bottom:4px; display:inline-block;">
                  📅 ${dText} (สลับกะรายวัน)
                </span>
                <div style="font-weight:700; color:#0f172a; font-size:12.5px;">
                  คุณ${sw.agentAName} 🔁 คุณ${sw.agentBName}
                </div>
              </div>
              <button type="button" class="btn btn-outline btn-sm" onclick="deleteDailySwap('${sw.id}')" style="color:#ef4444; border-color:#fca5a5; background:white; font-size:11px; padding:3px 8px; font-weight:700; white-space:nowrap;" title="ยกเลิกการสลับนี้และคืนค่ากะเดิม">
                ↩️ ยกเลิก / คืนค่าเดิม
              </button>
            </div>
            <div style="font-size:11.5px; color:#475569; background:#f8fafc; padding:6px 8px; border-radius:6px; line-height:1.45;">
              <div>• <strong>คุณ${sw.agentAName}:</strong> ${tB} (${rB})</div>
              <div>• <strong>คุณ${sw.agentBName}:</strong> ${tA} (${rA})</div>
              ${sw.reason ? `<div style="color:#0284c7; margin-top:3px; font-style:italic;">💬 เหตุผล: ${sw.reason}</div>` : ''}
            </div>
            <div style="font-size:10.5px; color:#94a3b8; display:flex; align-items:center; gap:4px;">
              <span>👤</span> <span>ดำเนินการโดย: <strong>${opText}</strong></span>
            </div>
          </div>
        `;
      }).join("");

      // 2. Weekly / Holiday / Table Swaps
      html += otherSwaps.map(sw => {
        const norm = normalizeHistoryItem(sw);
        const opText = norm.performedBy || "ผู้ใช้งานในระบบ";
        const tagText = sw.tag || sw.swapTag || "[สลับเวร]";
        const swId = sw.id || (sw.time + "_" + (sw.detail || sw.date));
        return `
          <div class="active-swap-card" style="border-left-color: #7c3aed;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
              <div>
                <span class="badge" style="background:#f5f3ff; color:#6d28d9; font-size:10.5px; margin-bottom:4px; display:inline-block;">
                  🏢 ${tagText}
                </span>
                <div style="font-weight:700; color:#0f172a; font-size:12.5px;">
                  คุณ${norm.thA} 🔁 คุณ${norm.thB}
                </div>
              </div>
              <button type="button" class="btn btn-outline btn-sm" onclick="revertSwapRecord('${swId}')" style="color:#ef4444; border-color:#fca5a5; background:white; font-size:11px; padding:3px 8px; font-weight:700; white-space:nowrap;" title="ยกเลิกการสลับนี้และคืนค่ากะเดิม">
                ↩️ ยกเลิก / คืนค่าเดิม
              </button>
            </div>
            <div style="font-size:11.5px; color:#475569; background:#f8fafc; padding:6px 8px; border-radius:6px; line-height:1.45;">
              <div>• <strong>คุณ${norm.thA}:</strong> ${norm.descA || '-'}</div>
              <div>• <strong>คุณ${norm.thB}:</strong> ${norm.descB || '-'}</div>
              ${sw.note ? `<div style="color:#7c3aed; margin-top:3px; font-style:italic;">💬 รายละเอียด: ${sw.note}</div>` : ''}
            </div>
            <div style="font-size:10.5px; color:#94a3b8; display:flex; align-items:center; gap:4px;">
              <span>👤</span> <span>ดำเนินการโดย: <strong>${opText}</strong></span>
            </div>
          </div>
        `;
      }).join("");

      container.innerHTML = html;
    }

// Explicit global window bindings for inline HTML onclick handlers
    if (typeof window !== "undefined") {
      window.openHolidayTransferModal = openHolidayTransferModal;
      window.closeHolidayTransferModal = closeHolidayTransferModal;
      window.onHolidayTransferDateChange = onHolidayTransferDateChange;
      window.onHolidayTransferShiftChange = onHolidayTransferShiftChange;
      window.updateHolidayTransferPreview = updateHolidayTransferPreview;
      window.submitHolidayTransfer = submitHolidayTransfer;
      window.openDailySwapModal = openDailySwapModal;
      window.closeDailySwapModal = closeDailySwapModal;
      window.executeDailySwap = executeDailySwap;
      window.deleteDailySwap = deleteDailySwap;
      window.onDailySwapDateChange = onDailySwapDateChange;
      window.onDailySwapAgentAChange = onDailySwapAgentAChange;
      window.onDailySwapAgentBChange = onDailySwapAgentBChange;
      window.toggleDailySwapCrossDayUI = toggleDailySwapCrossDayUI;
      window.getDailySwapsForMonth = getDailySwapsForMonth;
      window.getEffectiveAssignmentsForDay = getEffectiveAssignmentsForDay;

      // Swap Hub exports
      window.initSwapHub = initSwapHub;
      window.onSwapHubTypeChange = onSwapHubTypeChange;
      window.onSwapHubDailyDateChange = onSwapHubDailyDateChange;
      window.toggleSwapHubDailyCrossDay = toggleSwapHubDailyCrossDay;
      window.onSwapHubAgentAChange = onSwapHubAgentAChange;
      window.onSwapHubAgentBChange = onSwapHubAgentBChange;
      window.onSwapHubWeeklyWeekChange = onSwapHubWeeklyWeekChange;
      window.onSwapHubHolidayChange = onSwapHubHolidayChange;
      window.updateSwapHubPreview = updateSwapHubPreview;
      window.executeSwapHubSwap = executeSwapHubSwap;
      window.renderActiveSwapsHub = renderActiveSwapsHub;
      window.revertWeeklySwap = revertWeeklySwap;
      window.revertSwapRecord = revertSwapRecord;
    }

