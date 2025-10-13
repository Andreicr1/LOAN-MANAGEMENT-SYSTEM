"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
class BackupService {
    constructor(dbPath) {
        this.maxBackups = 10;
        this.dbPath = dbPath;
        this.backupPath = path_1.default.join(electron_1.app.getPath('userData'), 'backups');
        // Create backup directory if it doesn't exist
        if (!fs_1.default.existsSync(this.backupPath)) {
            fs_1.default.mkdirSync(this.backupPath, { recursive: true });
        }
    }
    async createBackup() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFileName = `backup_${timestamp}.db`;
            const backupFilePath = path_1.default.join(this.backupPath, backupFileName);
            // Copy database file
            await fs_1.default.promises.copyFile(this.dbPath, backupFilePath);
            // Clean old backups
            await this.cleanOldBackups();
            console.log(`Backup created: ${backupFilePath}`);
            return { success: true, backupFile: backupFilePath };
        }
        catch (error) {
            console.error('Backup error:', error);
            return { success: false, error: error.message };
        }
    }
    async restoreBackup(backupFile) {
        try {
            const backupFilePath = path_1.default.join(this.backupPath, backupFile);
            if (!fs_1.default.existsSync(backupFilePath)) {
                return { success: false, error: 'Backup file not found' };
            }
            // Create a backup of current database before restore
            const tempBackup = this.dbPath + '.temp';
            await fs_1.default.promises.copyFile(this.dbPath, tempBackup);
            try {
                // Restore from backup
                await fs_1.default.promises.copyFile(backupFilePath, this.dbPath);
                // Delete temp backup
                await fs_1.default.promises.unlink(tempBackup);
                console.log(`Database restored from: ${backupFilePath}`);
                return { success: true };
            }
            catch (restoreError) {
                // Restore failed, rollback to temp backup
                await fs_1.default.promises.copyFile(tempBackup, this.dbPath);
                await fs_1.default.promises.unlink(tempBackup);
                throw restoreError;
            }
        }
        catch (error) {
            console.error('Restore error:', error);
            return { success: false, error: error.message };
        }
    }
    async getBackupList() {
        try {
            const files = await fs_1.default.promises.readdir(this.backupPath);
            const backups = [];
            for (const file of files) {
                if (file.endsWith('.db')) {
                    const filePath = path_1.default.join(this.backupPath, file);
                    const stats = await fs_1.default.promises.stat(filePath);
                    backups.push({
                        name: file,
                        size: stats.size,
                        created: stats.birthtime,
                    });
                }
            }
            // Sort by creation date, newest first
            backups.sort((a, b) => b.created.getTime() - a.created.getTime());
            return backups;
        }
        catch (error) {
            console.error('Error listing backups:', error);
            return [];
        }
    }
    async cleanOldBackups() {
        try {
            const backups = await this.getBackupList();
            if (backups.length > this.maxBackups) {
                // Delete oldest backups
                const toDelete = backups.slice(this.maxBackups);
                for (const backup of toDelete) {
                    const filePath = path_1.default.join(this.backupPath, backup.name);
                    await fs_1.default.promises.unlink(filePath);
                    console.log(`Deleted old backup: ${backup.name}`);
                }
            }
        }
        catch (error) {
            console.error('Error cleaning old backups:', error);
        }
    }
    async enableAutoBackup(intervalHours = 24) {
        // Create initial backup
        await this.createBackup();
        // Schedule periodic backups
        setInterval(async () => {
            await this.createBackup();
        }, intervalHours * 60 * 60 * 1000);
    }
}
exports.BackupService = BackupService;
