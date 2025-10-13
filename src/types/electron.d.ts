export type SignwellNotificationType = 'promissory_note' | 'wire_transfer'

export interface SignwellNotificationEntry {
  type: SignwellNotificationType
  id: number
  reference: string
  requestNumber?: string
  disbursementId?: number
  clientName?: string | null
  status?: string | null
  completedAt?: string | null
  attachmentPath?: string | null
  documentId: string
  updatedAt?: string | null
}

export interface ElectronAPI {
  auth: {
    login: (username: string, password: string) => Promise<{
      success: boolean
      user?: {
        id: number
        username: string
        role: string
        fullName: string
        mustChangePassword: boolean
      }
      error?: string
    }>
    logout: (userId: number) => Promise<boolean>
    changePassword: (userId: number, oldPassword: string, newPassword: string) => Promise<{
      success: boolean
      error?: string
    }>
  }
  users: {
    getAll: () => Promise<any[]>
    getById: (id: number) => Promise<any>
    create: (data: any) => Promise<any>
    update: (id: number, data: any) => Promise<any>
    delete: (id: number) => Promise<any>
    resetPassword: (userId: number, newPassword: string) => Promise<any>
  }
  config: {
    get: () => Promise<any>
    update: (data: any) => Promise<any>
    setupIntegrations: () => Promise<{ success: boolean; message?: string; error?: string }>
    unlock: (secret: string) => Promise<{ success: boolean; error?: string }>
    lock: () => Promise<{ success: boolean }>
  }
  audit: {
    log: (userId: number, action: string, details: any) => Promise<any>
    getAll: (filters?: any) => Promise<any[]>
  }
  disbursements: {
    getAll: (filters?: any) => Promise<any[]>
    getById: (id: number) => Promise<any>
    create: (data: any) => Promise<any>
    update: (id: number, data: any) => Promise<any>
    approve: (id: number, approvedBy: number, signedRequestPath?: string) => Promise<any>
    cancel: (id: number) => Promise<any>
    uploadDocument: (id: number, fieldName: string, filePath: string) => Promise<any>
  }
  promissoryNotes: {
    getAll: (filters?: any) => Promise<any[]>
    getById: (id: number) => Promise<any>
    getByDisbursementId: (disbursementId: number) => Promise<any>
    create: (data: any) => Promise<any>
    update: (id: number, data: any) => Promise<any>
    settle: (id: number, amount: number, date: string) => Promise<any>
    updateOverdue: () => Promise<any>
  }
  pdf: {
    generatePromissoryNote: (data: any) => Promise<string>
    generateWireTransfer: (data: any) => Promise<string>
    generateDebitNote: (data: any) => Promise<string>
  }
  interest: {
    calculateAll: () => Promise<any>
    getForPN: (pnId: number, asOfDate?: string) => Promise<number>
    getTotal: () => Promise<number>
    getHistory: (pnId: number, startDate: string, endDate: string) => Promise<any[]>
  }
  bankRecon: {
    getAll: (filters?: any) => Promise<any[]>
    import: (transaction: any) => Promise<any>
    importCSV: (filePath: string) => Promise<any>
    match: (transactionId: number, pnId: number, userId: number) => Promise<any>
    unmatch: (transactionId: number) => Promise<any>
    suggestMatches: (transactionId: number) => Promise<any[]>
    getSummary: () => Promise<any>
  }
  debitNotes: {
    getAll: () => Promise<any[]>
    getById: (id: number) => Promise<any>
    create: (data: any) => Promise<any>
    update: (id: number, data: any) => Promise<any>
    markPaid: (id: number) => Promise<any>
    updateOverdue: () => Promise<any>
  }
  reports: {
    getDashboardKPIs: () => Promise<any>
    getAgingReport: () => Promise<any[]>
    getTimeSeries: (startDate: string, endDate: string) => Promise<any[]>
    getPeriodReport: (startDate: string, endDate: string) => Promise<any>
    getTopPNs: (limit: number) => Promise<any[]>
    getAcquiredAssets: () => Promise<any[]>
    getSignwellNotifications: () => Promise<SignwellNotificationEntry[]>
  }
  backup: {
    create: () => Promise<any>
    restore: (backupFile: string) => Promise<any>
    list: () => Promise<any[]>
  }
  parsePDF: (base64Data: string) => Promise<{
    success: boolean
    assets?: string[]
    error?: string
  }>
  openPDF: (pdfPath: string) => Promise<void>
  uploadSignedPN: (pnId: number, base64Data: string, fileName: string) => Promise<{
    success: boolean
    filePath?: string
    signatureInfo?: {
      signerName?: string
      signDate?: string
      certificateValid?: boolean
    }
    error?: string
  }>
  validatePDFSignature: (pdfPath: string) => Promise<{
    isSigned: boolean
    signerName?: string
    signDate?: string
    certificateValid?: boolean
    error?: string
  }>
  
  signwell: {
    runMigration: () => Promise<{ success: boolean; message?: string; error?: string }>
    
    createDocument: (data: {
      name: string
      pdfPath: string
      pdfName: string
      recipients: Array<{ name: string; email: string }>
    }) => Promise<{ success: boolean; documentId?: string; status?: string; error?: string }>
    
    getEmbeddedRequestingUrl: (documentId: string) => Promise<{
      success: boolean
      url?: string
      expiresAt?: string
      error?: string
    }>
    
    openEmbeddedRequesting: (documentId: string, documentName: string) => Promise<{
      success: boolean
      url?: string
      expiresAt?: string
      error?: string
    }>
    
    getDocument: (documentId: string) => Promise<{
      success: boolean
      document?: any
      error?: string
    }>
    
    downloadCompletedPDF: (documentId: string, savePath: string) => Promise<{
      success: boolean
      path?: string
      error?: string
    }>
    
    downloadAndAttach: (payload: {
      documentId: string
      documentType?: SignwellNotificationType
    }) => Promise<{
      success: boolean
      type?: SignwellNotificationType
      path?: string
      status?: string
      completedAt?: string
      error?: string
    }>

    syncCompletedDocuments: () => Promise<{
      success: boolean
      summary?: {
        processed: number
        completed: number
        errors: number
      }
      pendingPromissory?: number
      pendingWireTransfers?: number
      error?: string
    }>
    
    sendReminder: (documentId: string) => Promise<{ success: boolean; error?: string }>
    
    updateAndSend: (data: {
      documentId: string
      recipients?: Array<{ name: string; email: string }>
    }) => Promise<{ success: boolean; document?: any; error?: string }>
  }
  
  clients: {
    getAll: () => Promise<any[]>
    getActive: () => Promise<any[]>
    getById: (id: number) => Promise<any>
    create: (data: any) => Promise<{ success: boolean; clientId?: number; error?: string }>
    update: (id: number, data: any) => Promise<{ success: boolean; error?: string }>
    delete: (id: number) => Promise<{ success: boolean; error?: string }>
    getStats: (id: number) => Promise<any>
  }
  
  // Webhook event listeners
  onWebhookUrlReady: (callback: (url: string) => void) => void
  onSignwellDocumentCompleted: (callback: (data: {
    documentId: string
    documentName: string
    pdfPath: string
    status: string
  }) => void) => void
  onSignwellWindowClosed: (callback: (documentId: string) => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

