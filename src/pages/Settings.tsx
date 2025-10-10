import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/stores/authStore'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTheme } from '@/contexts/ThemeContext'
import { formatMoney, formatPercentage, formatDateTime } from '@/lib/utils'

interface Config {
  creditLimitTotal: number
  interestRateAnnual: number
  dayBasis: 360 | 365
  defaultDueDays: number
  pnNumberFormat: string
  lender: {
    name: string
    taxId: string
    address: string
    jurisdiction: string
  }
  borrower: {
    name: string
    taxId: string
    address: string
    jurisdiction: string
  }
  lenderSignatories?: Array<{ name: string; email: string; role: string }>
  borrowerSignatories?: Array<{ name: string; email: string; role: string }>
  docusign?: {
    integrationKey: string
    accountId: string
    webhookUrl: string
    webhookSecret: string
    environment: 'demo' | 'production'
  }
  email?: {
    host: string
    port: number
    secure: boolean
    user: string
    pass: string
    bankEmail: string
  }
}

export const Settings: React.FC = () => {
  const currentUser = useAuthStore((state) => state.user)
  const { t } = useLanguage()
  const theme = useTheme()
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [backups, setBackups] = useState<any[]>([])
  const [showBackups, setShowBackups] = useState(false)

  // Helper functions to safely update nested config properties
  const updateDocusign = (field: keyof NonNullable<Config['docusign']>, value: any) => {
    if (!config) return;
    
    setConfig({
      ...config,
      docusign: {
        integrationKey: config.docusign?.integrationKey || '',
        accountId: config.docusign?.accountId || '',
        webhookUrl: config.docusign?.webhookUrl || '',
        webhookSecret: config.docusign?.webhookSecret || '',
        environment: config.docusign?.environment || 'demo',
        [field]: value
      }
    })
  }

  const updateEmail = (field: keyof NonNullable<Config['email']>, value: any) => {
    if (!config) return;
    
    setConfig({
      ...config,
      email: {
        host: config.email?.host || 'smtp.gmail.com',
        port: config.email?.port || 587,
        secure: config.email?.secure || false,
        user: config.email?.user || 'operations@wmf-corp.com',
        pass: config.email?.pass || '',
        bankEmail: config.email?.bankEmail || '',
        [field]: value
      }
    })
  }

  useEffect(() => {
    loadConfig()
    loadBackups()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const data = await window.electronAPI.config.get()
      setConfig({
        ...data,
        lenderSignatories: data.lenderSignatories ? JSON.parse(data.lenderSignatories) : [],
        borrowerSignatories: data.borrowerSignatories ? JSON.parse(data.borrowerSignatories) : [],
        docusign: data.docusignIntegrationKey ? {
          integrationKey: data.docusignIntegrationKey || '',
          accountId: data.docusignAccountId || '',
          webhookUrl: data.webhookUrl || '',
          webhookSecret: data.webhookSecret || '',
          environment: data.docusignBasePath?.includes('demo') ? 'demo' : 'production'
        } : undefined,
        email: {
          host: data.emailHost || 'smtp.gmail.com',
          port: data.emailPort || 587,
          secure: data.emailSecure || false,
          user: data.emailUser || 'operations@wmf-corp.com',
          pass: data.emailPass || '',
          bankEmail: data.bankEmail || ''
        }
      })
    } catch (error) {
      console.error('Failed to load config:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBackups = async () => {
    try {
      const data = await window.electronAPI.backup.list()
      setBackups(data)
    } catch (error) {
      console.error('Failed to load backups:', error)
    }
  }

  const handleSave = async () => {
    if (!config) return

    setSaving(true)
    setMessage(null)

    try {
      // Transform the config to match backend format
      const configToSave = {
        ...config,
        // Signatories
        lenderSignatories: config.lenderSignatories ? JSON.stringify(config.lenderSignatories) : null,
        borrowerSignatories: config.borrowerSignatories ? JSON.stringify(config.borrowerSignatories) : null,
        // DocuSign fields
        docusignIntegrationKey: config.docusign?.integrationKey || null,
        docusignAccountId: config.docusign?.accountId || null,
        webhookUrl: config.docusign?.webhookUrl || null,
        webhookSecret: config.docusign?.webhookSecret || null,
        docusignBasePath: config.docusign?.environment === 'production' 
          ? 'https://na3.docusign.net/restapi' 
          : 'https://demo.docusign.net/restapi',
        // Email fields
        emailHost: config.email?.host || 'smtp.gmail.com',
        emailPort: config.email?.port || 587,
        emailSecure: config.email?.secure ? 1 : 0,
        emailUser: config.email?.user || 'operations@wmf-corp.com',
        emailPass: config.email?.pass || null,
        bankEmail: config.email?.bankEmail || null
      }
      
      // Remove the nested objects
      delete configToSave.docusign
      delete configToSave.email
      
      const result = await window.electronAPI.config.update(configToSave)
      
      if (result.success) {
        await window.electronAPI.audit.log(currentUser!.id, 'CONFIG_UPDATED', {
          creditLimit: config.creditLimitTotal,
          interestRate: config.interestRateAnnual,
          docusignConfigured: !!config.docusign?.integrationKey,
          emailConfigured: !!config.email?.pass
        })
        
        setMessage({ type: 'success', text: 'Settings saved successfully' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save settings' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setSaving(false)
    }
  }

  const handleBackup = async () => {
    try {
      const result = await window.electronAPI.backup.create()
      
      if (result.success) {
        await window.electronAPI.audit.log(currentUser!.id, 'DATABASE_BACKUP_CREATED', {
          backupFile: result.backupFile,
        })
        
        setMessage({ type: 'success', text: 'Backup created successfully' })
        loadBackups()
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to create backup' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' })
    }
  }

  const handleRestore = async (backupFile: string) => {
    if (!confirm(`Restore database from ${backupFile}? This will overwrite current data.`)) {
      return
    }

    try {
      const result = await window.electronAPI.backup.restore(backupFile)
      
      if (result.success) {
        await window.electronAPI.audit.log(currentUser!.id, 'DATABASE_RESTORED', {
          backupFile,
        })
        
        alert('Database restored successfully. The application will now restart.')
        window.location.reload()
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to restore backup' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' })
    }
  }

  if (loading || !config) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-text-primary">Settings</h1>
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-text-secondary">Loading settings...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Settings</h1>
          <p className="text-text-secondary mt-1">Configure credit line parameters</p>
        </div>
        <Button onClick={handleSave} loading={saving}>
          Save Changes
        </Button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Credit Line Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Credit Line Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Input
                label="Total Credit Limit (USD)"
                type="number"
                step="0.01"
                value={config.creditLimitTotal}
                onChange={(e) => setConfig({ ...config, creditLimitTotal: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-text-secondary mt-1">
                Current: {formatMoney(config.creditLimitTotal)}
              </p>
            </div>

            <div>
              <Input
                label="Annual Interest Rate (%)"
                type="number"
                step="0.01"
                value={config.interestRateAnnual}
                onChange={(e) => setConfig({ ...config, interestRateAnnual: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-text-secondary mt-1">
                Current: {formatPercentage(config.interestRateAnnual)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5">
                Day Basis for Interest Calculation
              </label>
              <select
                value={config.dayBasis}
                onChange={(e) => setConfig({ ...config, dayBasis: parseInt(e.target.value) as 360 | 365 })}
                className="w-full px-3 py-2.5 text-sm border border-border-gray rounded-md focus:outline-none focus:ring-2 focus:ring-green-primary"
                aria-label="Day basis for interest calculation"
              >
                <option value="360">360 days (Standard)</option>
                <option value="365">365 days (Actual)</option>
              </select>
            </div>

            <div>
              <Input
                label="Default Due Days"
                type="number"
                value={config.defaultDueDays}
                onChange={(e) => setConfig({ ...config, defaultDueDays: parseInt(e.target.value) })}
              />
              <p className="text-xs text-text-secondary mt-1">
                Days after disbursement
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lender Information */}
      <Card>
        <CardHeader>
          <CardTitle>Lender Information (WMF Corp)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Legal Name"
              value={config.lender.name}
              onChange={(e) => setConfig({
                ...config,
                lender: { ...config.lender, name: e.target.value }
              })}
            />

            <Input
              label="Tax ID / Registration Number"
              value={config.lender.taxId}
              onChange={(e) => setConfig({
                ...config,
                lender: { ...config.lender, taxId: e.target.value }
              })}
            />

            <div className="md:col-span-2">
              <Input
                label="Address"
                value={config.lender.address}
                onChange={(e) => setConfig({
                  ...config,
                  lender: { ...config.lender, address: e.target.value }
                })}
              />
            </div>

            <Input
              label="Jurisdiction"
              value={config.lender.jurisdiction}
              onChange={(e) => setConfig({
                ...config,
                lender: { ...config.lender, jurisdiction: e.target.value }
              })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Borrower Information */}
      <Card>
        <CardHeader>
          <CardTitle>Borrower Information (Whole Max)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Legal Name"
              value={config.borrower.name}
              onChange={(e) => setConfig({
                ...config,
                borrower: { ...config.borrower, name: e.target.value }
              })}
            />

            <Input
              label="Tax ID / EIN"
              value={config.borrower.taxId}
              onChange={(e) => setConfig({
                ...config,
                borrower: { ...config.borrower, taxId: e.target.value }
              })}
            />

            <div className="md:col-span-2">
              <Input
                label="Address"
                value={config.borrower.address}
                onChange={(e) => setConfig({
                  ...config,
                  borrower: { ...config.borrower, address: e.target.value }
                })}
              />
            </div>

            <Input
              label="Jurisdiction"
              value={config.borrower.jurisdiction}
              onChange={(e) => setConfig({
                ...config,
                borrower: { ...config.borrower, jurisdiction: e.target.value }
              })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Authorized Signatories */}
      <Card>
        <CardHeader>
          <CardTitle>Authorized Signatories for DocuSign</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* WMF Corp Signatories */}
            <div>
              <h4 className="text-sm font-bold text-text-primary mb-3">WMF Corp Signatories (Lender)</h4>
              <div className="space-y-2 text-sm">
                {config.lenderSignatories && config.lenderSignatories.length > 0 ? (
                  config.lenderSignatories.map((sig, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-border-gray">
                      <div>
                        <p className="font-semibold text-text-primary">{sig.name}</p>
                        <p className="text-xs text-text-secondary">{sig.email} • {sig.role}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-text-secondary">No signatories configured. Add them in Clients page.</p>
                )}
              </div>
            </div>

            {/* Whole Max Signatories */}
            <div className="pt-4 border-t border-border-gray">
              <h4 className="text-sm font-bold text-text-primary mb-3">Whole Max Signatories (Borrower)</h4>
              <div className="space-y-2 text-sm">
                {config.borrowerSignatories && config.borrowerSignatories.length > 0 ? (
                  config.borrowerSignatories.map((sig, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-border-gray">
                      <div>
                        <p className="font-semibold text-text-primary">{sig.name}</p>
                        <p className="text-xs text-text-secondary">{sig.email} • {sig.role}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-text-secondary">No signatories configured. Will use client signatories.</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-border-gray">
              <p className="text-xs text-text-secondary">
                Note: These signatories will be used for document signing via DocuSign. 
                You can also manage client-specific signatories in the Clients page.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customization */}
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.customization}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary mb-6">
            {t.settings.customizationDesc}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">
                {t.settings.primaryColor}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={theme.colors.primary}
                  onChange={(e) => theme.updateColors({ primary: e.target.value })}
                  className="w-16 h-10 rounded border border-border-gray cursor-pointer"
                  title="Select primary color"
                  aria-label="Primary color picker"
                />
                <span className="text-sm text-text-secondary font-mono">
                  {theme.colors.primary}
                </span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">
                {t.settings.lightColor}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={theme.colors.primaryLight}
                  onChange={(e) => theme.updateColors({ primaryLight: e.target.value })}
                  className="w-16 h-10 rounded border border-border-gray cursor-pointer"
                  title="Select light accent color"
                  aria-label="Light accent color picker"
                />
                <span className="text-sm text-text-secondary font-mono">
                  {theme.colors.primaryLight}
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="secondary"
            className="mt-6"
            onClick={() => {
              theme.resetColors()
              setMessage({ type: 'success', text: t.settings.success.colorsReset })
              setTimeout(() => setMessage(null), 3000)
            }}
          >
            {t.settings.resetColors}
          </Button>

          {/* Preview */}
          <div className="mt-8 p-6 border border-border-gray rounded-lg bg-green-subtle/30">
            <p className="text-sm font-semibold text-text-primary mb-4">{t.settings.previewTheme}</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" size="sm">Primary Button</Button>
              <Button variant="secondary" size="sm">Secondary Button</Button>
              <div className="px-4 py-2 bg-green-primary text-white rounded-lg text-sm font-medium">
                Primary Badge
              </div>
              <div className="px-4 py-2 bg-green-subtle text-green-primary rounded-lg text-sm font-medium border border-green-primary">
                Subtle Badge
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DocuSign Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>DocuSign Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Integration Key"
              type="password"
              value={config.docusign?.integrationKey || ''}
              onChange={(e) => updateDocusign('integrationKey', e.target.value)}
              placeholder="Enter DocuSign Integration Key"
            />

            <Input
              label="Account ID"
              value={config.docusign?.accountId || ''}
              onChange={(e) => updateDocusign('accountId', e.target.value)}
              placeholder="Enter DocuSign Account ID"
            />

            <Input
              label="Webhook URL"
              value={config.docusign?.webhookUrl || ''}
              onChange={(e) => updateDocusign('webhookUrl', e.target.value)}
              placeholder="https://yourdomain.com/webhook/docusign"
            />

            <Input
              label="Webhook Secret"
              type="password"
              value={config.docusign?.webhookSecret || ''}
              onChange={(e) => updateDocusign('webhookSecret', e.target.value)}
              placeholder="Enter Webhook Secret"
            />

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-text-primary mb-1.5">
                Environment
              </label>
              <select
                value={config.docusign?.environment || 'demo'}
                onChange={(e) => updateDocusign('environment', e.target.value as 'demo' | 'production')}
                className="w-full px-3 py-2.5 text-sm border border-border-gray rounded-md focus:outline-none focus:ring-2 focus:ring-green-primary"
                aria-label="DocuSign environment selection"
              >
                <option value="demo">Demo/Sandbox</option>
                <option value="production">Production</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Email Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="SMTP Host"
              value={config.email?.host || 'smtp.gmail.com'}
              onChange={(e) => updateEmail('host', e.target.value)}
            />

            <Input
              label="SMTP Port"
              type="number"
              value={config.email?.port || 587}
              onChange={(e) => updateEmail('port', parseInt(e.target.value))}
            />

            <Input
              label="Email User"
              value={config.email?.user || 'operations@wmf-corp.com'}
              onChange={(e) => updateEmail('user', e.target.value)}
            />

            <Input
              label="Email Password"
              type="password"
              value={config.email?.pass || ''}
              onChange={(e) => updateEmail('pass', e.target.value)}
              placeholder="Enter email password"
            />

            <Input
              label="Bank Email Address"
              value={config.email?.bankEmail || ''}
              onChange={(e) => updateEmail('bankEmail', e.target.value)}
              placeholder="bank@example.com"
            />

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.email?.secure || false}
                  onChange={(e) => updateEmail('secure', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium">Use SSL/TLS</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup & Restore */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t.settings.database}</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowBackups(!showBackups)}
              >
                {showBackups ? 'Hide Backups' : `View Backups (${backups.length})`}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBackup}
              >
                Create Backup
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary">
            Automatic backups are created daily. You can also create manual backups at any time.
          </p>
          
          {showBackups && backups.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold text-text-primary mb-2">Available Backups:</p>
              {backups.slice(0, 5).map((backup) => (
                <div
                  key={backup.name}
                  className="flex items-center justify-between p-2 border border-border-gray rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium">{backup.name}</p>
                    <p className="text-xs text-text-secondary">
                      {formatDateTime(backup.created)} | {(backup.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRestore(backup.name)}
                  >
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

