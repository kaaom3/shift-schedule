// =========================================================
// ADMIN AUTHENTICATION, SETTINGS EDITORS & MODAL MANAGERS
// =========================================================

    function handleAdminToggle() {
      if (isAdminMode) {
        exitAdminMode();
      } else {
        openPinModal();
      }
    }

    function openPinModal() {
      document.getElementById("pinInput").value = "";
      document.getElementById("pinErrorMsg").style.display = "none";
      document.getElementById("pinModal").classList.add("show");
      setTimeout(() => document.getElementById("pinInput").focus(), 150);
    }

    function closePinModal() {
      document.getElementById("pinModal").classList.remove("show");
    }

    function submitAdminPin() {
      const enteredPin = document.getElementById("pinInput").value.trim();
      if (enteredPin === currentAdminPin) {
        isAdminMode = true;
        closePinModal();
        updateAdminModeUI();
        showToast("🔓 เข้าสู่โหมดหัวหน้างานเรียบร้อยแล้ว");
      } else {
        document.getElementById("pinErrorMsg").style.display = "block";
      }
    }

    function exitAdminMode() {
      isAdminMode = false;
      if (isViewingOriginal) setScheduleViewMode(false);
      updateAdminModeUI();
      // If currently on admin-only tab, switch to masterTab
      if (document.getElementById("tabBtnMatrix").classList.contains("active") || 
          document.getElementById("tabBtnAgents").classList.contains("active")) {
        switchTab("masterTab", document.getElementById("tabBtnMaster"));
      }
      showToast("🔒 ออกจากโหมดหัวหน้าแล้ว (สลับสู่โหมดน้อง)");
    }

    function updateAdminModeUI() {
      const body = document.body;
      const toggleBtn = document.getElementById("adminToggleBtn");

      if (isAdminMode) {
        body.classList.add("is-admin");
        toggleBtn.innerHTML = "🔓 โหมดหัวหน้า (ออกจากระบบ)";
        toggleBtn.style.background = "linear-gradient(135deg, #b45309, #d97706)";
        toggleBtn.style.borderColor = "#f59e0b";
      } else {
        body.classList.remove("is-admin");
        toggleBtn.innerHTML = "🔒 โหมดหัวหน้า (Admin)";
        toggleBtn.style.background = "rgba(255,255,255,0.14)";
        toggleBtn.style.borderColor = "rgba(255,255,255,0.3)";
      }
      updateSwapPermissionUI();
      renderMasterWeekdayTable();
      renderMasterHolidayTable();
    }

    function openChangePinModal() {
      document.getElementById("newPinInput").value = "";
      document.getElementById("changePinModal").classList.add("show");
    }

    function closeChangePinModal() {
      document.getElementById("changePinModal").classList.remove("show");
    }

    function saveNewPin() {
      const newPin = document.getElementById("newPinInput").value.trim();
      if (!newPin || newPin.length < 4) {
        alert("กรุณากรอกรหัส PIN เป็นตัวเลขอย่างน้อย 4 หลัก");
        return;
      }
      currentAdminPin = newPin;
      try {
        localStorage.setItem("ft_admin_pin", newPin);
      } catch (e) {}
      closeChangePinModal();
      showToast("🔑 เปลี่ยนรหัส PIN เรียบร้อยแล้ว (บันทึกขึ้นระบบแล้ว)");
      saveScheduleToCloud("Admin เปลี่ยนรหัส PIN ใหม่");
    }



    // =========================================================================
    // LEAVE MANAGEMENT MODAL
    // =========================================================================
    let currentEditingLeaveSlot = null;

    function openLeaveRecordModal(yearAD, month, type, idx1, idx2, sIdx, agentName, label, shiftInfo) {
      if (!isAdminMode) {
        showToast("🔒 เฉพาะหัวหน้างาน (Admin) จึงจะสามารถบันทึกหรือแก้ไขการลาได้");
        return;
      }
      if (!agentName || agentName === "-") {
        showToast("⚠️ ไม่มีพนักงานในช่องนี้");
        return;
      }

      const slotKey = type === "WEEKDAY" ? `W_${idx1}_${idx2}_${sIdx}` : `H_${idx1}_${sIdx}`;
      currentEditingLeaveSlot = { yearAD, month, type, idx1, idx2, sIdx, agentName, slotKey };

      const thName = AGENT_NAME_MAP[agentName] ? ` (${AGENT_NAME_MAP[agentName]})` : "";
      document.getElementById("leaveModalAgentName").innerText = `${agentName}${thName}`;
      document.getElementById("leaveModalSlotDesc").innerText = `${type === 'WEEKDAY' ? 'เวรวันทำการ: ' + label + ' • ช่อง ' + shiftInfo : 'เวรวันหยุด: ' + label + ' • ' + shiftInfo}`;

      const currentLeave = getSlotLeave(yearAD, month, slotKey);
      const statusEl = document.getElementById("leaveModalCurrentStatus");
      const noteInput = document.getElementById("leaveModalNoteInput");
      const delBtn = document.getElementById("leaveModalDeleteBtn");

      if (currentLeave) {
        statusEl.innerHTML = `สถานะปัจจุบัน: <strong style="color:#c2410c;">${getLeaveIcon(currentLeave.leaveType)} ${currentLeave.leaveType}</strong> ${currentLeave.note ? `(หมายเหตุ: ${currentLeave.note})` : ''}`;
        noteInput.value = currentLeave.note || "";
        const radios = document.getElementsByName("leaveTypeRadio");
        for (let r of radios) {
          if (r.value === currentLeave.leaveType) r.checked = true;
        }
        delBtn.style.display = "inline-block";
      } else {
        statusEl.innerHTML = `สถานะปัจจุบัน: <span style="color:#16a34a; font-weight:700;">🟢 ปฏิบัติงานตามปกติ (ยังไม่มีบันทึกการลา)</span>`;
        noteInput.value = "";
        delBtn.style.display = "none";
      }

      document.getElementById("leaveRecordModal").classList.add("show");
    }

    function closeLeaveRecordModal() {
      document.getElementById("leaveRecordModal").classList.remove("show");
      currentEditingLeaveSlot = null;
    }

    function saveCurrentSlotLeave() {
      if (!currentEditingLeaveSlot) return;
      const { yearAD, month, slotKey, agentName } = currentEditingLeaveSlot;

      let selectedType = "ลาพักร้อน";
      const radios = document.getElementsByName("leaveTypeRadio");
      for (let r of radios) {
        if (r.checked) selectedType = r.value;
      }
      const note = document.getElementById("leaveModalNoteInput").value.trim();

      setSlotLeave(yearAD, month, slotKey, {
        agent: agentName,
        leaveType: selectedType,
        note: note,
        recordedAt: new Date().toISOString()
      });

      closeLeaveRecordModal();
      renderMasterWeekdayTable();
      renderMasterHolidayTable();
      renderIndividualCards();
      showToast(`✅ บันทึกสถานะ ${selectedType} ของคุณ${agentName} เรียบร้อยแล้ว`);
      saveScheduleToCloud(`บันทึกการลา: ${agentName} (${selectedType})`);
    }

    function deleteCurrentSlotLeave() {
      if (!currentEditingLeaveSlot) return;
      const { yearAD, month, slotKey, agentName } = currentEditingLeaveSlot;

      setSlotLeave(yearAD, month, slotKey, null);
      closeLeaveRecordModal();
      renderMasterWeekdayTable();
      renderMasterHolidayTable();
      renderIndividualCards();
      showToast(`🗑️ ลบสถานะการลาของคุณ${agentName} เรียบร้อยแล้ว`);
      saveScheduleToCloud(`ยกเลิกการลา: ${agentName}`);
    }



    // =========================================================================
    // WEEK-SPECIFIC TIME OVERRIDE MODAL
    // =========================================================================
    let currentEditingWeekIdx = null;

    function openWeekTimeModal(wIdx) {
      if (!isAdminMode) {
        showToast("🔒 เฉพาะหัวหน้างาน (Admin) จึงจะสามารถปรับเวลาเฉพาะสัปดาห์ได้");
        return;
      }
      const sched = isViewingOriginal ? originalSchedule : currentSchedule;
      const week = sched.weeks && sched.weeks[wIdx];
      if (!week) return;

      currentEditingWeekIdx = wIdx;
      document.getElementById("weekTimeModalTitle").innerText = `ปรับเวลาทำงานเฉพาะสัปดาห์: ${week.label}`;

      const customTimes = week.customTimes || {};
      const container = document.getElementById("weekTimeModalGrid");

      let html = "";
      WEEKDAY_COLUMNS.forEach((col, cIdx) => {
        const curTime = customTimes[cIdx]?.time || col.time;
        const curBreak = customTimes[cIdx]?.breakTime || col.breakTime;
        const isOverridden = !!customTimes[cIdx];

        html += `
          <div style="background:${isOverridden ? '#fff7ed' : '#f8fafc'}; border:1px solid ${isOverridden ? '#fed7aa' : 'var(--border)'}; border-radius:8px; padding:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span style="font-weight:700; font-size:12px; color:var(--primary);">ช่องที่ ${cIdx + 1} (${col.code}) • ${col.role}</span>
              ${isOverridden ? `<span style="font-size:10px; color:#c2410c; font-weight:700; background:#ffedd5; padding:1px 5px; border-radius:4px;">⚡ กำหนดเอง</span>` : ''}
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
              <div>
                <label style="font-size:10.5px; color:var(--muted); display:block; margin-bottom:2px;">เวลาทำงาน:</label>
                <input type="text" id="wt_time_${cIdx}" value="${curTime}" style="width:100%; font-size:12px; padding:4px 6px; border:1px solid var(--border); border-radius:4px;">
              </div>
              <div>
                <label style="font-size:10.5px; color:var(--muted); display:block; margin-bottom:2px;">เวลาพัก:</label>
                <input type="text" id="wt_break_${cIdx}" value="${curBreak}" style="width:100%; font-size:12px; padding:4px 6px; border:1px solid var(--border); border-radius:4px;">
              </div>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
      document.getElementById("weekTimeModal").classList.add("show");
    }

    function closeWeekTimeModal() {
      document.getElementById("weekTimeModal").classList.remove("show");
      currentEditingWeekIdx = null;
    }

    function saveWeekTimeOverrides() {
      if (currentEditingWeekIdx === null) return;
      const sched = isViewingOriginal ? originalSchedule : currentSchedule;
      const week = sched.weeks && sched.weeks[currentEditingWeekIdx];
      if (!week) return;

      const overrides = {};
      let changeCount = 0;

      WEEKDAY_COLUMNS.forEach((col, cIdx) => {
        const inputTime = document.getElementById(`wt_time_${cIdx}`).value.trim();
        const inputBreak = document.getElementById(`wt_break_${cIdx}`).value.trim();

        if (inputTime !== col.time || inputBreak !== col.breakTime) {
          overrides[cIdx] = { time: inputTime, breakTime: inputBreak };
          changeCount++;
        }
      });

      if (changeCount > 0) {
        week.customTimes = overrides;
      } else {
        delete week.customTimes;
      }

      closeWeekTimeModal();
      renderMasterWeekdayTable();
      renderIndividualCards();
      showToast(`✅ บันทึกเวลาเฉพาะสัปดาห์ ${week.label} เรียบร้อยแล้ว (${changeCount} ช่องที่มีการปรับเวลา)`);
      saveScheduleToCloud(`ปรับเวลาเฉพาะสัปดาห์: ${week.label}`);
    }

    function resetWeekTimeToDefault() {
      if (currentEditingWeekIdx === null) return;
      const sched = isViewingOriginal ? originalSchedule : currentSchedule;
      const week = sched.weeks && sched.weeks[currentEditingWeekIdx];
      if (!week) return;

      if (confirm(`ต้องการคืนค่าเวลาทำงานของสัปดาห์ "${week.label}" กลับเป็นเวลามาตรฐานทั้งหมดหรือไม่?`)) {
        delete week.customTimes;
        closeWeekTimeModal();
        renderMasterWeekdayTable();
        renderIndividualCards();
        showToast(`🔄 คืนค่าเวลามาตรฐานของสัปดาห์ ${week.label} แล้ว`);
        saveScheduleToCloud(`คืนค่าเวลามาตรฐานสัปดาห์: ${week.label}`);
      }
    }



    function renderAgentsEditor() {
      const grid = document.getElementById("agentsGrid");
      if (!grid) return;
      grid.innerHTML = "";
      AGENTS.forEach((ag, idx) => {
        const thName = AGENT_NAME_MAP[ag] || "";
        grid.innerHTML += `
          <div style="background:#ffffff; border:1px solid var(--border); border-radius:8px; padding:10px 12px; box-shadow:0 1px 3px rgba(0,0,0,0.04); display:flex; flex-direction:column; gap:6px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:700; color:var(--primary); font-size:12px;">👤 เจ้าหน้าที่คนที่ ${idx+1}</span>
              <span style="font-size:10px; color:var(--muted); background:#f1f5f9; padding:1px 6px; border-radius:4px;">ลำดับหมุนเวร #${idx+1}</span>
            </div>
            <div>
              <label style="font-size:10.5px; font-weight:600; color:var(--muted); display:block; margin-bottom:2px;">Username (ภาษาอังกฤษ):</label>
              <input type="text" class="agent-name-input agent-username-input" data-idx="${idx}" value="${ag}" placeholder="เช่น ${ag}" style="width:100%; border:1px solid var(--border); padding:5px 8px; border-radius:6px; font-size:12px; font-weight:600; font-family:inherit; color:var(--primary);">
            </div>
            <div>
              <label style="font-size:10.5px; font-weight:600; color:var(--muted); display:block; margin-bottom:2px;">ชื่อ-นามสกุล / ชื่อเล่น (ไทย):</label>
              <input type="text" class="agent-thname-input" data-idx="${idx}" value="${thName}" placeholder="เช่น ${thName || 'ชื่อภาษาไทย'}" style="width:100%; border:1px solid var(--border); padding:5px 8px; border-radius:6px; font-size:12px; font-family:inherit;">
            </div>
          </div>
        `;
      });
    }

    
    // Swap Permission & Master Baseline Management
    function toggleUserSwapPermission() {
      allowUserSwap = !allowUserSwap;
      try {
        localStorage.setItem("ft_allow_user_swap", allowUserSwap ? "true" : "false");
      } catch (e) {
        console.warn("localStorage write failed:", e);
      }
      updateSwapPermissionUI();
      renderMasterWeekdayTable();
      renderMasterHolidayTable();
      renderSwapHistoryTable();

      const actionText = allowUserSwap ? "เปิดรับการสลับเวร (น้องๆ สลับเวรได้)" : "ปิดรับการสลับเวร (ล็อกดูอย่างเดียว)";
      if (allowUserSwap) {
        showToast("🟢 เปิดให้น้องๆ สลับเวรได้แล้ว (บันทึกลงระบบแล้ว)");
      } else {
        showToast("🔒 ปิดรับการสลับเวรแล้ว (บันทึกลงระบบแล้ว)");
      }

      // Save directly to MongoDB Atlas so the state persists across refreshes and devices
      saveScheduleToCloud(`Admin เปลี่ยนสถานะ: ${actionText}`);
    }

    function updateSwapPermissionUI() {
      const pill = document.getElementById("swapStatusPill");
      const pillText = document.getElementById("swapStatusPillText");
      const toggleBtn = document.getElementById("swapLockToggleBtn");

      if (allowUserSwap) {
        if (pill) {
          pill.className = "swap-status-pill open no-print";
          pillText.innerHTML = "<strong>สถานะการสลับเวร:</strong> 🟢 เปิดให้น้องๆ สลับเวรกันเองได้ (คลิกชื่อเพื่อจับคู่สลับ)";
        }
        if (toggleBtn) {
          toggleBtn.innerHTML = "🔒 ปิดรับการสลับเวร (ล็อกดูอย่างเดียว)";
          toggleBtn.style.background = "#dc2626";
        }
      } else {
        if (pill) {
          pill.className = "swap-status-pill locked no-print";
          pillText.innerHTML = "<strong>สถานะการสลับเวร:</strong> 🔒 ปิดรับการสลับเวรแล้ว (โหมดดูได้อย่างเดียว หากต้องการเปลี่ยนเวรกรุณาติดต่อหัวหน้างาน)";
        }
        if (toggleBtn) {
          toggleBtn.innerHTML = "🔓 เปิดให้น้องๆ สลับเวรได้";
          toggleBtn.style.background = "#16a34a";
        }
      }
    }

    function setScheduleViewMode(isOriginal) {
      isViewingOriginal = !!isOriginal;
      
      const btnActive = document.getElementById("modeBtnActive");
      const btnMaster = document.getElementById("modeBtnMaster");
      if (btnActive) btnActive.classList.toggle("active", !isViewingOriginal);
      if (btnMaster) btnMaster.classList.toggle("active", isViewingOriginal);

      const notice = document.getElementById("baselineNoticeBar");
      if (notice) {
        if (isViewingOriginal) notice.classList.add("show");
        else notice.classList.remove("show");
      }

      const swapPill = document.getElementById("swapStatusPill");
      if (swapPill) {
        swapPill.style.display = isViewingOriginal ? "none" : "inline-flex";
      }

      const adminToggleViewBtn = document.getElementById("viewBaselineBtn");
      if (adminToggleViewBtn) {
        adminToggleViewBtn.innerHTML = isViewingOriginal ? "📋 สลับดูตารางปฏิบัติงานจริง" : "📜 สลับดูตารางต้นฉบับ";
      }

      if (pendingSwapSlot) cancelPendingSwap();
      renderAllViews();

      if (isViewingOriginal) {
        showToast("📜 กำลังดูตารางต้นฉบับ Master (Baseline)");
      } else {
        showToast("📋 กำลังดูตารางปฏิบัติงานจริง (Active)");
      }
    }

    function toggleViewOriginal() {
      setScheduleViewMode(!isViewingOriginal);
    }



    // =========================================================================
    // SAFETY CONFIRMATION MODAL LOGIC (กันการเผลอกดคืนค่าหรือคำนวณใหม่)
    // =========================================================================
    let pendingSafetyAction = null;

    function openSafetyModal({ title, icon, alertHTML, checkboxText, confirmBtnText, actionFn }) {
      document.getElementById("safetyModalTitle").innerText = title;
      document.getElementById("safetyModalIcon").innerText = icon || "⚠️";
      document.getElementById("safetyModalAlertBox").innerHTML = alertHTML;
      document.getElementById("safetyCheckboxLabel").innerText = checkboxText;
      
      const actionBtn = document.getElementById("safetyConfirmActionBtn");
      actionBtn.innerText = confirmBtnText || "💥 ยืนยันดำเนินการ";
      actionBtn.disabled = true;
      actionBtn.style.opacity = "0.5";
      actionBtn.style.cursor = "not-allowed";

      const cb = document.getElementById("safetyConfirmCheckbox");
      cb.checked = false;

      pendingSafetyAction = actionFn;
      document.getElementById("safetyConfirmModal").classList.add("show");
    }

    function closeSafetyModal() {
      document.getElementById("safetyConfirmModal").classList.remove("show");
      pendingSafetyAction = null;
    }

    function onSafetyCheckboxChange() {
      const cb = document.getElementById("safetyConfirmCheckbox");
      const actionBtn = document.getElementById("safetyConfirmActionBtn");
      if (cb.checked) {
        actionBtn.disabled = false;
        actionBtn.style.opacity = "1";
        actionBtn.style.cursor = "pointer";
      } else {
        actionBtn.disabled = true;
        actionBtn.style.opacity = "0.5";
        actionBtn.style.cursor = "not-allowed";
      }
    }

    function executeSafetyAction() {
      const cb = document.getElementById("safetyConfirmCheckbox");
      if (!cb.checked) return;
      if (typeof pendingSafetyAction === "function") {
        const fn = pendingSafetyAction;
        closeSafetyModal();
        fn();
      }
    }

    function requestRestoreOriginal() {
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const monthName = THAI_MONTHS[month];
      const yearTH = parseInt(document.getElementById("yearSelect").value, 10) + 543;
      const swapCount = (swapHistory || []).length;

      const alertHTML = `
        <div style="background:#fef2f2; border:1px solid #fecaca; color:#991b1b; padding:12px; border-radius:8px;">
          <div style="font-size:14px; font-weight:700; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
            <span>🛑</span> คำเตือนสำคัญ: การคืนค่าจะลบประวัติการสลับเวรทั้งหมด
          </div>
          <ul style="margin:0; padding-left:18px; line-height:1.5;">
            <li>ระบบจะ <strong>ลบประวัติการสลับเวร (${swapCount} รายการ)</strong> ของเดือน ${monthName} ${yearTH} ทิ้งทั้งหมด</li>
            <li>รายชื่อเวรทั้งหมดจะถูกดึงย้อนกลับไปเป็น <strong>"ตารางต้นฉบับ Master"</strong> ทันที</li>
            <li>น้องๆ ที่เคยตกลงสลับเวรกันไว้จะต้องมาดำเนินการใหม่อีกครั้ง</li>
          </ul>
          <div style="margin-top:10px; padding:8px 10px; background:#fff; border:1px solid #fca5a5; border-radius:6px; font-size:12px; color:#b91c1c;">
            💡 <strong>ข้อแนะนำ:</strong> หากคุณต้องการเพียงแค่ <em>"ดูหรือตรวจสอบ"</em> ตารางเดิม ให้ปิดหน้านี้แล้วเลือกแท็บ <strong>"📜 ตารางต้นฉบับ Master"</strong> ด้านบนได้ทันทีโดยไม่สูญเสียข้อมูล
          </div>
        </div>
      `;

      openSafetyModal({
        title: "ยืนยันการคืนค่าสู่ตารางต้นฉบับ (Reset Schedule)",
        icon: "🔄",
        alertHTML: alertHTML,
        checkboxText: `ฉันเข้าใจว่าประวัติการสลับเวรของเดือน ${monthName} จะถูกลบทั้งหมด และยืนยันคืนค่าตารางต้นฉบับ`,
        confirmBtnText: "💥 ยืนยันคืนค่าสู่ตารางต้นฉบับ",
        actionFn: () => {
          currentSchedule = JSON.parse(JSON.stringify(originalSchedule));
          swapHistory = [];
          if (pendingSwapSlot) cancelPendingSwap();
          renderAllViews();
          showToast("🔄 คืนค่าสู่ตารางต้นฉบับเรียบร้อยแล้ว (การสลับเวรถูกรีเซ็ต)");
          triggerAutoSaveToCloud("คืนค่าสู่ตารางต้นฉบับ");
        }
      });
    }

    function restoreOriginalSchedule() {
      requestRestoreOriginal();
    }

    function requestCalculateNextMonth() {
      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      
      let nextYearAD = yearAD;
      let nextMonth = month + 1;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYearAD++;
      }
      const curMonthName = THAI_MONTHS[month];
      const nextMonthName = THAI_MONTHS[nextMonth];
      const nextYearTH = nextYearAD + 543;

      const nextKey = `${nextYearAD}-${nextMonth}`;
      const alreadyExists = !!monthSchedules[nextKey];

      const alertHTML = `
        <div style="background:#eff6ff; border:1px solid #bfdbfe; color:#1e40af; padding:12px; border-radius:8px;">
          <div style="font-size:14px; font-weight:700; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
            <span>✨</span> คำนวณตารางเวรเดือนถัดไป: <strong>${nextMonthName} ${nextYearTH}</strong>
          </div>
          <ul style="margin:0; padding-left:18px; line-height:1.5;">
            <li>ระบบจะใช้ <strong>"ตารางต้นฉบับ (Master Baseline)"</strong> ของเดือน ${curMonthName} เป็นฐานในการหมุนเวรต่อเนื่อง</li>
            <li><strong>ไม่นำการสลับเวรของน้องๆ มาคำนวณ</strong> เพื่อความยุติธรรมสูงสุดในการเกลี่ยโควตาวันหยุด</li>
            ${alreadyExists ? `<li style="color:#b91c1c; font-weight:700;">⚠️ หมายเหตุ: เดือน ${nextMonthName} มีข้อมูลอยู่แล้ว หากยืนยันระบบจะคำนวณใหม่และทับตารางเดิม</li>` : ''}
          </ul>
        </div>
      `;

      openSafetyModal({
        title: `ยืนยันการคำนวณตารางเวรเดือนถัดไป (${nextMonthName})`,
        icon: "✨",
        alertHTML: alertHTML,
        checkboxText: `ฉันยืนยันให้ระบบคำนวณและสร้างตารางเวรเดือน ${nextMonthName} ${nextYearTH}`,
        confirmBtnText: `✨ ยืนยันคำนวณเดือน ${nextMonthName}`,
        actionFn: () => {
          calculateNextMonthFromBaselineLogic(nextYearAD, nextMonth, nextMonthName, nextYearTH);
        }
      });
    }

    function calculateNextMonthFromBaseline() {
      requestCalculateNextMonth();
    }

    function requestShuffle() {
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const monthName = THAI_MONTHS[month];
      const yearTH = parseInt(document.getElementById("yearSelect").value, 10) + 543;

      const alertHTML = `
        <div style="background:#fefce8; border:1px solid #fef08a; color:#854d0e; padding:12px; border-radius:8px;">
          <div style="font-size:14px; font-weight:700; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
            <span>🎲</span> คำเตือน: สุ่มจัดคิวตารางต้นฉบับใหม่
          </div>
          <ul style="margin:0; padding-left:18px; line-height:1.5;">
            <li>ระบบจะสุ่มสลับตำแหน่งเวรและสร้างเป็น <strong>"ตารางต้นฉบับชุดใหม่"</strong> ประจำเดือน ${monthName} ${yearTH}</li>
            <li>ประวัติการสลับเวรทั้งหมดในเดือนนี้จะถูกรีเซ็ตใหม่</li>
          </ul>
        </div>
      `;

      openSafetyModal({
        title: `ยืนยันการสุ่มจัดตารางใหม่ (${monthName} ${yearTH})`,
        icon: "🎲",
        alertHTML: alertHTML,
        checkboxText: `ฉันเข้าใจและยืนยันต้องการสุ่มสร้างตารางต้นฉบับใหม่`,
        confirmBtnText: "🎲 ยืนยันสุ่มจัดตารางใหม่",
        actionFn: () => {
          customSpinSeed += 3;
          generateScheduleForSelectedMonth(true);
          showToast("🎲 สร้างตารางเวรต้นฉบับใหม่เรียบร้อยแล้ว");
        }
      });
    }


    function switchSettingsSubTab(subTabId, btn) {
      document.querySelectorAll(".settings-sub-panel").forEach(p => p.style.display = "none");
      document.querySelectorAll("#subTabBtnAgents, #subTabBtnWeekdayJD, #subTabBtnHolidayJD").forEach(b => {
        b.className = "btn btn-outline btn-sm";
      });
      document.getElementById(subTabId).style.display = "block";
      btn.className = "btn btn-primary btn-sm";
      if (subTabId === "weekdayJdSubTab") renderWeekdayJdEditor();
      if (subTabId === "holidayJdSubTab") renderHolidayJdEditor();
    }

    function renderWeekdayJdEditor() {
      const container = document.getElementById("weekdayJdGrid");
      let html = "";
      WEEKDAY_COLUMNS.forEach((col, idx) => {
        html += `
          <div style="background:#f8fafc; border:1px solid var(--border-dark); border-radius:8px; padding:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid var(--border); padding-bottom:6px;">
              <div>
                <strong style="color:var(--primary); font-size:14px;">กะที่ ${idx+1} [รหัส: ${col.code}]</strong>
              </div>
              <span style="font-size:12px; color:var(--muted);">จำนวนคน: ${col.slots} คน</span>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:10px; margin-bottom:12px;">
              <div>
                <label style="font-size:11.5px; font-weight:700; color:var(--secondary);">หน้าที่งาน (Role):</label>
                <input type="text" id="wkRole_${idx}" value="${col.role}" style="width:100%; padding:5px 8px; border:1px solid var(--border); border-radius:4px; font-family:inherit; font-size:12.5px;">
              </div>
              <div>
                <label style="font-size:11.5px; font-weight:700; color:var(--secondary);">เวลาเข้า-ออกงาน:</label>
                <input type="text" id="wkTime_${idx}" value="${col.time}" style="width:100%; padding:5px 8px; border:1px solid var(--border); border-radius:4px; font-family:inherit; font-size:12.5px;">
              </div>
              <div>
                <label style="font-size:11.5px; font-weight:700; color:var(--secondary);">เวลาพักเบรก:</label>
                <input type="text" id="wkBreak_${idx}" value="${col.breakTime}" style="width:100%; padding:5px 8px; border:1px solid var(--border); border-radius:4px; font-family:inherit; font-size:12.5px;">
              </div>
            </div>
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <label style="font-size:11.5px; font-weight:700; color:var(--secondary);">หัวข้อ Job Description (JD):</label>
                <button class="btn btn-outline btn-sm" type="button" onclick="addJdLine('wk', ${idx})" style="padding:2px 8px; font-size:11px; color:var(--primary); border-color:var(--primary);">+ เพิ่มหัวข้อ JD</button>
              </div>
              <div id="wkJdList_${idx}">
                ${col.jd.map((line, lIdx) => `
                  <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px;">
                    <span style="color:var(--muted); font-size:12px;">•</span>
                    <input type="text" class="wk-jd-item-${idx}" value="${line}" style="flex:1; padding:4px 8px; border:1px solid var(--border); border-radius:4px; font-size:12px; font-family:inherit;">
                    <button class="btn btn-outline btn-sm" type="button" onclick="this.parentElement.remove()" style="color:var(--danger); padding:2px 6px; font-size:11px;" title="ลบหัวข้อนี้">✕</button>
                  </div>
                `).join("")}
              </div>
            </div>
          </div>
        `;
      });
      container.innerHTML = html;
    }

    function renderHolidayJdEditor() {
      const container = document.getElementById("holidayJdGrid");
      let html = "";
      HOLIDAY_SHIFT_META.forEach((meta, idx) => {
        html += `
          <div style="background:#f8fafc; border:1px solid var(--border-dark); border-radius:8px; padding:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid var(--border); padding-bottom:6px;">
              <strong style="color:var(--primary); font-size:14px;">กะวันหยุดที่ ${idx+1} [${meta.time}]</strong>
              <span class="badge badge-hol">วันหยุดพิเศษ</span>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:10px; margin-bottom:12px;">
              <div>
                <label style="font-size:11.5px; font-weight:700; color:var(--secondary);">เวลาเข้า-ออกงาน:</label>
                <input type="text" id="holTime_${idx}" value="${meta.time}" style="width:100%; padding:5px 8px; border:1px solid var(--border); border-radius:4px; font-family:inherit; font-size:12.5px;">
              </div>
              <div>
                <label style="font-size:11.5px; font-weight:700; color:var(--secondary);">เวลาพักเบรก:</label>
                <input type="text" id="holBreak_${idx}" value="${meta.breakTime}" style="width:100%; padding:5px 8px; border:1px solid var(--border); border-radius:4px; font-family:inherit; font-size:12.5px;">
              </div>
            </div>
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <label style="font-size:11.5px; font-weight:700; color:var(--secondary);">หัวข้อ Job Description (JD):</label>
                <button class="btn btn-outline btn-sm" type="button" onclick="addJdLine('hol', ${idx})" style="padding:2px 8px; font-size:11px; color:var(--primary); border-color:var(--primary);">+ เพิ่มหัวข้อ JD</button>
              </div>
              <div id="holJdList_${idx}">
                ${meta.jd.map((line, lIdx) => `
                  <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px;">
                    <span style="color:var(--muted); font-size:12px;">•</span>
                    <input type="text" class="hol-jd-item-${idx}" value="${line}" style="flex:1; padding:4px 8px; border:1px solid var(--border); border-radius:4px; font-size:12px; font-family:inherit;">
                    <button class="btn btn-outline btn-sm" type="button" onclick="this.parentElement.remove()" style="color:var(--danger); padding:2px 6px; font-size:11px;" title="ลบหัวข้อนี้">✕</button>
                  </div>
                `).join("")}
              </div>
            </div>
          </div>
        `;
      });
      container.innerHTML = html;
    }

    function addJdLine(type, colIdx) {
      const container = document.getElementById(`${type}JdList_${colIdx}`);
      const div = document.createElement("div");
      div.style.cssText = "display:flex; gap:6px; align-items:center; margin-bottom:6px;";
      div.innerHTML = `
        <span style="color:var(--muted); font-size:12px;">•</span>
        <input type="text" class="${type}-jd-item-${colIdx}" value="" placeholder="ระบุข้อความ JD ใหม่" style="flex:1; padding:4px 8px; border:1px solid var(--border); border-radius:4px; font-size:12px; font-family:inherit;">
        <button class="btn btn-outline btn-sm" type="button" onclick="this.parentElement.remove()" style="color:var(--danger); padding:2px 6px; font-size:11px;">✕</button>
      `;
      container.appendChild(div);
      div.querySelector("input").focus();
    }

    function saveWeekdayJdConfig() {
      WEEKDAY_COLUMNS.forEach((col, idx) => {
        const roleInp = document.getElementById(`wkRole_${idx}`);
        const timeInp = document.getElementById(`wkTime_${idx}`);
        const breakInp = document.getElementById(`wkBreak_${idx}`);
        if (roleInp) col.role = roleInp.value.trim();
        if (timeInp) col.time = timeInp.value.trim();
        if (breakInp) col.breakTime = breakInp.value.trim();

        const jdInputs = document.querySelectorAll(`.wk-jd-item-${idx}`);
        const newJd = [];
        jdInputs.forEach(inp => {
          const v = inp.value.trim();
          if (v) newJd.push(v);
        });
        col.jd = newJd;
      });
      renderAllViews();
      showToast("💾 บันทึกเวลาเข้างานและ JD วันทำการเรียบร้อยแล้ว");
      triggerAutoSaveToCloud("บันทึกการตั้งค่า JD วันทำการ");
    }

    function saveHolidayJdConfig() {
      HOLIDAY_SHIFT_META.forEach((meta, idx) => {
        const timeInp = document.getElementById(`holTime_${idx}`);
        const breakInp = document.getElementById(`holBreak_${idx}`);
        if (timeInp) meta.time = timeInp.value.trim();
        if (breakInp) meta.breakTime = breakInp.value.trim();

        const jdInputs = document.querySelectorAll(`.hol-jd-item-${idx}`);
        const newJd = [];
        jdInputs.forEach(inp => {
          const v = inp.value.trim();
          if (v) newJd.push(v);
        });
        meta.jd = newJd;
      });
      renderAllViews();
      showToast("💾 บันทึกเวลาเข้างานและ JD วันหยุดเรียบร้อยแล้ว");
      triggerAutoSaveToCloud("บันทึกการตั้งค่า JD วันหยุด");
    }

    function saveAgentNames() {
      const usernameInputs = document.querySelectorAll(".agent-username-input");
      const thNameInputs = document.querySelectorAll(".agent-thname-input");
      
      const renamePairs = [];

      usernameInputs.forEach((inp, idx) => {
        const oldUsername = AGENTS[idx];
        const newUsername = inp.value.trim() || oldUsername;
        const thInp = thNameInputs[idx];
        const oldThaiName = AGENT_NAME_MAP[oldUsername] || "";
        const newThaiName = thInp ? thInp.value.trim() : oldThaiName;

        if (oldUsername !== newUsername || oldThaiName !== newThaiName) {
          renamePairs.push({ oldUsername, newUsername, oldThaiName, newThaiName, idx });
        }
      });

      if (renamePairs.length === 0) {
        showToast("ℹ️ ไม่มีการเปลี่ยนแปลงรายชื่อ");
        return;
      }

      // 1. Update AGENTS and AGENT_NAME_MAP
      renamePairs.forEach(pair => {
        const { oldUsername, newUsername, newThaiName, idx } = pair;
        AGENTS[idx] = newUsername;

        if (newThaiName) {
          AGENT_NAME_MAP[newUsername] = newThaiName;
        } else if (AGENT_NAME_MAP[oldUsername]) {
          AGENT_NAME_MAP[newUsername] = AGENT_NAME_MAP[oldUsername];
        }
        if (oldUsername !== newUsername && AGENT_NAME_MAP[oldUsername]) {
          delete AGENT_NAME_MAP[oldUsername];
        }
      });

      // 2. Helper to replace name in a schedule object
      function replaceNameInSchedule(sched, oldName, newName) {
        if (!sched) return;
        if (Array.isArray(sched.weeks)) {
          sched.weeks.forEach(w => {
            if (Array.isArray(w.assignments)) {
              w.assignments.forEach(colList => {
                if (Array.isArray(colList)) {
                  for (let s = 0; s < colList.length; s++) {
                    if (colList[s] === oldName) {
                      colList[s] = newName;
                    }
                  }
                }
              });
            }
          });
        }
        if (Array.isArray(sched.holidays)) {
          sched.holidays.forEach(h => {
            if (Array.isArray(h.shifts)) {
              for (let s = 0; s < h.shifts.length; s++) {
                if (h.shifts[s] === oldName) {
                  h.shifts[s] = newName;
                }
              }
            }
          });
        }
      }

      // 3. Propagate replacement to currentSchedule, originalSchedule, and all monthSchedules
      renamePairs.forEach(pair => {
        const { oldUsername, newUsername, newThaiName } = pair;
        if (oldUsername === newUsername) return;

        replaceNameInSchedule(currentSchedule, oldUsername, newUsername);
        replaceNameInSchedule(originalSchedule, oldUsername, newUsername);

        Object.keys(monthSchedules).forEach(key => {
          const mData = monthSchedules[key];
          if (!mData) return;
          replaceNameInSchedule(mData.schedule, oldUsername, newUsername);
          replaceNameInSchedule(mData.originalSchedule, oldUsername, newUsername);

          // Update leaves
          if (mData.leaves && typeof mData.leaves === 'object') {
            Object.keys(mData.leaves).forEach(slotKey => {
              const l = mData.leaves[slotKey];
              if (l && l.agent === oldUsername) {
                l.agent = newUsername;
              }
            });
          }

          // Update swap history
          if (Array.isArray(mData.swapHistory)) {
            mData.swapHistory.forEach(item => {
              if (item.agentA && item.agentA.username === oldUsername) {
                item.agentA.username = newUsername;
                item.agentA.thName = newThaiName || AGENT_NAME_MAP[newUsername] || newUsername;
              }
              if (item.agentB && item.agentB.username === oldUsername) {
                item.agentB.username = newUsername;
                item.agentB.thName = newThaiName || AGENT_NAME_MAP[newUsername] || newUsername;
              }
              if (item.detail && item.detail.includes(oldUsername)) {
                item.detail = item.detail.split(oldUsername).join(newUsername);
              }
              if (item.summaryAtoB && item.summaryAtoB.includes(oldUsername)) {
                item.summaryAtoB = item.summaryAtoB.split(oldUsername).join(newUsername);
              }
              if (item.summaryBtoA && item.summaryBtoA.includes(oldUsername)) {
                item.summaryBtoA = item.summaryBtoA.split(oldUsername).join(newUsername);
              }
            });
          }
        });

        // HISTORICAL_SCHEDULES
        Object.keys(HISTORICAL_SCHEDULES).forEach(key => {
          replaceNameInSchedule(HISTORICAL_SCHEDULES[key], oldUsername, newUsername);
        });

        // WEEKDAY_ROTATION_MATRIX
        if (Array.isArray(WEEKDAY_ROTATION_MATRIX)) {
          WEEKDAY_ROTATION_MATRIX.forEach(week => {
            if (Array.isArray(week)) {
              week.forEach(col => {
                if (Array.isArray(col)) {
                  for (let s = 0; s < col.length; s++) {
                    if (col[s] === oldUsername) col[s] = newUsername;
                  }
                }
              });
            }
          });
        }

        // HOLIDAY_ROTATION_AGENTS
        if (Array.isArray(HOLIDAY_ROTATION_AGENTS)) {
          for (let h = 0; h < HOLIDAY_ROTATION_AGENTS.length; h++) {
            if (HOLIDAY_ROTATION_AGENTS[h] === oldUsername) {
              HOLIDAY_ROTATION_AGENTS[h] = newUsername;
            }
          }
        }
      });

      // 4. Update UI
      updateAdminModeUI();
      populateFilterDropdowns();
      renderAllViews();
      renderAgentsEditor();

      showToast(`💾 บันทึกและอัปเดตรายชื่อสำเร็จ (${renamePairs.length} คน) ข้อมูลกะเวรเชื่อมโยงอัตโนมัติเรียบร้อย`);
      triggerAutoSaveToCloud(`บันทึกรายชื่อเจ้าหน้าที่ (${renamePairs.length} คน)`);
    }


