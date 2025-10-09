export declare class BackupService {
    private dbPath;
    private backupPath;
    private maxBackups;
    constructor(dbPath: string);
    createBackup(): Promise<{
        success: boolean;
        backupFile?: string;
        error?: string;
    }>;
    restoreBackup(backupFile: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    getBackupList(): Promise<Array<{
        name: string;
        size: number;
        created: Date;
    }>>;
    private cleanOldBackups;
    enableAutoBackup(intervalHours?: number): Promise<void>;
}
