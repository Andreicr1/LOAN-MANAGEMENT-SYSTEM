-- Insert SignWell API Token
-- Run this once to configure SignWell with the provided API token

UPDATE config 
SET 
  signwell_api_token = 'YWNjZXNzOjJhMWM2Y2FjYWI0ZGU2MmY0YjhjYTM0ZjFiNGY0MGU5',
  signwell_test_mode = 1
WHERE id = 1;

