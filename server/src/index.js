const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./config/logger');
const { port, env, clientUrl, assertConfig } = require('./config/env');
const { startJobs, stopJobs } = require('./jobs');
const initSockets = require('./sockets');

/**
 * Server bootstrap: validate configuration, connect, mount realtime, listen,
 * then start scheduled work. Everything that has a side effect lives here so
 * the app itself stays importable and testable.
 */

// Fail before binding a port rather than on the first request needing a secret.
try {
  assertConfig();
} catch (err) {
  logger.error(err.message);
  process.exit(1);
}

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: env === 'production' ? clientUrl.split(',').map((o) => o.trim()) : true, credentials: true }
});

initSockets(io);

const start = async () => {
  await connectDB();

  server.listen(port, () => {
    logger.info(`TradeX API listening on port ${port} (${env})`);
    logger.info(`API docs: http://localhost:${port}/api/docs`);
    startJobs();
  });
};

start().catch((err) => {
  logger.error(`Failed to start server: ${err.message}`);
  process.exit(1);
});

/** Stop accepting connections, release the database, and exit cleanly. */
const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down`);
  stopJobs();
  io.close();

  server.close(async () => {
    try {
      await require('mongoose').connection.close();
    } catch (err) {
      logger.error(`Error closing the database connection: ${err.message}`);
    }
    process.exit(0);
  });

  // Do not hang forever on a stuck connection.
  setTimeout(() => process.exit(1), 10000).unref();
};

['SIGTERM', 'SIGINT'].forEach((signal) => process.on(signal, () => shutdown(signal)));

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled rejection: ${reason instanceof Error ? reason.message : reason}`);
  shutdown('unhandledRejection');
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.message}`, { stack: err.stack });
  shutdown('uncaughtException');
});
