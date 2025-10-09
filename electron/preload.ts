import { contextBridge, ipcRenderer } from 'electron'

// DECISION: Expose limited, type-safe API to renderer process
const electronAPI = {
  // Auth
  auth: {
    login: (username: string, password: string) => 
      ipcRenderer.invoke('auth:login', username, password),
    logout: (userId: number) => 
      ipcRenderer.invoke('auth:logout', userId),
    changePassword: (userId: number, oldPassword: string, newPassword: string) =>
      ipcRenderer.invoke('auth:changePassword', userId, oldPassword, newPassword),
  },

  // Users
  users: {
    getAll: () => ipcRenderer.invoke('users:getAll'),
    getById: (id: number) => ipcRenderer.invoke('users:getById', id),
    create: (data: any) => ipcRenderer.invoke('users:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('users:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('users:delete', id),
    resetPassword: (userId: number, newPassword: string) => 
      ipcRenderer.invoke('users:resetPassword', userId, newPassword),
  },

  // Config
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    update: (data: any) => ipcRenderer.invoke('config:update', data),
    setupIntegrations: () => ipcRenderer.invoke('config:setupIntegrations'),
  },

  // Audit
  audit: {
    log: (userId: number, action: string, details: any) => 
      ipcRenderer.invoke('audit:log', userId, action, details),
    getAll: (filters?: any) => ipcRenderer.invoke('audit:getAll', filters),
  },

  // Disbursements
  disbursements: {
    getAll: (filters?: any) => ipcRenderer.invoke('disbursements:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('disbursements:getById', id),
    create: (data: any) => ipcRenderer.invoke('disbursements:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('disbursements:update', id, data),
    approve: (id: number, approvedBy: number, signedRequestPath?: string) => 
      ipcRenderer.invoke('disbursements:approve', id, approvedBy, signedRequestPath),
    cancel: (id: number) => ipcRenderer.invoke('disbursements:cancel', id),
    uploadDocument: (id: number, fieldName: string, filePath: string) =>
      ipcRenderer.invoke('disbursements:uploadDocument', id, fieldName, filePath),
  },

  // Promissory Notes
  promissoryNotes: {
    getAll: (filters?: any) => ipcRenderer.invoke('promissoryNotes:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('promissoryNotes:getById', id),
    getByDisbursementId: (disbursementId: number) => 
      ipcRenderer.invoke('promissoryNotes:getByDisbursementId', disbursementId),
    create: (data: any) => ipcRenderer.invoke('promissoryNotes:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('promissoryNotes:update', id, data),
    settle: (id: number, amount: number, date: string) => 
      ipcRenderer.invoke('promissoryNotes:settle', id, amount, date),
    updateOverdue: () => ipcRenderer.invoke('promissoryNotes:updateOverdue'),
  },

  // PDF Generation
  pdf: {
    generatePromissoryNote: (data: any) => ipcRenderer.invoke('pdf:generatePromissoryNote', data),
    generateWireTransfer: (data: any) => ipcRenderer.invoke('pdf:generateWireTransfer', data),
    generateDebitNote: (data: any) => ipcRenderer.invoke('pdf:generateDebitNote', data),
  },

  // Interest Calculations
  interest: {
    calculateAll: () => ipcRenderer.invoke('interest:calculateAll'),
    getForPN: (pnId: number, asOfDate?: string) => ipcRenderer.invoke('interest:getForPN', pnId, asOfDate),
    getTotal: () => ipcRenderer.invoke('interest:getTotal'),
    getHistory: (pnId: number, startDate: string, endDate: string) => 
      ipcRenderer.invoke('interest:getHistory', pnId, startDate, endDate),
  },

  // Bank Reconciliation
  bankRecon: {
    getAll: (filters?: any) => ipcRenderer.invoke('bankRecon:getAll', filters),
    import: (transaction: any) => ipcRenderer.invoke('bankRecon:import', transaction),
    importCSV: (filePath: string) => ipcRenderer.invoke('bankRecon:importCSV', filePath),
    match: (transactionId: number, pnId: number, userId: number) => 
      ipcRenderer.invoke('bankRecon:match', transactionId, pnId, userId),
    unmatch: (transactionId: number) => ipcRenderer.invoke('bankRecon:unmatch', transactionId),
    suggestMatches: (transactionId: number) => ipcRenderer.invoke('bankRecon:suggestMatches', transactionId),
    getSummary: () => ipcRenderer.invoke('bankRecon:getSummary'),
  },

  // Debit Notes
  debitNotes: {
    getAll: () => ipcRenderer.invoke('debitNotes:getAll'),
    getById: (id: number) => ipcRenderer.invoke('debitNotes:getById', id),
    create: (data: any) => ipcRenderer.invoke('debitNotes:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('debitNotes:update', id, data),
    markPaid: (id: number) => ipcRenderer.invoke('debitNotes:markPaid', id),
    updateOverdue: () => ipcRenderer.invoke('debitNotes:updateOverdue'),
  },

  // Reports
  reports: {
    getDashboardKPIs: () => ipcRenderer.invoke('reports:getDashboardKPIs'),
    getAgingReport: () => ipcRenderer.invoke('reports:getAgingReport'),
    getTimeSeries: (startDate: string, endDate: string) => 
      ipcRenderer.invoke('reports:getTimeSeries', startDate, endDate),
    getPeriodReport: (startDate: string, endDate: string) => 
      ipcRenderer.invoke('reports:getPeriodReport', startDate, endDate),
    getTopPNs: (limit: number) => ipcRenderer.invoke('reports:getTopPNs', limit),
    getAcquiredAssets: () => ipcRenderer.invoke('reports:getAcquiredAssets'),
  },

  // Backup
  backup: {
    create: () => ipcRenderer.invoke('backup:create'),
    restore: (backupFile: string) => ipcRenderer.invoke('backup:restore', backupFile),
    list: () => ipcRenderer.invoke('backup:list'),
  },

  // PDF Parsing
  parsePDF: (base64Data: string) => ipcRenderer.invoke('parsePDF', base64Data),

  // PDF Viewer
  openPDF: (pdfPath: string) => ipcRenderer.invoke('openPDF', pdfPath),

  // Upload Signed PN
  uploadSignedPN: (pnId: number, base64Data: string, fileName: string) =>
    ipcRenderer.invoke('uploadSignedPN', pnId, base64Data, fileName),

  // Validate PDF Signature
  validatePDFSignature: (pdfPath: string) =>
    ipcRenderer.invoke('validatePDFSignature', pdfPath),
  
  // DocuSign
  docusign: {
    sendPromissoryNoteForSignature: (data: {
      promissoryNoteId: number
      pdfPath: string
      pnNumber: string
      disbursementNumber: string
      signatories: Array<{ email: string, name: string }>
    }) => ipcRenderer.invoke('docusign.sendPromissoryNoteForSignature', data),
    
    sendWireTransferForSignature: (data: {
      disbursementId: number
      pdfPath: string
      disbursementNumber: string
      signatories: Array<{ email: string, name: string }>
    }) => ipcRenderer.invoke('docusign.sendWireTransferForSignature', data),
  },
  
  // Clients
  clients: {
    getAll: () => ipcRenderer.invoke('clients:getAll'),
    getActive: () => ipcRenderer.invoke('clients:getActive'),
    getById: (id: number) => ipcRenderer.invoke('clients:getById', id),
    create: (data: any) => ipcRenderer.invoke('clients:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('clients:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('clients:delete', id),
    getStats: (id: number) => ipcRenderer.invoke('clients:getStats', id),
  },
}

// Debug logging at the very beginning
console.log('=== PRELOAD SCRIPT STARTING ===')
console.log('contextBridge available:', typeof contextBridge !== 'undefined')
console.log('ipcRenderer available:', typeof ipcRenderer !== 'undefined')

// Expose API to renderer
try {
  contextBridge.exposeInMainWorld('electronAPI', electronAPI)
  console.log('✓ electronAPI exposed successfully')
} catch (error) {
  console.error('✗ Failed to expose electronAPI:', error)
}

// Debug logging
console.log('Preload script loaded successfully')
console.log('electronAPI exposed to window')
console.log('=== PRELOAD SCRIPT FINISHED ===')

export type ElectronAPI = typeof electronAPI

