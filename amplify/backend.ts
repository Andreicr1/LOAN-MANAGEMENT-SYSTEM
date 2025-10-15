import { defineBackend, defineFunction, secret } from '@aws-amplify/backend'
import { auth } from './auth/resource'
import { data } from './data/resource'
import { aws_apigatewayv2 as apigwv2 } from 'aws-cdk-lib'
import { aws_apigatewayv2_integrations as apigwv2i } from 'aws-cdk-lib'

const pdfGenerate = defineFunction({
  name: 'pdf-generate',
  entry: '../WEB/functions/pdf-generate/index.ts'
})

const pdfParse = defineFunction({
  name: 'pdf-parse',
  entry: '../WEB/functions/pdf-parse/index.ts'
})

const pdfSignatureValidate = defineFunction({
  name: 'pdf-signature-validate',
  entry: '../WEB/functions/pdf-signature-validate/index.ts'
})

const emailSend = defineFunction({
  name: 'email-send',
  entry: '../WEB/functions/email-send/index.ts'
})

const disbursementApprove = defineFunction({
  name: 'disbursement-approve',
  entry: '../WEB/functions/disbursement-approve/index.ts'
})

const reportsAggregates = defineFunction({
  name: 'reports-aggregates',
  entry: '../WEB/functions/reports-aggregates/index.ts'
})

const bankReconciliation = defineFunction({
  name: 'bank-reconciliation',
  entry: '../WEB/functions/bank-reconciliation/index.ts'
})

const backupExport = defineFunction({
  name: 'backup-export',
  entry: '../WEB/functions/backup-export/index.ts'
})

const backupRestore = defineFunction({
  name: 'backup-restore',
  entry: '../WEB/functions/backup-restore/index.ts'
})

const signwellCreate = defineFunction({
  name: 'signwell-create',
  entry: '../WEB/functions/signwell-create/index.ts'
})

const signwellEmbeddedUrl = defineFunction({
  name: 'signwell-embedded-url',
  entry: '../WEB/functions/signwell-embedded-url/index.ts'
})

const signwellUpdateSend = defineFunction({
  name: 'signwell-update-send',
  entry: '../WEB/functions/signwell-update-send/index.ts'
})

const signwellWebhook = defineFunction({
  name: 'signwell-webhook',
  entry: '../WEB/functions/signwell-webhook/index.ts'
})

const interestDaily = defineFunction({
  name: 'interest-daily',
  entry: '../WEB/functions/interest-daily/index.ts'
})

// New endpoint functions
const authLogin = defineFunction({ name: 'auth-login', entry: '../WEB/functions/auth/login/index.ts' })
const authLogout = defineFunction({ name: 'auth-logout', entry: '../WEB/functions/auth/logout/index.ts' })

const usersList = defineFunction({ name: 'users-list', entry: '../WEB/functions/users/list/index.ts' })
const usersCreate = defineFunction({ name: 'users-create', entry: '../WEB/functions/users/create/index.ts' })
const usersUpdate = defineFunction({ name: 'users-update', entry: '../WEB/functions/users/update/index.ts' })
const usersDelete = defineFunction({ name: 'users-delete', entry: '../WEB/functions/users/delete/index.ts' })
const usersResetPassword = defineFunction({ name: 'users-reset-password', entry: '../WEB/functions/users/reset-password/index.ts' })

const configGet = defineFunction({ name: 'config-get', entry: '../WEB/functions/config/get/index.ts' })
const configUpdate = defineFunction({ name: 'config-update', entry: '../WEB/functions/config/update/index.ts' })
const configUnlock = defineFunction({ name: 'config-unlock', entry: '../WEB/functions/config/unlock/index.ts' })

const backupListFn = defineFunction({ name: 'backup-list', entry: '../WEB/functions/backup/list/index.ts' })
const backupCreateFn = defineFunction({ name: 'backup-create', entry: '../WEB/functions/backup/create/index.ts' })
const backupRestoreFn = defineFunction({ name: 'backup-restore-fn', entry: '../WEB/functions/backup/restore/index.ts' })

const disbursementsCancel = defineFunction({ name: 'disbursements-cancel', entry: '../WEB/functions/disbursements/cancel/index.ts' })
const disbursementsGetAll = defineFunction({ name: 'disbursements-get-all', entry: '../WEB/functions/disbursements/get-all/index.ts' })

