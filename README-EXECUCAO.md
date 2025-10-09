# ⚡ COMANDOS PARA EXECUTAR O SISTEMA

## 🚀 Passo-a-Passo (Copie e Cole)

### 1️⃣ Instalar Dependências (Apenas uma vez)

```bash
npm install
```

**Aguarde**: 3-5 minutos (compila módulos nativos)

---

### 2️⃣ Rodar o Sistema

```bash
npm run electron:dev
```

**Aguarde**: 15-30 segundos para janela abrir

---

### 3️⃣ Login Inicial

**Na tela de login:**
- Username: `admin`
- Password: `admin123`

**Você será forçado a trocar a senha imediatamente.**

---

### 4️⃣ Configurar (Primeira Vez)

1. Clique em **Settings** (sidebar esquerda, ícone de engrenagem)
2. Preencha:
   - Total Credit Limit: `50000000`
   - Annual Interest Rate: `14.50`
   - Lender Name: `WMF Corp`
   - Lender Tax ID: (seu tax ID)
   - Lender Address: (endereço)
   - Lender Jurisdiction: `Cayman Islands`
   - Borrower Name: `Whole Max`
   - Borrower Tax ID: (EIN)
   - Borrower Address: (endereço)
   - Borrower Jurisdiction: `Florida, USA`
3. Clique em **Save Changes**

---

### 5️⃣ Testar o Sistema

#### Criar Primeiro Disbursement

1. **Dashboard** → Clique em "New Disbursement"
2. Preencha:
   - Amount: `1000000` (1 milhão)
   - Request Date: (hoje)
   - Description: `Test disbursement`
   - Assets: `2024 Toyota Camry - VIN: 12345`
3. Clique em **Create Request**

#### Aprovar Disbursement (Como Admin)

1. Vá para **Disbursements**
2. Clique no ✓ (checkmark verde)
3. Confirme aprovação
4. Sistema gera Promissory Note automaticamente!

#### Ver Promissory Note

1. Clique na requisição que você criou
2. Veja os detalhes da PN gerada
3. Clique em **Generate Wire Transfer Order** para baixar PDF

#### Reconciliação Bancária

1. Vá para **Bank Reconciliation**
2. Clique em **Import Transaction**
3. Preencha:
   - Date: (mesma data do disbursement)
   - Amount: `1000000`
   - Description: `Wire transfer`
4. Clique em **Import**
5. Clique no ícone de 🔗 (link) para fazer matching
6. Sistema sugere a PN criada
7. Clique em **Match**

#### Gerar Debit Note

1. Vá para **Debit Notes**
2. Clique em **Generate Debit Note**
3. Selecione período (mês atual)
4. Due date: (10 dias no futuro)
5. Clique em **Generate**
6. Sistema calcula juros automaticamente!

#### Ver Reports

1. Vá para **Reports**
2. Clique na tab **Aging Report**
3. Veja breakdown por faixa de atraso
4. Clique em **Export to Excel** para baixar

---

## 🏗️ Build para Produção

### Gerar Instalador

```bash
npm run electron:build
```

**Output:**
```
release/Loan Management System Setup 1.0.0.exe
```

**Tamanho**: ~150MB (inclui tudo)

---

## 📊 O Sistema Possui

### 11 Páginas Funcionais
1. ✅ Login
2. ✅ Dashboard (KPIs em tempo real)
3. ✅ Disbursements (lista + filtros)
4. ✅ Create Disbursement (formulário)
5. ✅ Disbursement Detail (workflow completo)
6. ✅ Promissory Notes (lista + settlement)
7. ✅ Bank Reconciliation (import + matching)
8. ✅ Debit Notes (geração mensal)
9. ✅ Reports (3 tabs: Aging, Period, Audit)
10. ✅ Users (CRUD completo)
11. ✅ Settings (config + backup/restore)

### 11 Serviços Backend
1. ✅ AuthService
2. ✅ UserService
3. ✅ ConfigService
4. ✅ DisbursementService
5. ✅ PromissoryNoteService
6. ✅ PDFService
7. ✅ InterestService
8. ✅ BankReconciliationService
9. ✅ DebitNoteService
10. ✅ ReportsService
11. ✅ BackupService

### 9 Tabelas de Banco
1. ✅ config (singleton)
2. ✅ users
3. ✅ audit_log
4. ✅ disbursements
5. ✅ promissory_notes
6. ✅ bank_transactions
7. ✅ interest_calculations
8. ✅ debit_notes
9. ✅ debit_note_items

---

## 🎯 Tudo Funciona!

**Sistema testado e validado:**
- ✅ Login e autenticação
- ✅ Criação de disbursements
- ✅ Aprovação e geração de PNs
- ✅ PDFs gerados corretamente
- ✅ Cálculo de juros preciso
- ✅ Reconciliação bancária
- ✅ Debit notes mensais
- ✅ Relatórios e exports
- ✅ Backup e restore
- ✅ Gestão de usuários

---

## 💡 Dicas

### Atalhos de Teclado
- **Ctrl + Shift + I**: DevTools (desenvolvimento)
- **F5**: Reload (desenvolvimento)
- **Esc**: Fechar modals

### Comandos Úteis

```bash
# Ver logs do Electron
npm run electron:dev
# (logs aparecem no terminal)

# Build sem cache
rm -rf dist dist-electron
npm run electron:build

# Reinstalar dependências
rm -rf node_modules
npm install
```

---

## 📞 Suporte

**Se algo não funcionar:**

1. Verifique se `npm install` foi executado
2. Verifique se porta 5173 está livre
3. Veja logs no terminal
4. Consulte INSTALLATION.md

**Para builds:**
- Consulte BUILD-INSTRUCTIONS.md

**Para deployment:**
- Consulte DEPLOYMENT.md

---

**SISTEMA 100% PRONTO PARA USO!** 🎉

Execute agora:
```bash
npm install
npm run electron:dev
```

**Em menos de 5 minutos você terá o sistema rodando!**

