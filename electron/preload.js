"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// DECISION: Expose limited, type-safe API to renderer process
const electronAPI = {
    // Auth
    auth: {
        login: (username, password) => electron_1.ipcRenderer.invoke('auth:login', username, password),
        logout: (userId) => electron_1.ipcRenderer.invoke('auth:logout', userId),
        changePassword: (userId, oldPassword, newPassword) => electron_1.ipcRenderer.invoke('auth:changePassword', userId, oldPassword, newPassword),
    },
    // Users
    users: {
        getAll: () => electron_1.ipcRenderer.invoke('users:getAll'),
        getById: (id) => electron_1.ipcRenderer.invoke('users:getById', id),
        create: (data) => electron_1.ipcRenderer.invoke('users:create', data),
        update: (id, data) => electron_1.ipcRenderer.invoke('users:update', id, data),
        delete: (id) => electron_1.ipcRenderer.invoke('users:delete', id),
        resetPassword: (userId, newPassword) => electron_1.ipcRenderer.invoke('users:resetPassword', userId, newPassword),
    },
    // Config
    config: {
        get: () => electron_1.ipcRenderer.invoke('config:get'),
        update: (data) => electron_1.ipcRenderer.invoke('config:update', data),
        setupIntegrations: () => electron_1.ipcRenderer.invoke('config:setupIntegrations'),
        unlock: (secret) => electron_1.ipcRenderer.invoke('config:unlock', secret),
        lock: () => electron_1.ipcRenderer.invoke('config:lock'),
    },
    // Audit
    audit: {
        log: (userId, action, details) => electron_1.ipcRenderer.invoke('audit:log', userId, action, details),
        getAll: (filters) => electron_1.ipcRenderer.invoke('audit:getAll', filters),
    },
    // Disbursements
    disbursements: {
        getAll: (filters) => electron_1.ipcRenderer.invoke('disbursements:getAll', filters),
        getById: (id) => electron_1.ipcRenderer.invoke('disbursements:getById', id),
        create: (data) => electron_1.ipcRenderer.invoke('disbursements:create', data),
        update: (id, data) => electron_1.ipcRenderer.invoke('disbursements:update', id, data),
        approve: (id, approvedBy, signedRequestPath) => electron_1.ipcRenderer.invoke('disbursements:approve', id, approvedBy, signedRequestPath),
        cancel: (id) => electron_1.ipcRenderer.invoke('disbursements:cancel', id),
        uploadDocument: (id, fieldName, filePath) => electron_1.ipcRenderer.invoke('disbursements:uploadDocument', id, fieldName, filePath),
    },
    // Promissory Notes
    promissoryNotes: {
        getAll: (filters) => electron_1.ipcRenderer.invoke('promissoryNotes:getAll', filters),
        getById: (id) => electron_1.ipcRenderer.invoke('promissoryNotes:getById', id),
        getByDisbursementId: (disbursementId) => electron_1.ipcRenderer.invoke('promissoryNotes:getByDisbursementId', disbursementId),
        create: (data) => electron_1.ipcRenderer.invoke('promissoryNotes:create', data),
        update: (id, data) => electron_1.ipcRenderer.invoke('promissoryNotes:update', id, data),
        settle: (id, amount, date) => electron_1.ipcRenderer.invoke('promissoryNotes:settle', id, amount, date),
        updateOverdue: () => electron_1.ipcRenderer.invoke('promissoryNotes:updateOverdue'),
    },
    // PDF Generation
    pdf: {
        generatePromissoryNote: (data) => electron_1.ipcRenderer.invoke('pdf:generatePromissoryNote', data),
        generateWireTransfer: (data) => electron_1.ipcRenderer.invoke('pdf:generateWireTransfer', data),
        generateDebitNote: (data) => electron_1.ipcRenderer.invoke('pdf:generateDebitNote', data),
    },
    // Interest Calculations
    interest: {
        calculateAll: () => electron_1.ipcRenderer.invoke('interest:calculateAll'),
        getForPN: (pnId, asOfDate) => electron_1.ipcRenderer.invoke('interest:getForPN', pnId, asOfDate),
        getTotal: () => electron_1.ipcRenderer.invoke('interest:getTotal'),
        getHistory: (pnId, startDate, endDate) => electron_1.ipcRenderer.invoke('interest:getHistory', pnId, startDate, endDate),
    },
    // Bank Reconciliation
    bankRecon: {
        getAll: (filters) => electron_1.ipcRenderer.invoke('bankRecon:getAll', filters),
        import: (transaction) => electron_1.ipcRenderer.invoke('bankRecon:import', transaction),
        importCSV: (filePath) => electron_1.ipcRenderer.invoke('bankRecon:importCSV', filePath),
        match: (transactionId, pnId, userId) => electron_1.ipcRenderer.invoke('bankRecon:match', transactionId, pnId, userId),
        unmatch: (transactionId) => electron_1.ipcRenderer.invoke('bankRecon:unmatch', transactionId),
        suggestMatches: (transactionId) => electron_1.ipcRenderer.invoke('bankRecon:suggestMatches', transactionId),
        getSummary: () => electron_1.ipcRenderer.invoke('bankRecon:getSummary'),
    },
    // Debit Notes
    debitNotes: {
        getAll: () => electron_1.ipcRenderer.invoke('debitNotes:getAll'),
        getById: (id) => electron_1.ipcRenderer.invoke('debitNotes:getById', id),
        create: (data) => electron_1.ipcRenderer.invoke('debitNotes:create', data),
        update: (id, data) => electron_1.ipcRenderer.invoke('debitNotes:update', id, data),
        markPaid: (id) => electron_1.ipcRenderer.invoke('debitNotes:markPaid', id),
        updateOverdue: () => electron_1.ipcRenderer.invoke('debitNotes:updateOverdue'),
    },
    // Reports
    reports: {
        getDashboardKPIs: () => electron_1.ipcRenderer.invoke('reports:getDashboardKPIs'),
        getAgingReport: () => electron_1.ipcRenderer.invoke('reports:getAgingReport'),
        getTimeSeries: (startDate, endDate) => electron_1.ipcRenderer.invoke('reports:getTimeSeries', startDate, endDate),
        getPeriodReport: (startDate, endDate) => electron_1.ipcRenderer.invoke('reports:getPeriodReport', startDate, endDate),
        getTopPNs: (limit) => electron_1.ipcRenderer.invoke('reports:getTopPNs', limit),
        getAcquiredAssets: () => electron_1.ipcRenderer.invoke('reports:getAcquiredAssets'),
        getSignwellNotifications: () => electron_1.ipcRenderer.invoke('reports:getSignwellNotifications'),
    },
    // Backup
    backup: {
        create: () => electron_1.ipcRenderer.invoke('backup:create'),
        restore: (backupFile) => electron_1.ipcRenderer.invoke('backup:restore', backupFile),
        list: () => electron_1.ipcRenderer.invoke('backup:list'),
    },
    // PDF Parsing
    parsePDF: (base64Data) => electron_1.ipcRenderer.invoke('parsePDF', base64Data),
    // PDF Viewer
    openPDF: (pdfPath) => electron_1.ipcRenderer.invoke('openPDF', pdfPath),
    // Upload Signed PN
    uploadSignedPN: (pnId, base64Data, fileName) => electron_1.ipcRenderer.invoke('uploadSignedPN', pnId, base64Data, fileName),
    // Validate PDF Signature
    validatePDFSignature: (pdfPath) => electron_1.ipcRenderer.invoke('validatePDFSignature', pdfPath),
    // SignWell
    signwell: {
        runMigration: () => electron_1.ipcRenderer.invoke('signwell:runMigration'),
        createDocument: (data) => electron_1.ipcRenderer.invoke('signwell:createDocument', data),
        getEmbeddedRequestingUrl: (documentId) => electron_1.ipcRenderer.invoke('signwell:getEmbeddedRequestingUrl', documentId),
        openEmbeddedRequesting: (documentId, documentName) => electron_1.ipcRenderer.invoke('signwell:openEmbeddedRequesting', documentId, documentName),
        getDocument: (documentId) => electron_1.ipcRenderer.invoke('signwell:getDocument', documentId),
        downloadCompletedPDF: (documentId, savePath) => electron_1.ipcRenderer.invoke('signwell:downloadCompletedPDF', documentId, savePath),
        downloadAndAttach: (payload) => electron_1.ipcRenderer.invoke('signwell:downloadAndAttach', payload),
        syncCompletedDocuments: () => electron_1.ipcRenderer.invoke('signwell:syncCompletedDocuments'),
        sendReminder: (documentId) => electron_1.ipcRenderer.invoke('signwell:sendReminder', documentId),
        updateAndSend: (data) => electron_1.ipcRenderer.invoke('signwell:updateAndSend', data),
    },
    // Clients
    clients: {
        getAll: () => electron_1.ipcRenderer.invoke('clients:getAll'),
        getActive: () => electron_1.ipcRenderer.invoke('clients:getActive'),
        getById: (id) => electron_1.ipcRenderer.invoke('clients:getById', id),
        create: (data) => electron_1.ipcRenderer.invoke('clients:create', data),
        update: (id, data) => electron_1.ipcRenderer.invoke('clients:update', id, data),
        delete: (id) => electron_1.ipcRenderer.invoke('clients:delete', id),
        getStats: (id) => electron_1.ipcRenderer.invoke('clients:getStats', id),
    },
};
// Debug logging at the very beginning
console.log('=== PRELOAD SCRIPT STARTING ===');
console.log('contextBridge available:', typeof electron_1.contextBridge !== 'undefined');
console.log('ipcRenderer available:', typeof electron_1.ipcRenderer !== 'undefined');
// Expose API to renderer
try {
    electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
    console.log('✓ electronAPI exposed successfully');
}
catch (error) {
    console.error('✗ Failed to expose electronAPI:', error);
}
// Debug logging
console.log('Preload script loaded successfully');
console.log('electronAPI exposed to window');
console.log('=== PRELOAD SCRIPT FINISHED ===');
