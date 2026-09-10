module.exports = {
  displayName: 'admin',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.spec.json',
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@destination-country$': '<rootDir>/../../libs/database/src/contracts/destination-country.ts',
  },
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
};
