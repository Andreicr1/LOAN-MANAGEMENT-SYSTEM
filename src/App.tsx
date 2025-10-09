import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { LanguageProvider } from './contexts/LanguageContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Users } from './pages/Users'
import { Settings } from './pages/Settings'
import { Disbursements } from './pages/Disbursements'
import { CreateDisbursement } from './pages/CreateDisbursement'
import { DisbursementDetail } from './pages/DisbursementDetail'
import { PromissoryNotes } from './pages/PromissoryNotes'
import { BankReconciliation } from './pages/BankReconciliation'
import { DebitNotes } from './pages/DebitNotes'
import { Reports } from './pages/Reports'
import { Clients } from './pages/Clients'
import { MainLayout } from './components/layout/MainLayout'

// Placeholder pages (will be implemented in future sprints)
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="space-y-6">
    <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
    <p className="text-text-secondary">This page will be implemented in the next sprint.</p>
  </div>
)

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return (
    <ThemeProvider>
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/login" 
              element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} 
            />
            
            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="disbursements" element={<Disbursements />} />
              <Route path="disbursements/new" element={<CreateDisbursement />} />
              <Route path="disbursements/:id" element={<DisbursementDetail />} />
              <Route path="promissory-notes" element={<PromissoryNotes />} />
              <Route path="bank-reconciliation" element={<BankReconciliation />} />
              <Route path="debit-notes" element={<DebitNotes />} />
              <Route path="reports" element={<Reports />} />
              <Route path="clients" element={<Clients />} />
              <Route path="users" element={<Users />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App

