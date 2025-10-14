type AuthApi = {
  login(username: string, password: string): Promise<any>
  logout(userId: string | number): Promise<void>
}

type AuditApi = {
  log(userId: string, action: string, details: any): Promise<void>
  getAll(): Promise<any[]>
}

type UsersApi = {
  getAll(): Promise<any[]>
  create(payload: any): Promise<any>
  update(id: string, payload: any): Promise<any>
  delete(id: string): Promise<any>
  resetPassword(id: string, newPassword: string): Promise<any>
}

type ConfigApi = {
  get(): Promise<any>
  update(payload: any): Promise<any>
  unlock(secret: string): Promise<any>
}

type BackupApi = {
  list(): Promise<any[]>
  create(): Promise<any>
  restore(key: string): Promise<any>
}

type ReportsApi = {
  getDashboardKPIs(): Promise<any>
  getAgingReport(): Promise<any>
  getPeriodReport(start: string, end: string): Promise<any>
  getAcquiredAssets(): Promise<any>
}

type DisbursementApi = {
  getAll(filters?: any): Promise<any[]>
  approve(id: string, userId: string): Promise<any>
  cancel(id: string): Promise<any>
}

type SignwellApi = {
  createDocument(payload: any): Promise<any>
  getEmbeddedRequestingUrl(documentId: string): Promise<any>
  updateAndSend(payload: any): Promise<any>
}

type ElectronApi = {
  auth: AuthApi
  audit: AuditApi
  users: UsersApi
  config: ConfigApi
  backup: BackupApi
  reports: ReportsApi
  disbursements: DisbursementApi
  signwell: SignwellApi
  onWebhookUrlReady?: (cb: (url: string) => void) => void
  onSignwellDocumentCompleted?: (cb: (data: any) => void) => void
  openPDF?: (path: string) => Promise<void>
  clients?: {
    getActive: () => Promise<any[]>
    getStats: (id: string | number) => Promise<any>
  }
  promissoryNotes?: {
    getAll: (filters?: any) => Promise<any[]>
    settle?: (id: string | number, amount: number, date: string) => Promise<any>
    updateOverdue?: () => Promise<void>
  }
  debitNotes?: {
    getAll: () => Promise<any[]>
  }
  bankRecon?: {
    getAll: (filters?: any) => Promise<any[]>
    getSummary: () => Promise<any>
    importCSV: (path: string) => Promise<any>
    match: (transactionId: string | number, pnId: string | number, userId: string | number) => Promise<any>
    unmatch: (transactionId: string | number) => Promise<any>
    suggestMatches: (transactionId: string | number) => Promise<any[]>
  }
  pdf?: {
    generatePromissoryNote?: () => Promise<string>
    generateWireTransfer?: () => Promise<string>
    generateDebitNote?: () => Promise<string>
  }
  interest?: {
    calculateAll?: () => Promise<void>
    getForPN?: (pnId: string | number) => Promise<number>
    getTotal?: () => Promise<number>
    getHistory?: () => Promise<any[]>
  }
  parsePDF?: (data: string) => Promise<any>
  uploadSignedPN?: (...args: any[]) => Promise<any>
  validatePDFSignature?: (path: string) => Promise<any>
  [key: string]: any
}

const apiUrl = (window as any).__AMPLIFY_API_URL__ ?? ((import.meta as any)?.env?.VITE_AMPLIFY_API_URL as string | undefined)

