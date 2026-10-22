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

const DEFAULT_TEAM_USERS = [
  { username: "pantip.to", nameTH: "พันธุ์ทิพย์", role: "MEMBER", pin: "1234", active: true },
  { username: "jutharat.ka", nameTH: "จุฑารัตน์", role: "MEMBER", pin: "1234", active: true },
  { username: "anusit.k", nameTH: "อนุสิทธิ์", role: "MEMBER", pin: "1234", active: true },
  { username: "mewika.p", nameTH: "เมวิกา", role: "MEMBER", pin: "1234", active: true },
  { username: "sawitree.ton", nameTH: "สาวิตรี", role: "MEMBER", pin: "1234", active: true },
  { username: "chadaporn.sa", nameTH: "ชฎาพร", role: "MEMBER", pin: "1234", active: true },
  { username: "parinya.si", nameTH: "ปริญญา", role: "MEMBER", pin: "1234", active: true },
  { username: "theerawut.b", nameTH: "ธีรวุฒิ", role: "MEMBER", pin: "1234", active: true },
  { username: "panisara.n", nameTH: "ปาณิสรา", role: "MEMBER", pin: "1234", active: true },
  { username: "suriya.r", nameTH: "สุริยา", role: "MEMBER", pin: "1234", active: true },
  { username: "komkrit.pr", nameTH: "คมกริช", role: "MEMBER", pin: "1234", active: true },
  { username: "kittipa.j", nameTH: "กิตติภา", role: "MEMBER", pin: "1234", active: true },
  { username: "mallika.to", nameTH: "มัลลิกา", role: "MEMBER", pin: "1234", active: true },
  { username: "pattaraporn.n", nameTH: "ภัทรภรณ์", role: "MEMBER", pin: "1234", active: true },
  { username: "siriyakorn.y", nameTH: "สิริยากร", role: "MEMBER", pin: "1234", active: true },
  { username: "nithus.d", nameTH: "นิทัศน์", role: "MEMBER", pin: "1234", active: true },
  { username: "pornpoom.t", nameTH: "พรภูมิ", role: "MEMBER", pin: "1234", active: true },
  { username: "kittiyakorn.h", nameTH: "กิตติยากร", role: "MEMBER", pin: "1234", active: true },
  { username: "nutchanat.p", nameTH: "นุชนาถ", role: "MEMBER", pin: "1234", active: true },
  { username: "yasumin.t", nameTH: "ญาสุมินทร์", role: "MEMBER", pin: "1234", active: true }
];

const DEC_2026_WEEK_5 = {
  label: "28 - 30 ธ.ค. 69 (หยุด 31 ธ.ค. วันสิ้นปี)",
  assignments: [
    ["theerawut.b"],
    ["kittiyakorn.h"],
    ["parinya.si", "pantip.to"],
    ["jutharat.ka"],
    ["nithus.d"],
    ["panisara.n"],
    ["mewika.p"],
    ["sawitree.ton"],
    ["pattaraporn.n"],
    ["kittipa.j", "mallika.to", "siriyakorn.y", "pornpoom.t"],
    ["komkrit.pr"],
    ["nutchanat.p"],
    ["anusit.k"],
    ["chadaporn.sa"],
    ["suriya.r"],
    ["yasumin.t"]
  ]
};

function ensureDecemberWeek5(payload) {
  if (!payload || !payload.monthSchedules || !payload.monthSchedules["2026-12"]) return;
  const dec = payload.monthSchedules["2026-12"];
  if (dec.schedule && Array.isArray(dec.schedule.weeks) && dec.schedule.weeks.length < 5) {
    dec.schedule.weeks.push(JSON.parse(JSON.stringify(DEC_2026_WEEK_5)));
  }
  if (dec.originalSchedule && Array.isArray(dec.originalSchedule.weeks) && dec.originalSchedule.weeks.length < 5) {
    dec.originalSchedule.weeks.push(JSON.parse(JSON.stringify(DEC_2026_WEEK_5)));
  }
}

