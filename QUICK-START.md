# ⚡ Quick Start Guide

Guia rápido para rodar o sistema em menos de 5 minutos.

---

## Pré-requisitos

- **Node.js 18+** instalado ([baixar aqui](https://nodejs.org/))
- **Windows 10/11**
- Terminal (CMD ou PowerShell)

---

## 🚀 Passos

### 1. Instalar Dependências

Abra o terminal na pasta do projeto e execute:

```bash
npm install
```

⏱️ Aguarde 3-5 minutos (compila módulos nativos).

---

### 2. Rodar o Sistema

```bash
npm run electron:dev
```

Aguarde a janela do Electron abrir (15-30 segundos).

---

### 3. Fazer Login

Na tela de login, use:

- **Username**: `admin`
- **Password**: `admin123`

Você será solicitado a trocar a senha imediatamente.

---

### 4. Configurar o Sistema

1. Após login, navegue para **Settings** (sidebar esquerda)
2. Configure:
   - **Credit Limit** (ex: $50,000,000)
   - **Interest Rate** (ex: 14.50%)
   - **Lender Info**: WMF Corp, Tax ID, Address, etc.
   - **Borrower Info**: Whole Max, EIN, Address, etc.
3. Clique em **Save Changes**

---

### 5. Criar Usuários Adicionais (Opcional)

1. Navegue para **Users**
2. Clique em **New User**
3. Preencha:
   - Username
   - Password
   - Full Name
   - Role (Admin / Operator / Viewer)
4. Clique em **Create**

---

## 🎯 Pronto!

O sistema está configurado e pronto para uso.

**Próximos Passos:**
- Aguardar Sprint 2 para criar desembolsos
- Explorar o Dashboard (placeholders por enquanto)
- Testar gestão de usuários

---

## 🐛 Problemas?

### Erro "Module not found"
```bash
npm install
```

### Janela não abre
Verifique se porta 5173 está livre:
```bash
netstat -ano | findstr :5173
```

### Database locked
Feche todas as instâncias do app e reabra.

---

## 📍 Localização do Banco de Dados

```
C:\Users\{SeuUsuario}\AppData\Roaming\loan-management-system\loan-management.db
```

Para backup: copie este arquivo.

---

**Divirta-se! 🎉**

