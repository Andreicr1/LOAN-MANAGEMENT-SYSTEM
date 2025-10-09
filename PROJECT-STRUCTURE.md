# 📁 Project Structure - Loan Management System

## Visão Geral da Arquitetura

```
loan-management-system/
│
├── 📦 electron/                    # Electron Main Process (Backend)
│   ├── main.ts                     # Entry point, IPC handlers
│   ├── preload.ts                  # Secure bridge (contextBridge)
│   │
│   ├── database/
│   │   ├── schema.sql              # SQLite schema completo
│   │   └── database.service.ts     # Database wrapper + audit
│   │
│   ├── services/
│   │   ├── auth.service.ts         # Login, logout, change password
│   │   ├── user.service.ts         # CRUD de usuários
│   │   └── config.service.ts       # Configurações do sistema
│   │
│   └── utils/
│       └── hash-password.ts        # Utility para gerar hashes bcrypt
│
├── 🎨 src/                         # React Renderer Process (Frontend)
│   ├── main.tsx                    # React entry point
│   ├── App.tsx                     # Router + Protected routes
│   ├── index.css                   # Global styles + TailwindCSS
│   │
│   ├── components/
│   │   ├── ui/                     # Design System Components
│   │   │   ├── Button.tsx          # Primary, Secondary, Danger, Ghost
│   │   │   ├── Card.tsx            # Com Header, Title, Content
│   │   │   ├── Input.tsx           # Com label, error, validation
│   │   │   └── Badge.tsx           # Status badges (semântica)
│   │   │
│   │   └── layout/                 # Layout Components
│   │       ├── MainLayout.tsx      # Container principal
│   │       └── Sidebar.tsx         # Navegação verde escuro
│   │
│   ├── pages/
│   │   ├── Login.tsx               # Tela de autenticação
│   │   ├── Dashboard.tsx           # Home com KPIs (placeholder)
│   │   ├── Users.tsx               # Gestão de usuários (CRUD)
│   │   └── Settings.tsx            # Configurações do sistema
│   │
│   ├── stores/
│   │   └── authStore.ts            # Zustand store (auth state)
│   │
│   ├── lib/
│   │   └── utils.ts                # Utilities (formatMoney, formatDate)
│   │
│   └── types/
│       └── electron.d.ts           # TypeScript definitions para IPC
│
├── 📄 Configuration Files
│   ├── package.json                # Dependencies + scripts
│   ├── tsconfig.json               # TypeScript config
│   ├── tsconfig.node.json          # TypeScript config (Node/Vite)
│   ├── vite.config.ts              # Vite + Electron plugins
│   ├── tailwind.config.js          # Design system colors
│   ├── postcss.config.js           # PostCSS (autoprefixer)
│   ├── .eslintrc.cjs               # ESLint rules
│   ├── .gitignore                  # Git ignore patterns
│   └── .npmrc                      # NPM config (Electron rebuild)
│
├── 📚 Documentation
│   ├── README.md                   # Technical overview
│   ├── INSTALLATION.md             # Setup guide detalhado
│   ├── QUICK-START.md              # Guia rápido (5 min)
│   ├── SPRINT-1-SUMMARY.md         # Sprint 1 deliverables
│   └── PROJECT-STRUCTURE.md        # Este arquivo
│
├── 🎯 Rules & Specifications
│   └── rules/
│       └── loan-system-rules.mdc   # Especificações completas
│
└── index.html                      # HTML entry point

```

---

## Detalhamento dos Módulos

### 🔧 Electron Main Process

**Responsabilidades:**
- Gerenciar janela do app
- Controlar acesso ao filesystem
- Gerenciar banco SQLite
- IPC handlers (comunicação com frontend)
- Segurança (context isolation)

**Serviços Implementados:**
1. **AuthService**: Login, logout, troca de senha
2. **UserService**: CRUD de usuários + reset password
3. **ConfigService**: Get/Update configurações
4. **DatabaseService**: Wrapper SQLite + audit log

---

### 🎨 React Renderer Process

**Responsabilidades:**
- Interface do usuário
- Gerenciamento de estado (Zustand)
- Routing (React Router)
- Forms + Validation (React Hook Form + Zod)

**Páginas Implementadas:**
1. **Login**: Autenticação com validação
2. **Dashboard**: KPIs e overview (placeholder para Sprint 4)
3. **Users**: CRUD completo de usuários
4. **Settings**: Configurações editáveis

**Componentes UI (Design System):**
- Button (4 variants)
- Card (com sub-componentes)
- Input (com label + error)
- Badge (status semânticos)

---

### 🗄️ Database Schema

**8 Tabelas Principais:**

| Tabela | Propósito | Status |
|--------|-----------|--------|
| `config` | Configurações singleton | ✅ Implementado |
| `users` | Usuários com roles | ✅ Implementado |
| `audit_log` | Trail de ações | ✅ Implementado |
| `disbursements` | Requisições de desembolso | ✅ Schema pronto |
| `promissory_notes` | Notas promissórias | ✅ Schema pronto |
| `bank_transactions` | Conciliação bancária | ✅ Schema pronto |
| `interest_calculations` | Cache de juros | ✅ Schema pronto |
| `debit_notes` | Notas de débito | ✅ Schema pronto |

