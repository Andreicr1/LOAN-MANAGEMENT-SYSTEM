import React from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', roles: ['admin', 'operator', 'viewer'] },
  { name: 'Disbursements', href: '/disbursements', roles: ['admin', 'operator'] },
  { name: 'Promissory Notes', href: '/promissory-notes', roles: ['admin', 'operator', 'viewer'] },
  { name: 'Bank Reconciliation', href: '/bank-reconciliation', roles: ['admin', 'operator'] },
  { name: 'Debit Notes', href: '/debit-notes', roles: ['admin', 'operator'] },
  { name: 'Reports', href: '/reports', roles: ['admin', 'operator', 'viewer'] },
  { name: 'Clients', href: '/clients', roles: ['admin', 'operator'] },
  { name: 'Users', href: '/users', roles: ['admin'] },
  { name: 'Settings', href: '/settings', roles: ['admin'] },
]

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore()

  const allowedNav = navigation.filter(item => 
    user && item.roles.includes(user.role)
  )

  return (
    <div className="flex flex-col h-full w-60 bg-green-dark text-white">
      {/* Logo/Header */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-white/10">
        <div className="w-10 h-10 bg-green-primary rounded flex items-center justify-center">
          <span className="text-lg font-bold text-white">W</span>
        </div>
        <div>
          <h1 className="text-lg font-bold">WMF Corp</h1>
          <p className="text-xs text-white/70">Credit Line Manager</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {allowedNav.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-green-primary text-white'
                  : 'text-white/90 hover:bg-white/10'
              )
            }
          >
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* User Info & Logout */}
      <div className="border-t border-white/10 p-4">
        <div className="mb-3">
          <p className="text-sm font-medium text-white">{user?.fullName}</p>
          <p className="text-xs text-white/60 capitalize">{user?.role}</p>
        </div>
        <button
          onClick={logout}
          className="w-full px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10 rounded-lg transition-colors text-left"
        >
          Logout
        </button>
      </div>
    </div>
  )
}

