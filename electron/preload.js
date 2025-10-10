const { contextBridge, ipcRenderer } = require('electron');

// DECISION: Use selective API exposure for security
contextBridge.exposeInMainWorld('electronAPI', {
  // Auth
  auth: {
    login: (username, password) => ipcRenderer.invoke('auth:login', username, password),
    logout: (userId) => ipcRenderer.invoke('auth:logout', userId),
    changePassword: (userId, oldPassword, newPassword) => 
      ipcRenderer.invoke('auth:changePassword', userId, oldPassword, newPassword),
  },
  
  // Users
  users: {
    getAll: () => ipcRenderer.invoke('users:getAll'),
    getById: (id) => ipcRenderer.invoke('users:getById', id),
    create: (data) => ipcRenderer.invoke('users:create', data),
    update: (id, data) => ipcRenderer.invoke('users:update', id, data),
    delete: (id) => ipcRenderer.invoke('users:delete', id),
    resetPassword: (userId, newPassword) => ipcRenderer.invoke('users:resetPassword', userId, newPassword),
  },
  
  // Config
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    update: (data) => ipcRenderer.invoke('config:update', data),
    setupIntegrations: () => ipcRenderer.invoke('config:setupIntegrations'),
  },
  
  // Audit
  audit: {
    log: (userId, action, details) => ipcRenderer.invoke('audit:log', userId, action, details),
    getAll: (filters) => ipcRenderer.invoke('audit:getAll', filters),
  },
  
  // Disbursements
  disbursements: {
    getAll: (filters) => ipcRenderer.invoke('disbursements:getAll', filters),
    getById: (id) => ipcRenderer.invoke('disbursements:getById', id),
    create: (data) => ipcRenderer.invoke('disbursements:create', data),
    update: (id, data) => ipcRenderer.invoke('disbursements:update', id, data),
    approve: (id, approvedBy, signedRequestPath) => 
      ipcRenderer.invoke('disbursements:approve', id, approvedBy, signedRequestPath),
    cancel: (id) => ipcRenderer.invoke('disbursements:cancel', id),
    uploadDocument: (id, fieldName, filePath) => 
      ipcRenderer.invoke('disbursements:uploadDocument', id, fieldName, filePath),
  },
  
  // Promissory Notes
  promissoryNotes: {
    getAll: (filters) => ipcRenderer.invoke('promissoryNotes:getAll', filters),
    getById: (id) => ipcRenderer.invoke('promissoryNotes:getById', id),
    getByDisbursementId: (disbursementId) => 
      ipcRenderer.invoke('promissoryNotes:getByDisbursementId', disbursementId),
    create: (data) => ipcRenderer.invoke('promissoryNotes:create', data),
    update: (id, data) => ipcRenderer.invoke('promissoryNotes:update', id, data),
    settle: (id, amount, date) => ipcRenderer.invoke('promissoryNotes:settle', id, amount, date),
    updateOverdue: () => ipcRenderer.invoke('promissoryNotes:updateOverdue'),
  },
  
  // PDF
  pdf: {
    generatePromissoryNote: (data) => ipcRenderer.invoke('pdf:generatePromissoryNote', data),
    generateWireTransfer: (data) => ipcRenderer.invoke('pdf:generateWireTransfer', data),
    generateDebitNote: (data) => ipcRenderer.invoke('pdf:generateDebitNote', data),
  },
  
  // Interest
  interest: {
    calculateAll: () => ipcRenderer.invoke('interest:calculateAll'),
    getForPN: (pnId, asOfDate) => ipcRenderer.invoke('interest:getForPN', pnId, asOfDate),
    getTotal: () => ipcRenderer.invoke('interest:getTotal'),
    getHistory: (pnId, startDate, endDate) => 
      ipcRenderer.invoke('interest:getHistory', pnId, startDate, endDate),
  },
  
  // Bank Reconciliation
  bankRecon: {
    getAll: (filters) => ipcRenderer.invoke('bankRecon:getAll', filters),
    import: (transaction) => ipcRenderer.invoke('bankRecon:import', transaction),
    importCSV: (filePath) => ipcRenderer.invoke('bankRecon:importCSV', filePath),
    match: (transactionId, pnId, userId) => 
      ipcRenderer.invoke('bankRecon:match', transactionId, pnId, userId),
    unmatch: (transactionId) => ipcRenderer.invoke('bankRecon:unmatch', transactionId),
    suggestMatches: (transactionId) => ipcRenderer.invoke('bankRecon:suggestMatches', transactionId),
    getSummary: () => ipcRenderer.invoke('bankRecon:getSummary'),
  },
  
  // Debit Notes
  debitNotes: {
    getAll: () => ipcRenderer.invoke('debitNotes:getAll'),
    getById: (id) => ipcRenderer.invoke('debitNotes:getById', id),
    create: (data) => ipcRenderer.invoke('debitNotes:create', data),
    update: (id, data) => ipcRenderer.invoke('debitNotes:update', id, data),
    markPaid: (id) => ipcRenderer.invoke('debitNotes:markPaid', id),
    updateOverdue: () => ipcRenderer.invoke('debitNotes:updateOverdue'),
  },
  
  // Reports
  reports: {
    getDashboardKPIs: () => ipcRenderer.invoke('reports:getDashboardKPIs'),
    getAgingReport: () => ipcRenderer.invoke('reports:getAgingReport'),
    getTimeSeries: (startDate, endDate) => 
      ipcRenderer.invoke('reports:getTimeSeries', startDate, endDate),
    getPeriodReport: (startDate, endDate) => 
      ipcRenderer.invoke('reports:getPeriodReport', startDate, endDate),
    getTopPNs: (limit) => ipcRenderer.invoke('reports:getTopPNs', limit),
    getAcquiredAssets: () => ipcRenderer.invoke('reports:getAcquiredAssets'),
  },
  
  // Backup
  backup: {
    create: () => ipcRenderer.invoke('backup:create'),
    restore: (backupFile) => ipcRenderer.invoke('backup:restore', backupFile),
    list: () => ipcRenderer.invoke('backup:list'),
  },
  
  // Clients
  clients: {
    getAll: () => ipcRenderer.invoke('clients:getAll'),
    getActive: () => ipcRenderer.invoke('clients:getActive'),
    getById: (id) => ipcRenderer.invoke('clients:getById', id),
    create: (data) => ipcRenderer.invoke('clients:create', data),
    update: (id, data) => ipcRenderer.invoke('clients:update', id, data),
    delete: (id) => ipcRenderer.invoke('clients:delete', id),
    getStats: (id) => ipcRenderer.invoke('clients:getStats', id),
  },
  
  // PDF Parser
  parsePDF: (base64Data) => ipcRenderer.invoke('parsePDF', base64Data),
  
  // PDF Viewer
  openPDF: (pdfPath) => ipcRenderer.invoke('openPDF', pdfPath),
  
  // Upload signed PN
  uploadSignedPN: (pnId, base64Data, fileName) => 
    ipcRenderer.invoke('uploadSignedPN', pnId, base64Data, fileName),
  
  // Validate PDF signature
  validatePDFSignature: (pdfPath) => ipcRenderer.invoke('validatePDFSignature', pdfPath),
  
  // DocuSign
  docusign: {
    sendPromissoryNoteForSignature: (data) => 
      ipcRenderer.invoke('docusign.sendPromissoryNoteForSignature', data),
    sendWireTransferForSignature: (data) => 
      ipcRenderer.invoke('docusign.sendWireTransferForSignature', data),
  },
});