import { generateClient } from 'aws-amplify/data'
import { fetchAuthSession } from 'aws-amplify/auth'
import { amplifyEnv } from '../bootstrap/amplifyConfig'

type AuthApi = {
  login(username: string, password: string): Promise<any>
  logout(userId: string): Promise<void>
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
}

const client = generateClient({ authMode: 'userPool' })

async function callFunction(name: string, init?: RequestInit) {
  const session = await fetchAuthSession()
  const token = session.tokens?.idToken?.toString()

  const response = await fetch(`${amplifyEnv.apiUrl}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: token } : {})
    },
    ...init
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Function ${name} failed: ${response.status} ${errorBody}`)
  }

  if (response.headers.get('content-type')?.includes('application/json')) {
    return response.json()
  }

  return response.text()
}

export function createElectronApiAdapter(): ElectronApi {
  return {
    auth: {
      async login(username, password) {
        const response = await fetch(`${amplifyEnv.apiUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        })

        if (!response.ok) {
          throw new Error('Login failed')
        }

        return response.json()
      },
      async logout(userId) {
        await callFunction('auth/logout', {
          body: JSON.stringify({ userId })
        })
      }
    },
    audit: {
      async log(userId, action, details) {
        await client.models.AuditLog.create({
          userId,
          action,
          details: JSON.stringify(details),
          timestamp: new Date().toISOString()
        })
      },
      async getAll() {
        const result = await client.models.AuditLog.list()
        return result.data ?? []
      }
    },
    users: {
      async getAll() {
        const result = await client.models.User.list()
        return result.data ?? []
      },
      async create(payload) {
        return callFunction('users/create', {
          body: JSON.stringify(payload)
        })
      },
      async update(id, payload) {
        return callFunction('users/update', {
          body: JSON.stringify({ id, ...payload })
        })
      },
      async delete(id) {
        return callFunction('users/delete', {
          body: JSON.stringify({ id })
        })
      },
      async resetPassword(id, newPassword) {
        return callFunction('users/reset-password', {
          body: JSON.stringify({ id, newPassword })
        })
      }
    },
    config: {
      async get() {
        const result = await client.models.Config.list()
        return result.data?.[0] ?? null
      },
      async update(payload) {
        return callFunction('config/update', {
          body: JSON.stringify(payload)
        })
      },
      async unlock(secret) {
        return callFunction('config/unlock', {
          body: JSON.stringify({ secret })
        })
      }
    },
    backup: {
      async list() {
        const result = await callFunction('backup/list')
        return result?.items ?? []
      },
      async create() {
        return callFunction('backup/create')
      },
      async restore(key) {
        return callFunction('backup/restore', {
          body: JSON.stringify({ key })
        })
      }
    },
    reports: {
      async getDashboardKPIs() {
        return callFunction('reports/dashboard-kpis')
      },
      async getAgingReport() {
        return callFunction('reports/aging')
      },
      async getPeriodReport(start, end) {
        return callFunction('reports/period', {
          body: JSON.stringify({ start, end })
        })
      },
      async getAcquiredAssets() {
        return callFunction('reports/acquired-assets')
      }
    },
    disbursements: {
      async getAll(filters) {
        const result = await client.models.Disbursement.list({
          filter: filters
            ? Object.entries(filters).map(([field, value]) => ({ [field]: { eq: value } }))
            : undefined
        })
        return result.data ?? []
      },
      async approve(id, userId) {
        return callFunction('disbursement/approve', {
          body: JSON.stringify({ id, userId })
        })
      },
      async cancel(id) {
        return callFunction('disbursement/cancel', {
          body: JSON.stringify({ id })
        })
      }
    },
    signwell: {
      async createDocument(payload) {
        return callFunction('signwell/create', {
          body: JSON.stringify(payload)
        })
      },
      async getEmbeddedRequestingUrl(documentId) {
        return callFunction('signwell/embedded-url', {
          body: JSON.stringify({ documentId })
        })
      },
      async updateAndSend(payload) {
        return callFunction('signwell/update-send', {
          body: JSON.stringify(payload)
        })
      }
    }
  }
}


