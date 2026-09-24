const axios = require('axios');
const logger = require('../config/logger');

/**
 * Pings the backend's external URL to prevent free-tier hosting providers (like Render)
 * from putting the process to sleep after 15 minutes of inactivity.
 */
const keepAlive = async () => {
  const url = process.env.RENDER_EXTERNAL_URL;
  if (!url) {
    logger.debug('Keep-alive skipped: RENDER_EXTERNAL_URL is not set.');
    return;
  }

  try {
    const healthUrl = `${url}/health`;
    await axios.get(healthUrl, { timeout: 5000 });
    logger.debug(`Keep-alive ping sent to ${healthUrl}`);
  } catch (err) {
    logger.error(`Keep-alive ping failed: ${err.message}`);
  }
};

module.exports = keepAlive;
