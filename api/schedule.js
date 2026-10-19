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
      await stateCol.updateOne(
        { _id: 'current_state' },
        {
          $set: {
            _id: 'current_state',
            payload: body,
            updatedAt: now,
          },
        },
        { upsert: true }
      );

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
