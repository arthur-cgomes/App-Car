module.exports = {
  rootDir: '..',
  testRegex: 'test/.*\\.int-spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  testTimeout: 30000,
};
