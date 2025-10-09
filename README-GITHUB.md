# 💼 Loan Management System - WMF Corp

Sistema desktop de gestão de linha de crédito desenvolvido com **Electron**, **React**, **TypeScript** e **SQLite**.

## 📋 Descrição

Sistema completo para gerenciamento de:
- ✅ Solicitações de desembolso
- 📝 Notas promissórias
- 💰 Cálculo de juros
- 📊 Reconciliação bancária
- 📄 Notas de débito
- 📈 Relatórios financeiros
- 🔐 Autenticação e controle de acesso
- ✍️ Assinaturas eletrônicas com DocuSign

## 🚀 Tecnologias

### Frontend
- **React 18** + **TypeScript**
- **Tailwind CSS** para estilização
- **React Router** para navegação
- **Zustand** para gerenciamento de estado
- **React Hook Form** + **Zod** para validação

### Backend/Electron
- **Electron 28** para aplicativo desktop
- **Better-SQLite3** banco de dados local
- **PDFKit** para geração de PDFs
- **Bcrypt** para segurança
- **DocuSign** para assinaturas eletrônicas

## 📦 Instalação

### Pré-requisitos
- Node.js 22.x ou superior
- npm 10.x ou superior
- Python 3.13+ com setuptools
- Visual Studio Build Tools (Windows)

### Passos

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/loan-management-system.git
cd loan-management-system

# Instale as dependências
npm install

# Execute em modo desenvolvimento
npm run dev

# Compile o aplicativo
npm run build
npm run electron:build
```

## 🏗️ Estrutura do Projeto

```
loan-management-system/
├── electron/           # Código do processo principal do Electron
│   ├── main.ts        # Ponto de entrada principal
│   ├── preload.ts     # Script de preload
│   ├── database/      # Serviços de banco de dados
│   ├── services/      # Serviços de negócio
│   └── utils/         # Utilitários
├── src/               # Código React/Frontend
│   ├── components/    # Componentes reutilizáveis
│   ├── pages/         # Páginas da aplicação
│   ├── stores/        # Gerenciamento de estado
│   └── lib/           # Bibliotecas e utilitários
├── build/             # Recursos de build
└── release/           # Executáveis gerados
```

## 🔧 Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Compila o frontend para produção
- `npm run electron:build` - Gera o executável do Electron
- `npm run preview` - Visualiza o build de produção
- `npm run clean` - Limpa os diretórios de build

## 📝 Funcionalidades Principais

### Desembolsos
- Criação e aprovação de solicitações
- Upload e processamento de PDFs
- Geração automática de notas promissórias
- Integração com DocuSign

### Gestão Financeira
- Cálculo automático de juros
- Reconciliação bancária
- Geração de notas de débito
- Relatórios detalhados

### Segurança
- Autenticação de usuários
- Controle de acesso por roles
- Criptografia de senhas
- Auditoria de ações

## 🔐 Configuração

### Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto:

```env
# DocuSign (opcional)
DOCUSIGN_INTEGRATION_KEY=sua-chave
DOCUSIGN_USER_ID=seu-user-id
DOCUSIGN_ACCOUNT_ID=sua-account-id
DOCUSIGN_RSA_PRIVATE_KEY=caminho-para-chave
```

### Primeiro Acesso
- Usuário padrão: `admin`
- Senha padrão: `admin123`
- **IMPORTANTE**: Altere a senha no primeiro acesso!

## 📖 Documentação Adicional

- [BUILD-INSTRUCTIONS.md](BUILD-INSTRUCTIONS.md) - Instruções detalhadas de compilação
- [USER-MANUAL.md](USER-MANUAL.md) - Manual do usuário
- [DEPLOYMENT.md](DEPLOYMENT.md) - Guia de implantação
- [CHANGELOG.md](CHANGELOG.md) - Histórico de alterações

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é proprietário da **WMF Corp**.

## 👥 Autores

- **WMF Corp Development Team**

## 📧 Suporte

Para suporte, entre em contato através de: [seu-email@wmfcorp.com]

---

**Desenvolvido com ❤️ pela equipe WMF Corp**

