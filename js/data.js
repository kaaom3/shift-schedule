// =========================================================
// MASTER DATA, ROSTER AGENTS & ROTATION MATRICES
// =========================================================

    // Master Team List (20 Agents)
    let AGENTS = [
  "pantip.to",
  "jutharat.ka",
  "anusit.k",
  "mewika.p",
  "sawitree.ton",
  "chadaporn.sa",
  "parinya.si",
  "theerawut.b",
  "panisara.n",
  "suriya.r",
  "komkrit.pr",
  "kittipa.j",
  "mallika.to",
  "pattaraporn.n",
  "siriyakorn.y",
  "nithus.d",
  "pornpoom.t",
  "kittiyakorn.h",
  "nutchanat.p",
  "yasumin.t"
];

    let AGENT_NAME_MAP = {
  "pantip.to": "พันธุ์ทิพย์",
  "jutharat.ka": "จุฑารัตน์",
  "anusit.k": "อนุสิทธิ์",
  "mewika.p": "เมวิกา",
  "sawitree.ton": "สาวิตรี",
  "chadaporn.sa": "ชฎาพร",
  "parinya.si": "ปริญญา",
  "theerawut.b": "ธีรวุฒิ",
  "panisara.n": "ปาณิสรา",
  "suriya.r": "สุริยา",
  "komkrit.pr": "คมกริช",
  "kittipa.j": "กิตติภา",
  "mallika.to": "มัลลิกา",
  "pattaraporn.n": "ภัทรภรณ์",
  "siriyakorn.y": "สิริยากร",
  "nithus.d": "นิทัศน์",
  "pornpoom.t": "พรภูมิ",
  "kittiyakorn.h": "กิตติยากร",
  "nutchanat.p": "นุชนาถ",
  "yasumin.t": "ญาสุมินทร์"
};

    function getAgentDisplayName(name) {
      if (!name) return "";
      const th = AGENT_NAME_MAP[name];
      return th ? `${name} (${th})` : name;
    }

    function reconcileScheduleNames(sched) {
      if (!sched) return;
      const thaiToEn = {};
      Object.keys(AGENT_NAME_MAP).forEach(en => {
        const th = AGENT_NAME_MAP[en];
        if (th) thaiToEn[th.trim()] = en;
      });

      if (Array.isArray(sched.weeks)) {
        sched.weeks.forEach(w => {
          if (Array.isArray(w.assignments)) {
            w.assignments.forEach(col => {
              if (Array.isArray(col)) {
                for (let i = 0; i < col.length; i++) {
                  const name = col[i];
                  if (thaiToEn[name]) {
                    col[i] = thaiToEn[name];
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
            for (let i = 0; i < h.shifts.length; i++) {
              const name = h.shifts[i];
              if (thaiToEn[name]) {
                h.shifts[i] = thaiToEn[name];
              }
            }
          }
        });
      }
    }


    // 16 Weekday Column Definitions
    let WEEKDAY_COLUMNS = [
      { id: 1, time: "07.00-16.00", breakTime: "พัก 11.00", role: "Call/ECE", code: "7C", slots: 1, wfh: false, jd: ["7.00 - 08.00 Call+ECE", "8.00 - 16.00 น. Call"] },
      { id: 2, time: "07.00-16.00", breakTime: "พัก 12.00", role: "Mail K-Helps/Self/Realtime", code: "7A", slots: 1, wfh: false, jd: ["7.00 - 08.00 Mail All", "09.00 - 16.00 Self ตู้ 0-3"] },
      { id: 3, time: "08.00-17.00", breakTime: "พัก 11.30", role: "Call", code: "8C", slots: 2, wfh: false, jd: ["รับสาย Call 08.00 - 17.00 น."] },
      { id: 4, time: "08.00-17.00", breakTime: "พัก 13.00", role: "Self Service", code: "8A", slots: 1, wfh: false, jd: ["09.00 - 17.00 Self ตู้ 4-6"] },
      { id: 5, time: "08.00-17.00", breakTime: "พัก 12.00", role: "ECE", code: "8E", slots: 1, wfh: false, jd: ["ดู ECE รอบ 08.00 - 17.00 น."] },
      { id: 6, time: "08.00-17.00", breakTime: "พัก 13.00", role: "Mail K-Helps/Realtime", code: "8M", slots: 1, wfh: false, jd: ["08.00 – 17.00 น Mail All"] },
      { id: 7, time: "08.30-17.30", breakTime: "พัก 12.30", role: "Aging/16App/Follow SOS/Follow SR", code: "Agingคู่", slots: 1, wfh: false, jd: ["08.30-12.30 นาทีคู่", "13.30-14.30 All"] },
      { id: 8, time: "08.30-17.30", breakTime: "พัก 13.00", role: "ECE", code: "8.3E", slots: 1, wfh: false, jd: ["ดู ECE 08.30 - 17.30 น."] },
      { id: 9, time: "08.30-17.30", breakTime: "พัก 13.30", role: "Aging/16App/Follow SOS/Follow SR", code: "Agingคี่", slots: 1, wfh: false, jd: ["08.30-12.30 นาทีคี่", "12.30-13.30 All"] },
      { id: 10, time: "08.30-17.30", breakTime: "พัก 13.00 (2 คน) / 13.30 (2 คน)", role: "Call", code: "8.3C", slots: 4, wfh: false, jd: ["รับสาย Call 08.30 - 17.30 น."] },
      { id: 11, time: "09.00-18.00", breakTime: "พัก 14.00", role: "Self Service", code: "9A", slots: 1, wfh: false, jd: ["09.00-17.00 Self ตู้ 7-9"] },
      { id: 12, time: "09.00-18.00", breakTime: "พัก 14.00", role: "Call/ECE", code: "9C", slots: 1, wfh: false, jd: ["09.00-14.00 ECE", "15.00-18.00 Call"] },
      { id: 13, time: "10.00-19.00", breakTime: "พัก 13.30", role: "ECE", code: "10", slots: 1, wfh: false, jd: ["ดู ECE 10.00 - 19.00 น."] },
      { id: 14, time: "11.00-20.00", breakTime: "พัก 14.00", role: "Call", code: "11", slots: 1, wfh: false, jd: ["รับสาย Call 11.00 - 20.00 น."] },
      { id: 15, time: "12.00-21.00", breakTime: "พัก 15.00", role: "Self+Realtime/Mail/Realtime", code: "12", slots: 1, wfh: false, jd: ["12.00-15.00 Self", "16.00-21.00 Mail/Call"] },
      { id: 16, time: "13.30-22.30", breakTime: "พัก 16.00", role: "Call+Mail+ECE+Self Service +Realtime", code: "13", slots: 1, wfh: false, jd: ["13.30 ECE", "14.30-21 Call", "21-22.30 ALL"] }
    ];

    let HOLIDAY_SHIFT_META = [
      { role: "เวรวันหยุด กะที่ 1", time: "08.00-17.00 น.", breakTime: "พัก 13.30-14.30 น.", jd: ["เวลา 08.00 - 09.00 น. (All)", "เวลา 09.00 - 17.00 น. (Call+ECE)", "Monitor V2 เวลา 9.00 , 11.00 น. , 13.00 น."] },
      { role: "เวรวันหยุด กะที่ 2", time: "09.00-18.00 น.", breakTime: "พัก 14.30-15.30 น.", jd: ["เวลา 09.00 - 10.00 น. (All)", "เวลา 10.00 - 18.00 น. (Call+ECE)", "Monitor V2 เวลา 10.00 , 12.00 , 14.00 น."] },
      { role: "เวรวันหยุด กะที่ 3", time: "10.00-19.00 น.", breakTime: "พัก 14.00-15.00 น.", jd: ["เวลา 10.00 - 11.00 น. (All)", "เวลา 11.00 - 18.00 น. (Mail + ECE+Self+Follow PK/Console Expert)", "Monitor V2 เวลา 15.00 , 17.00 , 18.30 น.", "เวลา 18.00 น.-19.00 น. (All)"] },
      { role: "เวรวันหยุด กะที่ 4", time: "13.30-22.30 น.", breakTime: "พัก 16.00-17.00 น.", jd: ["13.30 - 14.00 น. (Call+ECE)", "เวลา 14.00 - 15.00 (Mail + ECE+Self+Follow PK/Console Expert)", "เวลา 15.00 - 19.00 (Call+ECE)", "เวลา 19.00 (All)", "Monitor V2 เวลา 19.30 , 20.30 , 22.00 น."] }
    ];
    // Load cached JD and shift configurations immediately from localStorage if available
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const cachedWk = localStorage.getItem("ft_weekday_columns");
        if (cachedWk) {
          const parsed = JSON.parse(cachedWk);
          if (Array.isArray(parsed) && parsed.length > 0) {
            WEEKDAY_COLUMNS = parsed;
          }
        }
        const cachedHol = localStorage.getItem("ft_holiday_shift_meta");
        if (cachedHol) {
          const parsedH = JSON.parse(cachedHol);
          if (Array.isArray(parsedH) && parsedH.length > 0) {
            HOLIDAY_SHIFT_META = parsedH;
          }
        }
      }
    } catch(e) {}


    // Real historical schedules for September and October
    const HISTORICAL_SCHEDULES = {"2026-9": {"weeks": [{"label": "1 - 4 ก.ย. 69", "assignments": [["chadaporn.sa"], ["mallika.to"], ["pornpoom.t", "nutchanat.p"], ["yasumin.t"], ["pattaraporn.n"], ["kittiyakorn.h"], ["suriya.r"], ["komkrit.pr"], ["siriyakorn.y"], ["parinya.si", "theerawut.b", "panisara.n", "kittipa.j"], ["sawitree.ton"], ["mewika.p"], ["nithus.d"], ["pantip.to"], ["jutharat.ka"], ["anusit.k"]]}, {"label": "7 - 11 ก.ย. 69", "assignments": [["mewika.p"], ["komkrit.pr"], ["nutchanat.p", "jutharat.ka"], ["parinya.si"], ["chadaporn.sa"], ["siriyakorn.y"], ["anusit.k"], ["pattaraporn.n"], ["theerawut.b"], ["nithus.d", "yasumin.t", "kittiyakorn.h", "pornpoom.t"], ["suriya.r"], ["sawitree.ton"], ["pantip.to"], ["panisara.n"], ["kittipa.j"], ["mallika.to"]]}, {"label": "14 - 18 ก.ย. 69", "assignments": [["pattaraporn.n"], ["nithus.d"], ["suriya.r", "sawitree.ton"], ["pantip.to"], ["panisara.n"], ["jutharat.ka"], ["nutchanat.p"], ["kittiyakorn.h"], ["mewika.p"], ["mallika.to", "chadaporn.sa", "anusit.k", "pornpoom.t"], ["kittipa.j"], ["theerawut.b"], ["siriyakorn.y"], ["yasumin.t"], ["komkrit.pr"], ["parinya.si"]]}, {"label": "21 - 25 ก.ย. 69", "assignments": [["pantip.to"], ["chadaporn.sa"], ["kittiyakorn.h", "siriyakorn.y"], ["mallika.to"], ["yasumin.t"], ["theerawut.b"], ["komkrit.pr"], ["parinya.si"], ["pattaraporn.n"], ["suriya.r", "panisara.n", "jutharat.ka", "sawitree.ton"], ["pornpoom.t"], ["nithus.d"], ["kittipa.j"], ["anusit.k"], ["mewika.p"], ["nutchanat.p"]]}, {"label": "28 - 30 ก.ย. 69", "assignments": [["yasumin.t"], ["anusit.k"], ["nutchanat.p", "pattaraporn.n"], ["kittiyakorn.h"], ["kittipa.j"], ["pantip.to"], ["panisara.n"], ["nithus.d"], ["jutharat.ka"], ["komkrit.pr", "theerawut.b", "siriyakorn.y", "mewika.p"], ["parinya.si"], ["chadaporn.sa"], ["sawitree.ton"], ["mallika.to"], ["pornpoom.t"], ["suriya.r"]]}], "holidays": [{"dayName": "เสาร์", "date": 5, "note": "", "shifts": ["mewika.p", "sawitree.ton", "pantip.to", "pornpoom.t"]}, {"dayName": "อาทิตย์", "date": 6, "note": "", "shifts": ["panisara.n", "chadaporn.sa", "jutharat.ka", "kittiyakorn.h"]}, {"dayName": "เสาร์", "date": 12, "note": "", "shifts": ["suriya.r", "parinya.si", "komkrit.pr", "nutchanat.p"]}, {"dayName": "อาทิตย์", "date": 13, "note": "", "shifts": ["kittipa.j", "theerawut.b", "anusit.k", "yasumin.t"]}, {"dayName": "เสาร์", "date": 19, "note": "", "shifts": ["mallika.to", "panisara.n", "mewika.p", "pantip.to"]}, {"dayName": "อาทิตย์", "date": 20, "note": "", "shifts": ["pattaraporn.n", "suriya.r", "sawitree.ton", "jutharat.ka"]}, {"dayName": "เสาร์", "date": 26, "note": "", "shifts": ["siriyakorn.y", "kittipa.j", "chadaporn.sa", "komkrit.pr"]}, {"dayName": "อาทิตย์", "date": 27, "note": "", "shifts": ["nithus.d", "mallika.to", "parinya.si", "anusit.k"]}]}, "2026-10": {"weeks": [{"label": "5 - 9 ต.ค. 69", "assignments": [["nutchanat.p"], ["jutharat.ka"], ["nithus.d", "pantip.to"], ["komkrit.pr"], ["mewika.p"], ["kittipa.j"], ["chadaporn.sa"], ["suriya.r"], ["anusit.k"], ["pattaraporn.n", "pornpoom.t", "kittiyakorn.h", "yasumin.t"], ["mallika.to"], ["panisara.n"], ["theerawut.b"], ["parinya.si"], ["sawitree.ton"], ["siriyakorn.y"]]}, {"label": "12 - 16 ต.ค. 69", "assignments": [["suriya.r"], ["pantip.to"], ["kittipa.j", "panisara.n"], ["chadaporn.sa"], ["pattaraporn.n"], ["mallika.to"], ["kittiyakorn.h"], ["siriyakorn.y"], ["pornpoom.t"], ["theerawut.b", "sawitree.ton", "parinya.si", "mewika.p"], ["anusit.k"], ["komkrit.pr"], ["nutchanat.p"], ["jutharat.ka"], ["yasumin.t"], ["nithus.d"]]}, {"label": "19 - 22 ต.ค. 69", "assignments": [["siriyakorn.y"], ["pornpoom.t"], ["theerawut.b", "komkrit.pr"], ["mewika.p"], ["nithus.d"], ["kittiyakorn.h"], ["yasumin.t"], ["nutchanat.p"], ["pantip.to"], ["mallika.to", "suriya.r", "chadaporn.sa", "anusit.k"], ["jutharat.ka"], ["kittipa.j"], ["parinya.si"], ["pattaraporn.n"], ["panisara.n"], ["sawitree.ton"]]}, {"label": "26 - 30 ต.ค. 69", "assignments": [["mallika.to"], ["suriya.r"], ["jutharat.ka", "parinya.si"], ["nutchanat.p"], ["sawitree.ton"], ["komkrit.pr"], ["mewika.p"], ["anusit.k"], ["kittipa.j"], ["panisara.n", "nithus.d", "pornpoom.t", "kittiyakorn.h"], ["yasumin.t"], ["siriyakorn.y"], ["pattaraporn.n"], ["theerawut.b"], ["chadaporn.sa"], ["pantip.to"]]}], "holidays": [{"dayName": "เสาร์", "date": 3, "note": "", "shifts": ["pornpoom.t", "pattaraporn.n", "theerawut.b", "mewika.p"]}, {"dayName": "อาทิตย์", "date": 4, "note": "", "shifts": ["kittiyakorn.h", "siriyakorn.y", "panisara.n", "sawitree.ton"]}, {"dayName": "เสาร์", "date": 10, "note": "", "shifts": ["nutchanat.p", "nithus.d", "suriya.r", "chadaporn.sa"]}, {"dayName": "อาทิตย์", "date": 11, "note": "", "shifts": ["yasumin.t", "pornpoom.t", "kittipa.j", "parinya.si"]}, {"dayName": "อังคาร", "date": 13, "note": "วันนวมินทรมหาราช", "isBankHoliday": true, "holidayName": "วันนวมินทรมหาราช", "shifts": ["pantip.to", "kittiyakorn.h", "mallika.to", "theerawut.b"]}, {"dayName": "เสาร์", "date": 17, "note": "", "shifts": ["jutharat.ka", "nutchanat.p", "pattaraporn.n", "panisara.n"]}, {"dayName": "อาทิตย์", "date": 18, "note": "", "shifts": ["komkrit.pr", "yasumin.t", "siriyakorn.y", "suriya.r"]}, {"dayName": "ศุกร์", "date": 23, "note": "วันปิยมหาราช", "isBankHoliday": true, "holidayName": "วันปิยมหาราช", "shifts": ["anusit.k", "pantip.to", "nithus.d", "kittipa.j"]}, {"dayName": "เสาร์", "date": 24, "note": "", "shifts": ["mewika.p", "jutharat.ka", "pornpoom.t", "mallika.to"]}, {"dayName": "อาทิตย์", "date": 25, "note": "", "shifts": ["sawitree.ton", "komkrit.pr", "kittiyakorn.h", "pattaraporn.n"]}, {"dayName": "เสาร์", "date": 31, "note": "", "shifts": ["chadaporn.sa", "anusit.k", "nutchanat.p", "siriyakorn.y"]}, {"dayName": "อาทิตย์", "date": 1, "note": "", "shifts": ["parinya.si", "mewika.p", "yasumin.t", "nithus.d"]}]}, "2026-11": {"weeks": [{"label": "2 - 6 พ.ย. 69", "assignments": [["kittiyakorn.h"], ["panisara.n"], ["kittipa.j", "pattaraporn.n"], ["anusit.k"], ["mewika.p"], ["pornpoom.t"], ["nithus.d"], ["sawitree.ton"], ["parinya.si"], ["mallika.to", "suriya.r", "siriyakorn.y", "komkrit.pr"], ["nutchanat.p"], ["jutharat.ka"], ["yasumin.t"], ["pantip.to"], ["theerawut.b"], ["chadaporn.sa"]]}, {"label": "9 - 13 พ.ย. 69", "assignments": [["sawitree.ton"], ["nutchanat.p"], ["parinya.si", "suriya.r"], ["nithus.d"], ["theerawut.b"], ["mewika.p"], ["siriyakorn.y"], ["yasumin.t"], ["panisara.n"], ["chadaporn.sa", "jutharat.ka", "pornpoom.t", "pantip.to"], ["pattaraporn.n"], ["anusit.k"], ["mallika.to"], ["komkrit.pr"], ["kittiyakorn.h"], ["kittipa.j"]]}, {"label": "16 - 20 พ.ย. 69", "assignments": [["anusit.k"], ["theerawut.b"], ["kittipa.j", "panisara.n"], ["siriyakorn.y"], ["kittiyakorn.h"], ["pattaraporn.n"], ["sawitree.ton"], ["pornpoom.t"], ["chadaporn.sa"], ["komkrit.pr", "mallika.to", "pantip.to", "yasumin.t"], ["mewika.p"], ["parinya.si"], ["suriya.r"], ["nithus.d"], ["nutchanat.p"], ["jutharat.ka"]]}, {"label": "23 - 27 พ.ย. 69", "assignments": [["jutharat.ka"], ["pattaraporn.n"], ["mallika.to", "nithus.d"], ["panisara.n"], ["anusit.k"], ["parinya.si"], ["kittipa.j"], ["mewika.p"], ["nutchanat.p"], ["kittiyakorn.h", "yasumin.t", "komkrit.pr", "pantip.to"], ["chadaporn.sa"], ["suriya.r"], ["pornpoom.t"], ["sawitree.ton"], ["siriyakorn.y"], ["theerawut.b"]]}, {"label": "30 พ.ย. 69", "assignments": [["panisara.n"], ["sawitree.ton"], ["theerawut.b", "kittiyakorn.h"], ["suriya.r"], ["komkrit.pr"], ["nutchanat.p"], ["mallika.to"], ["chadaporn.sa"], ["yasumin.t"], ["pattaraporn.n", "parinya.si", "siriyakorn.y", "mewika.p"], ["nithus.d"], ["pantip.to"], ["jutharat.ka"], ["kittipa.j"], ["anusit.k"], ["pornpoom.t"]]}], "holidays": [{"dayName": "อาทิตย์", "date": 1, "note": "", "shifts": ["parinya.si", "mewika.p", "yasumin.t", "nithus.d"]}, {"dayName": "เสาร์", "date": 7, "note": "", "shifts": ["theerawut.b", "sawitree.ton", "pantip.to", "pornpoom.t"]}, {"dayName": "อาทิตย์", "date": 8, "note": "", "shifts": ["panisara.n", "chadaporn.sa", "jutharat.ka", "kittiyakorn.h"]}, {"dayName": "เสาร์", "date": 14, "note": "", "shifts": ["suriya.r", "parinya.si", "komkrit.pr", "nutchanat.p"]}, {"dayName": "อาทิตย์", "date": 15, "note": "", "shifts": ["kittipa.j", "theerawut.b", "anusit.k", "yasumin.t"]}, {"dayName": "เสาร์", "date": 21, "note": "", "shifts": ["mallika.to", "panisara.n", "mewika.p", "pantip.to"]}, {"dayName": "อาทิตย์", "date": 22, "note": "", "shifts": ["pattaraporn.n", "suriya.r", "sawitree.ton", "jutharat.ka"]}, {"dayName": "เสาร์", "date": 28, "note": "", "shifts": ["siriyakorn.y", "kittipa.j", "chadaporn.sa", "komkrit.pr"]}, {"dayName": "อาทิตย์", "date": 29, "note": "", "shifts": ["nithus.d", "mallika.to", "parinya.si", "anusit.k"]}]}, "2026-12": {"weeks": [{"label": "1 - 4 ธ.ค. 69", "assignments": [["panisara.n"], ["sawitree.ton"], ["theerawut.b", "kittiyakorn.h"], ["suriya.r"], ["komkrit.pr"], ["nutchanat.p"], ["mallika.to"], ["chadaporn.sa"], ["yasumin.t"], ["pattaraporn.n", "parinya.si", "siriyakorn.y", "mewika.p"], ["nithus.d"], ["pantip.to"], ["jutharat.ka"], ["kittipa.j"], ["anusit.k"], ["pornpoom.t"]]}, {"label": "8 - 11 ธ.ค. 69 (หยุด 7, 10 ธ.ค.)", "assignments": [["pornpoom.t"], ["kittipa.j"], ["yasumin.t", "siriyakorn.y"], ["sawitree.ton"], ["parinya.si"], ["nithus.d"], ["jutharat.ka"], ["theerawut.b"], ["suriya.r"], ["chadaporn.sa", "panisara.n", "mewika.p", "pantip.to"], ["komkrit.pr"], ["mallika.to"], ["anusit.k"], ["nutchanat.p"], ["pattaraporn.n"], ["kittiyakorn.h"]]}, {"label": "14 - 18 ธ.ค. 69", "assignments": [["kittipa.j"], ["yasumin.t"], ["jutharat.ka", "theerawut.b"], ["pornpoom.t"], ["suriya.r"], ["anusit.k"], ["pantip.to"], ["mallika.to"], ["komkrit.pr"], ["nutchanat.p", "nithus.d", "sawitree.ton", "mewika.p"], ["siriyakorn.y"], ["pattaraporn.n"], ["chadaporn.sa"], ["kittiyakorn.h"], ["parinya.si"], ["panisara.n"]]}, {"label": "21 - 25 ธ.ค. 69", "assignments": [["parinya.si"], ["siriyakorn.y"], ["mallika.to", "nutchanat.p"], ["theerawut.b"], ["jutharat.ka"], ["sawitree.ton"], ["pattaraporn.n"], ["komkrit.pr"], ["kittipa.j"], ["panisara.n", "yasumin.t", "anusit.k", "suriya.r"], ["kittiyakorn.h"], ["pornpoom.t"], ["nithus.d"], ["chadaporn.sa"], ["pantip.to"], ["mewika.p"]]}, {"label": "28 - 30 ธ.ค. 69 (หยุด 31 ธ.ค. วันสิ้นปี)", "assignments": [["theerawut.b"], ["kittiyakorn.h"], ["parinya.si", "pantip.to"], ["jutharat.ka"], ["nithus.d"], ["panisara.n"], ["mewika.p"], ["sawitree.ton"], ["pattaraporn.n"], ["kittipa.j", "mallika.to", "siriyakorn.y", "pornpoom.t"], ["komkrit.pr"], ["nutchanat.p"], ["anusit.k"], ["chadaporn.sa"], ["suriya.r"], ["yasumin.t"]]}], "holidays": [{"dayName": "เสาร์", "date": 5, "note": "วันพ่อแห่งชาติ / วันชาติ", "isBankHoliday": true, "holidayName": "วันพ่อแห่งชาติ / วันชาติ", "shifts": ["kittiyakorn.h", "panisara.n", "nutchanat.p", "theerawut.b"]}, {"dayName": "อาทิตย์", "date": 6, "note": "", "isBankHoliday": false, "holidayName": "", "shifts": ["pantip.to", "siriyakorn.y", "sawitree.ton", "komkrit.pr"]}, {"dayName": "จันทร์", "date": 7, "note": "ชดเชยวันพ่อแห่งชาติ (5 ธ.ค.)", "isBankHoliday": true, "holidayName": "ชดเชยวันพ่อแห่งชาติ (5 ธ.ค.)", "shifts": ["jutharat.ka", "mallika.to", "kittipa.j", "anusit.k"]}, {"dayName": "พฤหัสบดี", "date": 10, "note": "วันรัฐธรรมนูญ", "isBankHoliday": true, "holidayName": "วันรัฐธรรมนูญ", "shifts": ["pornpoom.t", "mewika.p", "yasumin.t", "parinya.si"]}, {"dayName": "เสาร์", "date": 12, "note": "", "isBankHoliday": false, "holidayName": "", "shifts": ["nithus.d", "suriya.r", "chadaporn.sa", "pattaraporn.n"]}, {"dayName": "อาทิตย์", "date": 13, "note": "", "isBankHoliday": false, "holidayName": "", "shifts": ["theerawut.b", "kittiyakorn.h", "panisara.n", "nutchanat.p"]}, {"dayName": "เสาร์", "date": 19, "note": "", "isBankHoliday": false, "holidayName": "", "shifts": ["sawitree.ton", "pantip.to", "siriyakorn.y", "komkrit.pr"]}, {"dayName": "อาทิตย์", "date": 20, "note": "", "shifts": ["kittipa.j", "jutharat.ka", "mallika.to", "anusit.k"]}, {"dayName": "เสาร์", "date": 26, "note": "", "shifts": ["yasumin.t", "pornpoom.t", "mewika.p", "parinya.si"]}, {"dayName": "อาทิตย์", "date": 27, "note": "", "shifts": ["chadaporn.sa", "nithus.d", "suriya.r", "pattaraporn.n"]}, {"dayName": "พฤหัสบดี", "date": 31, "note": "วันสิ้นปี", "isBankHoliday": true, "holidayName": "วันสิ้นปี", "shifts": ["kittiyakorn.h", "panisara.n", "nutchanat.p", "theerawut.b"]}]}};

    const BASE_ROTATION_ORDER_INDICES = [12, 9, 2, 6, 18, 1, 4, 0, 5, 11, 10, 15, 16, 17, 19, 14, 13, 7, 3, 8];

    // Master holiday rotation sequence from Excel Sheet 'รายชื่อหมุนเวรวันวันหยุด'
    let HOLIDAY_ROTATION_AGENTS = ["pantip.to", "jutharat.ka", "komkrit.pr", "anusit.k", "mewika.p", "sawitree.ton", "chadaporn.sa", "parinya.si", "theerawut.b", "panisara.n", "suriya.r", "kittipa.j", "mallika.to", "pattaraporn.n", "siriyakorn.y", "nithus.d", "pornpoom.t", "kittiyakorn.h", "nutchanat.p", "yasumin.t"];

    // 20-week weekday shift rotation matrix from Excel Sheet 'รายชื่อหมุนเวรวันธรรมดา'
    let WEEKDAY_ROTATION_MATRIX = [[["kittiyakorn.h"],["nutchanat.p"],["parinya.si","suriya.r"],["anusit.k"],["mewika.p"],["pornpoom.t"],["nithus.d"],["yasumin.t"],["panisara.n"],["kittipa.j","mallika.to","pattaraporn.n","siriyakorn.y"],["sawitree.ton"],["jutharat.ka"],["komkrit.pr"],["pantip.to"],["theerawut.b"],["chadaporn.sa"]],[["sawitree.ton"],["theerawut.b"],["suriya.r","panisara.n"],["nithus.d"],["kittiyakorn.h"],["mewika.p"],["jutharat.ka"],["chadaporn.sa"],["parinya.si"],["siriyakorn.y","pornpoom.t","nutchanat.p","yasumin.t"],["pattaraporn.n"],["anusit.k"],["mallika.to"],["komkrit.pr"],["pantip.to"],["kittipa.j"]],[["jutharat.ka"],["panisara.n"],["theerawut.b","pantip.to"],["siriyakorn.y"],["anusit.k"],["sawitree.ton"],["kittipa.j"],["pornpoom.t"],["nutchanat.p"],["mallika.to","pattaraporn.n","kittiyakorn.h","yasumin.t"],["mewika.p"],["suriya.r"],["chadaporn.sa"],["nithus.d"],["komkrit.pr"],["parinya.si"]],[["anusit.k"],["sawitree.ton"],["kittipa.j","mallika.to"],["pornpoom.t"],["komkrit.pr"],["pattaraporn.n"],["siriyakorn.y"],["mewika.p"],["chadaporn.sa"],["nithus.d","kittiyakorn.h","nutchanat.p","yasumin.t"],["jutharat.ka"],["parinya.si"],["pantip.to"],["suriya.r"],["panisara.n"],["theerawut.b"]],[["pornpoom.t"],["pattaraporn.n"],["komkrit.pr","suriya.r"],["sawitree.ton"],["theerawut.b"],["parinya.si"],["jutharat.ka"],["mallika.to"],["yasumin.t"],["panisara.n","siriyakorn.y","kittiyakorn.h","nutchanat.p"],["nithus.d"],["pantip.to"],["anusit.k"],["kittipa.j"],["mewika.p"],["chadaporn.sa"]],[["kittipa.j"],["mewika.p"],["theerawut.b","panisara.n"],["suriya.r"],["parinya.si"],["nithus.d"],["pantip.to"],["jutharat.ka"],["sawitree.ton"],["siriyakorn.y","pornpoom.t","nutchanat.p","yasumin.t"],["komkrit.pr"],["mallika.to"],["chadaporn.sa"],["kittiyakorn.h"],["pattaraporn.n"],["anusit.k"]],[["panisara.n"],["parinya.si"],["theerawut.b","pantip.to"],["mewika.p"],["suriya.r"],["sawitree.ton"],["pornpoom.t"],["kittipa.j"],["kittiyakorn.h"],["mallika.to","siriyakorn.y","nithus.d","yasumin.t"],["jutharat.ka"],["pattaraporn.n"],["chadaporn.sa"],["nutchanat.p"],["komkrit.pr"],["anusit.k"]],[["parinya.si"],["yasumin.t"],["anusit.k","panisara.n"],["theerawut.b"],["jutharat.ka"],["suriya.r"],["mallika.to"],["chadaporn.sa"],["komkrit.pr"],["kittipa.j","pattaraporn.n","nithus.d","nutchanat.p"],["siriyakorn.y"],["pornpoom.t"],["kittiyakorn.h"],["mewika.p"],["pantip.to"],["sawitree.ton"]],[["theerawut.b"],["kittiyakorn.h"],["parinya.si","pantip.to"],["jutharat.ka"],["nithus.d"],["panisara.n"],["mewika.p"],["sawitree.ton"],["pattaraporn.n"],["kittipa.j","mallika.to","siriyakorn.y","pornpoom.t"],["komkrit.pr"],["nutchanat.p"],["anusit.k"],["chadaporn.sa"],["suriya.r"],["yasumin.t"]],[["chadaporn.sa"],["mewika.p"],["theerawut.b","suriya.r"],["parinya.si"],["kittipa.j"],["nutchanat.p"],["sawitree.ton"],["pantip.to"],["jutharat.ka"],["mallika.to","siriyakorn.y","pornpoom.t","yasumin.t"],["komkrit.pr"],["kittiyakorn.h"],["anusit.k"],["panisara.n"],["nithus.d"],["pattaraporn.n"]],[["nithus.d"],["siriyakorn.y"],["suriya.r","kittipa.j"],["pantip.to"],["yasumin.t"],["chadaporn.sa"],["pattaraporn.n"],["komkrit.pr"],["mewika.p"],["mallika.to","pornpoom.t","kittiyakorn.h","nutchanat.p"],["panisara.n"],["sawitree.ton"],["anusit.k"],["parinya.si"],["jutharat.ka"],["theerawut.b"]],[["komkrit.pr"],["pornpoom.t"],["theerawut.b","pantip.to"],["mallika.to"],["chadaporn.sa"],["yasumin.t"],["suriya.r"],["pattaraporn.n"],["jutharat.ka"],["panisara.n","siriyakorn.y","nithus.d","kittiyakorn.h"],["sawitree.ton"],["mewika.p"],["nutchanat.p"],["anusit.k"],["kittipa.j"],["parinya.si"]],[["mewika.p"],["mallika.to"],["theerawut.b","panisara.n"],["kittiyakorn.h"],["pantip.to"],["siriyakorn.y"],["anusit.k"],["jutharat.ka"],["nithus.d"],["pattaraporn.n","pornpoom.t","nutchanat.p","yasumin.t"],["suriya.r"],["sawitree.ton"],["kittipa.j"],["chadaporn.sa"],["komkrit.pr"],["parinya.si"]],[["pattaraporn.n"],["komkrit.pr"],["panisara.n","mallika.to"],["chadaporn.sa"],["yasumin.t"],["jutharat.ka"],["nutchanat.p"],["parinya.si"],["sawitree.ton"],["siriyakorn.y","nithus.d","pornpoom.t","kittiyakorn.h"],["kittipa.j"],["theerawut.b"],["anusit.k"],["pantip.to"],["mewika.p"],["suriya.r"]],[["pantip.to"],["nithus.d"],["panisara.n","mallika.to"],["chadaporn.sa"],["kittipa.j"],["mewika.p"],["komkrit.pr"],["sawitree.ton"],["anusit.k"],["pattaraporn.n","siriyakorn.y","kittiyakorn.h","yasumin.t"],["pornpoom.t"],["parinya.si"],["theerawut.b"],["jutharat.ka"],["suriya.r"],["nutchanat.p"]],[["yasumin.t"],["chadaporn.sa"],["pantip.to","mallika.to"],["mewika.p"],["jutharat.ka"],["kittipa.j"],["komkrit.pr"],["suriya.r"],["pornpoom.t"],["siriyakorn.y","nithus.d","kittiyakorn.h","nutchanat.p"],["parinya.si"],["anusit.k"],["panisara.n"],["pattaraporn.n"],["sawitree.ton"],["theerawut.b"]],[["nutchanat.p"],["anusit.k"],["pantip.to","suriya.r"],["mewika.p"],["pattaraporn.n"],["mallika.to"],["panisara.n"],["siriyakorn.y"],["jutharat.ka"],["kittipa.j","nithus.d","pornpoom.t","kittiyakorn.h"],["sawitree.ton"],["chadaporn.sa"],["parinya.si"],["theerawut.b"],["yasumin.t"],["komkrit.pr"]],[["suriya.r"],["jutharat.ka"],["chadaporn.sa","parinya.si"],["yasumin.t"],["nithus.d"],["kittiyakorn.h"],["mewika.p"],["nutchanat.p"],["theerawut.b"],["pantip.to","kittipa.j","mallika.to","pornpoom.t"],["anusit.k"],["komkrit.pr"],["pattaraporn.n"],["siriyakorn.y"],["panisara.n"],["sawitree.ton"]],[["mallika.to"],["pantip.to"],["pattaraporn.n","siriyakorn.y"],["kittipa.j"],["sawitree.ton"],["komkrit.pr"],["yasumin.t"],["anusit.k"],["mewika.p"],["nithus.d","pornpoom.t","kittiyakorn.h","nutchanat.p"],["jutharat.ka"],["parinya.si"],["theerawut.b"],["suriya.r"],["chadaporn.sa"],["panisara.n"]],[["siriyakorn.y"],["suriya.r"],["chadaporn.sa","parinya.si"],["pattaraporn.n"],["panisara.n"],["theerawut.b"],["mewika.p"],["sawitree.ton"],["anusit.k"],["kittipa.j","nithus.d","kittiyakorn.h","nutchanat.p"],["yasumin.t"],["jutharat.ka"],["komkrit.pr"],["pornpoom.t"],["mallika.to"],["pantip.to"]]];


