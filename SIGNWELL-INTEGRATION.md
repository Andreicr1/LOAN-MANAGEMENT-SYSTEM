# 📝 SignWell Integration Guide

## Visão Geral

Este sistema integra o **SignWell** para assinatura eletrônica de documentos, utilizando a funcionalidade de **Embedded Requesting** que permite preparar documentos diretamente em um iframe antes de enviá-los para assinatura.

## 🔑 Características

- ✅ **Embedded Requesting**: Edição de documentos via iframe
- ✅ **Assinatura Eletrônica**: Envio automático para assinantes
- ✅ **Download Automático**: PDF assinado baixado após conclusão
- ✅ **Test Mode**: Testes sem cobrança
- ✅ **Webhooks**: (Opcional) Notificações de status
- ✅ **Templates**: Criação de templates reutilizáveis

## 📚 Documentação da API

- **URL Base**: https://www.signwell.com/api/v1
- **Autenticação**: Header `X-Api-Key: your-token`
- **Documentação Oficial**: https://developers.signwell.com/reference/getting-started-with-your-api-1

## 🚀 Setup Inicial

### 1. Obter API Token

1. Acesse https://www.signwell.com/
2. Faça login na sua conta de desenvolvedor
3. Vá em **Settings → API**
4. Copie seu **API Token**

### 2. Configurar no Sistema

**Via Interface:**
1. Abra a aplicação
2. Vá em **Settings → E-Signature**
3. Cole seu API Token
4. Marque **Test Mode** (recomendado para desenvolvimento)
5. Clique em **Save Changes**

**Via SQL (Alternativa):**
```sql
UPDATE config 
SET 
  signwell_api_token = 'seu-token-aqui',
  signwell_test_mode = 1  -- 1 para test mode, 0 para production
WHERE id = 1;
```

## 🏗️ Arquitetura

```
Frontend (React)
    ↓
window.electronAPI.signwell.*
    ↓
IPC Handlers (main.ts)
    ↓
SignWellService (signwell.service.ts)
    ↓
SignWell API (REST)
```

## 📋 Fluxos de Uso

### Fluxo 1: Promissory Note (Nota Promissória)

1. **Usuário aprova disbursement**
2. **Sistema gera PDF da Promissory Note**
3. **Cria documento no SignWell** (draft)
4. **Mostra iframe Embedded Requesting**
   - Usuário adiciona campos de assinatura
   - Posiciona campos de data
   - Adiciona texto adicional se necessário
5. **Usuário clica "Send for Signature"**
6. **SignWell envia email aos signatários**
7. **Signatários assinam online**
8. **Sistema baixa PDF assinado automaticamente**
9. **Salva em `signed_pn_path`**

### Fluxo 2: Wire Transfer Order

1. **Usuário gera Wire Transfer Order**
2. **Sistema cria PDF do wire transfer**
3. **Cria documento no SignWell** (draft)
4. **Mostra iframe Embedded Requesting**
5. **Usuário prepara campos e envia**
6. **SignWell envia para assinatura**
7. **Sistema baixa PDF assinado**
8. **Envia para banco via email**

## 🔧 API Methods

### Frontend (window.electronAPI.signwell)

```typescript
// Criar documento draft
const result = await window.electronAPI.signwell.createDocument({
  name: "Promissory Note PN-2025-001",
  pdfPath: "/path/to/pn.pdf",
  pdfName: "promissory-note.pdf",
  recipients: [
    { name: "John Doe", email: "john@example.com" },
    { name: "Jane Smith", email: "jane@example.com" }
  ]
});
// Returns: { success: true, documentId: "doc_123", status: "draft" }

// Obter URL do iframe de edição
const embedResult = await window.electronAPI.signwell.getEmbeddedRequestingUrl(documentId);
// Returns: { success: true, url: "https://...", expiresAt: "2025-..." }

// Verificar status do documento
const docResult = await window.electronAPI.signwell.getDocument(documentId);
// Returns: { success: true, document: {...} }

// Enviar para assinatura (após preparação)
const sendResult = await window.electronAPI.signwell.updateAndSend({
  documentId: documentId,
  recipients: [...] // opcional: atualizar recipients
});
// Returns: { success: true, document: {...} }

// Baixar PDF assinado
const downloadResult = await window.electronAPI.signwell.downloadCompletedPDF(
  documentId,
  "/path/to/save/signed.pdf"
);
// Returns: { success: true, path: "/path/to/save/signed.pdf" }

// Enviar lembrete
const reminderResult = await window.electronAPI.signwell.sendReminder(documentId);
// Returns: { success: true }
```

