// =========================================================
// EXPORT TO EXCEL (.xlsx) WITH COMPREHENSIVE STYLING
// =========================================================

    // FULL PROFESSIONAL EXPORT TO EXCEL (.xlsx) WITH BEAUTIFUL STYLING & BORDERS
    async function exportToExcel() {
      showToast("⏳ กำลังสร้างไฟล์ Excel รูปแบบตารางสวยงาม กรุณารอสักครู่...");

      const yearAD = parseInt(document.getElementById("yearSelect").value, 10);
      const month = parseInt(document.getElementById("monthSelect").value, 10);
      const yearTH = yearAD + 543;
      const monthName = THAI_MONTHS[month];
      const leaves = getMonthLeaves(yearAD, month);
      const fileName = `ตารางเวร_First_Tier_${yearAD}_${String(month).padStart(2, '0')}.xlsx`;

      // If ExcelJS is available, generate fully styled workbook
      if (typeof ExcelJS !== 'undefined') {
        try {
          const wb = new ExcelJS.Workbook();
          wb.creator = "First Tier Workforce System";
          wb.created = new Date();

          const thinBorder = {
            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
          };

          const headerBorder = {
            top: { style: 'thin', color: { argb: 'FF94A3B8' } },
            left: { style: 'thin', color: { argb: 'FF94A3B8' } },
            bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
            right: { style: 'thin', color: { argb: 'FF94A3B8' } }
          };

          // =========================================================
          // 1. SHEET: เวรวันทำการ (Weekday Shifts)
          // =========================================================
          const wsWd = wb.addWorksheet('เวรวันทำการ', {
            views: [{ showGridLines: true }],
            pageSetup: { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0 }
          });

          // Set Column Widths (A=24, B-Q=28)
          const wdCols = [{ key: 'col_week', width: 24 }];
          WEEKDAY_COLUMNS.forEach((c, idx) => {
            wdCols.push({ key: `col_${idx}`, width: 28 });
          });
          wsWd.columns = wdCols;

          // Row 1: Main Title Banner
          wsWd.mergeCells('A1:Q1');
          for (let c = 1; c <= 17; c++) {
            const cell = wsWd.getCell(1, c);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
          }
          const titleCell = wsWd.getCell('A1');
          titleCell.value = `ตารางเวร First Tier ประจำเดือน ${monthName} พ.ศ. ${yearTH}`;
          titleCell.font = { name: 'Sarabun', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
          titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
          wsWd.getRow(1).height = 42;

          // Row 2: Subtitle Info Banner
          wsWd.mergeCells('A2:Q2');
          for (let c = 1; c <= 17; c++) {
            const cell = wsWd.getCell(2, c);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
          }
          const subCell = wsWd.getCell('A2');
          subCell.value = 'ฝ่ายปฏิบัติการเทคโนโลยีสารสนเทศ • First Tier Support Group (16 ช่องงาน)';
          subCell.font = { name: 'Sarabun', size: 10, italic: true, color: { argb: 'FF7DD3FC' } };
          subCell.alignment = { horizontal: 'center', vertical: 'middle' };
          wsWd.getRow(2).height = 22;

          // Merge A3:A6 for Week Column Header
          wsWd.mergeCells('A3:A6');
          for (let r = 3; r <= 6; r++) {
            const cell = wsWd.getCell(r, 1);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            cell.border = headerBorder;
          }
          const weekHCell = wsWd.getCell('A3');
          weekHCell.value = 'สัปดาห์ / วันที่';
          weekHCell.font = { name: 'Sarabun', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
          weekHCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

          // Row 3: ช่องที่ 1-16
          wsWd.getRow(3).height = 28;
          WEEKDAY_COLUMNS.forEach((col, idx) => {
            const cell = wsWd.getCell(3, idx + 2);
            cell.value = `ช่องที่ ${idx + 1}`;
            cell.font = { name: 'Sarabun', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = headerBorder;
          });

          // Row 4: เวลาทำงาน
          wsWd.getRow(4).height = 24;
          WEEKDAY_COLUMNS.forEach((col, idx) => {
            const cell = wsWd.getCell(4, idx + 2);
            cell.value = `${col.time} น.`;
            cell.font = { name: 'Sarabun', size: 10.5, bold: true, color: { argb: 'FF1E3A8A' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = headerBorder;
          });

          // Row 5: เวลาพัก
          wsWd.getRow(5).height = 22;
          WEEKDAY_COLUMNS.forEach((col, idx) => {
            const cell = wsWd.getCell(5, idx + 2);
            cell.value = col.breakTime;
            cell.font = { name: 'Sarabun', size: 10, bold: true, color: { argb: 'FF9A3412' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = headerBorder;
          });

          // Row 6: Role & Code
          wsWd.getRow(6).height = 26;
          WEEKDAY_COLUMNS.forEach((col, idx) => {
            const cell = wsWd.getCell(6, idx + 2);
            cell.value = col.role;
            cell.font = { name: 'Sarabun', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = headerBorder;
          });

          // Row 7: รายละเอียดงาน (Job Description - JD)
          wsWd.getRow(7).height = 70;
          const cellJdHeader = wsWd.getCell(7, 1);
          cellJdHeader.value = 'รายละเอียดงาน (JD)';
          cellJdHeader.font = { name: 'Sarabun', size: 9.5, bold: true, color: { argb: 'FF1E293B' } };
          cellJdHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
          cellJdHeader.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cellJdHeader.border = headerBorder;

          WEEKDAY_COLUMNS.forEach((col, idx) => {
            const cell = wsWd.getCell(7, idx + 2);
            cell.value = col.jd.map(line => `• ${line}`).join('\n');
            cell.font = { name: 'Sarabun', size: 8.5, color: { argb: 'FF334155' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
            cell.border = headerBorder;
          });

          // Data Rows (Weeks)
          let currentRowNum = 8;
          currentSchedule.weeks.forEach((w, wIdx) => {
            const isEvenWeek = wIdx % 2 === 0;
            const defaultRowBg = isEvenWeek ? 'FFFFFFFF' : 'FFF8FAFC';
            const customTimes = w.customTimes || {};
            const isCustomWeek = Object.keys(customTimes).length > 0;

            let maxAgents = 1;
            WEEKDAY_COLUMNS.forEach((col, cIdx) => {
              const len = (w.assignments[cIdx] || []).length;
              if (len > maxAgents) maxAgents = len;
            });

            const rowHeight = maxAgents >= 4 ? 85 : (maxAgents >= 2 ? 55 : 38);
            wsWd.getRow(currentRowNum).height = rowHeight;

            // Week label cell
            const weekCell = wsWd.getCell(currentRowNum, 1);
            let cleanWeekLabel = w.label;
            if (isCustomWeek) cleanWeekLabel += '\n(⚡ ปรับเวลาพิเศษ)';
            weekCell.value = cleanWeekLabel;
            weekCell.font = { name: 'Sarabun', size: 10.5, bold: true, color: { argb: isCustomWeek ? 'FFC2410C' : 'FF1E3A8A' } };
            weekCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isCustomWeek ? 'FFFFEDD5' : 'FFF1F5F9' } };
            weekCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            weekCell.border = thinBorder;

            // Shift slots
            WEEKDAY_COLUMNS.forEach((col, cIdx) => {
              const cell = wsWd.getCell(currentRowNum, cIdx + 2);
              const assigned = w.assignments[cIdx] || [];
              let hasLeaveInSlot = false;

              const formattedLines = assigned.map((rawName, sIdx) => {
                const th = AGENT_NAME_MAP[rawName] ? ` (${AGENT_NAME_MAP[rawName]})` : '';
                const lKey = `W_${wIdx}_${cIdx}_${sIdx}`;
                const leave = leaves[lKey];
                let leaveText = '';
                if (leave) {
                  hasLeaveInSlot = true;
                  const mShort = (typeof THAI_MONTHS_SHORT !== "undefined" && THAI_MONTHS_SHORT[month]) ? THAI_MONTHS_SHORT[month] : "";
                  const dText = getLeaveDatesBadgeText(leave, mShort);
                  const dLabel = dText ? ` (${dText})` : '';
                  leaveText = ` [${leave.leaveType}${dLabel}${leave.note ? ': ' + leave.note : ''}]`;
                }
                const customNote = customTimes[cIdx] ? ` [เวลา: ${customTimes[cIdx].time}]` : '';
                return `${rawName}${th}${leaveText}${customNote}`;
              });

              cell.value = formattedLines.join('\n') || '-';
              cell.font = { name: 'Sarabun', size: 10, color: { argb: hasLeaveInSlot ? 'FFC2410C' : 'FF0F172A' } };
              
              if (hasLeaveInSlot) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } };
                cell.border = {
                  top: { style: 'thin', color: { argb: 'FFF97316' } },
                  left: { style: 'thin', color: { argb: 'FFF97316' } },
                  bottom: { style: 'thin', color: { argb: 'FFF97316' } },
                  right: { style: 'thin', color: { argb: 'FFF97316' } }
                };
              } else if (customTimes[cIdx]) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
                cell.border = thinBorder;
              } else {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: defaultRowBg } };
                cell.border = thinBorder;
              }

              cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            });

            currentRowNum++;
          });

          // =========================================================
          // 2. SHEET: เวรวันหยุด (Weekend & BOT Holidays)
          // =========================================================
          const wsWe = wb.addWorksheet('เวรวันหยุด', {
            views: [{ showGridLines: true }],
            pageSetup: { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0 }
          });

          wsWe.columns = [
            { key: 'day', width: 14 },
            { key: 'date', width: 14 },
            { key: 'note', width: 30 },
            { key: 's1', width: 28 },
            { key: 's2', width: 28 },
            { key: 's3', width: 28 },
            { key: 's4', width: 28 }
          ];

          // Title Row
          wsWe.mergeCells('A1:G1');
          for (let c = 1; c <= 7; c++) {
            const cell = wsWe.getCell(1, c);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
          }
          const weTitle = wsWe.getCell('A1');
          weTitle.value = `ตารางเวร First Tier วันหยุด ประจำเดือน ${monthName} พ.ศ. ${yearTH}`;
          weTitle.font = { name: 'Sarabun', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
          weTitle.alignment = { horizontal: 'center', vertical: 'middle' };
          wsWe.getRow(1).height = 42;

          // Subtitle
          wsWe.mergeCells('A2:G2');
          for (let c = 1; c <= 7; c++) {
            const cell = wsWe.getCell(2, c);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF064E3B' } };
          }
          const weSub = wsWe.getCell('A2');
          weSub.value = 'ประจำวันเสาร์-อาทิตย์ และวันหยุดตามประกาศ ธปท. (4 กะเวลา)';
          weSub.font = { name: 'Sarabun', size: 10, italic: true, color: { argb: 'FFA7F3D0' } };
          weSub.alignment = { horizontal: 'center', vertical: 'middle' };
          wsWe.getRow(2).height = 22;

          // Header 1: Shift Names
          wsWe.getRow(3).height = 28;
          const weH1 = ['วัน', 'วันที่', 'หมายเหตุวันหยุดพิเศษ', 'เวร 08:00 - 17:00 น.', 'เวร 09:00 - 18:00 น.', 'เวร 10:00 - 19:00 น.', 'เวร 13:30 - 22:30 น.'];
          weH1.forEach((txt, idx) => {
            const cell = wsWe.getCell(3, idx + 1);
            cell.value = txt;
            cell.font = { name: 'Sarabun', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = headerBorder;
          });

          // Header 2: Break Times
          wsWe.getRow(4).height = 22;
          const weH2 = ['', '', '', 'พัก 13:30 - 14:30', 'พัก 14:30 - 15:30', 'พัก 14:00 - 15:00', 'พัก 16:00 - 17:00'];
          weH2.forEach((txt, idx) => {
            const cell = wsWe.getCell(4, idx + 1);
            cell.value = txt;
            cell.font = { name: 'Sarabun', size: 10, bold: true, color: { argb: 'FF9A3412' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = headerBorder;
          });

          // Header 3: Job Description (JD)
          wsWe.getRow(5).height = 65;
          const cellHolJdHeader = wsWe.getCell(5, 3);
          cellHolJdHeader.value = 'รายละเอียดงาน (JD)';
          cellHolJdHeader.font = { name: 'Sarabun', size: 9.5, bold: true, color: { argb: 'FF065F46' } };
          cellHolJdHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EA' } };
          cellHolJdHeader.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cellHolJdHeader.border = headerBorder;

          for (let s = 0; s < 4; s++) {
            const cell = wsWe.getCell(5, s + 4);
            const meta = HOLIDAY_SHIFT_META[s];
            cell.value = (meta && meta.jd) ? meta.jd.map(l => `• ${l}`).join('\n') : '-';
            cell.font = { name: 'Sarabun', size: 8.5, color: { argb: 'FF1E293B' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
            cell.border = headerBorder;
          }

          // Holiday Data Rows
          let holRowNum = 6;
          currentSchedule.holidays.forEach((h, hIdx) => {
            const isSun = h.dayName === 'อาทิตย์';
            const isSat = h.dayName === 'เสาร์';
            const dayBgColor = isSun ? 'FFFFF1F2' : (isSat ? 'FFFFFBEB' : 'FFEFF6FF');
            const dayTextColor = isSun ? 'FFE11D48' : (isSat ? 'FFB45309' : 'FF1E3A8A');

            wsWe.getRow(holRowNum).height = 34;

            const cDay = wsWe.getCell(holRowNum, 1);
            cDay.value = h.dayName;
            cDay.font = { name: 'Sarabun', size: 10.5, bold: true, color: { argb: dayTextColor } };
            cDay.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: dayBgColor } };
            cDay.alignment = { horizontal: 'center', vertical: 'middle' };
            cDay.border = thinBorder;

            const cDate = wsWe.getCell(holRowNum, 2);
            cDate.value = `${h.date} ${THAI_MONTHS_SHORT[month]}`;
            cDate.font = { name: 'Sarabun', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
            cDate.alignment = { horizontal: 'center', vertical: 'middle' };
            cDate.border = thinBorder;

            const cNote = wsWe.getCell(holRowNum, 3);
            const cleanNote = (h.note || h.holidayName || '').replace(/^วันหยุด\s*ธปท\.?\s*:\s*/i, '').replace(/\(ธปท\.?\)/i, '').trim();
            cNote.value = cleanNote ? `🏦 ${cleanNote}` : '-';
            cNote.font = { name: 'Sarabun', size: 9.5, color: { argb: cleanNote ? 'FFB45309' : 'FF64748B' } };
            cNote.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cleanNote ? 'FFFEF3C7' : 'FFFFFFFF' } };
            cNote.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cNote.border = thinBorder;

            for (let s = 0; s < 4; s++) {
              const cShift = wsWe.getCell(holRowNum, 4 + s);
              const ag = h.shifts[s] || '-';
              const th = AGENT_NAME_MAP[ag] ? ` (${AGENT_NAME_MAP[ag]})` : '';
              const lKey = `H_${hIdx}_${s}`;
              const leave = leaves[lKey];
              let leaveText = '';
              if (leave) leaveText = ` [${leave.leaveType}]`;

              cShift.value = `${ag}${th}${leaveText}`;
              cShift.font = { name: 'Sarabun', size: 10, color: { argb: leave ? 'FFC2410C' : 'FF0F172A' } };
              cShift.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: leave ? 'FFFFEDD5' : 'FFFFFFFF' } };
              cShift.alignment = { horizontal: 'center', vertical: 'middle' };
              cShift.border = leave ? {
                top: { style: 'thin', color: { argb: 'FFF97316' } },
                left: { style: 'thin', color: { argb: 'FFF97316' } },
                bottom: { style: 'thin', color: { argb: 'FFF97316' } },
                right: { style: 'thin', color: { argb: 'FFF97316' } }
              } : thinBorder;
            }

            holRowNum++;
          });

          // =========================================================
          // 3. SHEET: สรุปสถิติรายบุคคล (Agent Summary)
          // =========================================================
          const wsSum = wb.addWorksheet('สรุปรายบุคคล', {
            views: [{ showGridLines: true }],
            pageSetup: { fitToWidth: 1, fitToHeight: 0 }
          });

          wsSum.columns = [
            { key: 'no', width: 10 },
            { key: 'user', width: 24 },
            { key: 'thName', width: 24 },
            { key: 'call', width: 26 },
            { key: 'hol', width: 20 },
            { key: 'leave', width: 20 }
          ];

          wsSum.mergeCells('A1:F1');
          for (let c = 1; c <= 6; c++) {
            const cell = wsSum.getCell(1, c);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
          }
          const sumTitle = wsSum.getCell('A1');
          sumTitle.value = `สรุปสถิติการปฏิบัติงาน First Tier ประจำเดือน ${monthName} พ.ศ. ${yearTH}`;
          sumTitle.font = { name: 'Sarabun', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
          sumTitle.alignment = { horizontal: 'center', vertical: 'middle' };
          wsSum.getRow(1).height = 42;

          wsSum.getRow(2).height = 28;
          const sumH = ['ลำดับ', 'ชื่อผู้ใช้ (Username)', 'ชื่อภาษาไทย', 'กะ Call Center (8C/8.3C)', 'เวรวันหยุด (วัน)', 'จำนวนวันลา (วัน)'];
          sumH.forEach((txt, idx) => {
            const cell = wsSum.getCell(2, idx + 1);
            cell.value = txt;
            cell.font = { name: 'Sarabun', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = headerBorder;
          });

          AGENTS.forEach((a, idx) => {
            let callCount = 0, holCount = 0, leaveCount = 0;
            currentSchedule.weeks.forEach((w, wIdx) => {
              WEEKDAY_COLUMNS.forEach((col, cIdx) => {
                const list = w.assignments[cIdx] || [];
                list.forEach((ag, sIdx) => {
                  if (ag === a) {
                    if (col.code === '8C' || col.code === '8.3C') callCount++;
                    const lKey = `W_${wIdx}_${cIdx}_${sIdx}`;
                    if (leaves[lKey]) leaveCount++;
                  }
                });
              });
            });

            currentSchedule.holidays.forEach((h, hIdx) => {
              h.shifts.forEach((ag, sIdx) => {
                if (ag === a) {
                  holCount++;
                  const lKey = `H_${hIdx}_${sIdx}`;
                  if (leaves[lKey]) leaveCount++;
                }
              });
            });

            const rNum = idx + 3;
            const isEven = idx % 2 === 0;
            const rBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';
            wsSum.getRow(rNum).height = 26;

            const cNo = wsSum.getCell(rNum, 1);
            cNo.value = idx + 1;
            cNo.alignment = { horizontal: 'center', vertical: 'middle' };
            cNo.border = thinBorder;
            cNo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rBg } };

            const cUser = wsSum.getCell(rNum, 2);
            cUser.value = a;
            cUser.font = { name: 'Sarabun', size: 10, bold: true };
            cUser.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
            cUser.border = thinBorder;
            cUser.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rBg } };

            const cTh = wsSum.getCell(rNum, 3);
            cTh.value = AGENT_NAME_MAP[a] || a;
            cTh.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
            cTh.border = thinBorder;
            cTh.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rBg } };

            const cCall = wsSum.getCell(rNum, 4);
            cCall.value = `${callCount} สัปดาห์`;
            cCall.alignment = { horizontal: 'center', vertical: 'middle' };
            cCall.border = thinBorder;
            cCall.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rBg } };

            const cHol = wsSum.getCell(rNum, 5);
            cHol.value = `${holCount} วัน`;
            cHol.alignment = { horizontal: 'center', vertical: 'middle' };
            cHol.border = thinBorder;
            cHol.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rBg } };

            const cLeave = wsSum.getCell(rNum, 6);
            cLeave.value = `${leaveCount} วัน`;
            cLeave.alignment = { horizontal: 'center', vertical: 'middle' };
            cLeave.border = thinBorder;
            cLeave.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: leaveCount > 0 ? 'FFFFEDD5' : rBg } };
            if (leaveCount > 0) {
              cLeave.font = { name: 'Sarabun', size: 10, bold: true, color: { argb: 'FFC2410C' } };
            }
          });

          // =========================================================
          // 4. SHEET: ประวัติการสลับเวร (Swap History Audit Log)
          // =========================================================
          const wsSwap = wb.addWorksheet('ประวัติการสลับเวร', {
            views: [{ showGridLines: true }],
            pageSetup: { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0 }
          });

          wsSwap.columns = [
            { key: 'no', width: 8 },
            { key: 'datetime', width: 22 },
            { key: 'type', width: 20 },
            { key: 'agentA', width: 28 },
            { key: 'origA', width: 34 },
            { key: 'agentB', width: 28 },
            { key: 'origB', width: 34 },
            { key: 'resultA', width: 40 },
            { key: 'resultB', width: 40 }
          ];

          wsSwap.mergeCells('A1:I1');
          for (let c = 1; c <= 9; c++) {
            const cell = wsSwap.getCell(1, c);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
          }
          const swapTitle = wsSwap.getCell('A1');
          swapTitle.value = `บันทึกประวัติการสลับเวร First Tier ประจำเดือน ${monthName} พ.ศ. ${yearTH}`;
          swapTitle.font = { name: 'Sarabun', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
          swapTitle.alignment = { horizontal: 'center', vertical: 'middle' };
          wsSwap.getRow(1).height = 42;

          wsSwap.getRow(2).height = 28;
          const swapHeaders = [
            'ลำดับ',
            'วัน-เวลาที่สลับ',
            'ประเภทการสลับ',
            'ผู้ขอสลับ A',
            'เวรเดิมของ A',
            'สลับกับ B',
            'เวรเดิมของ B',
            'ผลลัพธ์: A ย้ายไปทำ',
            'ผลลัพธ์: B ย้ายไปทำ'
          ];
          swapHeaders.forEach((txt, idx) => {
            const cell = wsSwap.getCell(2, idx + 1);
            cell.value = txt;
            cell.font = { name: 'Sarabun', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = headerBorder;
          });

          const currentMonthSwaps = (swapHistory || []);
          if (currentMonthSwaps.length === 0) {
            wsSwap.getRow(3).height = 32;
            wsSwap.mergeCells('A3:I3');
            const emptyCell = wsSwap.getCell('A3');
            emptyCell.value = 'ไม่มีรายการสลับเวรในเดือนนี้ (ตารางปฏิบัติงานตรงตามต้นฉบับ)';
            emptyCell.font = { name: 'Sarabun', size: 11, italic: true, color: { argb: 'FF64748B' } };
            emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
            for (let c = 1; c <= 9; c++) {
              wsSwap.getCell(3, c).border = thinBorder;
            }
          } else {
            currentMonthSwaps.forEach((item, idx) => {
              const rNum = idx + 3;
              const isEven = idx % 2 === 0;
              const rBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';
              wsSwap.getRow(rNum).height = 28;

              const isRich = !!(item.agentA && item.agentB);
              const tag = item.swapTag || (item.detail && item.detail.match(/\[(.*?)\]/) ? `[${item.detail.match(/\[(.*?)\]/)[1]}]` : '[สลับเวร]');
              const timeDisplay = item.dateStr ? `${item.dateStr} ${item.timeStr || ''}` : (item.time || '-');

              const rowData = [
                idx + 1,
                timeDisplay,
                tag,
                isRich ? `${item.agentA.username} (${item.agentA.thName})` : (item.detail || '-'),
                isRich ? item.agentA.desc : '-',
                isRich ? `${item.agentB.username} (${item.agentB.thName})` : '-',
                isRich ? item.agentB.desc : '-',
                isRich ? item.summaryAtoB : '-',
                isRich ? item.summaryBtoA : '-'
              ];

              rowData.forEach((val, cIdx) => {
                const cell = wsSwap.getCell(rNum, cIdx + 1);
                cell.value = val;
                cell.font = { name: 'Sarabun', size: 10 };
                cell.border = thinBorder;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rBg } };
                if (cIdx === 0 || cIdx === 1 || cIdx === 2) {
                  cell.alignment = { horizontal: 'center', vertical: 'middle' };
                } else {
                  cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
                }
              });
            });
          }

          // =========================================================
          // 4. SHEET: รายละเอียดหน้าที่ (Job Description Reference)
          // =========================================================
          const wsJdRef = wb.addWorksheet('รายละเอียดหน้าที่ (JD)', {
            views: [{ showGridLines: true }]
          });

          wsJdRef.columns = [
            { key: 'category', width: 16 },
            { key: 'slot', width: 14 },
            { key: 'code', width: 14 },
            { key: 'role', width: 28 },
            { key: 'time', width: 20 },
            { key: 'break', width: 26 },
            { key: 'jd', width: 65 }
          ];

          wsJdRef.mergeCells('A1:G1');
          for (let c = 1; c <= 7; c++) {
            wsJdRef.getCell(1, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
          }
          const jdTitleCell = wsJdRef.getCell('A1');
          jdTitleCell.value = 'คู่มือรายละเอียดหน้าที่และเวลาปฏิบัติงาน (First Tier Support Job Description)';
          jdTitleCell.font = { name: 'Sarabun', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
          jdTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
          wsJdRef.getRow(1).height = 36;

          wsJdRef.getRow(2).height = 26;
          const jdHeaders = ['หมวดหมู่', 'ลำดับช่อง', 'รหัสกะ', 'บทบาท / หน้าที่', 'เวลาทำงาน', 'เวลาพัก', 'รายละเอียดงาน (Job Description)'];
          jdHeaders.forEach((txt, idx) => {
            const cell = wsJdRef.getCell(2, idx + 1);
            cell.value = txt;
            cell.font = { name: 'Sarabun', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = headerBorder;
          });

          let jdRowIdx = 3;
          WEEKDAY_COLUMNS.forEach((col, idx) => {
            wsJdRef.getRow(jdRowIdx).height = Math.max(30, col.jd.length * 18);
            const rowData = [
              'เวรวันทำการ',
              `ช่องที่ ${idx + 1}`,
              'กะที่ ' + (idx + 1),
              col.role,
              `${col.time} น.`,
              col.breakTime,
              col.jd.map(line => `• ${line}`).join('\n')
            ];
            rowData.forEach((val, cIdx) => {
              const cell = wsJdRef.getCell(jdRowIdx, cIdx + 1);
              cell.value = val;
              cell.font = { name: 'Sarabun', size: 9.5 };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC' } };
              cell.alignment = { horizontal: cIdx === 6 ? 'left' : 'center', vertical: 'middle', wrapText: true };
              cell.border = thinBorder;
            });
            jdRowIdx++;
          });

          HOLIDAY_SHIFT_META.forEach((meta, idx) => {
            wsJdRef.getRow(jdRowIdx).height = Math.max(30, (meta.jd || []).length * 18);
            const rowData = [
              'เวรวันหยุด',
              `กะที่ ${idx + 1}`,
              `วันหยุด-${idx + 1}`,
              meta.role || `เวรวันหยุด กะที่ ${idx + 1}`,
              meta.time,
              meta.breakTime,
              (meta.jd || []).map(line => `• ${line}`).join('\n')
            ];
            rowData.forEach((val, cIdx) => {
              const cell = wsJdRef.getCell(jdRowIdx, cIdx + 1);
              cell.value = val;
              cell.font = { name: 'Sarabun', size: 9.5 };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
              cell.alignment = { horizontal: cIdx === 6 ? 'left' : 'center', vertical: 'middle', wrapText: true };
              cell.border = thinBorder;
            });
            jdRowIdx++;
          });

          // Write buffer and download
          const buffer = await wb.xlsx.writeBuffer();
          const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          showToast(`📊 ส่งออกไฟล์ Excel "${fileName}" สวยงามระดับมืออาชีพเรียบร้อยแล้ว!`);
          return;
        } catch (excelErr) {
          console.error("ExcelJS styling export error, falling back to basic:", excelErr);
        }
      }

      // Fallback to SheetJS if ExcelJS is not ready
      if (typeof XLSX !== 'undefined') {
        const wb = XLSX.utils.book_new();
        const wdAoa = [[`ตารางเวร First Tier ประจำเดือน ${monthName} พ.ศ. ${yearTH}`]];
        const hSlot = ["สัปดาห์ / วันที่"];
        const hTime = ["เวลาทำงาน"];
        const hBreak = ["เวลาพัก"];
        const hRole = ["หน้าที่ / ช่อง"];
        const hJd = ["รายละเอียดงาน (JD)"];
        WEEKDAY_COLUMNS.forEach((c, idx) => {
          hSlot.push(`ช่องที่ ${idx + 1}`);
          hTime.push(c.time);
          hBreak.push(c.breakTime);
          hRole.push(c.role);
          hJd.push(c.jd.join("\n"));
        });
        wdAoa.push(hSlot); wdAoa.push(hTime); wdAoa.push(hBreak); wdAoa.push(hRole); wdAoa.push(hJd);

        currentSchedule.weeks.forEach((w, wIdx) => {
          let maxSlots = 1;
          WEEKDAY_COLUMNS.forEach((col, cIdx) => {
            const len = (w.assignments[cIdx] || []).length;
            if (len > maxSlots) maxSlots = len;
          });
          const customTimes = w.customTimes || {};
          const isCustomWeek = Object.keys(customTimes).length > 0;
          const weekTitle = isCustomWeek ? `${w.label} (⚡ ปรับเวลาพิเศษ)` : w.label;

          for (let r = 0; r < maxSlots; r++) {
            const rowVals = [r === 0 ? weekTitle : ""];
            WEEKDAY_COLUMNS.forEach((col, cIdx) => {
              const rawName = (w.assignments[cIdx] || [])[r] || "";
              if (!rawName) { rowVals.push(""); return; }
              const thName = AGENT_NAME_MAP[rawName] ? ` (${AGENT_NAME_MAP[rawName]})` : "";
              const lKey = `W_${wIdx}_${cIdx}_${r}`;
              const leave = leaves[lKey];
              const leaveText = leave ? ` [${leave.leaveType}]` : "";
              const timeOverride = customTimes[cIdx] ? ` [เวลา: ${customTimes[cIdx].time}]` : "";
              rowVals.push(`${rawName}${thName}${leaveText}${timeOverride}`);
            });
            wdAoa.push(rowVals);
          }
        });

        const wsWd = XLSX.utils.aoa_to_sheet(wdAoa);
        wsWd['!cols'] = [{ wch: 28 }];
        WEEKDAY_COLUMNS.forEach(() => wsWd['!cols'].push({ wch: 26 }));
        XLSX.utils.book_append_sheet(wb, wsWd, "เวรวันทำการ");

        const weAoa = [[`ตารางเวร First Tier วันหยุด ประจำเดือน ${monthName} พ.ศ. ${yearTH}`]];
        weAoa.push(["วัน", "วันที่", "หมายเหตุวันหยุด", "เวร 08:00 - 17:00 น.", "เวร 09:00 - 18:00 น.", "เวร 10:00 - 19:00 น.", "เวร 13:30 - 22:30 น."]);
        const weJdRow = ["", "", "รายละเอียดหน้าที่ (JD)"];
        for (let s = 0; s < 4; s++) {
          weJdRow.push((HOLIDAY_SHIFT_META[s] && HOLIDAY_SHIFT_META[s].jd) ? HOLIDAY_SHIFT_META[s].jd.join("\n") : "");
        }
        weAoa.push(weJdRow);
        currentSchedule.holidays.forEach((h, hIdx) => {
          const row = [h.dayName, `${h.date} ${THAI_MONTHS_SHORT[month]}`, h.note || ""];
          for (let s = 0; s < 4; s++) {
            const rawName = h.shifts[s] || "";
            const thName = AGENT_NAME_MAP[rawName] ? ` (${AGENT_NAME_MAP[rawName]})` : "";
            row.push(rawName ? `${rawName}${thName}` : "-");
          }
          weAoa.push(row);
        });
        const wsWe = XLSX.utils.aoa_to_sheet(weAoa);
        XLSX.utils.book_append_sheet(wb, wsWe, "เวรวันหยุด");

        // Sheet 4 Fallback: ประวัติการสลับเวร
        const swapAoa = [[`ประวัติการสลับเวร First Tier ประจำเดือน ${monthName} พ.ศ. ${yearTH}`]];
        swapAoa.push(["ลำดับ", "วัน-เวลาที่สลับ", "ประเภท", "ผู้ขอสลับ A", "เวรเดิม A", "สลับกับ B", "เวรเดิม B", "ผลลัพธ์"]);
        (swapHistory || []).forEach((item, idx) => {
          const isRich = !!(item.agentA && item.agentB);
          const timeDisplay = item.dateStr ? `${item.dateStr} ${item.timeStr || ''}` : (item.time || '-');
          const tag = item.swapTag || '[สลับเวร]';
          if (isRich) {
            swapAoa.push([
              idx + 1,
              timeDisplay,
              tag,
              `${item.agentA.username} (${item.agentA.thName})`,
              item.agentA.desc,
              `${item.agentB.username} (${item.agentB.thName})`,
              item.agentB.desc,
              `${item.summaryAtoB} | ${item.summaryBtoA}`
            ]);
          } else {
            swapAoa.push([idx + 1, timeDisplay, tag, item.detail || '-', '', '', '', '']);
          }
        });
        const wsSwapFb = XLSX.utils.aoa_to_sheet(swapAoa);
        XLSX.utils.book_append_sheet(wb, wsSwapFb, "ประวัติการสลับเวร");

        XLSX.writeFile(wb, fileName);
        showToast(`📊 ส่งออกไฟล์ Excel "${fileName}" เรียบร้อยแล้ว`);
      }
    }

