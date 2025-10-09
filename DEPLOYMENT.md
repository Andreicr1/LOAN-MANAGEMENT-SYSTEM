# 📦 Deployment Guide - Loan Management System

## Preparação para Produção

### 1. Verificação Pré-Build

Antes de gerar o instalador, verifique:

```bash
# Verificar dependências
npm list

# Verificar linting
npm run lint

# Limpar builds anteriores
rm -rf dist dist-electron release
```

---

## 🏗️ Gerando o Instalador

### Build Completo

```bash
npm run electron:build
```

**Processo:**

1. TypeScript compilation
2. Vite build (React app)
3. Electron packaging
4. NSIS installer creation

**Duração:** 3-5 minutos

**Output:**

```
release/
  └── Loan Management System Setup 1.0.0.exe  (~150MB)
```

---

## 📋 Conteúdo do Instalador

O instalador inclui:

- ✅ Electron runtime
- ✅ Chromium engine
- ✅ Node.js runtime
- ✅ React app (bundled)
- ✅ SQLite3 binary (nativo)
- ✅ Todas as dependências

**Nenhuma dependência externa necessária!**

---

## 🖥️ Instalação em Máquinas de Usuários

### Processo de Instalação

1. **Distribuir**: Copie o `.exe` para a máquina alvo
2. **Executar**: Double-click no instalador
3. **Configurar**:
   - Escolha diretório (default: `C:\Program Files\Loan Management System\`)
   - Criar atalhos (Desktop + Start Menu)
4. **Instalar**: Click "Install"
5. **Finalizar**: Launch automático (opcional)

### Primeira Execução

O sistema automaticamente:

- Cria database em `%APPDATA%\loan-management-system\`
- Inicializa schema
- Cria usuário admin padrão
- Inicia backup automático

---

## 🔐 Configuração Pós-Instalação

### Obrigatório

1. **Login inicial**: admin / admin123
2. **Trocar senha**: Obrigatório no primeiro login
3. **Configurar Settings**:
   - Credit limit
   - Interest rate
   - Lender data (WMF Corp)
   - Borrower data (Whole Max)

### Opcional

4. **Criar usuários** adicionais
5. **Configurar backup** automático (já habilitado)
6. **Importar dados** históricos (se houver)

---

## 📂 Estrutura de Arquivos em Produção

```
C:\Program Files\Loan Management System\
  ├── Loan Management System.exe  # Executável principal
  ├── resources\                  # Assets e database schema
  ├── locales\                    # i18n (inglês)
  └── ... (runtime files)

C:\Users\{usuario}\AppData\Roaming\loan-management-system\
  ├── loan-management.db          # Database principal
  ├── backups\                    # Backups diários (últimos 10)
  │   ├── backup_2025-01-01.db
  │   └── ...
  └── documents\                  # PDFs gerados
      ├── PN-2025-001_Generated.pdf
      ├── WireTransfer_PN-2025-001.pdf
      └── DN-2025-01-001.pdf
```

---

## 🔄 Atualizações

### Versioning

O sistema usa semantic versioning (package.json):

- `1.0.0` - Release inicial
- `1.1.0` - Minor features
- `2.0.0` - Breaking changes

### Deploy de Atualizações

1. Incrementar versão em `package.json`
2. Build novo instalador
3. Distribuir para usuários
4. Usuários executam novo instalador
5. Database é preservado (migração automática se necessário)

---

## 🛡️ Segurança em Produção

### Checklist de Segurança

- [x] Senhas bcrypt (nunca plain text)
- [x] Context isolation habilitado
- [x] Node integration desabilitado
- [x] SQL injection prevention
- [x] Audit trail completo
- [x] Backup automático diário

### Recomendações Adicionais

1. **Firewall**: Não requer portas abertas (app local)
2. **Antivirus**: Adicionar exceção se necessário
3. **Permissões**: Instalar como Admin (para Program Files)
4. **Backup**: Configurar backup externo do folder `AppData`

---

## 📊 Requisitos de Sistema

### Mínimo

- Windows 10 (64-bit)
- 4GB RAM
- 500MB disco
- Resolução 1024x768

### Recomendado

- Windows 11 (64-bit)
- 8GB RAM
- 1GB disco
- Resolução 1920x1080

---

## 🚨 Troubleshooting em Produção

### App não inicia

1. Verificar logs em:

   ```
   %APPDATA%\loan-management-system\logs\
   ```

2. Reinstalar aplicação

3. Verificar permissões de escrita em AppData

### Database corrompido

1. Restaurar de backup (Settings → Backup & Restore)
2. Se sem backup, deletar `.db` (cria novo, perde dados)

### Performance lenta

1. Verificar tamanho do database
2. Limpar audit logs antigos (> 1 ano)
3. Reindexar database (reiniciar app)

---

## 📞 Suporte

**Antes de contactar suporte:**

1. Verificar versão do app (Help → About)
2. Coletar logs recentes
3. Screenshot do erro
4. Passos para reproduzir

**Contact:**

- Email: <support@wmfcorp.com>
- Incluir: versão, logs, screenshots

---

## 🔧 Desinstalação

### Windows

1. Settings → Apps → Loan Management System
2. Uninstall

**Dados preservados:**

- Database e backups em `%APPDATA%` NÃO são deletados
- Para remover completamente: deletar folder `%APPDATA%\loan-management-system\`

---

## 📝 Notas de Release

### v1.0.0 (Initial Release)

**Features:**

- ✅ Complete disbursement workflow
- ✅ Promissory note generation (PDF)
- ✅ Bank reconciliation (manual import)
- ✅ Interest calculation (daily, automatic)
- ✅ Debit notes (monthly)
- ✅ Reports & analytics (aging, period, audit)
- ✅ User management (3 roles)
- ✅ Backup/restore system
- ✅ Full English interface (US format)

**Known Limitations:**

- Bank API integration not included (manual import only)
- Single borrower support (multi-borrower planned for v2.0)
- Email sending requires manual configuration

---

**Ready for Production Deployment!** 🚀

© 2025 WMF Corp. All rights reserved.
