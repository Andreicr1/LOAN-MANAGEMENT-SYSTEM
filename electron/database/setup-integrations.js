const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbPath = path.join(__dirname, '../../loan.db');
const db = new Database(dbPath);

try {
  console.log('Configuring DocuSign and Email...');
  
  // Configure DocuSign and Email
  const updateConfig = db.prepare(`
    UPDATE config SET 
      docusign_integration_key = ?,
      docusign_account_id = ?,
      docusign_user_id = ?,
      docusign_base_path = ?,
      email_host = ?,
      email_port = ?,
      email_secure = ?,
      email_user = ?,
      email_pass = ?,
      bank_email = ?
    WHERE id = 1
  `);
  
  updateConfig.run(
    '2200e5dd-3ef2-40a8-bc5e-facfa2653b95',
    '5d45cf48-f587-45ce-a6f4-f8693c714f7c',
    '00246cfe-b264-45f4-aeff-82e51cb93ed1',
    'https://demo.docusign.net/restapi',
    'mail.infomaniak.com',
    587,
    0,
    'operations@wmf-corp.com',
    '2fEfeUwtPxYQPNqp',
    'bank@example.com'
  );
  
  console.log('✓ DocuSign and Email configured');

  // Optional: set webhook secret from .env for Connect fallback
  if (process.env.DS_CONNECT_SECRET) {
    const setSecret = db.prepare(`UPDATE config SET webhook_secret = ? WHERE id = 1`);
    setSecret.run(process.env.DS_CONNECT_SECRET);
    console.log('✓ webhook_secret updated from .env');
  }

  // Ensure webhook_url is cleared (Connect URL comes from .env at runtime)
  try {
    db.exec(`UPDATE config SET webhook_url = NULL WHERE id = 1`);
  } catch (e) {}
  
  // Add signatories columns if they don't exist
  try {
    db.exec('ALTER TABLE config ADD COLUMN lender_signatories TEXT');
    console.log('✓ Added lender_signatories column');
  } catch (e) {
    console.log('  lender_signatories column already exists');
  }
  
  try {
    db.exec('ALTER TABLE config ADD COLUMN borrower_signatories TEXT');
    console.log('✓ Added borrower_signatories column');
  } catch (e) {
    console.log('  borrower_signatories column already exists');
  }
  
  // Update with default signatories
  const updateSignatories = db.prepare(`
    UPDATE config SET 
      lender_signatories = ?,
      borrower_signatories = ?
    WHERE id = 1
  `);
  
  const lenderSignatories = JSON.stringify([
    {name: "John Smith", email: "andreirachadel07@gmail.com", role: "CFO"},
    {name: "Jane Doe", email: "jane.doe@wmf-corp.com", role: "CEO"}
  ]);
  
  const borrowerSignatories = JSON.stringify([
    {name: "Robert Johnson", email: "robert@wholemax.com", role: "Director"},
    {name: "Maria Garcia", email: "maria@wholemax.com", role: "Financial Manager"}
  ]);
  
  updateSignatories.run(lenderSignatories, borrowerSignatories);
  console.log('✓ Default signatories configured');
  
  console.log('\n✅ All integrations configured successfully!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  db.close();
}

