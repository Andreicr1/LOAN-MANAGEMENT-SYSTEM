-- Configure DocuSign and Email automatically
UPDATE config SET 
  docusign_integration_key = '22cbfa52b-5af7-42de-bc9ea4e652ab',
  docusign_account_id = '5d45cf48-f587-45ce-a6f4-f8693c714f7c',
  docusign_base_path = 'https://demo.docusign.net/restapi',
  email_host = 'mail.infomaniak.com',
  email_port = 587,
  email_secure = 0,
  email_user = 'operations@wmf-corp.com',
  email_pass = '2fEfeUwtPxYQPNqp',
  bank_email = 'bank@example.com'
WHERE id = 1;

-- Add signatories fields to config
ALTER TABLE config ADD COLUMN lender_signatories TEXT;
ALTER TABLE config ADD COLUMN borrower_signatories TEXT;

-- Update with default signatories
UPDATE config SET 
  lender_signatories = '[{"name":"John Smith","email":"john.smith@wmf-corp.com","role":"CFO"},{"name":"Jane Doe","email":"jane.doe@wmf-corp.com","role":"CEO"}]',
  borrower_signatories = '[{"name":"Robert Johnson","email":"robert@wholemax.com","role":"Director"},{"name":"Maria Garcia","email":"maria@wholemax.com","role":"Financial Manager"}]'
WHERE id = 1;

