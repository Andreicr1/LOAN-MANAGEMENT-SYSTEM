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
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
var BackupService = /** @class */ (function () {
    function BackupService(dbPath) {
        this.maxBackups = 10;
        this.dbPath = dbPath;
        this.backupPath = path.join(app.getPath('userData'), 'backups');
        // Create backup directory if it doesn't exist
        if (!fs.existsSync(this.backupPath)) {
            fs.mkdirSync(this.backupPath, { recursive: true });
        }
    }
    BackupService.prototype.createBackup = function () {
        return __awaiter(this, void 0, void 0, function () {
            var timestamp, backupFileName, backupFilePath, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                        backupFileName = "backup_".concat(timestamp, ".db");
                        backupFilePath = path.join(this.backupPath, backupFileName);
                        // Copy database file
                        return [4 /*yield*/, fs.promises.copyFile(this.dbPath, backupFilePath)
                            // Clean old backups
                        ];
                    case 1:
                        // Copy database file
                        _a.sent();
                        // Clean old backups
                        return [4 /*yield*/, this.cleanOldBackups()];
                    case 2:
                        // Clean old backups
                        _a.sent();
                        console.log("Backup created: ".concat(backupFilePath));
                        return [2 /*return*/, { success: true, backupFile: backupFilePath }];
                    case 3:
                        error_1 = _a.sent();
                        console.error('Backup error:', error_1);
                        return [2 /*return*/, { success: false, error: error_1.message }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    BackupService.prototype.restoreBackup = function (backupFile) {
        return __awaiter(this, void 0, void 0, function () {
            var backupFilePath, tempBackup, restoreError_1, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 9, , 10]);
                        backupFilePath = path.join(this.backupPath, backupFile);
                        if (!fs.existsSync(backupFilePath)) {
                            return [2 /*return*/, { success: false, error: 'Backup file not found' }];
                        }
                        tempBackup = this.dbPath + '.temp';
                        return [4 /*yield*/, fs.promises.copyFile(this.dbPath, tempBackup)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 5, , 8]);
                        // Restore from backup
                        return [4 /*yield*/, fs.promises.copyFile(backupFilePath, this.dbPath)
                            // Delete temp backup
                        ];
                    case 3:
                        // Restore from backup
                        _a.sent();
                        // Delete temp backup
                        return [4 /*yield*/, fs.promises.unlink(tempBackup)];
                    case 4:
                        // Delete temp backup
                        _a.sent();
                        console.log("Database restored from: ".concat(backupFilePath));
                        return [2 /*return*/, { success: true }];
                    case 5:
                        restoreError_1 = _a.sent();
                        // Restore failed, rollback to temp backup
                        return [4 /*yield*/, fs.promises.copyFile(tempBackup, this.dbPath)];
                    case 6:
                        // Restore failed, rollback to temp backup
                        _a.sent();
                        return [4 /*yield*/, fs.promises.unlink(tempBackup)];
                    case 7:
                        _a.sent();
                        throw restoreError_1;
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        error_2 = _a.sent();
                        console.error('Restore error:', error_2);
                        return [2 /*return*/, { success: false, error: error_2.message }];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    BackupService.prototype.getBackupList = function () {
        return __awaiter(this, void 0, void 0, function () {
            var files, backups, _i, files_1, file, filePath, stats, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, fs.promises.readdir(this.backupPath)];
                    case 1:
                        files = _a.sent();
                        backups = [];
                        _i = 0, files_1 = files;
                        _a.label = 2;
                    case 2:
                        if (!(_i < files_1.length)) return [3 /*break*/, 5];
                        file = files_1[_i];
                        if (!file.endsWith('.db')) return [3 /*break*/, 4];
                        filePath = path.join(this.backupPath, file);
                        return [4 /*yield*/, fs.promises.stat(filePath)];
                    case 3:
                        stats = _a.sent();
                        backups.push({
                            name: file,
                            size: stats.size,
                            created: stats.birthtime,
                        });
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5:
                        // Sort by creation date, newest first
                        backups.sort(function (a, b) { return b.created.getTime() - a.created.getTime(); });
                        return [2 /*return*/, backups];
                    case 6:
                        error_3 = _a.sent();
                        console.error('Error listing backups:', error_3);
                        return [2 /*return*/, []];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    BackupService.prototype.cleanOldBackups = function () {
        return __awaiter(this, void 0, void 0, function () {
            var backups, toDelete, _i, toDelete_1, backup, filePath, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        return [4 /*yield*/, this.getBackupList()];
                    case 1:
                        backups = _a.sent();
                        if (!(backups.length > this.maxBackups)) return [3 /*break*/, 5];
                        toDelete = backups.slice(this.maxBackups);
                        _i = 0, toDelete_1 = toDelete;
                        _a.label = 2;
                    case 2:
                        if (!(_i < toDelete_1.length)) return [3 /*break*/, 5];
                        backup = toDelete_1[_i];
                        filePath = path.join(this.backupPath, backup.name);
                        return [4 /*yield*/, fs.promises.unlink(filePath)];
                    case 3:
                        _a.sent();
                        console.log("Deleted old backup: ".concat(backup.name));
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        error_4 = _a.sent();
                        console.error('Error cleaning old backups:', error_4);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    BackupService.prototype.enableAutoBackup = function (intervalHours) {
        if (intervalHours === void 0) { intervalHours = 24; }
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // Create initial backup
                    return [4 /*yield*/, this.createBackup()
                        // Schedule periodic backups
                    ];
                    case 1:
                        // Create initial backup
                        _a.sent();
                        // Schedule periodic backups
                        setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, this.createBackup()];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }, intervalHours * 60 * 60 * 1000);
                        return [2 /*return*/];
                }
            });
        });
    };
    return BackupService;
}());
module.exports = { BackupService };
