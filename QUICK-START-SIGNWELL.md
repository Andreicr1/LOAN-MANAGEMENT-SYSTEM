# 🚀 SignWell - Quick Start Guide

## Passo a Passo para Usar a Integração

### 1️⃣ **Configurar o Token (FAÇA PRIMEIRO!)**

**Via Interface (Recomendado):**
1. Abrir a aplicação
2. Login como admin
3. Ir em **Settings** (menu lateral)
4. Clicar na aba **"E-Signature"**
5. Colar o token:
   ```
   7c0af648fe4d7ceeba5f5b087f5ec51d9e232047dd64d7c2628a32bf8484e243
   ```
6. Verificar se **Test Mode** está marcado ✓
7. Clicar em **Save Changes**
8. Confirmar mensagem de sucesso

**OU via SQL:**
```bash
# Executar o script:
sqlite3 <seu-banco>.db < electron/database/insert-signwell-token.sql
```

---

### 2️⃣ **Testar a Integração**

#### **Opção A: Página de Teste (Recomendado)**

1. Na aplicação, acessar manualmente:
   ```
   http://localhost:port/#/signwell-test
   ```
2. Clicar em **"Create Test Document"**
3. Aguardar o iframe carregar
4. Arrastar campos de assinatura no documento
5. Clicar em **"Send for Signature"**
6. Verificar email

#### **Opção B: Fluxo Real de Promissory Note**

1. Ir em **Disbursements**
2. Criar novo disbursement
3. Aprovar disbursement
4. Clicar em **"Generate Promissory Note"**
5. Clicar em **"📝 Send for E-Signature"** (botão verde)
6. Modal abre com iframe SignWell
7. Preparar documento (adicionar campos de assinatura)
8. Clicar em **"Send for Signature"**
9. Verificar emails dos signatários

#### **Opção C: Wire Transfer Order**

1. Após PN assinada estar no sistema
2. Clicar em **"Generate Wire Transfer Order"**
3. Clicar em botão SignWell para Wire Transfer
4. Preparar documento no iframe
5. Enviar para assinatura interna (WMF Corp)
6. Aguardar assinatura
7. Sistema baixa PDF assinado
8. Enviar ao banco

---

### 3️⃣ **Verificar se Funcionou**

✅ **Indicadores de Sucesso:**
- Settings mostra badge **"✓ Configured"**
- Modal SignWell abre sem erros
- Iframe carrega o documento
- Email chega aos signatários
- Status atualiza no sistema

❌ **Se algo deu errado:**
- Verificar console do navegador (F12)
- Verificar console do Electron
- Ler `SIGNWELL-INTEGRATION.md` seção Troubleshooting
- Verificar se token está correto em Settings

---

### 4️⃣ **Fluxo Completo Visual**

```
┌─────────────────────────────────────────┐
│  1. CONFIGURAR TOKEN                     │
│  Settings → E-Signature → Cole Token    │
│  ✓ Test Mode = ON                        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  2. CRIAR DISBURSEMENT                   │
│  Disbursements → New → Preencher dados  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  3. APROVAR                              │
│  Disbursement Detail → Approve          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  4. GERAR PROMISSORY NOTE                │
│  Generate Promissory Note → PDF criado  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  5. ENVIAR PARA E-SIGNATURE              │
│  📝 Send for E-Signature → Modal abre   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  6. PREPARAR DOCUMENTO NO IFRAME         │
│  - Arrastar campos de assinatura        │
│  - Posicionar campos de data            │
│  - Revisar documento                     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  7. ENVIAR                               │
│  Send for Signature → Emails enviados   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  8. SIGNATÁRIOS ASSINAM                  │
│  Email → Link → Assinatura online       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  9. DOWNLOAD AUTOMÁTICO (futuro)         │
│  PDF assinado → Salvo automaticamente   │
└─────────────────────────────────────────┘
```

---

## 🎨 **Screenshots (O que você vai ver)**

### Settings - E-Signature Section:
```
┌─────────────────────────────────────────────────┐
│  SignWell Integration        [✓ Configured]     │
├─────────────────────────────────────────────────┤
│  ℹ About SignWell                               │
│  SignWell is an electronic signature            │
│  platform that allows...                        │
│  [Get your API token from SignWell →]           │
│                                                  │
│  API Token: [••••••••••••]                      │
│                                                  │
│  ☑ Test Mode                                    │
│  Enable test mode for development...            │
│                                                  │
│  ✓ SignWell is configured and ready             │
│  (Currently in TEST MODE)                       │
└─────────────────────────────────────────────────┘
```

### Disbursement Detail - Actions:
```
Documents:
[View Generated PN]  [📝 Send for E-Signature]
```

### SignWell Modal:
```
┌─────────────────────────────────────────────────┐
│  Prepare Document for Signature            [✕]  │
│  Promissory Note PN-2025-001                    │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │  [SignWell Iframe - Document Editor]    │   │
│  │  • Drag signature fields                │   │
│  │  • Assign to recipients                 │   │
│  │  • Add date/text fields                 │   │
│  └─────────────────────────────────────────┘   │
│                                                  │
├─────────────────────────────────────────────────┤
│  Instructions:                                   │
│  1. Add signature fields by dragging...         │
│                    [Cancel] [Send for Signature]│
└─────────────────────────────────────────────────┘
```

---

## 🎯 **Checklist de Primeiro Uso**

Antes de usar pela primeira vez:

- [ ] Token configurado em Settings
- [ ] Test Mode ativado
- [ ] Badge "✓ Configured" aparece
- [ ] Pelo menos 1 client cadastrado com email
- [ ] Lender signatories configurados em Settings

---

## ⚡ **Comandos Úteis**

```bash
# Compilar TypeScript
npm run forge:compile

# Verificar erros TypeScript
npx tsc --noEmit

# Build da aplicação
npm run build

# Executar em dev mode
npm run dev

# Criar executável
npm run forge:make
```

---

## 📧 **Emails de Teste**

Para testar, os signatários vão receber:
- **Assunto**: "Promissory Note PN-XXXX-XXX - Disbursement DR-XXX"
- **De**: SignWell (noreply@signwell.com)
- **Conteúdo**: Link para assinar o documento
- **Prazo**: Configurável (default: 30 dias)

---

## 🔍 **Como Saber se Está Funcionando**

### Console Logs:
```
✓ OAuth/Webhook server started... (NÃO mais!)
✓ Database initialized at: ...
SignWell create document: { documentId: 'doc_xxx', status: 'draft' }
SignWell embed URL: { url: 'https://...', expiresAt: '...' }
```

### Audit Log (na aplicação):
```
PN_SENT_TO_SIGNWELL
- PN Number: PN-2025-001
- Document ID: doc_abc123
```

### Banco de Dados:
```sql
SELECT 
  pn_number, 
  signwell_document_id, 
  signwell_status 
FROM promissory_notes 
WHERE signwell_document_id IS NOT NULL;
```

---

## 💡 **Dicas Importantes**

1. **Test Mode é grátis** - Use à vontade para testar
2. **Embed URL expira** - Se expirar, fechar e reabrir modal
3. **Emails reais** - Mesmo em test mode, emails são enviados
4. **Fallback manual** - Se SignWell não configurado, botão manual aparece
5. **Múltiplos signatários** - Suportado automaticamente
6. **PDFs grandes** - Limite de tamanho depende do plano SignWell

---

## 🎊 **Pronto para Usar!**

A integração está **100% funcional**. Basta configurar o token e começar a usar!

**Dúvidas?** Consulte `SIGNWELL-INTEGRATION.md` para detalhes técnicos.

**Boa sorte!** 🚀

