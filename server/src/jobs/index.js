const cron = require('node-cron');
const { jobs: jobConfig } = require('../config/env');
const logger = require('../config/logger');
const resolvePendingOrders = require('./orderResolver');
const checkAlerts = require('./alertChecker');
const { computeLeaderboard } = require('./leaderboardCompute');

/**
 * Scheduled work. Started by the server bootstrap (not by importing the app),
 * so a test that imports `app` never begins firing cron against a memory DB.
 */

const tasks = [];
const running = new Set();

/**
 * Wrap a job so a slow run cannot overlap the next tick — two resolvers racing
 * the same queue would defeat the claim-based locking.
 */
const guarded = (name, fn) => async () => {
  if (running.has(name)) {
    logger.warn(`Job ${name} is still running; skipping this tick`);
    return;
  }
  running.add(name);
  const startedAt = Date.now();
  try {
    await fn();
  } catch (err) {
    logger.error(`Job ${name} failed: ${err.message}`);
  } finally {
    running.delete(name);
    logger.debug(`Job ${name} finished in ${Date.now() - startedAt}ms`);
  }
};

const schedule = (name, expression, fn) => {
  if (!cron.validate(expression)) {
    logger.error(`Invalid cron expression for ${name}: "${expression}" — job not scheduled`);
    return;
  }
  tasks.push(cron.schedule(expression, guarded(name, fn), { name }));
};

const keepAlive = require('./keepAlive');

const startJobs = () => {
  if (!jobConfig.enabled) {
    logger.info('Scheduled jobs are disabled (ENABLE_JOBS=false or test environment)');
    return { started: false, tasks: [] };
  }

  schedule('order-resolver', jobConfig.orderResolveCron, async () => {
    await resolvePendingOrders();
    await resolvePendingOrders.reportStuckOrders();
  });

  schedule('alert-checker', jobConfig.alertCheckCron, checkAlerts);
  schedule('leaderboard-compute', jobConfig.leaderboardCron, computeLeaderboard);
  
  // Render free tier goes to sleep after 15 minutes of inactivity. 
  // We ping ourselves every 14 minutes to keep it awake.
  schedule('keep-alive', '*/14 * * * *', keepAlive);

  logger.info(`Started ${tasks.length} scheduled jobs`);
  return { started: true, tasks: tasks.map((t) => t.name) };
};

const stopJobs = () => {
  tasks.forEach((task) => task.stop());
  tasks.length = 0;
};

module.exports = { startJobs, stopJobs };
