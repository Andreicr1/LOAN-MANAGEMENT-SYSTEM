declare const electronAPI: {
    auth: {
        login: (username: string, password: string) => Promise<any>;
        logout: (userId: number) => Promise<any>;
        changePassword: (userId: number, oldPassword: string, newPassword: string) => Promise<any>;
    };
    users: {
        getAll: () => Promise<any>;
        getById: (id: number) => Promise<any>;
        create: (data: any) => Promise<any>;
        update: (id: number, data: any) => Promise<any>;
        delete: (id: number) => Promise<any>;
        resetPassword: (userId: number, newPassword: string) => Promise<any>;
    };
    config: {
        get: () => Promise<any>;
        update: (data: any) => Promise<any>;
        setupIntegrations: () => Promise<{ success: boolean; message?: string; error?: string }>;
        unlock: (secret: string) => Promise<{ success: boolean; error?: string }>;
        lock: () => Promise<{ success: boolean }>;
    };
    audit: {
        log: (userId: number, action: string, details: any) => Promise<any>;
        getAll: (filters?: any) => Promise<any>;
    };
    disbursements: {
        getAll: (filters?: any) => Promise<any>;
        getById: (id: number) => Promise<any>;
        create: (data: any) => Promise<any>;
        update: (id: number, data: any) => Promise<any>;
        approve: (id: number, approvedBy: number, signedRequestPath?: string) => Promise<any>;
        cancel: (id: number) => Promise<any>;
        uploadDocument: (id: number, fieldName: string, filePath: string) => Promise<any>;
    };
    promissoryNotes: {
        getAll: (filters?: any) => Promise<any>;
        getById: (id: number) => Promise<any>;
        getByDisbursementId: (disbursementId: number) => Promise<any>;
        create: (data: any) => Promise<any>;
        update: (id: number, data: any) => Promise<any>;
        settle: (id: number, amount: number, date: string) => Promise<any>;
        updateOverdue: () => Promise<any>;
    };
    pdf: {
        generatePromissoryNote: (data: any) => Promise<any>;
        generateWireTransfer: (data: any) => Promise<any>;
        generateDebitNote: (data: any) => Promise<any>;
    };
    interest: {
        calculateAll: () => Promise<any>;
        getForPN: (pnId: number, asOfDate?: string) => Promise<any>;
        getTotal: () => Promise<any>;
        getHistory: (pnId: number, startDate: string, endDate: string) => Promise<any>;
    };
    bankRecon: {
        getAll: (filters?: any) => Promise<any>;
        import: (transaction: any) => Promise<any>;
        importCSV: (filePath: string) => Promise<any>;
        match: (transactionId: number, pnId: number, userId: number) => Promise<any>;
        unmatch: (transactionId: number) => Promise<any>;
        suggestMatches: (transactionId: number) => Promise<any>;
        getSummary: () => Promise<any>;
    };
    debitNotes: {
        getAll: () => Promise<any>;
        getById: (id: number) => Promise<any>;
        create: (data: any) => Promise<any>;
        update: (id: number, data: any) => Promise<any>;
        markPaid: (id: number) => Promise<any>;
        updateOverdue: () => Promise<any>;
    };
    reports: {
        getDashboardKPIs: () => Promise<any>;
        getAgingReport: () => Promise<any>;
        getTimeSeries: (startDate: string, endDate: string) => Promise<any>;
        getPeriodReport: (startDate: string, endDate: string) => Promise<any>;
        getTopPNs: (limit: number) => Promise<any>;
        getAcquiredAssets: () => Promise<any>;
    };
    backup: {
        create: () => Promise<any>;
        restore: (backupFile: string) => Promise<any>;
        list: () => Promise<any>;
    };
    parsePDF: (base64Data: string) => Promise<any>;
    openPDF: (pdfPath: string) => Promise<any>;
};
export type ElectronAPI = typeof electronAPI;
export {};
