import { type ClientSchema, a, defineData } from '@aws-amplify/backend'

const userRoleEnum = a.enum(['ADMIN', 'MANAGER', 'VIEWER'])
const disbursementStatusEnum = a.enum(['PENDING', 'APPROVED', 'CANCELLED', 'DISBURSED'])

const schema = a.schema({
  EmailConfig: a.customType({
    host: a.string(),
    port: a.integer(),
    user: a.string(),
    passStored: a.boolean()
  }),
  SignwellConfig: a.customType({
    apiKeyStored: a.boolean(),
    webhookSecretStored: a.boolean()
  }),
  Config: a
    .model({
      masterSecretRequired: a.boolean().default(false),
      email: a.ref('EmailConfig'),
      signwell: a.ref('SignwellConfig')
    })
    .authorization((allow) => [allow.groups(['admin']).to(['read', 'create', 'update'])]),
  User: a
    .model({
      cognitoId: a.id(),
      username: a.string(),
      fullName: a.string(),
      email: a.email(),
      role: userRoleEnum
    })
    .authorization((allow) => [
      allow.groups(['admin']).to(['read', 'create', 'update', 'delete']),
      allow.groups(['manager']).to(['read'])
    ]),
  AuditLog: a
    .model({
      userId: a.id(),
      action: a.string(),
      details: a.json(),
      timestamp: a.datetime()
    })
    .authorization((allow) => [allow.groups(['admin', 'manager']).to(['read', 'create'])]),
  Disbursement: a
    .model({
      clientId: a.id(),
      amount: a.float(),
      status: disbursementStatusEnum,
      approvedBy: a.id(),
      approvedAt: a.datetime()
    })
    .secondaryIndexes((index) => [index('status')])
    .authorization((allow) => [allow.groups(['admin', 'manager', 'viewer'])]),
  PromissoryNote: a
    .model({
      disbursementId: a.id(),
      pdfKey: a.string(),
      dueDate: a.date(),
      amount: a.float()
    })
    .authorization((allow) => [allow.groups(['admin', 'manager', 'viewer'])]),
  BankTransaction: a
    .model({
      reference: a.string(),
      amount: a.float(),
      transactionDate: a.date(),
      matchedDisbursementId: a.id()
    })
    .authorization((allow) => [allow.groups(['admin', 'manager'])]),
  InterestCalculation: a
    .model({
      disbursementId: a.id(),
      interestAmount: a.float(),
      calculationDate: a.date()
    })
    .authorization((allow) => [allow.groups(['admin', 'manager'])]),
  DebitNote: a
    .model({
      disbursementId: a.id(),
      amount: a.float(),
      issuedAt: a.date()
    })
    .authorization((allow) => [allow.groups(['admin', 'manager'])])
})

export type Schema = ClientSchema<typeof schema>

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool'
  }
})
