// Script para adicionar campos SignWell ao banco de dados existente
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Localizar banco de dados
const dbPath = path.join(
  process.env.APPDATA || process.env.HOME,
  'Electron',
  'loan-management.db'
);

console.log('Localizando banco de dados em:', dbPath);

if (!fs.existsSync(dbPath)) {
  console.error('❌ Banco de dados não encontrado!');
  console.log('Verifique se a aplicação foi executada pelo menos uma vez.');
  process.exit(1);
}

console.log('✅ Banco de dados encontrado!');

try {
  const db = new Database(dbPath);
  
  console.log('\n📝 Adicionando campos SignWell...\n');
  
  // Verificar se colunas já existem
  const tableInfo = db.prepare("PRAGMA table_info(config)").all();
  const hasSignwellToken = tableInfo.some(col => col.name === 'signwell_api_token');
  
  if (hasSignwellToken) {
    console.log('⚠️  Campos SignWell já existem. Apenas atualizando token...');
  } else {
    // Adicionar colunas na tabela config
    db.exec(`
      ALTER TABLE config ADD COLUMN signwell_api_token TEXT;
      ALTER TABLE config ADD COLUMN signwell_test_mode INTEGER DEFAULT 1;
    `);
    console.log('✅ Colunas adicionadas à tabela config');
    
    // Adicionar colunas na tabela promissory_notes
    db.exec(`
      ALTER TABLE promissory_notes ADD COLUMN signwell_document_id TEXT;
      ALTER TABLE promissory_notes ADD COLUMN signwell_status TEXT;
      ALTER TABLE promissory_notes ADD COLUMN signwell_embed_url TEXT;
      ALTER TABLE promissory_notes ADD COLUMN signwell_completed_at TEXT;
    `);
    console.log('✅ Colunas adicionadas à tabela promissory_notes');
    
    // Adicionar colunas na tabela disbursements
    db.exec(`
      ALTER TABLE disbursements ADD COLUMN wire_transfer_signwell_document_id TEXT;
      ALTER TABLE disbursements ADD COLUMN wire_transfer_signwell_status TEXT;
      ALTER TABLE disbursements ADD COLUMN wire_transfer_signwell_embed_url TEXT;
    `);
    console.log('✅ Colunas adicionadas à tabela disbursements');
  }
  
  // Inserir/atualizar token
  const stmt = db.prepare(`
    UPDATE config 
    SET 
      signwell_api_token = ?,
      signwell_test_mode = 1
    WHERE id = 1
  `);
  
  stmt.run('7c0af648fe4d7ceeba5f5b087f5ec51d9e232047dd64d7c2628a32bf8484e243');
  console.log('✅ Token SignWell configurado!');
  
  // Verificar
  const config = db.prepare('SELECT signwell_api_token, signwell_test_mode FROM config WHERE id = 1').get();
  console.log('\n📊 Configuração atual:');
  console.log('- Token:', config.signwell_api_token ? config.signwell_api_token.substring(0, 20) + '...' : 'NULL');
  console.log('- Test Mode:', config.signwell_test_mode === 1 ? 'Ativo ✓' : 'Inativo');
  
  db.close();
  
  console.log('\n🎉 Migração concluída com sucesso!');
  console.log('📌 Agora reinicie a aplicação.');
  
} catch (error) {
  console.error('\n❌ Erro durante migração:', error.message);
  process.exit(1);
}

