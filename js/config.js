// =========================================================
// CONFIG & CONSTANTS & GENERAL FORMATTING HELPERS
// =========================================================

    const THAI_MONTHS = ["", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    const THAI_MONTHS_SHORT = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const THAI_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];



    // Bank of Thailand (BOT / ธนาคารแห่งประเทศไทย) Official Holiday Calendar
    const BOT_HOLIDAYS_EXACT = {
      // 2025
      "2025-1-1": "วันขึ้นปีใหม่",
      "2025-2-12": "วันมาฆบูชา",
      "2025-4-6": "วันจักรี",
      "2025-4-13": "วันสงกรานต์",
      "2025-4-14": "วันสงกรานต์",
      "2025-4-15": "วันสงกรานต์",
      "2025-5-1": "วันแรงงานแห่งชาติ",
      "2025-5-5": "ชดเชยวันฉัตรมงคล (4 พ.ค.)",
      "2025-5-12": "ชดเชยวันวิสาขบูชา (11 พ.ค.)",
      "2025-6-3": "วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าฯ พระบรมราชินี",
      "2025-7-10": "วันอาสาฬหบูชา",
      "2025-7-28": "วันเฉลิมพระชนมพรรษา พระบาทสมเด็จพระเจ้าอยู่หัว (ร.10)",
      "2025-8-12": "วันแม่แห่งชาติ",
      "2025-10-13": "วันนวมินทรมหาราช",
      "2025-10-23": "วันปิยมหาราช",
      "2025-12-5": "วันพ่อแห่งชาติ / วันชาติ",
      "2025-12-10": "วันรัฐธรรมนูญ",
      "2025-12-31": "วันสิ้นปี",

      // 2026 (พ.ศ. 2569)
      "2026-1-1": "วันขึ้นปีใหม่",
      "2026-1-2": "วันหยุดพิเศษ",
      "2026-3-3": "วันมาฆบูชา",
      "2026-4-6": "วันจักรี",
      "2026-4-13": "วันสงกรานต์",
      "2026-4-14": "วันสงกรานต์",
      "2026-4-15": "วันสงกรานต์",
      "2026-5-1": "วันแรงงานแห่งชาติ",
      "2026-5-4": "วันฉัตรมงคล",
      "2026-6-1": "ชดเชยวันวิสาขบูชา (31 พ.ค.)",
      "2026-6-3": "วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าฯ พระบรมราชินี",
      "2026-7-28": "วันเฉลิมพระชนมพรรษา พระบาทสมเด็จพระเจ้าอยู่หัว (ร.10)",
      "2026-7-29": "วันอาสาฬหบูชา",
      "2026-8-12": "วันแม่แห่งชาติ",
      "2026-10-13": "วันนวมินทรมหาราช",
      "2026-10-23": "วันปิยมหาราช",
      "2026-12-7": "ชดเชยวันพ่อแห่งชาติ (5 ธ.ค.)",
      "2026-12-10": "วันรัฐธรรมนูญ",
      "2026-12-31": "วันสิ้นปี",

      // 2027 (พ.ศ. 2570)
      "2027-1-1": "วันขึ้นปีใหม่",
      "2027-2-22": "ชดเชยวันมาฆบูชา (21 ก.พ.)",
      "2027-4-6": "วันจักรี",
      "2027-4-13": "วันสงกรานต์",
      "2027-4-14": "วันสงกรานต์",
      "2027-4-15": "วันสงกรานต์",
      "2027-5-3": "ชดเชยวันแรงงานแห่งชาติ (1 พ.ค.)",
      "2027-5-4": "วันฉัตรมงคล",
      "2027-5-20": "วันวิสาขบูชา",
      "2027-6-3": "วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าฯ พระบรมราชินี",
      "2027-7-19": "ชดเชยวันอาสาฬหบูชา (18 ก.ค.)",
      "2027-7-28": "วันเฉลิมพระชนมพรรษา พระบาทสมเด็จพระเจ้าอยู่หัว (ร.10)",
      "2027-8-12": "วันแม่แห่งชาติ",
      "2027-10-13": "วันนวมินทรมหาราช",
      "2027-10-25": "ชดเชยวันปิยมหาราช (23 ต.ค.)",
      "2027-12-6": "ชดเชยวันพ่อแห่งชาติ (5 ธ.ค.)",
      "2027-12-10": "วันรัฐธรรมนูญ",
      "2027-12-31": "วันสิ้นปี"
    };

    function getBotHoliday(yearAD, month, day) {
      const key = `${yearAD}-${month}-${day}`;
      if (BOT_HOLIDAYS_EXACT[key]) return BOT_HOLIDAYS_EXACT[key];

      // Generic fixed-date annual BOT holidays for other years
      const fixed = {
        "1-1": "วันขึ้นปีใหม่",
        "4-6": "วันจักรี",
        "4-13": "วันสงกรานต์",
        "4-14": "วันสงกรานต์",
        "4-15": "วันสงกรานต์",
        "5-1": "วันแรงงานแห่งชาติ",
        "5-4": "วันฉัตรมงคล",
        "6-3": "วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าฯ พระบรมราชินี",
        "7-28": "วันเฉลิมพระชนมพรรษา พระบาทสมเด็จพระเจ้าอยู่หัว (ร.10)",
        "8-12": "วันแม่แห่งชาติ",
        "10-13": "วันนวมินทรมหาราช",
        "10-23": "วันปิยมหาราช",
        "12-5": "วันพ่อแห่งชาติ / วันชาติ",
        "12-10": "วันรัฐธรรมนูญ",
        "12-31": "วันสิ้นปี"
      };
      const md = `${month}-${day}`;
      if (fixed[md]) return fixed[md];

      // Automatic Monday substitution if weekend falls on fixed holiday
      const dt = new Date(yearAD, month - 1, day);
      if (dt.getDay() === 1) { // Monday
        const sun = new Date(dt.getTime() - 86400000);
        const sat = new Date(dt.getTime() - 2 * 86400000);
        const sunMd = `${sun.getMonth() + 1}-${sun.getDate()}`;
        const satMd = `${sat.getMonth() + 1}-${sat.getDate()}`;
        if (fixed[sunMd]) return `ชดเชย${fixed[sunMd]}`;
        if (fixed[satMd]) return `ชดเชย${fixed[satMd]}`;
      }
      return null;
    }

    function getCodeBadge(code) {
      if (code.startsWith("7")) return `<span class="badge badge-early">${code}</span>`;
      if (code === "8C" || code === "8.3C") return `<span class="badge badge-call">${code}</span>`;
      if (code === "12" || code === "13") return `<span class="badge badge-late">${code}</span>`;
      if (code === "10" || code === "11") return `<span class="badge badge-late">${code}</span>`;
      return `<span class="badge badge-spec">${code}</span>`;
    }

    function escapeHtml(str) {
      if (str === null || str === undefined) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function formatWeekLabel(label) {
      if (!label) return "";
      return label.replace(/\s*(\(หยุด[^\)]+\))/g, '<br><span style="display:inline-block; margin-top:3px; font-size:11px; font-weight:600; color:#dc2626; line-height:1.2;">$1</span>');
    }



    function getLeaveIcon(type) {
      switch(type) {
        case "ลาพักร้อน": return "🏖️";
        case "ลาป่วย": return "🤒";
        case "ลากิจ": return "💼";
        case "อบรม": return "📚";
        default: return "🏖️";
      }
    }

    function getLeaveClass(type) {
      switch(type) {
        case "ลาพักร้อน": return "vacation";
        case "ลาป่วย": return "sick";
        case "ลากิจ": return "business";
        case "อบรม": return "training";
        default: return "other";
      }
    }



    // TOAST UTILITY
    function showToast(msg) {
      const toast = document.getElementById("toast-msg");
      document.getElementById("toast-text").innerText = msg;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 2800);
    }