async function http<T = any>(path: string, init?: RequestInit): Promise<T> {
  if (!apiUrl) throw new Error('API URL is not configured')
  const res = await fetch(`${apiUrl}${path}`, init)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`)
  }
  const contentType = res.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return (await res.json()) as T
  }
  return (await res.text()) as any
}

function post(path: string, body?: any, headers?: Record<string, string>) {
  return http(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

function get(path: string) {
  return http(path, { method: 'GET' })
}

export function createElectronApiAdapter(): ElectronApi {
  return {
    auth: {
      login(username, password) {
        return post('/auth/login', { username, password })
      },
      async logout(userId) {
        await post('/auth/logout', { userId })
      },
    },
    audit: {
      async log(userId, action, details) {
        console.info('[audit]', action, { userId, details })
      },
      async getAll() {
        return []
      },
    },
    users: {
      async getAll() {
        return get('/users/list')
      },
      create(payload) {
        return post('/users/create', payload)
      },
      update(id, payload) {
        return post('/users/update', { id, ...payload })
      },
      delete(id) {
        return post('/users/delete', { id })
      },
      resetPassword(id, newPassword) {
        return post('/users/reset-password', { id, newPassword })
      },
    },
    config: {
      get() {
        return get('/config/get')
      },
      update(payload) {
        return post('/config/update', payload)
      },
      unlock(secret) {
        return post('/config/unlock', { secret })
      },
    },
    backup: {
      async list() {
        const result = await get('/backup/list')
        return result.items ?? []
      },
      create() {
        return post('/backup/create')
      },
      restore(key) {
        return post('/backup/restore', { key })
      },
    },
    reports: {
      getDashboardKPIs() {
        return post('/reports/dashboard-kpis')
      },
      getAgingReport() {
        return post('/reports/aging')
      },
      getPeriodReport(start, end) {
        return post('/reports/period', { start, end })
      },
      getAcquiredAssets() {
        return post('/reports/acquired-assets')
      },
    },
    disbursements: {
      async getAll(filters) {
        const result = await get('/disbursements/get-all')
        if (!filters || !filters.status) return result
        return result.filter((item: any) => item.status === filters.status)
      },
      approve(id, userId) {
        return post('/disbursements/approve', { id, userId })
      },
      cancel(id) {
        return post('/disbursements/cancel', { id })
      },
    },
    signwell: {
      createDocument(payload) {
        return post('/signwell/create', payload)
      },
      getEmbeddedRequestingUrl(documentId) {
        return post('/signwell/embedded-url', { documentId })
      },
      updateAndSend(payload) {
        return post('/signwell/update-send', payload)
      },
    },
    pdf: {
      async generatePromissoryNote() {
        throw new Error('Not implemented')
      },
      async generateWireTransfer() {
        throw new Error('Not implemented')
      },
      async generateDebitNote() {
        throw new Error('Not implemented')
      },
    },
    interest: {
      async calculateAll() {
        throw new Error('Not implemented')
      },
      async getForPN() {
        return 0
      },
      async getTotal() {
        return 0
      },
      async getHistory() {
        return []
      },
    },
    parsePDF: async () => ({ success: false, error: 'Not implemented in web' }),
    uploadSignedPN: async () => ({ success: false, error: 'Not implemented in web' }),
    validatePDFSignature: async () => ({ success: false, error: 'Not implemented in web' }),
    onWebhookUrlReady: undefined,
    onSignwellDocumentCompleted: undefined,
    openPDF: async () => {
      console.warn('openPDF not supported in web')
    },
    clients: {
      async getActive() {
        return []
      },
      async getStats() {
        return null
      },
    },
    promissoryNotes: {
      async getAll() {
        return []
      },
      async settle() {
        throw new Error('Not implemented')
      },
      async updateOverdue() {
        return
      },
    },
    debitNotes: {
      async getAll() {
        return []
      },
    },
    bankRecon: {
      async getAll() {
        return []
      },
      async getSummary() {
        return {
          totalTransactions: 0,
          matchedTransactions: 0,
          unmatchedTransactions: 0,
          matchedAmount: 0,
          unmatchedAmount: 0,
        }
      },
      async importCSV() {
        return { success: false, imported: 0, errors: ['CSV import não suportado na web'] }
      },
      async match() {
        return { success: false }
      },
      async unmatch() {
        return { success: false }
      },
      async suggestMatches() {
        return []
      },
    },
  }
}


