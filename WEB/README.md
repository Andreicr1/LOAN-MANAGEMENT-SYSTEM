# Guia de Deploy Web com AWS Amplify

Este diretório contém a implementação web do Loan Management System baseada em AWS Amplify. O objetivo é reaproveitar o frontend React existente, substituir a camada Electron por integrações nativas com Amplify (Auth, Data, Functions, Storage) e preparar o pipeline de deploy.

## Estrutura

- `bootstrap/`: inicialização do Amplify e polyfill de `window.electronAPI`.
- `adapters/`: implementação da API que emula o contrato Electron no navegador.
- `api/graphql/`: schema, operações e tipos GraphQL usados pelo frontend.
- `functions/`: código das Lambdas publicadas pelo Amplify (uma pasta por função).
- `storage/`: definição centralizada dos buckets S3.
- `tools/`: utilitários (ex.: migração de dados do SQLite).
- `amplify.yml`: buildspec usado pelo Amplify Hosting.

## Fluxo de desenvolvimento

1. Instale dependências na raiz (`npm install`).
2. Configure o CLI do Amplify (`npm install -g @aws-amplify/cli`, `amplify pull`).
3. Exporte variáveis de ambiente necessárias (`AMPLIFY_API_URL`, `AMPLIFY_REGION`, etc.).
4. Rode `npm run dev:web` (ver `package.json` na raiz) para subir o Vite apontando para `src/main.web.tsx`.

## Deploy no Amplify

1. Conecte o repositório ao Amplify Hosting.
2. Defina a raiz do app como `WEB/` e use `WEB/amplify.yml`.
3. Configure as variáveis de ambiente por ambiente (dev/prod).
4. Após o build, valide o smoke-test (`admin`, `manager`).

## Migração de dados

O script `tools/migrate-sqlite-to-amplify.ts` importa dados do banco SQLite utilizado no Electron para as tabelas do Amplify Data (DynamoDB) e provisiona usuários no Cognito.

## Próximos passos

- Implementar o conteúdo das funções Lambda (`functions/*`).
- Ajustar regras IAM conforme necessidade de cada função.
- Automatizar agendamentos via EventBridge (ver `amplify/backend.ts`).
- Completar testes unitários e de integração descritos no plano.


