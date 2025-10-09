import bcrypt from 'bcryptjs';
// Utility to generate password hashes for seeding database
// Run with: node -r ts-node/register electron/utils/hash-password.ts
var password = 'admin123';
bcrypt.hash(password, 10).then(function (hash) {
    console.log("Password: ".concat(password));
    console.log("Hash: ".concat(hash));
});
