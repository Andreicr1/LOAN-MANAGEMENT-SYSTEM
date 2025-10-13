-- Configure DocuSign and Email automatically
UPDATE config SET 

  email_host = 'mail.infomaniak.com',
  email_port = 587,
  email_secure = 0,
  email_user = 'operations@wmf-corp.com',
  email_pass = '2fEfeUwtPxYQPNqp',
  bank_email = 'bank@example.com',
  webhook_url = NULL -- Connect URL now comes from .env (DS_CONNECT_PORT/DS_CONNECT_PATH)
WHERE id = 1;

-- Add signatories fields to config
ALTER TABLE config ADD COLUMN lender_signatories TEXT;
ALTER TABLE config ADD COLUMN borrower_signatories TEXT;

-- Update with default signatories
UPDATE config SET 
  lender_signatories = '[{"name":"John Smith","email":"andreirachadel07@gmail.com","role":"CFO"},{"name":"Jane Doe","email":"jane.doe@wmf-corp.com","role":"CEO"}]',
  borrower_signatories = '[{"name":"Robert Johnson","email":"robert@wholemax.com","role":"Director"},{"name":"Maria Garcia","email":"maria@wholemax.com","role":"Financial Manager"}]'
WHERE id = 1;

