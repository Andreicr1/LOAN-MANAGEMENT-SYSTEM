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

export interface ElectronAPI extends Record<string, any> {
  auth?: any
  users?: any
  config?: any
  audit?: any
  disbursements?: any
  promissoryNotes?: any
  pdf?: any
  interest?: any
  bankRecon?: any
  debitNotes?: any
  reports?: any
  backup?: any
  signwell?: any
  parsePDF?: (data: string) => Promise<any>
  openPDF?: (path: string) => Promise<void>
  uploadSignedPN?: (...args: any[]) => Promise<any>
  validatePDFSignature?: (path: string) => Promise<any>
  onWebhookUrlReady?: (cb: (url: string) => void) => void
  onSignwellDocumentCompleted?: (cb: (data: any) => void) => void
  onSignwellWindowClosed?: (cb: (documentId: string) => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

