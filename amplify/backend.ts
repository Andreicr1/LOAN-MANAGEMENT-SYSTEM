import { defineBackend, defineFunction, defineHttpEndpoint } from '@aws-amplify/backend'
import { auth } from './auth/resource'
import { data } from './data/resource'

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

const api = defineHttpEndpoint({
  name: 'web-api',
  routes: [
    { path: '/auth/login', method: 'POST', function: authLogin },
    { path: '/auth/logout', method: 'POST', function: authLogout },

    { path: '/users/list', method: 'GET', function: usersList },
    { path: '/users/create', method: 'POST', function: usersCreate },
    { path: '/users/update', method: 'POST', function: usersUpdate },
    { path: '/users/delete', method: 'POST', function: usersDelete },
    { path: '/users/reset-password', method: 'POST', function: usersResetPassword },

    { path: '/config/get', method: 'GET', function: configGet },
    { path: '/config/update', method: 'POST', function: configUpdate },
    { path: '/config/unlock', method: 'POST', function: configUnlock },

    { path: '/backup/list', method: 'GET', function: backupListFn },
    { path: '/backup/create', method: 'POST', function: backupCreateFn },
    { path: '/backup/restore', method: 'POST', function: backupRestoreFn },

    { path: '/disbursements/get-all', method: 'GET', function: disbursementsGetAll },
    { path: '/disbursements/approve', method: 'POST', function: disbursementApprove },
    { path: '/disbursements/cancel', method: 'POST', function: disbursementsCancel },

    { path: '/reports/dashboard-kpis', method: 'POST', function: reportsAggregates },
    { path: '/reports/aging', method: 'POST', function: reportsAggregates },
    { path: '/reports/period', method: 'POST', function: reportsAggregates },
    { path: '/reports/acquired-assets', method: 'POST', function: reportsAggregates },

    { path: '/signwell/create', method: 'POST', function: signwellCreate },
    { path: '/signwell/embedded-url', method: 'POST', function: signwellEmbeddedUrl },
    { path: '/signwell/update-send', method: 'POST', function: signwellUpdateSend }
  ]
})

defineBackend({
  auth,
  data,
  storage: {
    buckets: {
      pdfDocuments: {
        name: 'loan-management-pdf-documents',
        access: 'authAndFunctions',
        lifecycleRules: [{ id: 'expire-signed', enabled: true, expiration: 365 }]
      },
      exports: {
        name: 'loan-management-exports',
        access: 'functions',
        lifecycleRules: [{ id: 'expire-exports', enabled: true, expiration: 60 }]
      },
      uploads: {
        name: 'loan-management-uploads',
        access: 'functions',
        lifecycleRules: [{ id: 'expire-temp', enabled: true, expiration: 14 }]
      }
    }
  },
  api
})
