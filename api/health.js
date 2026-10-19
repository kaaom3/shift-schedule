const { MongoClient } = require('mongodb');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return res.status(200).json({
      success: false,
      status: 'unconfigured',
      message: 'MONGODB_URI is not set in Environment Variables.',
    });
  }

  let client;
  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    const pingResult = await client.db('shift_schedule').command({ ping: 1 });
    return res.status(200).json({
      success: true,
      status: 'connected',
      message: 'Successfully connected to MongoDB Atlas!',
      ping: pingResult,
    });
  } catch (err) {
    return res.status(200).json({
      success: false,
      status: 'error',
      message: err.message,
    });
  } finally {
    if (client) {
      await client.close().catch(() => {});
    }
  }
};
