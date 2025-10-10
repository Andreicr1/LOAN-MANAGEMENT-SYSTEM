const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { DatabaseService } = require('./database/database.service');
const { AuthService } = require('./services/auth.service');
const { ConfigService } = require('./services/config.service');
const { UserService } = require('./services/user.service');
const { DisbursementService } = require('./services/disbursement.service');
const { PromissoryNoteService } = require('./services/promissory-note.service');
const { PDFService } = require('./services/pdf.service');
const { PDFParserService } = require('./services/pdf-parser.service');
const { PDFSignatureValidatorService } = require('./services/pdf-signature-validator.service');
const { ESignatureService } = require('./services/esignature.service');
const { DocuSignService } = require('./services/docusign.service');
const { EmailService } = require('./services/email.service');
const { WebhookService } = require('./services/webhook.service');
const { InterestService } = require('./services/interest.service');
const { BankReconciliationService } = require('./services/bank-reconciliation.service');
const { DebitNoteService } = require('./services/debit-note.service');
const { ReportsService } = require('./services/reports.service');
const { BackupService } = require('./services/backup.service');
const { ClientService } = require('./services/client.service');

// DECISION: Keep database and services as singletons in main process
let mainWindow = null;
let db = null;
let authService = null;
let configService = null;
let userService = null;
let disbursementService = null;
let promissoryNoteService = null;
let pdfService = null;
let pdfParserService = null;
let pdfSignatureValidator = null;
let eSignatureService = null;
let docuSignService = null;
let emailService = null;
let webhookService = null;
let interestService = null;
let bankReconciliationService = null;
let debitNoteService = null;
let reportsService = null;
let backupService = null;
let clientService = null;

const isDev = process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL;

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log('Creating window with preload:', preloadPath);
  console.log('Preload exists:', require('fs').existsSync(preloadPath));
  
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
  });
  
  // Debug: Log paths
  console.log('App path:', app.getPath('userData'));
  console.log('Preload path:', preloadPath);
  console.log('__dirname:', __dirname);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function initializeServices() {
  const dbPath = path.join(app.getPath('userData'), 'loan-management.db');
  db = new DatabaseService(dbPath);
  authService = new AuthService(db);
  configService = new ConfigService(db);
  userService = new UserService(db);
  disbursementService = new DisbursementService(db);
  promissoryNoteService = new PromissoryNoteService(db);
  pdfService = new PDFService();
  pdfParserService = new PDFParserService();
  pdfSignatureValidator = new PDFSignatureValidatorService();
  eSignatureService = new ESignatureService();
  docuSignService = new DocuSignService();
  emailService = new EmailService();
  webhookService = new WebhookService(docuSignService, emailService, disbursementService, promissoryNoteService);
  interestService = new InterestService(db);
  bankReconciliationService = new BankReconciliationService(db);
  debitNoteService = new DebitNoteService(db);
  reportsService = new ReportsService(db);
  backupService = new BackupService(dbPath);
  clientService = new ClientService(db);

  // Calculate interests daily
  interestService.calculateAllActiveInterests();

  // Enable auto backup every 24 hours
  backupService.enableAutoBackup(24);

  console.log(`Database initialized at: ${dbPath}`);
}

app.whenReady().then(() => {
  initializeServices();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    db?.close();
    app.quit();
  }
});

// ==================== IPC HANDLERS ====================

// Auth
ipcMain.handle('auth:login', async (_, username, password) => {
  return authService?.login(username, password);
});

ipcMain.handle('auth:logout', async (_, userId) => {
  return authService?.logout(userId);
});

ipcMain.handle('auth:changePassword', async (_, userId, oldPassword, newPassword) => {
  return authService?.changePassword(userId, oldPassword, newPassword);
});

// Users
ipcMain.handle('users:getAll', async () => {
  return userService?.getAllUsers();
});

ipcMain.handle('users:getById', async (_, id) => {
  return userService?.getUserById(id);
});

ipcMain.handle('users:create', async (_, data) => {
  return userService?.createUser(data);
});

ipcMain.handle('users:update', async (_, id, data) => {
  return userService?.updateUser(id, data);
});

ipcMain.handle('users:delete', async (_, id) => {
  return userService?.deleteUser(id);
});

