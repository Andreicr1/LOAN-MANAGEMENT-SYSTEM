module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Jest runs from WEB/ as <rootDir>; tests live under WEB/functions/__tests__
  roots: ['<rootDir>/functions/__tests__'],
  moduleNameMapper: {
    '^@aws-sdk/(.*)$': '<rootDir>/node_modules/@aws-sdk/$1'
  }
}


