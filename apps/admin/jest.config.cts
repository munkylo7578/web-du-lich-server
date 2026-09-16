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
    '^@database$': '<rootDir>/../../libs/database/src/index.ts',
    '^@destination-country$': '<rootDir>/../../libs/database/src/contracts/destination-country.ts',
    '^@service-category$': '<rootDir>/../../libs/database/src/contracts/service-category.ts',
    '^@setting-category$': '<rootDir>/../../libs/database/src/contracts/setting-category.ts',
  },
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
};
