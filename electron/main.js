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
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { DatabaseService } from './database/database.service';
import { AuthService } from './services/auth.service';
import { ConfigService } from './services/config.service';
import { UserService } from './services/user.service';
import { DisbursementService } from './services/disbursement.service';
import { PromissoryNoteService } from './services/promissory-note.service';
import { PDFService } from './services/pdf.service';
import { PDFParserService } from './services/pdf-parser.service';
import { InterestService } from './services/interest.service';
import { BankReconciliationService } from './services/bank-reconciliation.service';
import { DebitNoteService } from './services/debit-note.service';
import { ReportsService } from './services/reports.service';
import { BackupService } from './services/backup.service';
// DECISION: Keep database and services as singletons in main process
var mainWindow = null;
var db = null;
var authService = null;
var configService = null;
var userService = null;
var disbursementService = null;
var promissoryNoteService = null;
var pdfService = null;
var pdfParserService = null;
var interestService = null;
var bankReconciliationService = null;
var debitNoteService = null;
var reportsService = null;
var backupService = null;
var isDev = process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL;
function createWindow() {
    var preloadPath = path.join(__dirname, 'preload.js');
    console.log('Creating window with preload:', preloadPath);
    console.log('Preload exists:', require('fs').existsSync(preloadPath));
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
        frame: true,
        backgroundColor: '#FFFFFF',
        show: false, // Show only when ready
    });
    // Debug: Log paths
    console.log('App path:', app.getPath('userData'));
    console.log('Preload path:', preloadPath);
    console.log('__dirname:', __dirname);
    mainWindow.once('ready-to-show', function () {
        mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.show();
    });
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}
function initializeServices() {
    var dbPath = path.join(app.getPath('userData'), 'loan-management.db');
    db = new DatabaseService(dbPath);
    authService = new AuthService(db);
    configService = new ConfigService(db);
    userService = new UserService(db);
    disbursementService = new DisbursementService(db);
    promissoryNoteService = new PromissoryNoteService(db);
    pdfService = new PDFService();
    pdfParserService = new PDFParserService();
    interestService = new InterestService(db);
    bankReconciliationService = new BankReconciliationService(db);
    debitNoteService = new DebitNoteService(db);
    reportsService = new ReportsService(db);
    backupService = new BackupService(dbPath);
    // Calculate interests daily
    interestService.calculateAllActiveInterests();
    // Enable auto backup every 24 hours
    backupService.enableAutoBackup(24);
    console.log("Database initialized at: ".concat(dbPath));
}
app.whenReady().then(function () {
    initializeServices();
    createWindow();
    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        db === null || db === void 0 ? void 0 : db.close();
        app.quit();
    }
});
// ==================== IPC HANDLERS ====================
// Auth
ipcMain.handle('auth:login', function (_, username, password) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, authService === null || authService === void 0 ? void 0 : authService.login(username, password)];
    });
}); });
ipcMain.handle('auth:logout', function (_, userId) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, authService === null || authService === void 0 ? void 0 : authService.logout(userId)];
    });
}); });
ipcMain.handle('auth:changePassword', function (_, userId, oldPassword, newPassword) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, authService === null || authService === void 0 ? void 0 : authService.changePassword(userId, oldPassword, newPassword)];
    });
}); });
// Users
ipcMain.handle('users:getAll', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, userService === null || userService === void 0 ? void 0 : userService.getAllUsers()];
    });
}); });
ipcMain.handle('users:getById', function (_, id) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, userService === null || userService === void 0 ? void 0 : userService.getUserById(id)];
    });
}); });
ipcMain.handle('users:create', function (_, data) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, userService === null || userService === void 0 ? void 0 : userService.createUser(data)];
    });
}); });
ipcMain.handle('users:update', function (_, id, data) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, userService === null || userService === void 0 ? void 0 : userService.updateUser(id, data)];
    });
}); });
ipcMain.handle('users:delete', function (_, id) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, userService === null || userService === void 0 ? void 0 : userService.deleteUser(id)];
    });
}); });
ipcMain.handle('users:resetPassword', function (_, userId, newPassword) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, userService === null || userService === void 0 ? void 0 : userService.resetPassword(userId, newPassword)];
    });
}); });
// Config
ipcMain.handle('config:get', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, configService === null || configService === void 0 ? void 0 : configService.getConfig()];
    });
}); });
ipcMain.handle('config:update', function (_, data) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, configService === null || configService === void 0 ? void 0 : configService.updateConfig(data)];
    });
}); });
// Audit Log
ipcMain.handle('audit:log', function (_, userId, action, details) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, db === null || db === void 0 ? void 0 : db.logAudit(userId, action, details)];
    });
}); });
ipcMain.handle('audit:getAll', function (_, filters) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, db === null || db === void 0 ? void 0 : db.getAuditLogs(filters)];
    });
}); });
// Disbursements
ipcMain.handle('disbursements:getAll', function (_, filters) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, disbursementService === null || disbursementService === void 0 ? void 0 : disbursementService.getAllDisbursements(filters)];
    });
}); });
ipcMain.handle('disbursements:getById', function (_, id) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, disbursementService === null || disbursementService === void 0 ? void 0 : disbursementService.getDisbursementById(id)];
    });
}); });
ipcMain.handle('disbursements:create', function (_, data) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, disbursementService === null || disbursementService === void 0 ? void 0 : disbursementService.createDisbursement(data)];
    });
}); });
ipcMain.handle('disbursements:update', function (_, id, data) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, disbursementService === null || disbursementService === void 0 ? void 0 : disbursementService.updateDisbursement(id, data)];
    });
}); });
ipcMain.handle('disbursements:approve', function (_, id, approvedBy, signedRequestPath) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, disbursementService === null || disbursementService === void 0 ? void 0 : disbursementService.approveDisbursement(id, approvedBy, signedRequestPath)];
    });
}); });
ipcMain.handle('disbursements:cancel', function (_, id) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, disbursementService === null || disbursementService === void 0 ? void 0 : disbursementService.cancelDisbursement(id)];
    });
}); });
ipcMain.handle('disbursements:uploadDocument', function (_, id, fieldName, filePath) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, disbursementService === null || disbursementService === void 0 ? void 0 : disbursementService.uploadDocument(id, fieldName, filePath)];
    });
}); });
// Promissory Notes
ipcMain.handle('promissoryNotes:getAll', function (_, filters) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, promissoryNoteService === null || promissoryNoteService === void 0 ? void 0 : promissoryNoteService.getAllPromissoryNotes(filters)];
    });
}); });
ipcMain.handle('promissoryNotes:getById', function (_, id) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, promissoryNoteService === null || promissoryNoteService === void 0 ? void 0 : promissoryNoteService.getPromissoryNoteById(id)];
    });
}); });
ipcMain.handle('promissoryNotes:getByDisbursementId', function (_, disbursementId) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, promissoryNoteService === null || promissoryNoteService === void 0 ? void 0 : promissoryNoteService.getByDisbursementId(disbursementId)];
    });
}); });
ipcMain.handle('promissoryNotes:create', function (_, data) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, promissoryNoteService === null || promissoryNoteService === void 0 ? void 0 : promissoryNoteService.createPromissoryNote(data)];
    });
}); });
ipcMain.handle('promissoryNotes:update', function (_, id, data) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, promissoryNoteService === null || promissoryNoteService === void 0 ? void 0 : promissoryNoteService.updatePromissoryNote(id, data)];
    });
}); });
ipcMain.handle('promissoryNotes:settle', function (_, id, amount, date) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, promissoryNoteService === null || promissoryNoteService === void 0 ? void 0 : promissoryNoteService.settlePromissoryNote(id, amount, date)];
    });
}); });
ipcMain.handle('promissoryNotes:updateOverdue', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, promissoryNoteService === null || promissoryNoteService === void 0 ? void 0 : promissoryNoteService.updateOverdueStatus()];
    });
}); });
// PDF Generation
ipcMain.handle('pdf:generatePromissoryNote', function (_, data) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, pdfService === null || pdfService === void 0 ? void 0 : pdfService.generatePromissoryNote(data)];
    });
}); });
ipcMain.handle('pdf:generateWireTransfer', function (_, data) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, pdfService === null || pdfService === void 0 ? void 0 : pdfService.generateWireTransferOrder(data)];
    });
}); });
ipcMain.handle('pdf:generateDebitNote', function (_, data) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, pdfService === null || pdfService === void 0 ? void 0 : pdfService.generateDebitNote(data)];
    });
}); });
// Interest Calculations
ipcMain.handle('interest:calculateAll', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, interestService === null || interestService === void 0 ? void 0 : interestService.calculateAllActiveInterests()];
    });
}); });
ipcMain.handle('interest:getForPN', function (_, pnId, asOfDate) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, interestService === null || interestService === void 0 ? void 0 : interestService.getInterestForPromissoryNote(pnId, asOfDate)];
    });
}); });
ipcMain.handle('interest:getTotal', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, interestService === null || interestService === void 0 ? void 0 : interestService.getTotalAccumulatedInterest()];
    });
}); });
ipcMain.handle('interest:getHistory', function (_, pnId, startDate, endDate) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, interestService === null || interestService === void 0 ? void 0 : interestService.getInterestHistory(pnId, startDate, endDate)];
    });
}); });
// Bank Reconciliation
ipcMain.handle('bankRecon:getAll', function (_, filters) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, bankReconciliationService === null || bankReconciliationService === void 0 ? void 0 : bankReconciliationService.getAllTransactions(filters)];
    });
}); });
ipcMain.handle('bankRecon:import', function (_, transaction) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, bankReconciliationService === null || bankReconciliationService === void 0 ? void 0 : bankReconciliationService.importTransaction(transaction)];
    });
}); });
ipcMain.handle('bankRecon:importCSV', function (_, filePath) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, bankReconciliationService === null || bankReconciliationService === void 0 ? void 0 : bankReconciliationService.importFromCSV(filePath)];
    });
}); });
ipcMain.handle('bankRecon:match', function (_, transactionId, pnId, userId) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, bankReconciliationService === null || bankReconciliationService === void 0 ? void 0 : bankReconciliationService.matchTransaction(transactionId, pnId, userId)];
    });
}); });
ipcMain.handle('bankRecon:unmatch', function (_, transactionId) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, bankReconciliationService === null || bankReconciliationService === void 0 ? void 0 : bankReconciliationService.unmatchTransaction(transactionId)];
    });
}); });
ipcMain.handle('bankRecon:suggestMatches', function (_, transactionId) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, bankReconciliationService === null || bankReconciliationService === void 0 ? void 0 : bankReconciliationService.suggestMatches(transactionId)];
    });
}); });
ipcMain.handle('bankRecon:getSummary', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, bankReconciliationService === null || bankReconciliationService === void 0 ? void 0 : bankReconciliationService.getReconciliationSummary()];
    });
}); });
// Debit Notes
ipcMain.handle('debitNotes:getAll', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, debitNoteService === null || debitNoteService === void 0 ? void 0 : debitNoteService.getAllDebitNotes()];
    });
}); });
ipcMain.handle('debitNotes:getById', function (_, id) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, debitNoteService === null || debitNoteService === void 0 ? void 0 : debitNoteService.getDebitNoteById(id)];
    });
}); });
ipcMain.handle('debitNotes:create', function (_, data) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, debitNoteService === null || debitNoteService === void 0 ? void 0 : debitNoteService.createDebitNote(data)];
    });
}); });
ipcMain.handle('debitNotes:update', function (_, id, data) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, debitNoteService === null || debitNoteService === void 0 ? void 0 : debitNoteService.updateDebitNote(id, data)];
    });
}); });
ipcMain.handle('debitNotes:markPaid', function (_, id) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, debitNoteService === null || debitNoteService === void 0 ? void 0 : debitNoteService.markAsPaid(id)];
    });
}); });
ipcMain.handle('debitNotes:updateOverdue', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, debitNoteService === null || debitNoteService === void 0 ? void 0 : debitNoteService.updateOverdueStatus()];
    });
}); });
// Reports
ipcMain.handle('reports:getDashboardKPIs', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, reportsService === null || reportsService === void 0 ? void 0 : reportsService.getDashboardKPIs()];
    });
}); });
ipcMain.handle('reports:getAgingReport', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, reportsService === null || reportsService === void 0 ? void 0 : reportsService.getAgingReport()];
    });
}); });
ipcMain.handle('reports:getTimeSeries', function (_, startDate, endDate) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, reportsService === null || reportsService === void 0 ? void 0 : reportsService.getTimeSeriesData(startDate, endDate)];
    });
}); });
ipcMain.handle('reports:getPeriodReport', function (_, startDate, endDate) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, reportsService === null || reportsService === void 0 ? void 0 : reportsService.getPeriodReport(startDate, endDate)];
    });
}); });
ipcMain.handle('reports:getTopPNs', function (_, limit) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, reportsService === null || reportsService === void 0 ? void 0 : reportsService.getTopPromissoryNotes(limit)];
    });
}); });
ipcMain.handle('reports:getAcquiredAssets', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, reportsService === null || reportsService === void 0 ? void 0 : reportsService.getAcquiredAssets()];
    });
}); });
// Backup
ipcMain.handle('backup:create', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, backupService === null || backupService === void 0 ? void 0 : backupService.createBackup()];
    });
}); });
ipcMain.handle('backup:restore', function (_, backupFile) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, backupService === null || backupService === void 0 ? void 0 : backupService.restoreBackup(backupFile)];
    });
}); });
ipcMain.handle('backup:list', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, backupService === null || backupService === void 0 ? void 0 : backupService.getBackupList()];
    });
}); });
// PDF Parsing
ipcMain.handle('parsePDF', function (_, base64Data) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, pdfParserService === null || pdfParserService === void 0 ? void 0 : pdfParserService.parsePDF(base64Data)];
    });
}); });
// PDF Viewer - Open PDF in new window
ipcMain.handle('openPDF', function (_, pdfPath) { return __awaiter(void 0, void 0, void 0, function () {
    var fs, pdfWindow;
    return __generator(this, function (_a) {
        fs = require('fs');
        if (!fs.existsSync(pdfPath)) {
            console.error('PDF file not found:', pdfPath);
            return [2 /*return*/];
        }
        pdfWindow = new BrowserWindow({
            width: 900,
            height: 700,
            autoHideMenuBar: true,
            backgroundColor: '#FFFFFF',
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
            },
        });
        // Load PDF file
        pdfWindow.loadFile(pdfPath);
        pdfWindow.on('closed', function () {
            // Window will be garbage collected
        });
        return [2 /*return*/];
    });
}); });