### Backend (SignWellService)

```typescript
// Inicializar serviço
signWellService.initialize({
  apiToken: "your-token",
  testMode: true
});

// Criar documento
const document = await signWellService.createDocument({
  name: "Document Name",
  files: [{ name: "doc.pdf", file_base64: "..." }],
  recipients: [...],
  draft: true
});

// Obter link de embedded requesting
const link = await signWellService.getEmbeddedRequestingLink(documentId);

// Obter documento
const doc = await signWellService.getDocument(documentId);

// Atualizar e enviar
const updated = await signWellService.updateAndSendDocument(documentId, {...});

// Baixar PDF completado
const pdfBuffer = await signWellService.downloadCompletedPDF(documentId);

// Enviar lembrete
await signWellService.sendReminder(documentId);

// Criar template
const template = await signWellService.createTemplate({...});

// Criar documento a partir de template
const doc = await signWellService.createDocumentFromTemplate(templateId, {...});
```

## 💾 Estrutura do Banco de Dados

### Tabela: config
```sql
signwell_api_token TEXT         -- API token criptografado
signwell_test_mode INTEGER       -- 1 = test, 0 = production
```

### Tabela: promissory_notes
```sql
signwell_document_id TEXT        -- ID do documento no SignWell
signwell_status TEXT             -- pending, awaiting_signature, completed, etc.
signwell_embed_url TEXT          -- URL do iframe (temporária)
signwell_completed_at TEXT       -- Data de conclusão
```

### Tabela: disbursements
```sql
wire_transfer_signwell_document_id TEXT   -- ID do wire transfer
wire_transfer_signwell_status TEXT        -- Status
wire_transfer_signwell_embed_url TEXT     -- URL do iframe
```

## 🎨 UI Components

### Embedded Requesting Iframe

```tsx
<iframe
  src={embedUrl}
  title="SignWell Document Editor"
  className="w-full h-[600px]"
  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
/>
```

**Eventos do Iframe:**
- O iframe pode enviar mensagens via postMessage
- Escutar eventos de conclusão/fechamento
- Atualizar UI quando documento for enviado

### Status Badges

```tsx
{signwellStatus === 'completed' && (
  <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-xs font-medium">
    ✓ Signed
  </span>
)}

{signwellStatus === 'awaiting_signature' && (
  <span className="bg-yellow-50 text-yellow-600 px-3 py-1 rounded-full text-xs font-medium">
    ⏳ Awaiting Signature
  </span>
)}
```

## ⚡ Rate Limits

- **Production**: 100 requests/minuto
- **Test Mode**: 20 requests/minuto
- **Document Creation**: 30 requests/minuto

## 🔒 Segurança

1. **API Token Encryption**
   - Token armazenado criptografado no banco
   - Usa `secret-manager.ts` com master secret
   - Nunca exposto no frontend

2. **Iframe Sandbox**
   - `allow-same-origin`: Permite comunicação
   - `allow-scripts`: Necessário para funcionalidade
   - `allow-forms`: Para inputs do documento
   - `allow-popups`: Para janelas de ajuda

3. **HTTPS Only**
   - SignWell API usa apenas HTTPS
   - Tokens nunca em URLs, sempre em headers

## 🐛 Troubleshooting

### Erro: "SignWell not configured"
**Solução**: Configure o API token em Settings → E-Signature

### Erro: "Failed to create document"
**Possíveis causas**:
- Token inválido ou expirado
- PDF corrompido ou muito grande
- Rate limit excedido
- Email de recipient inválido

### Iframe não carrega
**Soluções**:
- Verificar se URL do embed não expirou (válido por ~1 hora)
- Checar console do navegador para erros CORS
- Verificar se sandbox permissions estão corretas

### PDF não baixa após assinatura
**Soluções**:
- Verificar se documento está com status "completed"
- Checar permissões de escrita no diretório
- Confirmar que `signwell_document_id` está salvo corretamente

## 📊 Monitoramento

### Logs Importantes

