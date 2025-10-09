import { DatabaseService } from '../database/database.service';
export interface Config {
    creditLimitTotal: number;
    interestRateAnnual: number;
    dayBasis: 360 | 365;
    defaultDueDays: number;
    pnNumberFormat: string;
    lender: {
        name: string;
        taxId: string;
        address: string;
        jurisdiction: string;
    };
    borrower: {
        name: string;
        taxId: string;
        address: string;
        jurisdiction: string;
    };
}
export declare class ConfigService {
    private db;
    constructor(dbService: DatabaseService);
    getConfig(): Config;
    updateConfig(data: Partial<Config>): {
        success: boolean;
        error?: string;
    };
}
