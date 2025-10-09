# 🔧 Guia Completo - Reinstalação Node.js e Deployment

## 📋 **PASSO A PASSO COMPLETO**

---

## **PARTE 1: Desinstalar Node.js Atual**

### **1. Desinstalar via Painel de Controle:**
1. Pressione **Windows + R**
2. Digite: `appwiz.cpl` e pressione Enter
3. Procure por **Node.js**
4. Clique com botão direito → **Desinstalar**
5. Confirme e aguarde

### **2. Limpar Pastas Residuais:**

Abra PowerShell como Administrador e execute:

```powershell
# Limpar cache npm global
Remove-Item -Recurse -Force "$env:APPDATA\npm" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:APPDATA\npm-cache" -ErrorAction SilentlyContinue

# Limpar node_modules global (se existir)
Remove-Item -Recurse -Force "$env:ProgramData\nvm" -ErrorAction SilentlyContinue

# Limpar configurações
Remove-Item "$env:USERPROFILE\.npmrc" -ErrorAction SilentlyContinue
```

### **3. Reiniciar o Computador:**
- Reinicie para garantir que todos os processos foram encerrados

---

## **PARTE 2: Instalar Node.js Limpo**

### **1. Baixar Node.js 22.x LTS:**
1. Acesse: https://nodejs.org/
2. Baixe a versão **22.x LTS** (recomendado)
3. Ou baixe diretamente: https://nodejs.org/dist/v22.12.0/node-v22.12.0-x64.msi

### **2. Instalar:**
1. Execute o instalador `.msi` baixado
2. **Importante:** Marque a opção **"Automatically install the necessary tools"**
3. Siga o assistente (Next, Next, Install)
4. Aguarde a instalação completa

### **3. Verificar Instalação:**

Abra um **NOVO** terminal PowerShell e execute:

```bash
node --version
# Deve mostrar: v22.12.0 (ou similar)

npm --version  
# Deve mostrar: 10.x.x (ou similar)
```

---

## **PARTE 3: Preparar Projeto**

### **1. Navegar para o Projeto:**

```bash
cd C:\Users\andre\loan-management-system
```

### **2. Limpar Completamente o Projeto:**

```bash
# Remover node_modules e locks
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue
Remove-Item yarn.lock -ErrorAction SilentlyContinue

# Limpar builds antigos
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force dist-electron -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force release -ErrorAction SilentlyContinue
```

### **3. Limpar Cache npm:**

```bash
npm cache clean --force
```

---

## **PARTE 4: Instalar Dependências**

### **1. Instalar com npm:**

```bash
npm install
```

Aguarde completar (pode levar 2-5 minutos).

### **2. Verificar se Instalou Corretamente:**

```bash
# Verificar TypeScript
npm list typescript

# Verificar Vite
npm list vite

# Verificar Electron
npm list electron
```

Todos devem mostrar a versão instalada (não vazio).

---

## **PARTE 5: Compilar e Gerar Executável**

### **1. Compilar Backend (Electron):**

```bash
npm run electron:compile
```

Deve gerar arquivos em `dist-electron/`.

### **2. Compilar Frontend (React):**

```bash
npm run build
```

Deve gerar arquivos em `dist/`.

### **3. Gerar Executável Windows:**

```bash
npm run electron:build
```

Ou diretamente:

```bash
npx electron-builder --win portable
```

### **4. Aguardar Build:**
- Pode levar 5-10 minutos
- Vai baixar Electron binários
- Vai compilar e empacotar tudo

---

## **PARTE 6: Resultado Final**

O executável estará em:
```
release\Loan Management System Portable.exe
```

Ou:
```
release\win-unpacked\Loan Management System.exe
```

---

## ⚡ **ATALHO - Se Reinstalação der Certo:**

Depois de reinstalar Node.js e limpar tudo:

```bash
cd C:\Users\andre\loan-management-system
npm install
npm run electron:compile
npm run build
npm run electron:build
```

Pronto! 🎉

---

## 🐛 **Se Ainda Der Erro:**

### **Alternativa 1: Usar Yarn ao invés de npm**

```bash
# Instalar Yarn globalmente
npm install -g yarn

# Limpar tudo
yarn cache clean
Remove-Item -Recurse node_modules
Remove-Item yarn.lock

# Instalar
yarn install

# Compilar
yarn electron:compile

# Build
yarn build

# Gerar executável
yarn electron-builder --win portable
```

### **Alternativa 2: Usar pnpm**

```bash
# Instalar pnpm
npm install -g pnpm

# Usar pnpm
pnpm install
pnpm electron:compile
pnpm build
pnpm electron-builder --win portable
```

---

## 📞 **Checklist Final:**

Antes de Tentar:
- [ ] Node.js desinstalado
- [ ] Pastas residuais removidas
- [ ] Computador reiniciado
- [ ] Node.js 22.x instalado
- [ ] `node --version` funcionando
- [ ] `npm --version` funcionando

Depois de Instalar Node:
- [ ] `npm install` sem erros
- [ ] `npm list typescript` mostra versão
- [ ] `npm run electron:compile` compila sem erros
- [ ] `npm run build` compila frontend
- [ ] `npm run electron:build` gera executável

---

## 🎯 **Quando Estiver Pronto:**

**Depois de reinstalar Node.js**, volte para o modo **agent** e me avise que está pronto. Eu vou:

1. Executar todos os comandos de build
2. Compilar todo o código
3. Gerar o executável portable
4. Testar o aplicativo

---

## ⏱️ **Tempo Estimado:**
- Desinstalar + Limpar: 5 minutos
- Baixar + Instalar Node.js: 5 minutos  
- Reinstalar dependências: 5 minutos
- Compilar + Build: 10 minutos
- **Total: ~25 minutos**

---

**🚀 Boa sorte! Quando terminar a reinstalação, me avise que continuo o deployment! 💪**

