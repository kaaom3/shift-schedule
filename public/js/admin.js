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
              <span style="font-weight:700; font-size:12px; color:var(--primary);">ช่องที่ ${cIdx + 1} • ${col.role}</span>
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
      if (!container) return;
      let html = "";
      WEEKDAY_COLUMNS.forEach((col, idx) => {
        const roles = getShiftRoles(col);
        const times = getShiftTimes(col);
        const breaks = getShiftBreakTimes(col);
        const jds = Array.isArray(col.jd) ? col.jd : [];

        html += `
          <div style="background:#f8fafc; border:1px solid var(--border-dark); border-radius:10px; padding:16px; margin-bottom:14px; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid var(--border); padding-bottom:8px;">
              <div>
                <strong style="color:var(--primary); font-size:15px;">กะที่ ${idx + 1}</strong>
                <span style="font-size:12px; color:var(--secondary); margin-left:8px;">• ${col.role || roles.join(" / ")}</span>
              </div>
              <span style="font-size:12px; color:var(--muted); background:#f1f5f9; padding:2px 8px; border-radius:6px; font-weight:600;">👥 จำนวนคน: ${col.slots} คน</span>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap:12px; margin-bottom:14px;">

              <!-- 1. หน้าที่งาน (Role) -->
              <div style="background:white; border:1px solid var(--border); border-radius:8px; padding:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <label style="font-size:12px; font-weight:700; color:var(--primary); display:flex; align-items:center; gap:5px;">
                    <span>🏷️</span> หน้าที่งาน (Role):
                  </label>
                  <button class="btn btn-outline btn-sm" type="button" onclick="addShiftItem('wk', 'role', ${idx})" style="padding:2px 8px; font-size:11px; border-color:var(--primary); color:var(--primary);">+ เพิ่มหน้าที่</button>
                </div>
                <div id="wkRoleList_${idx}">
                  ${roles.map((r, rIdx) => `
                    <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px;">
                      <span style="color:var(--muted); font-size:12px;">•</span>
                      <input type="text" class="wk-role-item-${idx}" value="${escapeHtml(r)}" placeholder="ระบุหน้าที่งาน เช่น Call, ECE, Mail" style="flex:1; padding:5px 8px; border:1px solid var(--border); border-radius:5px; font-size:12px; font-family:inherit;">
                      <button class="btn btn-outline btn-sm" type="button" onclick="this.parentElement.remove()" style="color:var(--danger); padding:2px 6px; font-size:11px;" title="ลบหน้าที่นี้">✕</button>
                    </div>
                  `).join("")}
                </div>
              </div>

              <!-- 2. เวลาเข้า-ออกงาน (Working Hours) -->
              <div style="background:white; border:1px solid var(--border); border-radius:8px; padding:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <label style="font-size:12px; font-weight:700; color:var(--primary); display:flex; align-items:center; gap:5px;">
                    <span>⏱️</span> เวลาเข้า-ออกงาน:
                  </label>
                  <button class="btn btn-outline btn-sm" type="button" onclick="addShiftItem('wk', 'time', ${idx})" style="padding:2px 8px; font-size:11px; border-color:var(--primary); color:var(--primary);">+ เพิ่มเวลา</button>
                </div>
                <div id="wkTimeList_${idx}">
                  ${times.map((t, tIdx) => `
                    <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px;">
                      <span style="color:var(--muted); font-size:12px;">•</span>
                      <input type="text" class="wk-time-item-${idx}" value="${escapeHtml(t)}" placeholder="เช่น 08.00-17.00" style="flex:1; padding:5px 8px; border:1px solid var(--border); border-radius:5px; font-size:12px; font-family:inherit;">
                      <button class="btn btn-outline btn-sm" type="button" onclick="this.parentElement.remove()" style="color:var(--danger); padding:2px 6px; font-size:11px;" title="ลบเวลานี้">✕</button>
                    </div>
                  `).join("")}
                </div>
              </div>

              <!-- 3. เวลาพักเบรก (Break Times) -->
              <div style="background:white; border:1px solid var(--border); border-radius:8px; padding:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <label style="font-size:12px; font-weight:700; color:var(--primary); display:flex; align-items:center; gap:5px;">
                    <span>☕</span> เวลาพักเบรก:
                  </label>
                  <button class="btn btn-outline btn-sm" type="button" onclick="addShiftItem('wk', 'break', ${idx})" style="padding:2px 8px; font-size:11px; border-color:var(--primary); color:var(--primary);">+ เพิ่มเวลาพัก</button>
                </div>
                <div id="wkBreakList_${idx}">
                  ${breaks.map((b, bIdx) => `
                    <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px;">
                      <span style="color:var(--muted); font-size:12px;">•</span>
                      <input type="text" class="wk-break-item-${idx}" value="${escapeHtml(b)}" placeholder="เช่น พัก 13.00 น." style="flex:1; padding:5px 8px; border:1px solid var(--border); border-radius:5px; font-size:12px; font-family:inherit;">
                      <button class="btn btn-outline btn-sm" type="button" onclick="this.parentElement.remove()" style="color:var(--danger); padding:2px 6px; font-size:11px;" title="ลบเวลาพักนี้">✕</button>
                    </div>
                  `).join("")}
                </div>
                <div style="font-size:11px; color:var(--muted); margin-top:6px;">
                  💡 สามารถเพิ่มได้มากกว่า 1 เวลา หากมีหลายคนระบบจะจัดสรรกลุ่มเวลาพักให้ตามลำดับโดยอัตโนมัติ
                </div>
              </div>

            </div>

            <!-- 4. หัวข้อ Job Description (JD) -->
            <div style="background:white; border:1px solid var(--border); border-radius:8px; padding:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <label style="font-size:12px; font-weight:700; color:var(--primary); display:flex; align-items:center; gap:5px;">
                  <span>📋</span> หัวข้อ Job Description (JD):
                </label>
                <button class="btn btn-outline btn-sm" type="button" onclick="addJdLine('wk', ${idx})" style="padding:2px 8px; font-size:11px; color:var(--primary); border-color:var(--primary);">+ เพิ่มหัวข้อ JD</button>
              </div>
              <div id="wkJdList_${idx}">
                ${jds.map((line, lIdx) => `
                  <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px;">
                    <span style="color:var(--muted); font-size:12px;">•</span>
                    <input type="text" class="wk-jd-item-${idx}" value="${escapeHtml(line)}" style="flex:1; padding:5px 8px; border:1px solid var(--border); border-radius:5px; font-size:12px; font-family:inherit;">
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
      if (!container) return;
      let html = "";
      HOLIDAY_SHIFT_META.forEach((meta, idx) => {
        const roles = getShiftRoles(meta);
        const times = getShiftTimes(meta);
        const breaks = getShiftBreakTimes(meta);
        const jds = Array.isArray(meta.jd) ? meta.jd : [];

        html += `
          <div style="background:#f8fafc; border:1px solid var(--border-dark); border-radius:10px; padding:16px; margin-bottom:14px; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid var(--border); padding-bottom:8px;">
              <strong style="color:var(--primary); font-size:15px;">กะวันหยุดที่ ${idx + 1} [${times.join(" / ")}]</strong>
              <span class="badge badge-hol">วันหยุดพิเศษ</span>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap:12px; margin-bottom:14px;">

              <!-- 1. หน้าที่งาน (Role) -->
              <div style="background:white; border:1px solid var(--border); border-radius:8px; padding:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <label style="font-size:12px; font-weight:700; color:var(--primary); display:flex; align-items:center; gap:5px;">
                    <span>🏷️</span> ชื่อกะ / หน้าที่งาน (Role):
                  </label>
                  <button class="btn btn-outline btn-sm" type="button" onclick="addShiftItem('hol', 'role', ${idx})" style="padding:2px 8px; font-size:11px; border-color:var(--primary); color:var(--primary);">+ เพิ่มหน้าที่</button>
                </div>
                <div id="holRoleList_${idx}">
                  ${roles.map((r, rIdx) => `
                    <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px;">
                      <span style="color:var(--muted); font-size:12px;">•</span>
                      <input type="text" class="hol-role-item-${idx}" value="${escapeHtml(r)}" placeholder="ระบุหน้าที่งาน" style="flex:1; padding:5px 8px; border:1px solid var(--border); border-radius:5px; font-size:12px; font-family:inherit;">
                      <button class="btn btn-outline btn-sm" type="button" onclick="this.parentElement.remove()" style="color:var(--danger); padding:2px 6px; font-size:11px;" title="ลบหน้าที่นี้">✕</button>
                    </div>
                  `).join("")}
                </div>
              </div>

              <!-- 2. เวลาเข้า-ออกงาน (Working Hours) -->
              <div style="background:white; border:1px solid var(--border); border-radius:8px; padding:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <label style="font-size:12px; font-weight:700; color:var(--primary); display:flex; align-items:center; gap:5px;">
                    <span>⏱️</span> เวลาเข้า-ออกงาน:
                  </label>
                  <button class="btn btn-outline btn-sm" type="button" onclick="addShiftItem('hol', 'time', ${idx})" style="padding:2px 8px; font-size:11px; border-color:var(--primary); color:var(--primary);">+ เพิ่มเวลา</button>
                </div>
                <div id="holTimeList_${idx}">
                  ${times.map((t, tIdx) => `
                    <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px;">
                      <span style="color:var(--muted); font-size:12px;">•</span>
                      <input type="text" class="hol-time-item-${idx}" value="${escapeHtml(t)}" placeholder="เช่น 08.00-17.00 น." style="flex:1; padding:5px 8px; border:1px solid var(--border); border-radius:5px; font-size:12px; font-family:inherit;">
                      <button class="btn btn-outline btn-sm" type="button" onclick="this.parentElement.remove()" style="color:var(--danger); padding:2px 6px; font-size:11px;" title="ลบเวลานี้">✕</button>
                    </div>
                  `).join("")}
                </div>
              </div>

              <!-- 3. เวลาพักเบรก (Break Times) -->
              <div style="background:white; border:1px solid var(--border); border-radius:8px; padding:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <label style="font-size:12px; font-weight:700; color:var(--primary); display:flex; align-items:center; gap:5px;">
                    <span>☕</span> เวลาพักเบรก:
                  </label>
                  <button class="btn btn-outline btn-sm" type="button" onclick="addShiftItem('hol', 'break', ${idx})" style="padding:2px 8px; font-size:11px; border-color:var(--primary); color:var(--primary);">+ เพิ่มเวลาพัก</button>
                </div>
                <div id="holBreakList_${idx}">
                  ${breaks.map((b, bIdx) => `
                    <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px;">
                      <span style="color:var(--muted); font-size:12px;">•</span>
                      <input type="text" class="hol-break-item-${idx}" value="${escapeHtml(b)}" placeholder="เช่น พัก 13.30-14.30 น." style="flex:1; padding:5px 8px; border:1px solid var(--border); border-radius:5px; font-size:12px; font-family:inherit;">
                      <button class="btn btn-outline btn-sm" type="button" onclick="this.parentElement.remove()" style="color:var(--danger); padding:2px 6px; font-size:11px;" title="ลบเวลาพักนี้">✕</button>
                    </div>
                  `).join("")}
                </div>
              </div>

            </div>

            <!-- 4. หัวข้อ Job Description (JD) -->
            <div style="background:white; border:1px solid var(--border); border-radius:8px; padding:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <label style="font-size:12px; font-weight:700; color:var(--primary); display:flex; align-items:center; gap:5px;">
                  <span>📋</span> หัวข้อ Job Description (JD):
                </label>
                <button class="btn btn-outline btn-sm" type="button" onclick="addJdLine('hol', ${idx})" style="padding:2px 8px; font-size:11px; color:var(--primary); border-color:var(--primary);">+ เพิ่มหัวข้อ JD</button>
              </div>
              <div id="holJdList_${idx}">
                ${jds.map((line, lIdx) => `
                  <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px;">
                    <span style="color:var(--muted); font-size:12px;">•</span>
                    <input type="text" class="hol-jd-item-${idx}" value="${escapeHtml(line)}" style="flex:1; padding:5px 8px; border:1px solid var(--border); border-radius:5px; font-size:12px; font-family:inherit;">
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

    function addShiftItem(type, field, colIdx) {
      const capField = field.charAt(0).toUpperCase() + field.slice(1);
      const container = document.getElementById(`${type}${capField}List_${colIdx}`);
      if (!container) return;
      const placeholders = {
        role: "ระบุหน้าที่งาน เช่น Call, ECE, Mail",
        time: "ระบุเวลาเข้า-ออกงาน เช่น 08.00-17.00",
        break: "ระบุเวลาพัก เช่น พัก 12.00 น."
      };
      const div = document.createElement("div");
      div.style.cssText = "display:flex; gap:6px; align-items:center; margin-bottom:6px;";
      div.innerHTML = `
        <span style="color:var(--muted); font-size:12px;">•</span>
        <input type="text" class="${type}-${field}-item-${colIdx}" value="" placeholder="${placeholders[field] || ''}" style="flex:1; padding:5px 8px; border:1px solid var(--border); border-radius:5px; font-size:12px; font-family:inherit;">
        <button class="btn btn-outline btn-sm" type="button" onclick="this.parentElement.remove()" style="color:var(--danger); padding:2px 6px; font-size:11px;" title="ลบรายการนี้">✕</button>
      `;
      container.appendChild(div);
      div.querySelector("input").focus();
    }

    function addJdLine(type, colIdx) {
      const container = document.getElementById(`${type}JdList_${colIdx}`);
      if (!container) return;
      const div = document.createElement("div");
      div.style.cssText = "display:flex; gap:6px; align-items:center; margin-bottom:6px;";
      div.innerHTML = `
        <span style="color:var(--muted); font-size:12px;">•</span>
        <input type="text" class="${type}-jd-item-${colIdx}" value="" placeholder="ระบุข้อความ JD ใหม่" style="flex:1; padding:5px 8px; border:1px solid var(--border); border-radius:5px; font-size:12px; font-family:inherit;">
        <button class="btn btn-outline btn-sm" type="button" onclick="this.parentElement.remove()" style="color:var(--danger); padding:2px 6px; font-size:11px;" title="ลบหัวข้อนี้">✕</button>
      `;
      container.appendChild(div);
      div.querySelector("input").focus();
    }

    function saveWeekdayJdConfig() {
      WEEKDAY_COLUMNS.forEach((col, idx) => {
        // 1. Roles
        const roleInputs = document.querySelectorAll(`.wk-role-item-${idx}`);
        const roles = Array.from(roleInputs).map(inp => inp.value.trim()).filter(Boolean);
        col.roles = roles.length > 0 ? roles : [col.role || "เจ้าหน้าที่"];
        col.role = col.roles.join(" / ");

        // 2. Times
        const timeInputs = document.querySelectorAll(`.wk-time-item-${idx}`);
        const times = Array.from(timeInputs).map(inp => inp.value.trim()).filter(Boolean);
        col.times = times.length > 0 ? times : [col.time || "08.00-17.00"];
        col.time = col.times.join(" / ");

        // 3. Break times
        const breakInputs = document.querySelectorAll(`.wk-break-item-${idx}`);
        const breaks = Array.from(breakInputs).map(inp => inp.value.trim()).filter(Boolean);
        col.breakTimes = breaks.length > 0 ? breaks : [col.breakTime || "พัก 12.00"];
        col.breakTime = col.breakTimes.join(" / ");

        // 4. JD
        const jdInputs = document.querySelectorAll(`.wk-jd-item-${idx}`);
        const newJd = Array.from(jdInputs).map(inp => inp.value.trim()).filter(Boolean);
        col.jd = newJd;
      });

      renderAllViews();
      showToast("💾 บันทึกเวลาเข้างาน, เวลาพัก และ JD วันทำการเรียบร้อยแล้ว");
      triggerAutoSaveToCloud("บันทึกการตั้งค่ากะและ JD วันทำการ");
    }

    function saveHolidayJdConfig() {
      HOLIDAY_SHIFT_META.forEach((meta, idx) => {
        // 1. Roles
        const roleInputs = document.querySelectorAll(`.hol-role-item-${idx}`);
        const roles = Array.from(roleInputs).map(inp => inp.value.trim()).filter(Boolean);
        meta.roles = roles.length > 0 ? roles : [meta.role || `กะวันหยุดที่ ${idx+1}`];
        meta.role = meta.roles.join(" / ");

        // 2. Times
        const timeInputs = document.querySelectorAll(`.hol-time-item-${idx}`);
        const times = Array.from(timeInputs).map(inp => inp.value.trim()).filter(Boolean);
        meta.times = times.length > 0 ? times : [meta.time || "08.00-17.00"];
        meta.time = meta.times.join(" / ");

        // 3. Break times
        const breakInputs = document.querySelectorAll(`.hol-break-item-${idx}`);
        const breaks = Array.from(breakInputs).map(inp => inp.value.trim()).filter(Boolean);
        meta.breakTimes = breaks.length > 0 ? breaks : [meta.breakTime || "พัก 13.00"];
        meta.breakTime = meta.breakTimes.join(" / ");

        // 4. JD
        const jdInputs = document.querySelectorAll(`.hol-jd-item-${idx}`);
        const newJd = Array.from(jdInputs).map(inp => inp.value.trim()).filter(Boolean);
        meta.jd = newJd;
      });

      renderAllViews();
      showToast("💾 บันทึกเวลาเข้างาน, เวลาพัก และ JD วันหยุดเรียบร้อยแล้ว");
      triggerAutoSaveToCloud("บันทึกการตั้งค่ากะและ JD วันหยุด");
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


