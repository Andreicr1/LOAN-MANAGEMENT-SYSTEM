const bcrypt = require('bcryptjs');
// Utility to generate password hashes for seeding database
// Run with: node electron/utils/hash-password.js
var password = 'admin123';
bcrypt.hash(password, 10).then(function (hash) {
    console.log("Password: ".concat(password));
    console.log("Hash: ".concat(hash));
});
