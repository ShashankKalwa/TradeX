/**
 * Jest configuration.
 *
 * `runInBand` is deliberate: the suites share one in-memory MongoDB replica set,
 * and parallel workers would race on the same collections.
 */
module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setup.js'],
  // One shared in-memory replica set for the whole run: suites no longer race
  // each other starting and stopping their own.
  globalSetup: '<rootDir>/tests/globalSetup.js',
  globalTeardown: '<rootDir>/tests/globalTeardown.js',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  testTimeout: 60000,
  verbose: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/config/swagger.js',
    '!src/models/**',
    '!src/integrations/providers/**'
  ],
  coverageThreshold: {
    './src/services/tradingEngineService.js': {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/services/authService.js': {
      functions: 70,
      lines: 70
    }
  },
  clearMocks: true,
  restoreMocks: true
};
