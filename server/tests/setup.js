/**
 * Environment for every suite. Runs before the test framework loads, so
 * `src/config/env.js` reads these values when it is first required.
 */
process.env.NODE_ENV = 'test';

// A signing key must exist before any token is issued.
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-hs256-signing';
process.env.JWT_EXPIRES_IN = '1h';

// Fixed opening balance so the arithmetic in assertions is exact.
process.env.STARTING_CASH = '100000';

// Keep the simulated brokerage deterministic in tests.
process.env.TRADE_FEE_RATE = '0.0005';

// Never schedule cron or broadcast ticks during a test run.
process.env.ENABLE_JOBS = 'false';

// Silence the application logger unless a suite is being debugged.
if (!process.env.LOG_IN_TESTS) {
  process.env.LOG_LEVEL = 'silent';
}