ipcMain.handle('users:resetPassword', async (_, userId, newPassword) => {
  return userService?.resetPassword(userId, newPassword);
});

// Config
ipcMain.handle('config:get', async () => {
  return configService?.getConfig();
});

ipcMain.handle('config:update', async (_, data) => {
  return configService?.updateConfig(data);
});

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
    };
    
    const result = await configService?.updateConfig(config);
    return { success: true, message: 'Integrations configured successfully!' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Audit Log
ipcMain.handle('audit:log', async (_, userId, action, details) => {
  return db?.logAudit(userId, action, details);
});

ipcMain.handle('audit:getAll', async (_, filters) => {
  return db?.getAuditLogs(filters);
});

// Disbursements
ipcMain.handle('disbursements:getAll', async (_, filters) => {
  return disbursementService?.getAllDisbursements(filters);
});

ipcMain.handle('disbursements:getById', async (_, id) => {
  return disbursementService?.getDisbursementById(id);
});

ipcMain.handle('disbursements:create', async (_, data) => {
  return disbursementService?.createDisbursement(data);
});

ipcMain.handle('disbursements:update', async (_, id, data) => {
  return disbursementService?.updateDisbursement(id, data);
});

ipcMain.handle('disbursements:approve', async (_, id, approvedBy, signedRequestPath) => {
  return disbursementService?.approveDisbursement(id, approvedBy, signedRequestPath);
});

ipcMain.handle('disbursements:cancel', async (_, id) => {
  return disbursementService?.cancelDisbursement(id);
});

ipcMain.handle('disbursements:uploadDocument', async (_, id, fieldName, filePath) => {
  return disbursementService?.uploadDocument(id, fieldName, filePath);
});

// Promissory Notes
ipcMain.handle('promissoryNotes:getAll', async (_, filters) => {
  return promissoryNoteService?.getAllPromissoryNotes(filters);
});

ipcMain.handle('promissoryNotes:getById', async (_, id) => {
  return promissoryNoteService?.getPromissoryNoteById(id);
});

ipcMain.handle('promissoryNotes:getByDisbursementId', async (_, disbursementId) => {
  return promissoryNoteService?.getByDisbursementId(disbursementId);
});

ipcMain.handle('promissoryNotes:create', async (_, data) => {
  return promissoryNoteService?.createPromissoryNote(data);
});

ipcMain.handle('promissoryNotes:update', async (_, id, data) => {
  return promissoryNoteService?.updatePromissoryNote(id, data);
});

ipcMain.handle('promissoryNotes:settle', async (_, id, amount, date) => {
  return promissoryNoteService?.settlePromissoryNote(id, amount, date);
});

ipcMain.handle('promissoryNotes:updateOverdue', async () => {
  return promissoryNoteService?.updateOverdueStatus();
});

// PDF Generation
ipcMain.handle('pdf:generatePromissoryNote', async (_, data) => {
  return pdfService?.generatePromissoryNote(data);
});

ipcMain.handle('pdf:generateWireTransfer', async (_, data) => {
  return pdfService?.generateWireTransferOrder(data);
});

ipcMain.handle('pdf:generateDebitNote', async (_, data) => {
  return pdfService?.generateDebitNote(data);
});

// Interest Calculations
ipcMain.handle('interest:calculateAll', async () => {
  return interestService?.calculateAllActiveInterests();
});

ipcMain.handle('interest:getForPN', async (_, pnId, asOfDate) => {
  return interestService?.getInterestForPromissoryNote(pnId, asOfDate);
});

ipcMain.handle('interest:getTotal', async () => {
  return interestService?.getTotalAccumulatedInterest();
});

ipcMain.handle('interest:getHistory', async (_, pnId, startDate, endDate) => {
  return interestService?.getInterestHistory(pnId, startDate, endDate);
});

// Bank Reconciliation
ipcMain.handle('bankRecon:getAll', async (_, filters) => {
  return bankReconciliationService?.getAllTransactions(filters);
});

ipcMain.handle('bankRecon:import', async (_, transaction) => {
  return bankReconciliationService?.importTransaction(transaction);
});

ipcMain.handle('bankRecon:importCSV', async (_, filePath) => {
  return bankReconciliationService?.importFromCSV(filePath);
});

ipcMain.handle('bankRecon:match', async (_, transactionId, pnId, userId) => {
  return bankReconciliationService?.matchTransaction(transactionId, pnId, userId);
});

ipcMain.handle('bankRecon:unmatch', async (_, transactionId) => {
  return bankReconciliationService?.unmatchTransaction(transactionId);
});

ipcMain.handle('bankRecon:suggestMatches', async (_, transactionId) => {
  return bankReconciliationService?.suggestMatches(transactionId);
});

ipcMain.handle('bankRecon:getSummary', async () => {
  return bankReconciliationService?.getReconciliationSummary();
});

// Debit Notes
ipcMain.handle('debitNotes:getAll', async () => {
  return debitNoteService?.getAllDebitNotes();
});

ipcMain.handle('debitNotes:getById', async (_, id) => {
  return debitNoteService?.getDebitNoteById(id);
});

ipcMain.handle('debitNotes:create', async (_, data) => {
  return debitNoteService?.createDebitNote(data);
});

ipcMain.handle('debitNotes:update', async (_, id, data) => {
  return debitNoteService?.updateDebitNote(id, data);
});

ipcMain.handle('debitNotes:markPaid', async (_, id) => {
  return debitNoteService?.markAsPaid(id);
});

ipcMain.handle('debitNotes:updateOverdue', async () => {
  return debitNoteService?.updateOverdueStatus();
});

// Reports
ipcMain.handle('reports:getDashboardKPIs', async () => {
  return reportsService?.getDashboardKPIs();
});

ipcMain.handle('reports:getAgingReport', async () => {
  return reportsService?.getAgingReport();
});

ipcMain.handle('reports:getTimeSeries', async (_, startDate, endDate) => {
  return reportsService?.getTimeSeriesData(startDate, endDate);
});

ipcMain.handle('reports:getPeriodReport', async (_, startDate, endDate) => {
  return reportsService?.getPeriodReport(startDate, endDate);
});

ipcMain.handle('reports:getTopPNs', async (_, limit) => {
  return reportsService?.getTopPromissoryNotes(limit);
});

ipcMain.handle('reports:getAcquiredAssets', async () => {
  return reportsService?.getAcquiredAssets();
});

// Backup
ipcMain.handle('backup:create', async () => {
  return backupService?.createBackup();
});

ipcMain.handle('backup:restore', async (_, backupFile) => {
  return backupService?.restoreBackup(backupFile);
});

ipcMain.handle('backup:list', async () => {
  return backupService?.getBackupList();
});

// Clients
ipcMain.handle('clients:getAll', async () => {
  return clientService?.getAllClients();
});

ipcMain.handle('clients:getActive', async () => {
  return clientService?.getActiveClients();
});

ipcMain.handle('clients:getById', async (_, id) => {
  return clientService?.getClientById(id);
});

ipcMain.handle('clients:create', async (_, data) => {
  return clientService?.createClient(data);
});

ipcMain.handle('clients:update', async (_, id, data) => {
  return clientService?.updateClient(id, data);
});

ipcMain.handle('clients:delete', async (_, id) => {
  return clientService?.deleteClient(id);
});

ipcMain.handle('clients:getStats', async (_, id) => {
  return clientService?.getClientStats(id);
});

// PDF Parsing
ipcMain.handle('parsePDF', async (_, base64Data) => {
  return pdfParserService?.parsePDF(base64Data);
});

// PDF Viewer - Open PDF in new window
ipcMain.handle('openPDF', async (_, pdfPath) => {
  const fs = require('fs');
  
  if (!fs.existsSync(pdfPath)) {
    console.error('PDF file not found:', pdfPath);
    return;
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
  });

  // Load PDF file
  pdfWindow.loadFile(pdfPath);
  
  pdfWindow.on('closed', () => {
    // Window will be garbage collected
  });
});

