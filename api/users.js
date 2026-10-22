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

const DEFAULT_USERS = [
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
      error: 'MONGODB_URI is not set in Environment Variables.',
    });
  }

  try {
    const { db } = await connectToDatabase(uri);
    const usersCol = db.collection('users');

    // 1. GET: Retrieve all active users (seeds default 20 agents if empty)
    if (req.method === 'GET') {
      let users = await usersCol.find({}).sort({ username: 1 }).toArray();

      if (!users || users.length === 0) {
        const now = new Date();
        const seedData = DEFAULT_USERS.map(u => ({
          ...u,
          _id: u.username,
          createdAt: now,
          updatedAt: now
        }));
        await usersCol.insertMany(seedData);
        users = seedData;
      }

      return res.status(200).json({
        success: true,
        users: users.map(u => ({
          username: u.username,
          nameTH: u.nameTH,
          role: u.role || 'MEMBER',
          pin: u.pin || '1234',
          active: u.active !== false,
          updatedAt: u.updatedAt
        }))
      });
    }

    // 2. POST: Change PIN, reset PIN, or save user updates
    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) {
          return res.status(400).json({ success: false, error: 'Invalid JSON payload' });
        }
      }

      if (!body) {
        return res.status(400).json({ success: false, error: 'Empty payload' });
      }

      const now = new Date();
      const action = body.action || 'sync_users';

      // Action: change_pin
      if (action === 'change_pin') {
        const { username, oldPin, newPin } = body;
        if (!username || !newPin) {
          return res.status(400).json({ success: false, error: 'Missing username or newPin' });
        }

        const user = await usersCol.findOne({ _id: username });
        const currentPin = (user && user.pin) ? user.pin : '1234';

        if (oldPin && oldPin !== currentPin && oldPin !== '1234') {
          return res.status(400).json({ success: false, error: 'รหัส PIN เดิมไม่ถูกต้อง' });
        }

        await usersCol.updateOne(
          { _id: username },
          {
            $set: {
              _id: username,
              username: username,
              pin: String(newPin).trim(),
              updatedAt: now
            }
          },
          { upsert: true }
        );

        return res.status(200).json({
          success: true,
          message: 'เปลี่ยนรหัส PIN ใน Database สำเร็จเรียบร้อยแล้ว'
        });
      }

      // Action: reset_pin (by Admin)
      if (action === 'reset_pin') {
        const { username, newPin = '1234' } = body;
        if (!username) {
          return res.status(400).json({ success: false, error: 'Missing username' });
        }

        await usersCol.updateOne(
          { _id: username },
          {
            $set: {
              pin: String(newPin).trim(),
              updatedAt: now
            }
          },
          { upsert: true }
        );

        return res.status(200).json({
          success: true,
          message: `รีเซ็ตรหัส PIN ของคุณ${username} เป็น ${newPin} ใน Database เรียบร้อยแล้ว`
        });
      }

      // Action: sync_users (save/update full user roster)
      if (action === 'sync_users' || Array.isArray(body.users)) {
        const usersList = Array.isArray(body.users) ? body.users : [];
        if (usersList.length > 0) {
          const ops = usersList.map(u => {
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

          if (ops.length > 0) {
            await usersCol.bulkWrite(ops);
          }
        }

        return res.status(200).json({
          success: true,
          message: 'บันทึกรายชื่อผู้ใช้งานลงใน Database สำเร็จเรียบร้อยแล้ว',
          count: usersList.length
        });
      }

      return res.status(400).json({ success: false, error: 'Unknown action' });
    }

    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  } catch (err) {
    console.error('MongoDB Users API Error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Database error in users API'
    });
  }
};
