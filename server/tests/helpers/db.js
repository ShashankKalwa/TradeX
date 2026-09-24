const mongoose = require('mongoose');

/**
 * Database helpers for suites.
 *
 * The replica set itself is started once by tests/globalSetup.js and shared by
 * every suite; this module only manages the mongoose connection and the data
 * between tests.
 */

const connect = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  const uri = process.env.MONGO_TEST_URI;
  if (!uri) {
    throw new Error('MONGO_TEST_URI is not set — tests/globalSetup.js did not run');
  }

  await mongoose.connect(uri, { bufferCommands: false });
  return mongoose.connection;
};

/** Disconnect mongoose only. The shared server is stopped by globalTeardown. */
const disconnect = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
};

/** Wipe every collection between tests, so suites cannot leak state. */
const clearDatabase = async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
};

module.exports = { connect, disconnect, clearDatabase };