// Upload Signed PN
ipcMain.handle('uploadSignedPN', async (_, pnId, base64Data, fileName) => {
  try {
    // Save uploaded file
    const filePath = await pdfSignatureValidator?.saveUploadedPDF(base64Data, fileName);
    
    if (!filePath) {
      return { success: false, error: 'Failed to save file' };
    }

    // Validate signature
    const validation = pdfSignatureValidator?.validateSignature(filePath);
    
    if (!validation?.isSigned) {
      return { 
        success: false, 
        error: validation?.error || 'PDF does not contain a valid digital signature' 
      };
    }

    // Update PN with signed path
    const updateResult = await promissoryNoteService?.updatePromissoryNote(pnId, {
      signedPnPath: filePath
    });

    if (!updateResult?.success) {
      return { success: false, error: 'Failed to update promissory note' };
    }

    return {
      success: true,
      filePath,
      signatureInfo: {
        signerName: validation.signerName,
        signDate: validation.signDate,
        certificateValid: validation.certificateValid
      }
    };
  } catch (error) {
    console.error('Upload signed PN error:', error);
    return { success: false, error: error.message };
  }
});

// Validate PDF Signature
ipcMain.handle('validatePDFSignature', async (_, pdfPath) => {
  return pdfSignatureValidator?.validateSignature(pdfPath);
});

