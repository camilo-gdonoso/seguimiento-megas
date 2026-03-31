/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  // Run test files serially to avoid shared pool conflicts across suites
  runInBand: true,
  testTimeout: 20000,
  testMatch: [
    '**/tests/**/*.test.js',
    '**/*.test.js'
  ],
  // Global setup/teardown handled per-suite via globalTeardown
  globalTeardown: './jest.teardown.js',
  verbose: true,
};
