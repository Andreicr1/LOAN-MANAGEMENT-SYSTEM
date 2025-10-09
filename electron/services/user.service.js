var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import bcrypt from 'bcryptjs';
var UserService = /** @class */ (function () {
    function UserService(dbService) {
        this.db = dbService.getDatabase();
    }
    UserService.prototype.getAllUsers = function () {
        var stmt = this.db.prepare("\n      SELECT id, username, role, full_name, email, is_active, last_login, created_at\n      FROM users\n      ORDER BY created_at DESC\n    ");
        var rows = stmt.all();
        return rows.map(function (row) { return ({
            id: row.id,
            username: row.username,
            role: row.role,
            fullName: row.full_name,
            email: row.email,
            isActive: Boolean(row.is_active),
            lastLogin: row.last_login,
            createdAt: row.created_at,
        }); });
    };
    UserService.prototype.getUserById = function (id) {
        var stmt = this.db.prepare("\n      SELECT id, username, role, full_name, email, is_active, last_login, created_at\n      FROM users\n      WHERE id = ?\n    ");
        var row = stmt.get(id);
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
    };
    UserService.prototype.createUser = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var passwordHash, stmt, result, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, bcrypt.hash(data.password, 10)];
                    case 1:
                        passwordHash = _a.sent();
                        stmt = this.db.prepare("\n        INSERT INTO users (username, password_hash, role, full_name, email, must_change_password, created_by)\n        VALUES (?, ?, ?, ?, ?, 1, ?)\n      ");
                        result = stmt.run(data.username, passwordHash, data.role, data.fullName, data.email || null, data.createdBy);
                        return [2 /*return*/, { success: true, userId: result.lastInsertRowid }];
                    case 2:
                        error_1 = _a.sent();
                        console.error('Create user error:', error_1);
                        if (error_1.message.includes('UNIQUE constraint')) {
                            return [2 /*return*/, { success: false, error: 'Username already exists' }];
                        }
                        return [2 /*return*/, { success: false, error: 'Failed to create user' }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    UserService.prototype.updateUser = function (id, data) {
        try {
            var updates = [];
            var params = [];
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
            var stmt = this.db.prepare("\n        UPDATE users SET ".concat(updates.join(', '), " WHERE id = ?\n      "));
            stmt.run.apply(stmt, params);
            return { success: true };
        }
        catch (error) {
            console.error('Update user error:', error);
            return { success: false, error: 'Failed to update user' };
        }
    };
    UserService.prototype.deleteUser = function (id) {
        try {
            // Prevent deleting the default admin (id = 1)
            if (id === 1) {
                return { success: false, error: 'Cannot delete default admin user' };
            }
            var stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
            stmt.run(id);
            return { success: true };
        }
        catch (error) {
            console.error('Delete user error:', error);
            return { success: false, error: 'Failed to delete user' };
        }
    };
    UserService.prototype.resetPassword = function (userId, newPassword) {
        return __awaiter(this, void 0, void 0, function () {
            var passwordHash, stmt, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, bcrypt.hash(newPassword, 10)];
                    case 1:
                        passwordHash = _a.sent();
                        stmt = this.db.prepare("\n        UPDATE users \n        SET password_hash = ?, must_change_password = 1\n        WHERE id = ?\n      ");
                        stmt.run(passwordHash, userId);
                        return [2 /*return*/, { success: true }];
                    case 2:
                        error_2 = _a.sent();
                        console.error('Reset password error:', error_2);
                        return [2 /*return*/, { success: false, error: 'Failed to reset password' }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return UserService;
}());
export { UserService };
