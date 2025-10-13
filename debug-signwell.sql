-- Debug: Verificar configuração SignWell no banco de dados

.headers on
.mode column

-- Ver configuração atual
SELECT 
  'Configuração SignWell:' as info;

SELECT 
  signwell_api_token as token,
  signwell_test_mode as test_mode,
  CASE 
    WHEN signwell_api_token IS NULL THEN '❌ NÃO CONFIGURADO'
    WHEN signwell_api_token LIKE 'encrypted:%' THEN '🔒 CRIPTOGRAFADO'
    ELSE '✅ CONFIGURADO'
  END as status
FROM config 
WHERE id = 1;

-- Inserir/atualizar token se não existir
UPDATE config 
SET 
  signwell_api_token = 'YWNjZXNzOjJhMWM2Y2FjYWI0ZGU2MmY0YjhjYTM0ZjFiNGY0MGU5',
  signwell_test_mode = 1
WHERE id = 1 
  AND (signwell_api_token IS NULL OR signwell_api_token = '');

-- Verificar novamente
SELECT 
  '--- Depois da atualização ---' as info;

SELECT 
  CASE 
    WHEN signwell_api_token IS NOT NULL THEN '✅ Token configurado'
    ELSE '❌ Token não configurado'
  END as status,
  signwell_test_mode as test_mode
FROM config 
WHERE id = 1;