// DocuSign - Send Promissory Note for Signature
ipcMain.handle('docusign.sendPromissoryNoteForSignature', async (_, data) => {
  try {
    // Get DocuSign config
    const config = configService?.getConfig();
    if (!config?.docusignIntegrationKey || !config?.docusignAccountId) {
      return { success: false, error: 'DocuSign not configured. Please configure in Settings.' };
    }

    // Initialize DocuSign if needed
    if (!docuSignService) {
      return { success: false, error: 'DocuSign service not initialized' };
    }

    await docuSignService.initialize({
      integrationKey: config.docusignIntegrationKey,
      secretKey: config.docusignAccountId, // In production, use proper secret key
      redirectUri: 'https://localhost:8765/callback',
      basePath: config.docusignBasePath || 'https://demo.docusign.net/restapi',
      accountId: config.docusignAccountId,
      operationsEmail: config.emailUser || 'operations@wmf-corp.com',
      bankEmail: config.bankEmail || ''
    });

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
    });

    // Save envelope ID
    await promissoryNoteService?.updatePromissoryNote(data.promissoryNoteId, {
      envelopeId: envelopeId,
      signatureStatus: 'sent'
    });

    // Track in docusign_envelopes table
    const dbInstance = db?.getDatabase();
    dbInstance?.prepare(`
      INSERT INTO docusign_envelopes (envelope_id, document_type, document_id, disbursement_id, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(envelopeId, 'PN', data.promissoryNoteId, data.promissoryNoteId, 'sent');

    return { success: true, envelopeId };
  } catch (error) {
    console.error('DocuSign send PN error:', error);
    return { success: false, error: error.message };
  }
});

// DocuSign - Send Wire Transfer for Signature  
ipcMain.handle('docusign.sendWireTransferForSignature', async (_, data) => {
  try {
    // Get DocuSign config
    const config = configService?.getConfig();
    if (!config?.docusignIntegrationKey || !config?.docusignAccountId) {
      return { success: false, error: 'DocuSign not configured. Please configure in Settings.' };
    }

    // Initialize DocuSign if needed
    if (!docuSignService) {
      return { success: false, error: 'DocuSign service not initialized' };
    }

    await docuSignService.initialize({
      integrationKey: config.docusignIntegrationKey,
      secretKey: config.docusignAccountId, // In production, use proper secret key
      redirectUri: 'https://localhost:8765/callback',
      basePath: config.docusignBasePath || 'https://demo.docusign.net/restapi',
      accountId: config.docusignAccountId,
      operationsEmail: config.emailUser || 'operations@wmf-corp.com',
      bankEmail: config.bankEmail || ''
    });

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
    });

    // Update disbursement with envelope ID
    await disbursementService?.updateDisbursement(data.disbursementId, {
      wireTransferEnvelopeId: envelopeId,
      wireTransferSignatureStatus: 'sent',
      wireTransferPath: data.pdfPath
    });

    // Track in docusign_envelopes table
    const dbInst = db?.getDatabase();
    dbInst?.prepare(`
      INSERT INTO docusign_envelopes (envelope_id, document_type, document_id, disbursement_id, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(envelopeId, 'WT', data.disbursementId, data.disbursementId, 'sent');

    return { success: true, envelopeId };
  } catch (error) {
    console.error('DocuSign send WT error:', error);
    return { success: false, error: error.message };
  }
});