const backend = defineBackend({
  auth,
  data,
  pdfGenerate,
  pdfParse,
  pdfSignatureValidate,
  emailSend,
  disbursementApprove,
  reportsAggregates,
  bankReconciliation,
  backupExport,
  backupRestore,
  signwellCreate,
  signwellEmbeddedUrl,
  signwellUpdateSend,
  signwellWebhook,
  interestDaily,
  authLogin,
  authLogout,
  usersList,
  usersCreate,
  usersUpdate,
  usersDelete,
  usersResetPassword,
  configGet,
  configUpdate,
  configUnlock,
  backupListFn,
  backupCreateFn,
  backupRestoreFn,
  disbursementsCancel,
  disbursementsGetAll
})

// Create HttpApi and add routes using CDK
const apiStack = backend.createStack('web-api')
const httpApi = new apigwv2.HttpApi(apiStack, 'WebApi', {
  corsPreflight: {
    allowOrigins: ['*'],
    allowMethods: [apigwv2.CorsHttpMethod.GET, apigwv2.CorsHttpMethod.POST, apigwv2.CorsHttpMethod.OPTIONS],
    allowHeaders: ['*']
  }
})

const addRoute = (method: apigwv2.HttpMethod, path: string, name: string, lambda: any) => {
  const integration = new apigwv2i.HttpLambdaIntegration(`${name}Integration`, lambda)
  httpApi.addRoutes({ path, methods: [method], integration })
}

// Auth
addRoute(apigwv2.HttpMethod.POST, '/auth/login', 'AuthLogin', backend.authLogin.resources.lambda)
addRoute(apigwv2.HttpMethod.POST, '/auth/logout', 'AuthLogout', backend.authLogout.resources.lambda)

// Users
addRoute(apigwv2.HttpMethod.GET, '/users/list', 'UsersList', backend.usersList.resources.lambda)
addRoute(apigwv2.HttpMethod.POST, '/users/create', 'UsersCreate', backend.usersCreate.resources.lambda)
addRoute(apigwv2.HttpMethod.POST, '/users/update', 'UsersUpdate', backend.usersUpdate.resources.lambda)
addRoute(apigwv2.HttpMethod.POST, '/users/delete', 'UsersDelete', backend.usersDelete.resources.lambda)
addRoute(apigwv2.HttpMethod.POST, '/users/reset-password', 'UsersResetPassword', backend.usersResetPassword.resources.lambda)

// Config
addRoute(apigwv2.HttpMethod.GET, '/config/get', 'ConfigGet', backend.configGet.resources.lambda)
addRoute(apigwv2.HttpMethod.POST, '/config/update', 'ConfigUpdate', backend.configUpdate.resources.lambda)
addRoute(apigwv2.HttpMethod.POST, '/config/unlock', 'ConfigUnlock', backend.configUnlock.resources.lambda)

// Backup
addRoute(apigwv2.HttpMethod.GET, '/backup/list', 'BackupList', backend.backupListFn.resources.lambda)
addRoute(apigwv2.HttpMethod.POST, '/backup/create', 'BackupCreate', backend.backupCreateFn.resources.lambda)
addRoute(apigwv2.HttpMethod.POST, '/backup/restore', 'BackupRestore', backend.backupRestoreFn.resources.lambda)

// Disbursements
addRoute(apigwv2.HttpMethod.GET, '/disbursements/get-all', 'DisbursementsGetAll', backend.disbursementsGetAll.resources.lambda)
addRoute(apigwv2.HttpMethod.POST, '/disbursements/approve', 'DisbursementApprove', backend.disbursementApprove.resources.lambda)
addRoute(apigwv2.HttpMethod.POST, '/disbursements/cancel', 'DisbursementsCancel', backend.disbursementsCancel.resources.lambda)

// Reports
addRoute(apigwv2.HttpMethod.POST, '/reports/dashboard-kpis', 'ReportsDashboardKpis', backend.reportsAggregates.resources.lambda)
addRoute(apigwv2.HttpMethod.POST, '/reports/aging', 'ReportsAging', backend.reportsAggregates.resources.lambda)
addRoute(apigwv2.HttpMethod.POST, '/reports/period', 'ReportsPeriod', backend.reportsAggregates.resources.lambda)
addRoute(apigwv2.HttpMethod.POST, '/reports/acquired-assets', 'ReportsAcquiredAssets', backend.reportsAggregates.resources.lambda)

