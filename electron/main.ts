import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { DatabaseService } from './database/database.service'
import { AuthService } from './services/auth.service'
import { ConfigService } from './services/config.service'
import { UserService } from './services/user.service'
import { DisbursementService } from './services/disbursement.service'
import { PromissoryNoteService } from './services/promissory-note.service'
import { PDFService } from './services/pdf.service'
import { PDFParserService } from './services/pdf-parser.service'
import { PDFSignatureValidatorService } from './services/pdf-signature-validator.service'
import { ESignatureService } from './services/esignature.service'
import { DocuSignService } from './services/docusign.service'
import { EmailService } from './services/email.service'
import { WebhookService } from './services/webhook.service'
import { InterestService } from './services/interest.service'
import { BankReconciliationService } from './services/bank-reconciliation.service'
import { DebitNoteService } from './services/debit-note.service'
import { ReportsService } from './services/reports.service'
import { BackupService } from './services/backup.service'
import { ClientService } from './services/client.service'

// DECISION: Keep database and services as singletons in main process
let mainWindow: BrowserWindow | null = null
let db: DatabaseService | null = null
let authService: AuthService | null = null
let configService: ConfigService | null = null
let userService: UserService | null = null
let disbursementService: DisbursementService | null = null
let promissoryNoteService: PromissoryNoteService | null = null
let pdfService: PDFService | null = null
let pdfParserService: PDFParserService | null = null
let pdfSignatureValidator: PDFSignatureValidatorService | null = null
let eSignatureService: ESignatureService | null = null
let docuSignService: DocuSignService | null = null
let emailService: EmailService | null = null
let webhookService: WebhookService | null = null
let interestService: InterestService | null = null
let bankReconciliationService: BankReconciliationService | null = null
let debitNoteService: DebitNoteService | null = null
let reportsService: ReportsService | null = null
let backupService: BackupService | null = null
let clientService: ClientService | null = null

const isDev = process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js')
  console.log('Creating window with preload:', preloadPath)
  console.log('Preload exists:', require('fs').existsSync(preloadPath))
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    frame: true,
    backgroundColor: '#FFFFFF',
    show: false, // Show only when ready
  })
  
  // Debug: Log paths
  console.log('App path:', app.getPath('userData'))
  console.log('Preload path:', preloadPath)
  console.log('__dirname:', __dirname)

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function initializeServices() {
  const dbPath = path.join(app.getPath('userData'), 'loan-management.db')
  db = new DatabaseService(dbPath)
  authService = new AuthService(db)
  configService = new ConfigService(db)
  userService = new UserService(db)
  disbursementService = new DisbursementService(db)
  promissoryNoteService = new PromissoryNoteService(db)
  pdfService = new PDFService()
  pdfParserService = new PDFParserService()
  pdfSignatureValidator = new PDFSignatureValidatorService()
  eSignatureService = new ESignatureService()
  docuSignService = new DocuSignService()
  emailService = new EmailService()
  webhookService = new WebhookService(docuSignService, emailService, disbursementService, promissoryNoteService)
  interestService = new InterestService(db)
  bankReconciliationService = new BankReconciliationService(db)
  debitNoteService = new DebitNoteService(db)
  reportsService = new ReportsService(db)
  backupService = new BackupService(dbPath)
  clientService = new ClientService(db)

  // Calculate interests daily
  interestService.calculateAllActiveInterests()

  // Enable auto backup every 24 hours
  backupService.enableAutoBackup(24)

  console.log(`Database initialized at: ${dbPath}`)
}

app.whenReady().then(() => {
  initializeServices()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    db?.close()
    app.quit()
  }
})

// ==================== IPC HANDLERS ====================

// Auth
ipcMain.handle('auth:login', async (_, username: string, password: string) => {
  return authService?.login(username, password)
})

ipcMain.handle('auth:logout', async (_, userId: number) => {
  return authService?.logout(userId)
})

ipcMain.handle('auth:changePassword', async (_, userId: number, oldPassword: string, newPassword: string) => {
  return authService?.changePassword(userId, oldPassword, newPassword)
})

