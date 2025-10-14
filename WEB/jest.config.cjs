module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/WEB/functions/__tests__'],
  moduleNameMapper: {
    '^@aws-sdk/(.*)$': '<rootDir>/node_modules/@aws-sdk/$1'
  }
}


