import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export const Login: React.FC = () => {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const { t } = useLanguage()
  
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username || !password) {
      setError(t.login.errors.required)
      return
    }

    // Check if electronAPI is available
    if (!window.electronAPI) {
      setError(t.login.errors.apiNotAvailable)
      console.error('window.electronAPI is undefined')
      return
    }

    setLoading(true)

    try {
      console.log('Attempting login with username:', username)
      const result = await login(username, password)
      
      console.log('Login result:', result)
      
      if (result.success) {
        navigate('/dashboard')
      } else {
        setError(result.error || t.login.errors.loginFailed)
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(t.login.errors.genericError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-subtle via-white to-green-subtle/50">
      <div className="w-full max-w-md px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-primary rounded-lg mb-4">
            <span className="text-3xl font-bold text-white">WMF</span>
          </div>
          <h1 className="text-3xl font-bold text-text-primary">{t.login.title}</h1>
          <p className="text-text-secondary mt-2">{t.login.subtitle}</p>
        </div>

        {/* Login Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t.login.signIn}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label={t.login.username}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.login.enterUsername}
                autoComplete="username"
                autoFocus
              />

              <Input
                label={t.login.password}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.login.enterPassword}
                autoComplete="current-password"
              />

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                loading={loading}
              >
                {t.login.signIn}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-text-secondary mt-8">
          {t.login.footer}
        </p>
      </div>
    </div>
  )
}