```typescript
// Criar documento
console.log('SignWell create document:', { documentId, status });

// Obter embed URL
console.log('SignWell embed URL:', { url, expiresAt });

// Download PDF
console.log('SignWell download:', { documentId, path });

// Erros
console.error('SignWell API error:', error);
```

### Audit Trail

Todos os eventos são registrados na tabela `audit_log`:
- `SIGNWELL_DOCUMENT_CREATED`
- `SIGNWELL_DOCUMENT_SENT`
- `SIGNWELL_DOCUMENT_COMPLETED`
- `SIGNWELL_PDF_DOWNLOADED`

## 🔄 Status Lifecycle

```
draft → awaiting_signature → completed
  ↓           ↓                  ↓
cancelled   declined          expired
```

- **draft**: Documento criado, não enviado
- **awaiting_signature**: Enviado aos signatários
- **completed**: Todos assinaram
- **declined**: Algum signatário recusou
- **expired**: Prazo de assinatura expirou
- **cancelled**: Cancelado pelo criador

## 🧪 Testing

### Test Mode

- Crie documentos sem cobrança
- Use emails de teste
- PDFs não têm validade legal
- Ideal para desenvolvimento

### Página de Teste

Acesse `/signwell-test` para:
1. Criar documento de teste
2. Ver iframe de embedded requesting
3. Enviar para assinatura
4. Verificar fluxo completo

## 📝 Exemplos de Código

### Exemplo Completo: Enviar PN para Assinatura

```typescript
const handleSendPNForSignature = async (promissoryNoteId: number) => {
  try {
    // 1. Obter dados da PN
    const pn = await window.electronAPI.promissoryNotes.getById(promissoryNoteId);
    
    // 2. Criar documento no SignWell
    const createResult = await window.electronAPI.signwell.createDocument({
      name: `Promissory Note ${pn.pnNumber}`,
      pdfPath: pn.generatedPnPath,
      pdfName: `${pn.pnNumber}.pdf`,
      recipients: [
        { name: "WMF Corp", email: "operations@wmf-corp.com" },
        { name: pn.clientName, email: pn.clientEmail }
      ]
    });
    
    if (!createResult.success) {
      throw new Error(createResult.error);
    }
    
    // 3. Salvar document ID
    await window.electronAPI.promissoryNotes.update(promissoryNoteId, {
      signwellDocumentId: createResult.documentId,
      signwellStatus: 'draft'
    });
    
    // 4. Obter URL do embed
    const embedResult = await window.electronAPI.signwell.getEmbeddedRequestingUrl(
      createResult.documentId
    );
    
    if (!embedResult.success) {
      throw new Error(embedResult.error);
    }
    
    // 5. Mostrar iframe
    setEmbedUrl(embedResult.url);
    setShowEmbedModal(true);
    
  } catch (error) {
    console.error('Error sending PN for signature:', error);
    alert('Failed to send for signature');
  }
};
```

### Exemplo: Polling de Status

```typescript
const pollDocumentStatus = async (documentId: string) => {
  const checkStatus = async () => {
    const result = await window.electronAPI.signwell.getDocument(documentId);
    
    if (result.success && result.document) {
      const status = result.document.status;
      
      if (status === 'completed') {
        // Download signed PDF
        await downloadSignedPDF(documentId);
        return true; // Stop polling
      }
      
      if (status === 'declined' || status === 'expired') {
        alert(`Document ${status}`);
        return true; // Stop polling
      }
    }
    
    return false; // Continue polling
  };
  
  // Poll every 30 seconds
  const interval = setInterval(async () => {
    const done = await checkStatus();
    if (done) clearInterval(interval);
  }, 30000);
  
  // Initial check
  await checkStatus();
};
```

## 🎯 Best Practices

1. **Sempre use Test Mode em desenvolvimento**
2. **Valide recipients antes de criar documento**
3. **Salve `document_id` imediatamente após criação**
4. **Implemente polling ou webhooks para status updates**
5. **Faça download do PDF assinado assim que completado**
6. **Log todos os erros para debugging**
7. **Mostre feedback visual durante operações assíncronas**
8. **Trate erros de rate limit com retry exponencial**

## 📞 Suporte

- **Documentação Oficial**: https://developers.signwell.com/
- **Status da API**: https://status.signwell.com/
- **Suporte SignWell**: support@signwell.com

---

**Versão**: 1.0  
**Última Atualização**: 2025-01-11

