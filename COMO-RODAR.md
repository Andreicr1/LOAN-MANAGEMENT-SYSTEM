# 🚀 Como Rodar o Sistema - Guia Rápido

## ⚡ Instalação Rápida

### 1. Instalar Dependências

```bash
npm install
```

⏱️ Aguarde 3-5 minutos (compila módulos nativos para Electron).

---

### 2. Rodar em Desenvolvimento

```bash
npm run electron:dev
```

Isso irá:

- Iniciar o servidor Vite (React)
- Abrir a janela Electron
- Habilitar DevTools automático
- Criar database em `AppData\Roaming\loan-management-system\`

---

### 3. Login

**Credenciais padrão:**

- Username: `admin`
- Password: `admin123`

⚠️ Você será solicitado a trocar a senha no primeiro login.

---

### 4. Configurar Sistema

1. Vá para **Settings**
2. Configure:
   - Credit Limit (ex: $50,000,000)
   - Interest Rate (ex: 14.50%)
   - Lender Info (WMF Corp)
   - Borrower Info (Whole Max)
3. Clique em **Save Changes**

---

## 🏗️ Build para Produção

### Gerar Instalador Windows

```bash
npm run electron:build
```

**Output:**

- `release/Loan Management System Setup 1.0.0.exe`
- Instalador NSIS (Windows)
- Tamanho: ~150MB

---

## 📁 Estrutura de Arquivos Gerados

### Durante Desenvolvimento

C:\Users\{usuario}\AppData\Roaming\Electron\
  └── loan-management.db

```

### Em Produção

```

C:\Users\{usuario}\AppData\Roaming\loan-management-system\
  ├── loan-management.db          # Database
  ├── backups\                    # Backups automáticos
  └── documents\                  # PDFs gerados

```

---

## 🔧 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Vite dev server (sem Electron) |
| `npm run electron:dev` | Full app com hot reload |
| `npm run build` | Build do Vite apenas |
| `npm run electron:build` | Build completo + instalador |
| `npm run lint` | Verificar erros ESLint |

---

## 🐛 Solução de Problemas

### "Module not found"

```bash
npm install --force
```

### Porta 5173 ocupada

```bash
# Windows CMD
netstat -ano | findstr :5173
taskkill /PID {numero} /F
```

### Database locked

- Feche todas as janelas do app
- Reinicie

### Electron não abre

- Verifique console do terminal
- Tente deletar `node_modules` e reinstalar

---

## ✅ Checklist Antes de Rodar

- [ ] Node.js 18+ instalado
- [ ] npm funcionando
- [ ] Porta 5173 disponível
- [ ] Windows 10/11

---

## 📚 Próximos Passos

Após rodar o sistema:

1. **Login** com credenciais padrão
2. **Trocar senha** obrigatório
3. **Configurar Settings** (limite, taxas)
4. **Criar usuários** adicionais (opcional)
5. **Criar primeiro disbursement**!

---

## 🎯 Features Disponíveis

✅ **Completo e Funcional:**

- Disbursements (criar, aprovar, listar)
- Promissory Notes (geração automática, PDFs)
- Bank Reconciliation (import, matching)
- Debit Notes (geração mensal)
- Reports (Aging, Period, Audit)
- Dashboard com KPIs em tempo real
- User Management (CRUD, roles)
- Settings (config completa)
- Backup/Restore automático

---

**Sistema 100% pronto para uso!** 🎉
