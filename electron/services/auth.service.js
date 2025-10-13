"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class AuthService {
    constructor(dbService) {
        this.db = dbService.getDatabase();
    }
    async login(username, password) {
        try {
            // Get user from database
            const stmt = this.db.prepare(`
        SELECT id, username, password_hash, role, full_name, must_change_password, is_active
        FROM users
        WHERE username = ?
      `);
            const user = stmt.get(username);
            if (!user) {
                return { success: false, error: 'Invalid username or password' };
            }
            if (!user.is_active) {
                return { success: false, error: 'Account is deactivated' };
            }
            // Verify password
            const isValid = await bcryptjs_1.default.compare(password, user.password_hash);
            if (!isValid) {
                return { success: false, error: 'Invalid username or password' };
            }
            // Update last login
            const updateStmt = this.db.prepare(`
        UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
      `);
            updateStmt.run(user.id);
            return {
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    fullName: user.full_name,
                    mustChangePassword: Boolean(user.must_change_password),
                }
            };
        }
        catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Authentication failed' };
        }
    }
    logout(userId) {
        // In a desktop app, logout is mostly client-side
        // Could log audit trail here
        return true;
    }
    async changePassword(userId, oldPassword, newPassword) {
        try {
            // Get current password hash
            const stmt = this.db.prepare('SELECT password_hash FROM users WHERE id = ?');
            const user = stmt.get(userId);
            if (!user) {
                return { success: false, error: 'User not found' };
            }
            // Verify old password
            const isValid = await bcryptjs_1.default.compare(oldPassword, user.password_hash);
            if (!isValid) {
                return { success: false, error: 'Current password is incorrect' };
            }
            // Hash new password
            const newHash = await bcryptjs_1.default.hash(newPassword, 10);
            // Update password and clear must_change_password flag
            const updateStmt = this.db.prepare(`
        UPDATE users 
        SET password_hash = ?, must_change_password = 0 
        WHERE id = ?
      `);
            updateStmt.run(newHash, userId);
            return { success: true };
        }
        catch (error) {
            console.error('Change password error:', error);
            return { success: false, error: 'Failed to change password' };
        }
    }
}
exports.AuthService = AuthService;