// Users
ipcMain.handle('users:getAll', async () => {
  return userService?.getAllUsers()
})

ipcMain.handle('users:getById', async (_, id: number) => {
  return userService?.getUserById(id)
})

ipcMain.handle('users:create', async (_, data: any) => {
  return userService?.createUser(data)
})

ipcMain.handle('users:update', async (_, id: number, data: any) => {
  return userService?.updateUser(id, data)
})

ipcMain.handle('users:delete', async (_, id: number) => {
  return userService?.deleteUser(id)
})

ipcMain.handle('users:resetPassword', async (_, userId: number, newPassword: string) => {
  return userService?.resetPassword(userId, newPassword)
})

// Config
ipcMain.handle('config:get', async () => {
  return configService?.getConfig()
})

ipcMain.handle('config:update', async (_, data: any) => {
  return configService?.updateConfig(data)
})

ipcMain.handle('config:setupIntegrations', async () => {
  try {
    const config = {
      docusignIntegrationKey: '22cbfa52b-5af7-42de-bc9ea4e652ab',
      docusignAccountId: '5d45cf48-f587-45ce-a6f4-f8693c714f7c',
      docusignBasePath: 'https://demo.docusign.net/restapi',
      emailHost: 'mail.infomaniak.com',
      emailPort: 587,
      emailSecure: 0,
      emailUser: 'operations@wmf-corp.com',
      emailPass: '2fEfeUwtPxYQPNqp',
      bankEmail: 'bank@example.com',
      lenderSignatories: JSON.stringify([
        {name: "John Smith", email: "john.smith@wmf-corp.com", role: "CFO"},
        {name: "Jane Doe", email: "jane.doe@wmf-corp.com", role: "CEO"}
      ]),
      borrowerSignatories: JSON.stringify([
        {name: "Robert Johnson", email: "robert@wholemax.com", role: "Director"},
        {name: "Maria Garcia", email: "maria@wholemax.com", role: "Financial Manager"}
      ])
    }
    
    const result = await configService?.updateConfig(config)
    return { success: true, message: 'Integrations configured successfully!' }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// Audit Log
ipcMain.handle('audit:log', async (_, userId: number, action: string, details: any) => {
  return db?.logAudit(userId, action, details)
})

ipcMain.handle('audit:getAll', async (_, filters?: any) => {
  return db?.getAuditLogs(filters)
})

// Disbursements
ipcMain.handle('disbursements:getAll', async (_, filters?: any) => {
  return disbursementService?.getAllDisbursements(filters)
})

ipcMain.handle('disbursements:getById', async (_, id: number) => {
  return disbursementService?.getDisbursementById(id)
})

ipcMain.handle('disbursements:create', async (_, data: any) => {
  return disbursementService?.createDisbursement(data)
})

ipcMain.handle('disbursements:update', async (_, id: number, data: any) => {
  return disbursementService?.updateDisbursement(id, data)
})

ipcMain.handle('disbursements:approve', async (_, id: number, approvedBy: number, signedRequestPath?: string) => {
  return disbursementService?.approveDisbursement(id, approvedBy, signedRequestPath)
})

ipcMain.handle('disbursements:cancel', async (_, id: number) => {
  return disbursementService?.cancelDisbursement(id)
})

ipcMain.handle('disbursements:uploadDocument', async (_, id: number, fieldName: string, filePath: string) => {
  return disbursementService?.uploadDocument(id, fieldName as any, filePath)
})

// Promissory Notes
ipcMain.handle('promissoryNotes:getAll', async (_, filters?: any) => {
  return promissoryNoteService?.getAllPromissoryNotes(filters)
})

ipcMain.handle('promissoryNotes:getById', async (_, id: number) => {
  return promissoryNoteService?.getPromissoryNoteById(id)
})

ipcMain.handle('promissoryNotes:getByDisbursementId', async (_, disbursementId: number) => {
  return promissoryNoteService?.getByDisbursementId(disbursementId)
})

ipcMain.handle('promissoryNotes:create', async (_, data: any) => {
  return promissoryNoteService?.createPromissoryNote(data)
})

ipcMain.handle('promissoryNotes:update', async (_, id: number, data: any) => {
  return promissoryNoteService?.updatePromissoryNote(id, data)
})

ipcMain.handle('promissoryNotes:settle', async (_, id: number, amount: number, date: string) => {
  return promissoryNoteService?.settlePromissoryNote(id, amount, date)
})

ipcMain.handle('promissoryNotes:updateOverdue', async () => {
  return promissoryNoteService?.updateOverdueStatus()
})

// PDF Generation
ipcMain.handle('pdf:generatePromissoryNote', async (_, data: any) => {
  return pdfService?.generatePromissoryNote(data)
})

ipcMain.handle('pdf:generateWireTransfer', async (_, data: any) => {
  return pdfService?.generateWireTransferOrder(data)
})

ipcMain.handle('pdf:generateDebitNote', async (_, data: any) => {
  return pdfService?.generateDebitNote(data)
})

// Interest Calculations
ipcMain.handle('interest:calculateAll', async () => {
  return interestService?.calculateAllActiveInterests()
})

ipcMain.handle('interest:getForPN', async (_, pnId: number, asOfDate?: string) => {
  return interestService?.getInterestForPromissoryNote(pnId, asOfDate)
})

ipcMain.handle('interest:getTotal', async () => {
  return interestService?.getTotalAccumulatedInterest()
})

ipcMain.handle('interest:getHistory', async (_, pnId: number, startDate: string, endDate: string) => {
  return interestService?.getInterestHistory(pnId, startDate, endDate)
})

// Bank Reconciliation
ipcMain.handle('bankRecon:getAll', async (_, filters?: any) => {
  return bankReconciliationService?.getAllTransactions(filters)
})

ipcMain.handle('bankRecon:import', async (_, transaction: any) => {
  return bankReconciliationService?.importTransaction(transaction)
})

ipcMain.handle('bankRecon:importCSV', async (_, filePath: string) => {
  return bankReconciliationService?.importFromCSV(filePath)
})

ipcMain.handle('bankRecon:match', async (_, transactionId: number, pnId: number, userId: number) => {
  return bankReconciliationService?.matchTransaction(transactionId, pnId, userId)
})

ipcMain.handle('bankRecon:unmatch', async (_, transactionId: number) => {
  return bankReconciliationService?.unmatchTransaction(transactionId)
})

ipcMain.handle('bankRecon:suggestMatches', async (_, transactionId: number) => {
  return bankReconciliationService?.suggestMatches(transactionId)
})

ipcMain.handle('bankRecon:getSummary', async () => {
  return bankReconciliationService?.getReconciliationSummary()
})

// Debit Notes
ipcMain.handle('debitNotes:getAll', async () => {
  return debitNoteService?.getAllDebitNotes()
})

ipcMain.handle('debitNotes:getById', async (_, id: number) => {
  return debitNoteService?.getDebitNoteById(id)
})

ipcMain.handle('debitNotes:create', async (_, data: any) => {
  return debitNoteService?.createDebitNote(data)
})

ipcMain.handle('debitNotes:update', async (_, id: number, data: any) => {
  return debitNoteService?.updateDebitNote(id, data)
})

ipcMain.handle('debitNotes:markPaid', async (_, id: number) => {
  return debitNoteService?.markAsPaid(id)
})

ipcMain.handle('debitNotes:updateOverdue', async () => {
  return debitNoteService?.updateOverdueStatus()
})

// Reports
ipcMain.handle('reports:getDashboardKPIs', async () => {
  return reportsService?.getDashboardKPIs()
})

ipcMain.handle('reports:getAgingReport', async () => {
  return reportsService?.getAgingReport()
})

ipcMain.handle('reports:getTimeSeries', async (_, startDate: string, endDate: string) => {
  return reportsService?.getTimeSeriesData(startDate, endDate)
})

ipcMain.handle('reports:getPeriodReport', async (_, startDate: string, endDate: string) => {
  return reportsService?.getPeriodReport(startDate, endDate)
})

ipcMain.handle('reports:getTopPNs', async (_, limit: number) => {
  return reportsService?.getTopPromissoryNotes(limit)
})

ipcMain.handle('reports:getAcquiredAssets', async () => {
  return reportsService?.getAcquiredAssets()
})

// Backup
ipcMain.handle('backup:create', async () => {
  return backupService?.createBackup()
})

ipcMain.handle('backup:restore', async (_, backupFile: string) => {
  return backupService?.restoreBackup(backupFile)
})

ipcMain.handle('backup:list', async () => {
  return backupService?.getBackupList()
})

// Clients
ipcMain.handle('clients:getAll', async () => {
  return clientService?.getAllClients()
})

ipcMain.handle('clients:getActive', async () => {
  return clientService?.getActiveClients()
})

ipcMain.handle('clients:getById', async (_, id: number) => {
  return clientService?.getClientById(id)
})

ipcMain.handle('clients:create', async (_, data: any) => {
  return clientService?.createClient(data)
})

ipcMain.handle('clients:update', async (_, id: number, data: any) => {
  return clientService?.updateClient(id, data)
})

ipcMain.handle('clients:delete', async (_, id: number) => {
  return clientService?.deleteClient(id)
})

ipcMain.handle('clients:getStats', async (_, id: number) => {
  return clientService?.getClientStats(id)
})

// PDF Parsing
ipcMain.handle('parsePDF', async (_, base64Data: string) => {
  return pdfParserService?.parsePDF(base64Data)
})

// PDF Viewer - Open PDF in new window
ipcMain.handle('openPDF', async (_, pdfPath: string) => {
  const fs = require('fs')
  
  if (!fs.existsSync(pdfPath)) {
    console.error('PDF file not found:', pdfPath)
    return
  }

  // Create new window for PDF
  const pdfWindow = new BrowserWindow({
    width: 900,
    height: 700,
    autoHideMenuBar: true,
    backgroundColor: '#FFFFFF',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Load PDF file
  pdfWindow.loadFile(pdfPath)
  
  pdfWindow.on('closed', () => {
    // Window will be garbage collected
  })
})

// Upload Signed PN
ipcMain.handle('uploadSignedPN', async (_, pnId: number, base64Data: string, fileName: string) => {
  try {
    // Save uploaded file
    const filePath = await pdfSignatureValidator?.saveUploadedPDF(base64Data, fileName)
    
    if (!filePath) {
      return { success: false, error: 'Failed to save file' }
    }

    // Validate signature
    const validation = pdfSignatureValidator?.validateSignature(filePath)
    
    if (!validation?.isSigned) {
      return { 
        success: false, 
        error: validation?.error || 'PDF does not contain a valid digital signature' 
      }
    }

    // Update PN with signed path
    const updateResult = await promissoryNoteService?.updatePromissoryNote(pnId, {
      signedPnPath: filePath
    })

    if (!updateResult?.success) {
      return { success: false, error: 'Failed to update promissory note' }
    }

    return {
      success: true,
      filePath,
      signatureInfo: {
        signerName: validation.signerName,
        signDate: validation.signDate,
        certificateValid: validation.certificateValid
      }
    }
  } catch (error: any) {
    console.error('Upload signed PN error:', error)
    return { success: false, error: error.message }
  }
})

// Validate PDF Signature
ipcMain.handle('validatePDFSignature', async (_, pdfPath: string) => {
  return pdfSignatureValidator?.validateSignature(pdfPath)
})

// DocuSign - Send Promissory Note for Signature
ipcMain.handle('docusign.sendPromissoryNoteForSignature', async (_, data: {
  promissoryNoteId: number
  pdfPath: string
  pnNumber: string
  disbursementNumber: string
  signatories: Array<{ email: string, name: string }>
}) => {
  try {
    // Get DocuSign config
    const config = configService?.getConfig()
    if (!config?.docusignIntegrationKey || !config?.docusignAccountId) {
      return { success: false, error: 'DocuSign not configured. Please configure in Settings.' }
    }

    // Initialize DocuSign if needed
    if (!docuSignService) {
      return { success: false, error: 'DocuSign service not initialized' }
    }

    await docuSignService.initialize({
      integrationKey: config.docusignIntegrationKey,
      secretKey: config.docusignAccountId, // In production, use proper secret key
      redirectUri: 'https://localhost:8765/callback',
      basePath: config.docusignBasePath || 'https://demo.docusign.net/restapi',
      accountId: config.docusignAccountId,
      operationsEmail: config.emailUser || 'operations@wmf-corp.com',
      bankEmail: config.bankEmail || ''
    })

    // Send for signature
    const envelopeId = await docuSignService.sendForSignature({
      documentPath: data.pdfPath,
      documentName: `Promissory Note ${data.pnNumber}`,
      signers: data.signatories.map((s, index) => ({
        email: s.email,
        name: s.name,
        recipientId: (index + 1).toString(),
        routingOrder: '1'
      })),
      subject: `Promissory Note ${data.pnNumber} - Disbursement ${data.disbursementNumber}`,
      message: 'Please sign the attached Promissory Note.',
      webhookUrl: config.webhookUrl
    })

    // Save envelope ID
    await promissoryNoteService?.updatePromissoryNote(data.promissoryNoteId, {
      envelopeId: envelopeId,
      signatureStatus: 'sent'
    })

    // Track in docusign_envelopes table
    const dbInstance = db?.getDatabase()
    dbInstance?.prepare(`
      INSERT INTO docusign_envelopes (envelope_id, document_type, document_id, disbursement_id, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(envelopeId, 'PN', data.promissoryNoteId, data.promissoryNoteId, 'sent')

    return { success: true, envelopeId }
  } catch (error: any) {
    console.error('DocuSign send PN error:', error)
    return { success: false, error: error.message }
  }
})

// DocuSign - Send Wire Transfer for Signature  
ipcMain.handle('docusign.sendWireTransferForSignature', async (_, data: {
  disbursementId: number
  pdfPath: string
  disbursementNumber: string
  signatories: Array<{ email: string, name: string }>
}) => {
  try {
    // Get DocuSign config
    const config = configService?.getConfig()
    if (!config?.docusignIntegrationKey || !config?.docusignAccountId) {
      return { success: false, error: 'DocuSign not configured. Please configure in Settings.' }
    }

    // Initialize DocuSign if needed
    if (!docuSignService) {
      return { success: false, error: 'DocuSign service not initialized' }
    }

    await docuSignService.initialize({
      integrationKey: config.docusignIntegrationKey,
      secretKey: config.docusignAccountId, // In production, use proper secret key
      redirectUri: 'https://localhost:8765/callback',
      basePath: config.docusignBasePath || 'https://demo.docusign.net/restapi',
      accountId: config.docusignAccountId,
      operationsEmail: config.emailUser || 'operations@wmf-corp.com',
      bankEmail: config.bankEmail || ''
    })

    // Send for signature
    const envelopeId = await docuSignService.sendForSignature({
      documentPath: data.pdfPath,
      documentName: `Wire Transfer Order - ${data.disbursementNumber}`,
      signers: data.signatories.map((s, index) => ({
        email: s.email,
        name: s.name,
        recipientId: (index + 1).toString(),
        routingOrder: '1'
      })),
      subject: `Wire Transfer Order - ${data.disbursementNumber}`,
      message: 'Please sign the attached Wire Transfer Order to authorize the fund transfer.',
      webhookUrl: config.webhookUrl
    })

    // Update disbursement with envelope ID
    await disbursementService?.updateDisbursement(data.disbursementId, {
      wireTransferEnvelopeId: envelopeId,
      wireTransferSignatureStatus: 'sent',
      wireTransferPath: data.pdfPath
    })

    // Track in docusign_envelopes table
    const dbInst = db?.getDatabase()
    dbInst?.prepare(`
      INSERT INTO docusign_envelopes (envelope_id, document_type, document_id, disbursement_id, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(envelopeId, 'WT', data.disbursementId, data.disbursementId, 'sent')

    return { success: true, envelopeId }
  } catch (error: any) {
    console.error('DocuSign send WT error:', error)
    return { success: false, error: error.message }
  }
})

