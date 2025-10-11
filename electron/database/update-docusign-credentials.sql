-- Update DocuSign credentials with correct values
-- Run this to update existing database

UPDATE config SET 
  docusign_integration_key = '2200e5dd-3ef2-40a8-bc5e-facfa2653b95',
  docusign_account_id = '5d45cf48-f587-45ce-a6f4-f8693c714f7c',
  docusign_user_id = '00246cfe-b264-45f4-aeff-82e51cb93ed1',
  docusign_base_path = 'https://demo.docusign.net/restapi',
  updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- Verify the update
SELECT 
  docusign_integration_key,
  docusign_account_id,
  docusign_user_id,
  docusign_base_path
FROM config WHERE id = 1;

