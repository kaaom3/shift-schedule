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
      if (!doc || !doc.payload) {
        return res.status(200).json({
          success: true,
          data: null,
          message: 'No schedule state found in MongoDB Atlas yet.',
        });
      }

      // Populate or merge with users collection
      try {
        const usersCol = db.collection('users');
        const dbUsers = await usersCol.find({}).toArray();
        if (dbUsers && dbUsers.length > 0) {
          doc.payload.users = dbUsers.map(u => ({
            username: u.username,
            nameTH: u.nameTH,
            role: u.role || 'MEMBER',
            pin: u.pin || '1234',
            active: u.active !== false
          }));
        }
      } catch (uErr) {
        console.warn('Could not load users collection:', uErr);
      }

      return res.status(200).json({
        success: true,
        data: doc.payload,
        updatedAt: doc.updatedAt,
      });
    }

    // 2. POST: Update schedule state
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
