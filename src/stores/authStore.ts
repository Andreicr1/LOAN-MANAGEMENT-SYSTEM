import { create } from 'zustand'

interface User {
  id: number
  username: string
  role: 'admin' | 'operator' | 'viewer'
  fullName: string
  mustChangePassword: boolean
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<{ success: boolean, error?: string }>
  logout: () => void
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>()((set, get) => ({
      user: null,
      isAuthenticated: false,

      login: async (username: string, password: string) => {
        try {
          const result = await window.electronAPI.auth.login(username, password)
          
          if (result.success && result.user) {
            set({ 
              user: {
                id: result.user.id,
                username: result.user.username,
                role: result.user.role as 'admin' | 'operator' | 'viewer',
                fullName: result.user.fullName,
                mustChangePassword: result.user.mustChangePassword
              }, 
              isAuthenticated: true 
            })
            
            // Log audit
            await window.electronAPI.audit.log(result.user.id, 'USER_LOGIN', {
              username: result.user.username
            })
            
            return { success: true }
          }
          
          return { success: false, error: result.error || 'Login failed' }
        } catch (error: any) {
          console.error('Login error:', error)
          return { success: false, error: 'Connection error' }
        }
      },

      logout: () => {
        const user = get().user
        if (user) {
          window.electronAPI.auth.logout(user.id)
          window.electronAPI.audit.log(user.id, 'USER_LOGOUT', {
            username: user.username
          })
        }
        set({ user: null, isAuthenticated: false })
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user })
      },
    }))

