const mongoose = require('mongoose');

let mongoMemoryServer = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eesa_quiz';

  try {
    console.log(`Connecting to MongoDB at: ${uri}...`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
    });
    console.log('Successfully connected to MongoDB server');
  } catch (err) {
    console.warn('Local/remote MongoDB not reachable:', err.message);
    console.log('Spinning up embedded in-memory MongoDB server fallback...');

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
      const memoryUri = mongoMemoryServer.getUri();
      console.log(`Embedded MongoDB started at: ${memoryUri}`);

      await mongoose.connect(memoryUri);
      console.log('Successfully connected to embedded in-memory MongoDB');
    } catch (memErr) {
      console.error('Failed to initialize in-memory MongoDB:', memErr);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
