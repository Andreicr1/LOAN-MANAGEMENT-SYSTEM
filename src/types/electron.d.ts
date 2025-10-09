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
  
  docusign: {
    sendPromissoryNoteForSignature: (data: {
      promissoryNoteId: number
      pdfPath: string
      pnNumber: string
      disbursementNumber: string
      signatories: Array<{ email: string, name: string }>
    }) => Promise<{ success: boolean; envelopeId?: string; error?: string }>
    
    sendWireTransferForSignature: (data: {
      disbursementId: number
      pdfPath: string
      disbursementNumber: string
      signatories: Array<{ email: string, name: string }>
    }) => Promise<{ success: boolean; envelopeId?: string; error?: string }>
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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

