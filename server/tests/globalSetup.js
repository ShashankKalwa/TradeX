const { MongoMemoryReplSet } = require('mongodb-memory-server');

/**
 * One in-memory MongoDB replica set for the entire test run.
 *
 * Starting a set per suite meant every file paid the boot cost and, worse, a
 * set that had not finished releasing could make the next suite's `beforeAll`
 * fail — which fails all of that suite's tests at once. Starting it once here
 * removes that whole failure class, and makes the run faster.
 *
 * A replica set (not a standalone) is required: the trading engine uses
 * multi-document transactions, which a standalone server refuses outright.
 */
module.exports = async () => {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' }
  });

  globalThis.__MONGOD__ = replSet;
  // Worker processes (and the runInBand process) inherit this.
  process.env.MONGO_TEST_URI = replSet.getUri();
};
