import bcrypt from 'bcryptjs'

// Utility to generate password hashes for seeding database
// Run with: node -r ts-node/register electron/utils/hash-password.ts

const password = 'admin123'

bcrypt.hash(password, 10).then((hash) => {
  console.log(`Password: ${password}`)
  console.log(`Hash: ${hash}`)
})

