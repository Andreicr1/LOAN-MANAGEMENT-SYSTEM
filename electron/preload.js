import { contextBridge, ipcRenderer } from 'electron';
// DECISION: Expose limited, type-safe API to renderer process
var electronAPI = {
    // Auth
    auth: {
        login: function (username, password) {
            return ipcRenderer.invoke('auth:login', username, password);
        },
        logout: function (userId) {
            return ipcRenderer.invoke('auth:logout', userId);
        },
        changePassword: function (userId, oldPassword, newPassword) {
            return ipcRenderer.invoke('auth:changePassword', userId, oldPassword, newPassword);
        },
    },
    // Users
    users: {
        getAll: function () { return ipcRenderer.invoke('users:getAll'); },
        getById: function (id) { return ipcRenderer.invoke('users:getById', id); },
        create: function (data) { return ipcRenderer.invoke('users:create', data); },
        update: function (id, data) { return ipcRenderer.invoke('users:update', id, data); },
        delete: function (id) { return ipcRenderer.invoke('users:delete', id); },
        resetPassword: function (userId, newPassword) {
            return ipcRenderer.invoke('users:resetPassword', userId, newPassword);
        },
    },
    // Config
    config: {
        get: function () { return ipcRenderer.invoke('config:get'); },
        update: function (data) { return ipcRenderer.invoke('config:update', data); },
    },
    // Audit
    audit: {
        log: function (userId, action, details) {
            return ipcRenderer.invoke('audit:log', userId, action, details);
        },
        getAll: function (filters) { return ipcRenderer.invoke('audit:getAll', filters); },
    },
    // Disbursements
    disbursements: {
        getAll: function (filters) { return ipcRenderer.invoke('disbursements:getAll', filters); },
        getById: function (id) { return ipcRenderer.invoke('disbursements:getById', id); },
        create: function (data) { return ipcRenderer.invoke('disbursements:create', data); },
        update: function (id, data) { return ipcRenderer.invoke('disbursements:update', id, data); },
        approve: function (id, approvedBy, signedRequestPath) {
            return ipcRenderer.invoke('disbursements:approve', id, approvedBy, signedRequestPath);
        },
        cancel: function (id) { return ipcRenderer.invoke('disbursements:cancel', id); },
        uploadDocument: function (id, fieldName, filePath) {
            return ipcRenderer.invoke('disbursements:uploadDocument', id, fieldName, filePath);
        },
    },
    // Promissory Notes
    promissoryNotes: {
        getAll: function (filters) { return ipcRenderer.invoke('promissoryNotes:getAll', filters); },
        getById: function (id) { return ipcRenderer.invoke('promissoryNotes:getById', id); },
        getByDisbursementId: function (disbursementId) {
            return ipcRenderer.invoke('promissoryNotes:getByDisbursementId', disbursementId);
        },
        create: function (data) { return ipcRenderer.invoke('promissoryNotes:create', data); },
        update: function (id, data) { return ipcRenderer.invoke('promissoryNotes:update', id, data); },
        settle: function (id, amount, date) {
            return ipcRenderer.invoke('promissoryNotes:settle', id, amount, date);
        },
        updateOverdue: function () { return ipcRenderer.invoke('promissoryNotes:updateOverdue'); },
    },
    // PDF Generation
    pdf: {
        generatePromissoryNote: function (data) { return ipcRenderer.invoke('pdf:generatePromissoryNote', data); },
        generateWireTransfer: function (data) { return ipcRenderer.invoke('pdf:generateWireTransfer', data); },
        generateDebitNote: function (data) { return ipcRenderer.invoke('pdf:generateDebitNote', data); },
    },
    // Interest Calculations
    interest: {
        calculateAll: function () { return ipcRenderer.invoke('interest:calculateAll'); },
        getForPN: function (pnId, asOfDate) { return ipcRenderer.invoke('interest:getForPN', pnId, asOfDate); },
        getTotal: function () { return ipcRenderer.invoke('interest:getTotal'); },
        getHistory: function (pnId, startDate, endDate) {
            return ipcRenderer.invoke('interest:getHistory', pnId, startDate, endDate);
        },
    },
    // Bank Reconciliation
    bankRecon: {
        getAll: function (filters) { return ipcRenderer.invoke('bankRecon:getAll', filters); },
        import: function (transaction) { return ipcRenderer.invoke('bankRecon:import', transaction); },
        importCSV: function (filePath) { return ipcRenderer.invoke('bankRecon:importCSV', filePath); },
        match: function (transactionId, pnId, userId) {
            return ipcRenderer.invoke('bankRecon:match', transactionId, pnId, userId);
        },
        unmatch: function (transactionId) { return ipcRenderer.invoke('bankRecon:unmatch', transactionId); },
        suggestMatches: function (transactionId) { return ipcRenderer.invoke('bankRecon:suggestMatches', transactionId); },
        getSummary: function () { return ipcRenderer.invoke('bankRecon:getSummary'); },
    },
    // Debit Notes
    debitNotes: {
        getAll: function () { return ipcRenderer.invoke('debitNotes:getAll'); },
        getById: function (id) { return ipcRenderer.invoke('debitNotes:getById', id); },
        create: function (data) { return ipcRenderer.invoke('debitNotes:create', data); },
        update: function (id, data) { return ipcRenderer.invoke('debitNotes:update', id, data); },
        markPaid: function (id) { return ipcRenderer.invoke('debitNotes:markPaid', id); },
        updateOverdue: function () { return ipcRenderer.invoke('debitNotes:updateOverdue'); },
    },
    // Reports
    reports: {
        getDashboardKPIs: function () { return ipcRenderer.invoke('reports:getDashboardKPIs'); },
        getAgingReport: function () { return ipcRenderer.invoke('reports:getAgingReport'); },
        getTimeSeries: function (startDate, endDate) {
            return ipcRenderer.invoke('reports:getTimeSeries', startDate, endDate);
        },
        getPeriodReport: function (startDate, endDate) {
            return ipcRenderer.invoke('reports:getPeriodReport', startDate, endDate);
        },
        getTopPNs: function (limit) { return ipcRenderer.invoke('reports:getTopPNs', limit); },
        getAcquiredAssets: function () { return ipcRenderer.invoke('reports:getAcquiredAssets'); },
    },
    // Backup
    backup: {
        create: function () { return ipcRenderer.invoke('backup:create'); },
        restore: function (backupFile) { return ipcRenderer.invoke('backup:restore', backupFile); },
        list: function () { return ipcRenderer.invoke('backup:list'); },
    },
    // PDF Parsing
    parsePDF: function (base64Data) { return ipcRenderer.invoke('parsePDF', base64Data); },
    // PDF Viewer
    openPDF: function (pdfPath) { return ipcRenderer.invoke('openPDF', pdfPath); },
};
// Debug logging at the very beginning
console.log('=== PRELOAD SCRIPT STARTING ===');
console.log('contextBridge available:', typeof contextBridge !== 'undefined');
console.log('ipcRenderer available:', typeof ipcRenderer !== 'undefined');
// Expose API to renderer
try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI);
    console.log('✓ electronAPI exposed successfully');
}
catch (error) {
    console.error('✗ Failed to expose electronAPI:', error);
}
// Debug logging
console.log('Preload script loaded successfully');
console.log('electronAPI exposed to window');
console.log('=== PRELOAD SCRIPT FINISHED ===');
