"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class UserService {
    constructor(dbService) {
        this.db = dbService.getDatabase();
    }
    getAllUsers() {
        const stmt = this.db.prepare(`
      SELECT id, username, role, full_name, email, is_active, last_login, created_at
      FROM users
      ORDER BY created_at DESC
    `);
        const rows = stmt.all();
        return rows.map(row => ({
            id: row.id,
            username: row.username,
            role: row.role,
            fullName: row.full_name,
            email: row.email,
            isActive: Boolean(row.is_active),
            lastLogin: row.last_login,
            createdAt: row.created_at,
        }));
    }
    getUserById(id) {
        const stmt = this.db.prepare(`
      SELECT id, username, role, full_name, email, is_active, last_login, created_at
      FROM users
      WHERE id = ?
    `);
        const row = stmt.get(id);
        if (!row)
            return null;
        return {
            id: row.id,
            username: row.username,
            role: row.role,
            fullName: row.full_name,
            email: row.email,
            isActive: Boolean(row.is_active),
            lastLogin: row.last_login,
            createdAt: row.created_at,
        };
    }
    async createUser(data) {
        try {
            // Hash password
            const passwordHash = await bcryptjs_1.default.hash(data.password, 10);
            const stmt = this.db.prepare(`
        INSERT INTO users (username, password_hash, role, full_name, email, must_change_password, created_by)
        VALUES (?, ?, ?, ?, ?, 1, ?)
      `);
            const result = stmt.run(data.username, passwordHash, data.role, data.fullName, data.email || null, data.createdBy);
            return { success: true, userId: result.lastInsertRowid };
        }
        catch (error) {
            console.error('Create user error:', error);
            if (error.message.includes('UNIQUE constraint')) {
                return { success: false, error: 'Username already exists' };
            }
            return { success: false, error: 'Failed to create user' };
        }
    }
    updateUser(id, data) {
        try {
            const updates = [];
            const params = [];
            if (data.fullName !== undefined) {
                updates.push('full_name = ?');
                params.push(data.fullName);
            }
            if (data.email !== undefined) {
                updates.push('email = ?');
                params.push(data.email);
            }
            if (data.role !== undefined) {
                updates.push('role = ?');
                params.push(data.role);
            }
            if (data.isActive !== undefined) {
                updates.push('is_active = ?');
                params.push(data.isActive ? 1 : 0);
            }
            if (updates.length === 0) {
                return { success: false, error: 'No fields to update' };
            }
            params.push(id);
            const stmt = this.db.prepare(`
        UPDATE users SET ${updates.join(', ')} WHERE id = ?
      `);
            stmt.run(...params);
            return { success: true };
        }
        catch (error) {
            console.error('Update user error:', error);
            return { success: false, error: 'Failed to update user' };
        }
    }
    deleteUser(id) {
        try {
            // Prevent deleting the default admin (id = 1)
            if (id === 1) {
                return { success: false, error: 'Cannot delete default admin user' };
            }
            const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
            stmt.run(id);
            return { success: true };
        }
        catch (error) {
            console.error('Delete user error:', error);
            return { success: false, error: 'Failed to delete user' };
        }
    }
    async resetPassword(userId, newPassword) {
        try {
            const passwordHash = await bcryptjs_1.default.hash(newPassword, 10);
            const stmt = this.db.prepare(`
        UPDATE users 
        SET password_hash = ?, must_change_password = 1
        WHERE id = ?
      `);
            stmt.run(passwordHash, userId);
            return { success: true };
        }
        catch (error) {
            console.error('Reset password error:', error);
            return { success: false, error: 'Failed to reset password' };
        }
    }
}
exports.UserService = UserService;