---

## Fluxo de Dados

```
┌─────────────────────────────────────────────────┐
│           React Renderer (Frontend)             │
│                                                 │
│  ┌─────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Pages  │───▶│  Stores  │◀───│    UI    │  │
│  └─────────┘    └──────────┘    │Components│  │
│       │              │           └──────────┘  │
└───────┼──────────────┼─────────────────────────┘
        │              │
        │  IPC Bridge (preload.ts)
        │              │
┌───────▼──────────────▼─────────────────────────┐
│          Electron Main Process                 │
│                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│  │   IPC    │───▶│ Services │───▶│ Database │ │
│  │ Handlers │    │(Auth,User│    │ SQLite   │ │
│  └──────────┘    │,Config)  │    └──────────┘ │
│                  └──────────┘                  │
└─────────────────────────────────────────────────┘
```

---

## Convenções de Código

### Naming Conventions

**Backend (Electron):**
- Services: `*.service.ts` (PascalCase classes)
- Handlers: `ipcMain.handle('namespace:action')`

**Frontend (React):**
- Components: PascalCase (`Button.tsx`, `Card.tsx`)
- Pages: PascalCase (`Login.tsx`, `Dashboard.tsx`)
- Stores: camelCase + "Store" (`authStore.ts`)
- Utils: camelCase (`formatMoney`, `formatDate`)

### File Organization

```
Colocation Principle:
- Componentes agrupados por feature/tipo
- Pages separadas em arquivos individuais
- Services agrupados por domínio
```

---

## Design System - Referência Rápida

### Cores

```typescript
const colors = {
  'green-primary': '#1dd55c',  // CTAs, highlights
  'green-dark': '#0a3d11',     // Sidebar, headers
  'green-light': '#82d293',    // Hover states
  'green-subtle': '#edf3ed',   // Backgrounds
  'text-primary': '#040504',   // Main text
  'text-secondary': '#4b504b', // Secondary text
}
```

### Typography

```typescript
const fonts = {
  sans: ['Inter', 'Segoe UI', 'sans-serif'],
  mono: ['Consolas', 'Courier New', 'monospace'],
}

const sizes = {
  h1: '2rem (32px)',    // Page titles
  h2: '1.5rem (24px)',  // Section headers
  h3: '1.25rem (20px)', // Sub-sections
  body: '0.875rem (14px)',
  small: '0.75rem (12px)',
}
```

---

## Segurança - Checklist

- ✅ Passwords: bcrypt (10 rounds + salt)
- ✅ SQL Injection: Parameterized queries
- ✅ Context Isolation: Enabled
- ✅ Node Integration: Disabled
- ✅ Audit Trail: All sensitive actions logged
- ✅ Role-based Access: Admin/Operator/Viewer
- ✅ Protected Routes: Auth required

---

## Build & Deploy

### Development

```bash
npm run electron:dev
```

**O que acontece:**
1. Vite compila React (hot reload)
2. Electron-vite compila main/preload
3. Janela Electron abre com DevTools
4. Database criado em `AppData/Roaming`

---

### Production Build

```bash
npm run electron:build
```

**Output:**
- `release/Loan Management System Setup 1.0.0.exe`
- Instalador NSIS (Windows)
- Tamanho: ~150MB (inclui Node + Chromium)

**O que é empacotado:**
- Electron runtime
- React app compilado
- SQLite binary
- Node modules necessários

---

## Database Location

**Development:**
```
C:\Users\{user}\AppData\Roaming\Electron\loan-management.db
```

**Production:**
```
C:\Users\{user}\AppData\Roaming\loan-management-system\loan-management.db
```

**Backup:**
Copie o arquivo `.db` para local seguro.

---

## Próximas Expansões

### Sprint 2 - Disbursements (Planejado)

**Novos Arquivos:**
```
src/pages/
  ├── Disbursements.tsx           # Lista de requisições
  ├── DisbursementDetail.tsx      # Detalhes + workflow
  └── CreateDisbursement.tsx      # Formulário de criação

electron/services/
  ├── disbursement.service.ts     # CRUD disbursements
  ├── promissory-note.service.ts  # Gerar PNs
  └── pdf.service.ts              # Geração de PDFs

src/lib/
  └── pdf-generator.ts            # jsPDF wrapper
```

---

## Comandos Úteis

```bash
# Development
npm run dev              # Vite only (sem Electron)
npm run electron:dev     # Full app com hot reload

# Build
npm run build            # Vite build
npm run electron:build   # Full Electron build

# Linting
npm run lint             # ESLint check

# Database
# (Abrir com DB Browser for SQLite)
```

---

## Troubleshooting

### "Cannot find module 'better-sqlite3'"
```bash
npm install --force
```

### Electron não abre
Verificar se porta 5173 está livre:
```bash
netstat -ano | findstr :5173
```

### Database locked
Fechar todas as instâncias e reiniciar.

---

## Métricas do Projeto

**Sprint 1 - Atual:**
- **Total Lines of Code**: ~3,500
- **Components**: 8
- **Pages**: 4
- **Services**: 4
- **Database Tables**: 9
- **IPC Handlers**: 12

---

**Estrutura organizada e pronta para crescer! 🚀**