module.exports = async (req, res) => {
  // CORS Configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return res.status(500).json({
      success: false,
      error: 'MONGODB_URI is not set in Environment Variables. Please set MONGODB_URI in Vercel or local environment.',
    });
  }

  try {
    const { db } = await connectToDatabase(uri);
    const stateCol = db.collection('system_state');

    // 1. GET: Fetch current schedule state
    if (req.method === 'GET') {
      const doc = await stateCol.findOne({ _id: 'current_state' });

      // Populate or merge with users collection
      let dbUsers = [];
      try {
        const usersCol = db.collection('users');
        dbUsers = await usersCol.find({}).toArray();
        if (!dbUsers || dbUsers.length === 0) {
          const now = new Date();
          const seedData = DEFAULT_TEAM_USERS.map(u => ({
            ...u,
            _id: u.username,
            createdAt: now,
            updatedAt: now
          }));
          await usersCol.insertMany(seedData);
          dbUsers = seedData;
        }
      } catch (uErr) {
        console.warn('Could not load users collection:', uErr);
      }

      if (!doc || !doc.payload) {
        return res.status(200).json({
          success: true,
          data: { users: dbUsers },
          message: 'No schedule state found in MongoDB Atlas yet.',
        });
      }

      doc.payload.users = dbUsers.map(u => ({
        username: u.username,
        nameTH: u.nameTH,
        role: u.role || 'MEMBER',
        pin: u.pin || '1234',
        active: u.active !== false
      }));

      // Ensure December 2026 always retains Week 5 (28-30 ธ.ค. 69) on GET
      ensureDecemberWeek5(doc.payload);

      return res.status(200).json({
        success: true,
        data: doc.payload,
        updatedAt: doc.updatedAt,
      });
    }

    // 2. POST: Update schedule state or user PIN
    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {
          return res.status(400).json({ success: false, error: 'Invalid JSON payload' });
        }
      }

      if (!body) {
        return res.status(400).json({ success: false, error: 'Empty payload' });
      }

      const now = new Date();

      // Special action: change_pin
      if (body.action === 'change_pin') {
        const { username, oldPin, newPin } = body;
        if (!username || !newPin) {
          return res.status(400).json({ success: false, error: 'Missing username or newPin' });
        }
        try {
          const usersCol = db.collection('users');
          const user = await usersCol.findOne({ _id: username });
          const currentPin = (user && user.pin) ? user.pin : '1234';
          if (oldPin && oldPin !== currentPin && oldPin !== '1234') {
            return res.status(400).json({ success: false, error: 'รหัส PIN เดิมไม่ถูกต้อง' });
          }
          await usersCol.updateOne(
            { _id: username },
            { $set: { pin: String(newPin).trim(), updatedAt: now } },
            { upsert: true }
          );
          return res.status(200).json({ success: true, message: 'บันทึกรหัส PIN ลง Database เรียบร้อยแล้ว' });
        } catch (pinErr) {
          return res.status(500).json({ success: false, error: pinErr.message });
        }
      }
      let finalPayload = body;

      // Smart JD & Shift Config Preservation:
      // Prevent normal user operations (like shift swaps, leaves, etc.) from accidentally overwriting customized JDs
      const isJdSaveAction = body.lastAction && (body.lastAction.includes("JD") || body.lastAction.includes("การตั้งค่ากะ"));
      if (!isJdSaveAction) {
        try {
          const existingDoc = await stateCol.findOne({ _id: 'current_state' });
          if (existingDoc && existingDoc.payload) {
            if (Array.isArray(existingDoc.payload.weekdayColumns) && existingDoc.payload.weekdayColumns.length > 0) {
              finalPayload.weekdayColumns = existingDoc.payload.weekdayColumns;
            }
            if (Array.isArray(existingDoc.payload.holidayShiftMeta) && existingDoc.payload.holidayShiftMeta.length > 0) {
              finalPayload.holidayShiftMeta = existingDoc.payload.holidayShiftMeta;
            }
          }
        } catch (mergeErr) {
          console.warn('Could not merge existing JD config:', mergeErr);
        }
      }

      // Safeguard: Ensure December 2026 always retains Week 5 (28-30 ธ.ค. 69) on POST
      ensureDecemberWeek5(finalPayload);

      await stateCol.updateOne(
        { _id: 'current_state' },
        {
          $set: {
            _id: 'current_state',
            payload: finalPayload,
            updatedAt: now,
          },
        },
        { upsert: true }
      );

      // Sync users collection if users array is provided
      if (Array.isArray(body.users) && body.users.length > 0) {
        try {
          const usersCol = db.collection('users');
          const userOps = body.users.map(u => {
            const uname = (u.username || '').trim();
            if (!uname) return null;
            return {
              updateOne: {
                filter: { _id: uname },
                update: {
                  $set: {
                    _id: uname,
                    username: uname,
                    nameTH: (u.nameTH || '').trim(),
                    role: u.role || 'MEMBER',
                    pin: u.pin ? String(u.pin).trim() : '1234',
                    active: u.active !== false,
                    updatedAt: now
                  }
                },
                upsert: true
              }
            };
          }).filter(Boolean);

          if (userOps.length > 0) {
            await usersCol.bulkWrite(userOps);
          }
        } catch (uSyncErr) {
          console.warn('Could not sync users collection:', uSyncErr);
        }
      }

      // Audit log if action details are provided
      if (body.lastAction) {
        try {
          const logCol = db.collection('swap_audit_logs');
          await logCol.insertOne({
            action: body.lastAction,
            timestamp: now,
          });
        } catch (logErr) {
          console.warn('Could not write audit log:', logErr);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Successfully synchronized schedule to MongoDB Atlas.',
        updatedAt: now,
      });
    }

    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  } catch (err) {
    console.error('MongoDB Atlas Error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Database connection error',
    });
  }
};
