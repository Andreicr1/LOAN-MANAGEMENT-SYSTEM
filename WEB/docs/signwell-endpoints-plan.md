# Plano de Endpoints REST para SignWell

## Objetivo

Disponibilizar as operações críticas do fluxo de assinatura eletrônica (criar rascunho, gerar URL embedded, enviar documento e sincronizar status) através de funções Lambda expostas via AWS Amplify HTTP API (`web-api`).

## Recursos existentes

- Buckets S3 definidos em `amplify/backend.ts` (`pdfDocuments`, `uploads`) para armazenar PDFs.
- Funções base criadas em `WEB/functions/signwell-*` (create, embedded-url, update-send, webhook), ainda sem wiring completo.
- API `web-api` já registra rotas básicas para SignWell (`/signwell/create`, `/signwell/embedded-url`, `/signwell/update-send`).
- Front-end atualizado para exibir mensagem de indisponibilidade quando os endpoints não estiverem prontos.

## Próximos passos técnicos

1. **Parâmetros de ambiente**
   - Adicionar a `amplify/backend.ts` (ou `.env`) as variáveis consumidas pelas Lambdas:
     - `SIGNWELL_API_KEY` (já previsto).
     - `SIGNWELL_TEST_MODE` (boolean como string).
     - `SIGNWELL_WEBHOOK_SECRET` para validação de webhook.
     - `PDF_BUCKET`, `UPLOAD_BUCKET` (já utilizados pelas funções).
   - Garantir configuração via Amplify console (Hosting + Funcion, Secrets Manager).

2. **Função `signwell-create`**
   - Entrada esperada: `{ name, pdfKey, recipients, reminderDays?, subject?, message? }`.
   - A função deve:
     1. Ler o PDF no S3 (`pdfKey`).
     2. Montar payload para `POST https://www.signwell.com/api/v1/documents` com `files[].file_base64` e `recipients`.
     3. Opcional: aceitar `cc`, `allow_decline`, `allow_reassign` etc, conforme necessidades futuras.
     4. Retornar `{ success: true, documentId, status, rawResponse }`.
   - Tratar erros com `response.json()` detalhando mensagens da SignWell (status >=400).

3. **Função `signwell-embedded-url`**
   - Entrada: `{ documentId }`.
   - Chama `GET https://www.signwell.com/api/v1/documents/{id}/embedded_requesting_url`.
   - Retorno: `{ success: true, url, expiresAt }`.
   - Erros: mapear status 404/401 e retornar mensagens adequadas.

4. **Função `signwell-update-send`**
   - Entrada: `{ documentId, sendOptions? }` (por exemplo, `send_email`, `send_sms`, `reminder_days`!).
   - Chama `POST https://www.signwell.com/api/v1/documents/{id}/send`.
   - Retorno: `{ success: true, status }` ou erro informativo.

5. **Função `signwell-webhook`**
   - Recebe eventos `document.completed`, `document.declined`, etc.
   - Valida assinatura usando `SIGNWELL_WEBHOOK_SECRET`.
   - Atualiza DynamoDB (Modelos `PromissoryNote`, `Disbursement`) ou cria mensagens no `AuditLog`.
   - Deve responder rapidamente (200) e registrar logs para troubleshooting.

6. **Modelos/Configuração de dados**
   - Expandir schema GraphQL (`amplify/data/resource.ts`) para armazenar `signwell_document_id`, `signwell_status`, `signwell_completed_at`, `signed_pdf_key` em `PromissoryNote` e `Disbursement`.
   - Criar mutations/resolvers ou usar Lambdas existentes (`promissoryNotes.update`, `disbursements.update`) para refletir o status.

7. **Segurança**
   - Garantir que as rotas SignWell no `web-api` estejam protegidas via Cognito (grupos `admin`/`manager`).
   - Usar Secrets Manager para armazenar API Key / Webhook Secret, evitando variáveis planas.

8. **Testes**
   - Adicionar testes unitários em `WEB/functions/__tests__/signwell-create.test.ts` simulando resposta da SignWell (usar `fetch-mock` ou `undici` mock).
   - Testes de integração (e2e) podem usar `jest` com `Amplify mock` ou scripts de migração para validar fluxo completo.

9. **Fluxo front-end**
   - Após publicação das Lambdas, remover os guardas de “indisponível” do front e integrar com as respostas:
     1. `createDocument` retorna `documentId` manter no estado.
     2. `openEmbeddedRequesting` pode usar nova URL e exibir `SignWellEmbedModal`.
     3. `updateAndSend` finaliza e atualiza status local.

10. **Deploy**
   - Rodar `npx ampx generate` / `npx ampx push` após editar os arquivos em `amplify` e `WEB/functions`.
   - Configurar variáveis e secrets no Amplify Hosting e nas Functions (Amplify Console → Backend → Environments → Environment Variables / Secrets).

## Tarefas Futuras (checklist)

- [ ] Implementar validações detalhadas nas Lambdas (campos obrigatórios, formato de e-mail).
- [ ] Adicionar caching/local storage para reduzir chamadas repetidas à SignWell (ex.: obter status).
- [ ] Automatizar sincronização diária via EventBridge → Lambda que consulta SignWell e atualiza status (fallback ao webhook).


