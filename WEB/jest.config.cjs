module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Jest runs from project root, but tests are in WEB/functions/__tests__
  roots: ['<rootDir>/WEB/functions/__tests__'],
  moduleNameMapper: {
    '^@aws-sdk/(.*)$': '<rootDir>/node_modules/@aws-sdk/$1'
  }
}