// Signwell
addRoute(apigwv2.HttpMethod.POST, '/signwell/create', 'SignwellCreate', backend.signwellCreate.resources.lambda)
addRoute(apigwv2.HttpMethod.POST, '/signwell/embedded-url', 'SignwellEmbeddedUrl', backend.signwellEmbeddedUrl.resources.lambda)

addRoute(apigwv2.HttpMethod.POST, '/signwell/update-send', 'SignwellUpdateSend', backend.signwellUpdateSend.resources.lambda)
addRoute(apigwv2.HttpMethod.POST, '/signwell/webhook', 'SignwellWebhook', backend.signwellWebhook.resources.lambda)

// Dynamic environment variables wired from generated resources
const tables = Object.values(backend.data.resources.tables)
const mainTable = tables.length > 0 ? tables[0] : undefined
if (mainTable) {
  const setTableEnv = (fn: any) => fn.addEnvironment('DATA_TABLE_NAME', mainTable.tableName)
  ;[
    backend.disbursementApprove,
    backend.reportsAggregates,
    backend.backupCreateFn,
    backend.backupRestoreFn,
    backend.configGet,
    backend.configUpdate,
    backend.bankReconciliation,
    backend.interestDaily,
    backend.disbursementsGetAll,
    backend.disbursementsCancel,
    backend.usersList,
    backend.usersCreate,
    backend.usersUpdate,
    backend.usersDelete,
    backend.usersResetPassword,
    backend.signwellWebhook
  ].forEach(setTableEnv)
}

// Cognito resource-derived environment
const userPoolId = backend.auth.resources.userPool.userPoolId
const userPoolClientId = backend.auth.resources.userPoolClient.userPoolClientId
;[
  backend.usersList,
  backend.usersCreate,
  backend.usersUpdate,
  backend.usersDelete,
  backend.usersResetPassword
].forEach((fn) => fn.addEnvironment('COGNITO_USER_POOL_ID', userPoolId))
backend.authLogin.addEnvironment('COGNITO_CLIENT_ID', userPoolClientId)
backend.authLogin.addEnvironment('COGNITO_CLIENT_SECRET', secret('COGNITO_CLIENT_SECRET'))

// Static env and secrets by function
backend.pdfGenerate.addEnvironment('PDF_BUCKET', secret('PDF_BUCKET'))
backend.pdfParse.addEnvironment('UPLOAD_BUCKET', secret('UPLOAD_BUCKET'))
backend.pdfSignatureValidate.addEnvironment('UPLOAD_BUCKET', secret('UPLOAD_BUCKET'))
backend.bankReconciliation.addEnvironment('UPLOAD_BUCKET', secret('UPLOAD_BUCKET'))
backend.signwellCreate.addEnvironment('SIGNWELL_API_KEY', secret('SIGNWELL_API_KEY'))
backend.signwellCreate.addEnvironment('PDF_BUCKET', secret('PDF_BUCKET'))
backend.signwellCreate.addEnvironment('SIGNWELL_TEST_MODE', 'false')
backend.signwellEmbeddedUrl.addEnvironment('SIGNWELL_API_KEY', secret('SIGNWELL_API_KEY'))
backend.signwellUpdateSend.addEnvironment('SIGNWELL_API_KEY', secret('SIGNWELL_API_KEY'))
backend.signwellWebhook.addEnvironment('SIGNWELL_WEBHOOK_SECRET', secret('SIGNWELL_WEBHOOK_SECRET'))
backend.signwellWebhook.addEnvironment('SIGNWELL_API_KEY', secret('SIGNWELL_API_KEY'))
backend.signwellWebhook.addEnvironment('PDF_BUCKET', secret('PDF_BUCKET'))
backend.signwellWebhook.addEnvironment('WEBHOOK_TOKEN', secret('WEBHOOK_TOKEN'))
backend.signwellWebhook.addEnvironment('ALLOW_UNVERIFIED_WEBHOOKS', 'false')
backend.backupListFn.addEnvironment('EXPORT_BUCKET', secret('EXPORT_BUCKET'))
backend.backupCreateFn.addEnvironment('EXPORT_BUCKET', secret('EXPORT_BUCKET'))
backend.backupRestoreFn.addEnvironment('EXPORT_BUCKET', secret('EXPORT_BUCKET'))

// Expose HttpApi endpoint in amplify outputs
backend.addOutput({ custom: { httpApiUrl: httpApi.apiEndpoint } })

// Buckets placeholder

