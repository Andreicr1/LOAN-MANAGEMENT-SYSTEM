# 🏗️ Build Instructions - Loan Management System

## Pré-requisitos para Build

### Software Necessário

1. **Node.js** 18.x ou superior
2. **npm** 9.x ou superior  
3. **Windows SDK** (para builds nativos)
4. **Visual Studio Build Tools** (para better-sqlite3)

### Verificação

```bash
node --version  # v18.0.0+
npm --version   # 9.0.0+
```

---

## 📦 Processo de Build

### 1. Preparação

```bash
# Limpar builds anteriores
npm run clean
# ou manualmente:
rm -rf dist dist-electron release node_modules/.vite

# Instalar/atualizar dependências
npm install
```

### 2. Build de Desenvolvimento

```bash
# Build apenas do Vite (React app)
npm run build

# Verificar output
ls dist/
```

### 3. Build de Produção (Electron)

```bash
# Build completo + packaging
npm run electron:build
```

**O que acontece:**

1. TypeScript compilation (`tsc`)
2. Vite build (React → `dist/`)
3. Electron build (main + preload → `dist-electron/`)
4. electron-builder packaging
5. NSIS installer creation

**Duração:** 3-5 minutos (primeira vez) | 1-2 minutos (builds subsequentes)

---

## 📂 Output do Build

```
release/
  ├── Loan Management System Setup 1.0.0.exe   # Instalador NSIS
  ├── win-unpacked/                            # App desempacotado (para debug)
  │   ├── Loan Management System.exe
  │   ├── resources/
  │   └── ...
  └── builder-effective-config.yaml            # Config usado
```

---

## 🔍 Verificação do Build

### Testar Instalador

1. Rodar o `.exe` em máquina limpa (VM recomendada)
2. Seguir wizard de instalação
3. Verificar:
   - App inicia corretamente
   - Database é criado
   - Login funciona
   - Todos os módulos acessíveis

### Testar App Desempacotado

```bash
# Rodar diretamente (sem instalar)
cd "release/win-unpacked"
"Loan Management System.exe"
```

---

## ⚙️ Configuração de Build

### electron-builder.yml

```yaml
appId: com.wmfcorp.loanmanagement
productName: Loan Management System
copyright: Copyright © 2025 WMF Corp

win:
  target: nsis
  icon: build/icon.ico

nsis:
  oneClick: false                      # Wizard instalador
  perMachine: true                     # Instalar para todos os usuários
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: always
```

### Customizar Build

Edite `electron-builder.yml` ou `package.json` seção `"build"`.

---

## 🐛 Problemas Comuns de Build

### 1. "better-sqlite3" falha

**Solução:**

```bash
npm install --force
npm rebuild better-sqlite3 --update-binary
```

### 2. "Icon file not found"

**Solução:**

```bash
# Criar ícone temporário ou:
mkdir build
# Adicionar icon.ico em build/
```

### 3. "Out of memory"

**Solução:**

```bash
# Aumentar heap do Node
export NODE_OPTIONS="--max-old-space-size=4096"
npm run electron:build
```

### 4. Typescript errors

**Solução:**

```bash
# Build ignorando type errors (não recomendado)
npm run build -- --mode production --force
```

---

## 📝 Checklist Pré-Release

Antes de distribuir o instalador:

- [ ] Versão atualizada em `package.json`
- [ ] Changelog atualizado
- [ ] Build limpo (`npm run clean` antes)
- [ ] Testado em máquina limpa
- [ ] Todos os módulos funcionando
- [ ] Database migrations testadas
- [ ] Backup/restore testado
- [ ] PDFs gerando corretamente
- [ ] Sem console.logs no código
- [ ] ESLint sem erros críticos

---

## 🚀 Distribuição

### Opções de Distribuição

#### 1. Download Direto

- Upload `.exe` para servidor interno
- Usuários baixam e instalam

#### 2. Network Share

- Colocar em pasta compartilhada
- Usuários executam da rede

#### 3. Email

- Enviar link de download
- Incluir manual do usuário

### Auto-Update (Futuro)

Para implementar auto-update:

```bash
npm install electron-updater
```

Configurar em `electron/main.ts`:

```typescript
import { autoUpdater } from 'electron-updater'
autoUpdater.checkForUpdatesAndNotify()
```

---

## 📊 Tamanho do Build

| Componente | Tamanho |
|------------|---------|
| Electron Runtime | ~90MB |
| React App (bundled) | ~5MB |
| SQLite Binary | ~2MB |
| Node Modules | ~40MB |
| Assets & PDFs | ~3MB |
| **Total** | **~150MB** |

---

## 🔄 Continuous Integration (Opcional)

### GitHub Actions Example

```yaml
name: Build Windows Installer

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: windows-latest
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm install
      - run: npm run electron:build
      
      - uses: actions/upload-artifact@v3
        with:
          name: installer
          path: release/*.exe
```

---

## ✅ Teste Final

Após build:

```bash
# 1. Verificar integridade
sha256sum "release/Loan Management System Setup 1.0.0.exe"

# 2. Testar instalação em VM
# - Windows 10 clean install
# - Sem Node.js instalado
# - Sem dependências

# 3. Checklist funcional
# - Login funciona
# - Criar disbursement
# - Gerar PN
# - Conciliação bancária
# - Gerar relatórios
# - Backup/restore
```

---

## 📄 Documentação para Distribuição

Incluir com o instalador:

1. **USER-MANUAL.md** (ou PDF)
2. **QUICK-START.md**
3. **Release Notes**
4. **System Requirements**

---

## 🎯 Próximos Passos

Após distribuição:

1. **Monitorar** uso inicial
2. **Coletar feedback** dos usuários
3. **Iterar** baseado em feedback
4. **Planejar** v1.1.0 features

---

**Build configurado e pronto para produção!** 🚀

© 2025 WMF Corp
