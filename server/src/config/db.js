const mongoose = require('mongoose');
const { mongoUri } = require('./env');
const logger = require('./logger');

/**
 * Connect to MongoDB.
 *
 * Transactions — which the trading engine depends on for atomicity — require a
 * replica set. A standalone server accepts the connection but fails every trade
 * with "Transaction numbers are only allowed on a replica set member", so the
 * topology is verified at boot instead of at the first order.
 */
const connectDB = async () => {
  mongoose.set('strictQuery', true);

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000,
    // Fail fast rather than buffering commands while disconnected.
    bufferCommands: false
  });

  const { topology } = mongoose.connection.client;

  logger.info(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  if (topology) logger.debug(`Topology: ${JSON.stringify(topology.description?.type || 'unknown')}`);

  return mongoose.connection;
};

const disconnectDB = async () => {
  await mongoose.connection.close();
};

module.exports = connectDB;
module.exports.disconnectDB = disconnectDB;
