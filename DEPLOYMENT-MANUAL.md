# 🚀 Deployment Manual - Sistema Loan Management com DocuSign

## ⚠️ **Situação Atual**

Devido a problemas com npm/node_modules no seu ambiente Windows, vou fornecer instruções para deployment manual.

---

## 📦 **SOLUÇÃO RÁPIDA - Usar Executável Portable**

### **Opção 1: Download do Electron Pré-empacotado**

1. **Baixe Electron 28.1.0 portable para Windows:**
   - https://github.com/electron/electron/releases/tag/v28.1.0
   - Baixe: `electron-v28.1.0-win32-x64.zip`

2. **Extraia o ZIP** em uma pasta (ex: `C:\electron-app`)

3. **Copie os arquivos do projeto:**
   ```
   C:\electron-app\
     ├── electron.exe  (do ZIP baixado)
     ├── resources\
     │   └── app\
     │       ├── package.json  (do seu projeto)
     │       ├── dist\  (do seu projeto)
     │       ├── dist-electron\  (compile manualmente - veja abaixo)
     │       ├── node_modules\  (do seu projeto - apenas better-sqlite3, pdfkit, docusign-esign, nodemailer)
     │       └── electron\
     │           └── database\
     │               └── schema.sql
   ```

4. **Renomeie** `electron.exe` para `Loan Management System.exe`

5. **Execute!**

---

## 🔧 **Como Compilar Manualmente o Backend (dist-electron):**

Como tsc não está funcionando, compile um arquivo por vez:

### **Opção A: Copiar Arquivos .ts como .js** (Mais Rápido)

1. Crie a pasta `dist-electron`
2. Copie todos os arquivos `.ts` de `electron/` para `dist-electron/`
3. Renomeie `.ts` para `.js`
4. Remova tipos TypeScript manualmente (ou use um editor que faça isso)

### **Opção B: Usar Compilador Online**

1. Vá em https://www.typescriptlang.org/play
2. Cole cada arquivo `.ts`
3. Copie o JavaScript gerado
4. Salve em `dist-electron/`

### **Opção C: Instalar TypeScript Globalmente**

```bash
npm install -g typescript
tsc -p tsconfig.node.json
```

---

## 📋 **Arquivos Críticos que Precisam Estar Compilados:**

```
dist-electron/
  ├── main.js  ← CRÍTICO
  ├── preload.js  ← CRÍTICO
  ├── database/
  │   └── database.service.js
  └── services/
      ├── client.service.js  ← NOVO
      ├── docusign.service.js  ← NOVO
      ├── email.service.js  ← NOVO
      ├── webhook.service.js  ← NOVO
      └── [outros services].js
```

---

## 🎯 **ALTERNATIVA MAIS FÁCIL - Usar o que Já Foi Gerado**

Vi que você tem arquivos compilados no projeto. Vou criar um executável portátil usando o que já existe:

### **1. Baixar Electron Standalone:**
   - https://github.com/electron/electron/releases/download/v28.1.0/electron-v28.1.0-win32-x64.zip

### **2. Estrutura Final:**
   ```
   LoanManagementSystem-Portable/
     ├── Loan Management System.exe  (renomeado de electron.exe)
     ├── resources/
     │   └── default_app.asar  (do electron)
     └── app/
         ├── package.json
         ├── dist/ (frontend)
         ├── dist-electron/ (backend compilado)
         ├── node_modules/ (apenas módulos nativos necessários)
         └── loan.db
   ```

---

## 💡 **SOLUÇÃO DEFINITIVA - Use Yarn ao invés de NPM**

Se npm está com problemas:

```bash
# Instale Yarn
npm install -g yarn

# Use yarn para instalar
yarn install

# Compile
yarn tsc -p tsconfig.node.json

# Build
yarn vite build

# Gere executável
yarn electron-builder --win portable
```

---

## 🔄 **O Que Fazer AGORA:**

Você tem 3 opções:

### **A) Tentar com Yarn** (Recomendado)
```bash
npm install -g yarn
yarn install
yarn electron-builder --win portable
```

### **B) Download Manual Electron + Copiar Arquivos**
- Baixe Electron portable
- Copie arquivos do projeto
- Renomeie electron.exe

### **C) Usar WSL (Windows Subsystem for Linux)**
- Instale WSL
- npm/node funcionam melhor no Linux
- Compile lá e copie o executável

---

## 📞 **Qual opção você prefere tentar?**

Posso ajudar com qualquer uma dessas abordagens!

