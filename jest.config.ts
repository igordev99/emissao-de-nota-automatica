import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  verbose: false,
  testMatch: ['**/tests/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'CommonJS',
        moduleResolution: 'Node',
        esModuleInterop: true,
        isolatedModules: true
      },
      diagnostics: false
    }]
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.{ts,js}', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts']
};

export default config;