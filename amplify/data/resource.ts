import { type ClientSchema, a, defineData } from '@aws-amplify/backend'

const userRoleEnum = a.enum(['ADMIN', 'MANAGER', 'VIEWER'])
const disbursementStatusEnum = a.enum(['PENDING', 'APPROVED', 'CANCELLED', 'DISBURSED'])

const schema = a.schema({
  EmailConfig: a.customType({
    host: a.string().optional(),
    port: a.integer().optional(),
    user: a.string().optional(),
    passStored: a.boolean().optional()
  }),
  SignwellConfig: a.customType({
    apiKeyStored: a.boolean().optional(),
    webhookSecretStored: a.boolean().optional()
  }),
  Config: a
    .model({
      masterSecretRequired: a.boolean().default(false),
      email: a.ref('EmailConfig').optional(),
      signwell: a.ref('SignwellConfig').optional()
    })
    .identifier(['id'])
    .authorization((allow) => [allow.groups(['admin']).to(['read', 'create', 'update'])]),
  User: a
    .model({
      cognitoId: a.id(),
      username: a.string().required(),
      fullName: a.string().optional(),
      email: a.email().optional(),
      role: userRoleEnum
    })
    .authorization((allow) => [
      allow.groups(['admin', 'manager']).to(['read']),
      allow.owner({ ownerField: 'cognitoId' }).to(['read']),
      allow.groups(['admin']).to(['create', 'update', 'delete'])
    ]),
  AuditLog: a
    .model({
      userId: a.id().optional(),
      action: a.string(),
      details: a.json().optional(),
      timestamp: a.dateTime()
    })
    .authorization((allow) => [allow.groups(['admin', 'manager']).to(['read', 'create'])]),
  Disbursement: a
    .model({
      clientId: a.id(),
      amount: a.float(),
      status: disbursementStatusEnum,
      approvedBy: a.id().optional(),
      approvedAt: a.dateTime().optional()
    })
    .secondaryIndexes((index) => [index('byStatus', ['status']).queryField('disbursementsByStatus')])
    .authorization((allow) => [allow.groups(['admin', 'manager', 'viewer'])]),
  PromissoryNote: a
    .model({
      disbursementId: a.id(),
      pdfKey: a.string().optional(),
      dueDate: a.date().optional(),
      amount: a.float().optional()
    })
    .authorization((allow) => [allow.groups(['admin', 'manager', 'viewer'])]),
  BankTransaction: a
    .model({
      reference: a.string(),
      amount: a.float(),
      transactionDate: a.date().optional(),
      matchedDisbursementId: a.id().optional()
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
      issuedAt: a.date().optional()
    })
    .authorization((allow) => [allow.groups(['admin', 'manager'])])
})

export type Schema = ClientSchema<typeof schema>

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    additionalAuthorizationModes: ['iam']
  }
})
