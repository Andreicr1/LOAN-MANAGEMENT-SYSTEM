# Atualizar Credenciais DocuSign no Banco de Dados

## 📋 O que foi atualizado no código:

✅ `electron/database/schema.sql` - Valores padrão corretos
✅ `electron/main.ts` - Integration Key correta  
✅ `electron/database/database.service.ts` - Auto-migração adicionada

## 🔧 Como atualizar o banco de dados existente:

### **Opção 1: Via Console do App (RECOMENDADO)**

1. Abra o app
2. Pressione **F12** para abrir DevTools
3. Vá na aba **Console**
4. Cole e execute este código:

```javascript
// Atualizar credenciais DocuSign no banco de dados
await window.electronAPI.config.saveConfig({
  docusignIntegrationKey: '2200e5dd-3ef2-40a8-bc5e-facfa2653b95',
  docusignAccountId: '5d45cf48-f587-45ce-a6f4-f8693c714f7c',
  docusignUserId: '00246cfe-b264-45f4-aeff-82e51cb93ed1',
  docusignBasePath: 'https://demo.docusign.net/restapi'
})

console.log('✅ Credenciais DocuSign atualizadas!')
```

5. Feche o app
6. Abra novamente

### **Opção 2: Recompilar e executar**

Se preferir recompilar o projeto:

```bash
cd d:\LOAN-MANAGEMENT-SYSTEM
npm run build
npm run electron:build
```

Depois execute o novo `.exe` gerado.

## 🔐 Próximos Passos (OBRIGATÓRIO):

### **1. JWT Consent Grant**

Antes de testar o envio para assinatura, você **DEVE** fazer o consent grant:

1. Cole esta URL no navegador:
```
https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=2200e5dd-3ef2-40a8-bc5e-facfa2653b95&redirect_uri=https://localhost:8765/callback
```

2. Faça login com sua conta DocuSign
3. Clique em **"Allow Access"**
4. Ignore o erro de localhost - é normal!

### **2. Testar**

Depois de fazer o consent grant:
1. Feche e reabra o app
2. Tente enviar um documento para assinatura

## ✅ Valores Corretos Configurados:

- **Integration Key:** `2200e5dd-3ef2-40a8-bc5e-facfa2653b95`
- **Account ID:** `5d45cf48-f587-45ce-a6f4-f8693c714f7c`
- **User ID:** `00246cfe-b264-45f4-aeff-82e51cb93ed1`
- **Base Path:** `https://demo.docusign.net/restapi`

## 🔍 Verificar se funcionou:

Execute no console:
```javascript
const config = await window.electronAPI.config.getConfig()
console.log('Integration Key:', config.docusignIntegrationKey)
console.log('Account ID:', config.docusignAccountId)
console.log('User ID:', config.docusignUserId)
```

Deve mostrar os valores corretos listados acima.

