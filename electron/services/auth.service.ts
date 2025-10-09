import bcrypt from 'bcryptjs'
import { DatabaseService } from '../database/database.service'

export interface LoginResult {
  success: boolean
  user?: {
    id: number
    username: string
    role: string
    fullName: string
    mustChangePassword: boolean
  }
  error?: string
}

export class AuthService {
  private db

  constructor(dbService: DatabaseService) {
    this.db = dbService.getDatabase()
  }

  async login(username: string, password: string): Promise<LoginResult> {
    try {
      // Get user from database
      const stmt = this.db.prepare(`
        SELECT id, username, password_hash, role, full_name, must_change_password, is_active
        FROM users
        WHERE username = ?
      `)
      const user = stmt.get(username) as any

      if (!user) {
        return { success: false, error: 'Invalid username or password' }
      }

      if (!user.is_active) {
        return { success: false, error: 'Account is deactivated' }
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password_hash)
      
      if (!isValid) {
        return { success: false, error: 'Invalid username or password' }
      }

      // Update last login
      const updateStmt = this.db.prepare(`
        UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
      `)
      updateStmt.run(user.id)

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          fullName: user.full_name,
          mustChangePassword: Boolean(user.must_change_password),
        }
      }
    } catch (error: any) {
      console.error('Login error:', error)
      return { success: false, error: 'Authentication failed' }
    }
  }

  logout(userId: number): boolean {
    // In a desktop app, logout is mostly client-side
    // Could log audit trail here
    return true
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<{ success: boolean, error?: string }> {
    try {
      // Get current password hash
      const stmt = this.db.prepare('SELECT password_hash FROM users WHERE id = ?')
      const user = stmt.get(userId) as any

      if (!user) {
        return { success: false, error: 'User not found' }
      }

      // Verify old password
      const isValid = await bcrypt.compare(oldPassword, user.password_hash)
      if (!isValid) {
        return { success: false, error: 'Current password is incorrect' }
      }

      // Hash new password
      const newHash = await bcrypt.hash(newPassword, 10)

      // Update password and clear must_change_password flag
      const updateStmt = this.db.prepare(`
        UPDATE users 
        SET password_hash = ?, must_change_password = 0 
        WHERE id = ?
      `)
      updateStmt.run(newHash, userId)

      return { success: true }
    } catch (error: any) {
      console.error('Change password error:', error)
      return { success: false, error: 'Failed to change password' }
    }
  }
}

