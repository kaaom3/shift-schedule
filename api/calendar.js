const { MongoClient } = require('mongodb');

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase(uri) {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }
  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8000,
  });
  await client.connect();
  const db = client.db('shift_schedule');
  cachedClient = client;
  cachedDb = db;
  return { client, db };
}

function escapeICSText(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

function parseTimeRange(timeStr) {
  if (!timeStr) return null;
  const clean = timeStr.replace(/\s*น\.?$/, '').trim();
  const parts = clean.split('-');
  if (parts.length < 2) return null;

  const parseSingle = (s) => {
    const m = s.trim().match(/(\d{1,2})[.:](\d{2})/);
    if (!m) return null;
    return { hour: parseInt(m[1], 10), minute: parseInt(m[2], 10) };
  };

  const start = parseSingle(parts[0]);
  const end = parseSingle(parts[1]);
  if (!start || !end) return null;
  return { start, end };
}

function formatICSDateTime(year, month, day, hour, minute) {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  const h = String(hour).padStart(2, '0');
  const min = String(minute).padStart(2, '0');
  return `${y}${m}${d}T${h}${min}00`;
}

function isLeaveOnDay(leave, day) {
  if (!leave) return false;
  if (leave.allWeek) return true;
  if (Array.isArray(leave.dates) && leave.dates.length > 0) {
    return leave.dates.includes(Number(day));
  }
  return true;
}

function getWeekWorkingDays(w, yearAD, month, sched) {
  if (Array.isArray(w && w.days) && w.days.length > 0) {
    return [...w.days];
  }
  const days = [];
  if (!w || !w.label) return days;

  const mRange = w.label.match(/(\d+)\s*-\s*(\d+)/);
  if (mRange) {
    const start = parseInt(mRange[1], 10);
    const end = parseInt(mRange[2], 10);
    const holidayDates = new Set();
    if (sched && Array.isArray(sched.holidays)) {
      sched.holidays.forEach(h => holidayDates.add(Number(h.date)));
    }
    for (let d = start; d <= end; d++) {
      const dt = new Date(yearAD, month - 1, d);
      const dayOfWeek = dt.getDay(); // 0: Sun, 6: Sat
      if (dayOfWeek >= 1 && dayOfWeek <= 5 && !holidayDates.has(d)) {
        days.push(d);
      }
    }
  } else {
    const mSingle = w.label.match(/(\d+)/);
    if (mSingle) {
      days.push(parseInt(mSingle[1], 10));
    }
  }
  return days;
}

module.exports = async (req, res) => {
  // CORS Configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const agent = (req.query.agent || '').trim();
  if (!agent) {
    res.status(400).send('Missing agent parameter. Example: /api/calendar?agent=pantip.to');
    return;
  }

  const isDownload = req.query.download === '1';

  try {
    // Fetch system state from MongoDB
  const uri = process.env.MONGODB_URI;
  let payload = null;

  if (uri) {
    try {
      const { db } = await connectToDatabase(uri);
      const stateCol = db.collection('system_state');
      const doc = await stateCol.findOne({ _id: 'current_state' });
      if (doc && doc.payload) {
        payload = doc.payload;
      }
    } catch (e) {
      console.warn('MongoDB query notice in calendar API:', e.message);
    }
  }

  if (!payload) {
    res.status(503).send('Schedule data is temporarily loading. Please refresh shortly.');
    return;
  }

  const monthSchedules = payload.monthSchedules || {};
  const agentNameMap = payload.agentNameMap || {};
  const weekdayColumns = payload.weekdayColumns || [];
  const holidayShiftMeta = payload.holidayShiftMeta || [];

  // Resolve target agent ID and Thai display name
  let targetId = agent;
  let targetThaiName = agent;

  // Check if agent param matches Thai name or English ID
  const cleanAgent = agent.replace(/^คุณ\s*/, '').trim();
  for (const [engId, th] of Object.entries(agentNameMap)) {
    if (engId.toLowerCase() === agent.toLowerCase() || th === cleanAgent) {
      targetId = engId;
      targetThaiName = th;
      break;
    }
  }

  if (agentNameMap[targetId]) {
    targetThaiName = agentNameMap[targetId];
  }

  const thName = `คุณ${targetThaiName}`;
  const calName = `ตารางเวร - ${thName}`;

  function isAgentMatch(name) {
    if (!name) return false;
    const cleanName = name.replace(/^คุณ\s*/, '').trim();
    return name === targetId || 
           name.toLowerCase() === targetId.toLowerCase() ||
           name === targetThaiName ||
           cleanName === targetThaiName ||
           agentNameMap[name] === targetThaiName;
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FirstTier//ShiftSchedule//TH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICSText(calName)}`,
    'X-WR-TIMEZONE:Asia/Bangkok',
    'X-PUBLISHED-TTL:PT1H',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Bangkok',
    'X-LIC-LOCATION:Asia/Bangkok',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0700',
    'TZOFFSETTO:+0700',
    'TZNAME:ICT',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE'
  ];

  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  // Iterate over all stored months
  Object.keys(monthSchedules).forEach(monthKey => {
    const [yStr, mStr] = monthKey.split('-');
    const yearAD = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    if (!yearAD || !month) return;

    const mData = monthSchedules[monthKey];
    if (!mData) return;

    const sched = mData.schedule || {};
    const leaves = mData.leaves || {};

    // 1. Weekday shifts for this agent
    if (Array.isArray(sched.weeks)) {
      sched.weeks.forEach((w, wIdx) => {
        const weekDays = getWeekWorkingDays(w, yearAD, month, sched);
        if (!Array.isArray(w.assignments)) return;

        w.assignments.forEach((names, cIdx) => {
          if (!Array.isArray(names)) return;

          names.forEach((name, sIdx) => {
            if (!isAgentMatch(name)) return;

            const col = weekdayColumns[cIdx] || {};
            const colCustom = w.customTimes && w.customTimes[cIdx];
            const shiftTimeStr = colCustom ? colCustom.time : col.time;
            const timeRange = parseTimeRange(shiftTimeStr);
            if (!timeRange) return;

            const slotKey = `W_${wIdx}_${cIdx}_${sIdx}`;
            const leave = leaves[slotKey];
            const role = col.role || `ช่องที่ ${cIdx + 1}`;
            const jdLines = Array.isArray(col.jd) ? col.jd.join('\\n• ') : '';

            // Generate event for each working day in this week
            weekDays.forEach(day => {
              const dtStart = formatICSDateTime(yearAD, month, day, timeRange.start.hour, timeRange.start.minute);
              const dtEnd = formatICSDateTime(yearAD, month, day, timeRange.end.hour, timeRange.end.minute);
              const uid = `W_${yearAD}_${month}_${wIdx}_${cIdx}_${sIdx}_${day}@shiftschedule`;

              const isDayLeave = isLeaveOnDay(leave, day);

              lines.push('BEGIN:VEVENT');
              lines.push(`UID:${uid}`);
              lines.push(`DTSTAMP:${nowStamp}`);
              lines.push(`DTSTART;TZID=Asia/Bangkok:${dtStart}`);
              lines.push(`DTEND;TZID=Asia/Bangkok:${dtEnd}`);

              if (isDayLeave) {
                const leaveTitle = `🏖️ [ลางาน] ${leave.leaveType} (${thName})`;
                let desc = `สถานะ: ${leave.leaveType}\\n`;
                if (leave.note) desc += `หมายเหตุ: ${leave.note}\\n`;
                desc += `เวลากะเดิม: ${shiftTimeStr}\\nหน้าที่: ${role}`;
                lines.push(`SUMMARY:${escapeICSText(leaveTitle)}`);
                lines.push(`DESCRIPTION:${escapeICSText(desc)}`);
                lines.push('STATUS:CONFIRMED');
                lines.push('CATEGORIES:LEAVE,VACATION');
              } else {
                const summary = `🏢 กะ ${shiftTimeStr} (${role})`;
                let desc = `เจ้าหน้าที่: ${thName}\\nกะงาน: ช่องที่ ${cIdx + 1} (${role})\\nเวลางาน: ${shiftTimeStr}\\n`;
                if (colCustom && colCustom.breakTime) {
                  desc += `เวลาพัก: ${colCustom.breakTime}\\n`;
                }
                if (jdLines) {
                  desc += `\\n📋 หน้าที่งาน (JD):\\n• ${jdLines}\\n`;
                }
                lines.push(`SUMMARY:${escapeICSText(summary)}`);
                lines.push(`DESCRIPTION:${escapeICSText(desc)}`);
                lines.push('STATUS:CONFIRMED');
                lines.push('CATEGORIES:WORK,SHIFT');

                // 60-min Reminder Alarm
                lines.push('BEGIN:VALARM');
                lines.push('TRIGGER:-PT60M');
                lines.push('ACTION:DISPLAY');
                lines.push(`DESCRIPTION:${escapeICSText(`เตือนเข้ากะงาน First Tier: ${summary}`)}`);
                lines.push('END:VALARM');
              }

              lines.push('END:VEVENT');
            });
          });
        });
      });
    }

    // 2. Holiday shifts for this agent
    if (Array.isArray(sched.holidays)) {
      sched.holidays.forEach((h, hIdx) => {
        if (!Array.isArray(h.shifts)) return;

        h.shifts.forEach((shName, sIdx) => {
          if (!isAgentMatch(shName)) return;

          const meta = holidayShiftMeta[sIdx] || { time: '08.00-17.00', breakTime: '' };
          const timeRange = parseTimeRange(meta.time);
          if (!timeRange) return;

          const day = parseInt(h.date, 10);
          if (!day) return;

          const dtStart = formatICSDateTime(yearAD, month, day, timeRange.start.hour, timeRange.start.minute);
          const dtEnd = formatICSDateTime(yearAD, month, day, timeRange.end.hour, timeRange.end.minute);
          const uid = `H_${yearAD}_${month}_${hIdx}_${sIdx}_${day}@shiftschedule`;

          const hName = h.holidayName ? ` (${h.holidayName})` : '';
          const summary = `🏖️ กะวันหยุด H${sIdx + 1}: ${meta.time} ${hName}`;
          let desc = `เจ้าหน้าที่: ${thName}\\nเวรวันหยุด: ${h.dayName}ที่ ${h.date}${hName}\\nเวลางาน: ${meta.time}\\n`;
          if (meta.breakTime) desc += `เวลาพัก: ${meta.breakTime}\\n`;
          if (Array.isArray(meta.jd)) {
            desc += `\\n📋 หน้าที่งาน (JD):\\n• ${meta.jd.join('\\n• ')}\\n`;
          }

          lines.push('BEGIN:VEVENT');
          lines.push(`UID:${uid}`);
          lines.push(`DTSTAMP:${nowStamp}`);
          lines.push(`DTSTART;TZID=Asia/Bangkok:${dtStart}`);
          lines.push(`DTEND;TZID=Asia/Bangkok:${dtEnd}`);
          lines.push(`SUMMARY:${escapeICSText(summary)}`);
          lines.push(`DESCRIPTION:${escapeICSText(desc)}`);
          lines.push('STATUS:CONFIRMED');
          lines.push('CATEGORIES:HOLIDAY_SHIFT,WORK');

          // 60-min Reminder Alarm
          lines.push('BEGIN:VALARM');
          lines.push('TRIGGER:-PT60M');
          lines.push('ACTION:DISPLAY');
          lines.push(`DESCRIPTION:${escapeICSText(`เตือนเข้ากะวันหยุด First Tier: ${summary}`)}`);
          lines.push('END:VALARM');

          lines.push('END:VEVENT');
        });
      });
    }
  });

  lines.push('END:VCALENDAR');
  const icsContent = lines.join('\r\n');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=600');
  const disposition = isDownload ? 'attachment' : 'inline';
  const asciiFilename = `shift-${encodeURIComponent(targetId || 'schedule')}.ics`;
  const utf8Filename = encodeURIComponent(`ตารางเวร_${targetThaiName || targetId}.ics`);
  res.setHeader(
    'Content-Disposition',
    `${disposition}; filename="${asciiFilename}"; filename*=UTF-8''${utf8Filename}`
  );

  res.status(200).send(icsContent);
  } catch (err) {
    console.error('Calendar generation error:', err);
    if (!res.headersSent) {
      res.status(500).send('Error generating calendar feed: ' + err.message);
    }
  }
};
