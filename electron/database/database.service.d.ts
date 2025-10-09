import Database from 'better-sqlite3';
export declare class DatabaseService {
    private db;
    constructor(dbPath: string);
    private initialize;
    private getInlineSchema;
    getDatabase(): Database.Database;
    close(): void;
    logAudit(userId: number, action: string, details: any): Database.RunResult;
    getAuditLogs(filters?: {
        userId?: number;
        startDate?: string;
        endDate?: string;
    }): unknown[];
}
