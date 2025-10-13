"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_service_1 = require("./database/database.service");
const auth_service_1 = require("./services/auth.service");
const config_service_1 = require("./services/config.service");
const user_service_1 = require("./services/user.service");
const disbursement_service_1 = require("./services/disbursement.service");
const promissory_note_service_1 = require("./services/promissory-note.service");
const pdf_service_1 = require("./services/pdf.service");
const pdf_parser_service_1 = require("./services/pdf-parser.service");
const pdf_signature_validator_service_1 = require("./services/pdf-signature-validator.service");
const esignature_service_1 = require("./services/esignature.service");
const signwell_service_1 = require("./services/signwell.service");
const email_service_1 = require("./services/email.service");
const interest_service_1 = require("./services/interest.service");
const bank_reconciliation_service_1 = require("./services/bank-reconciliation.service");
const debit_note_service_1 = require("./services/debit-note.service");
const reports_service_1 = require("./services/reports.service");
const backup_service_1 = require("./services/backup.service");
const client_service_1 = require("./services/client.service");
const secret_manager_1 = require("./utils/secret-manager");
// DECISION: Keep database and services as singletons in main process
let mainWindow = null;
let db = null;
let authService = null;
let configService = null;
let userService = null;
let disbursementService = null;
let promissoryNoteService = null;
let pdfService = null;
let pdfParserService = null;
let pdfSignatureValidator = null;
let eSignatureService = null;
let signWellService = null;
let emailService = null;
let interestService = null;
let bankReconciliationService = null;
let debitNoteService = null;
let reportsService = null;
let backupService = null;
let clientService = null;
const isDev = process.env.NODE_ENV === "development" || process.env.VITE_DEV_SERVER_URL;
function createWindow() {
    const preloadPath = path_1.default.join(__dirname, "preload.js");
    console.log("Creating window with preload:", preloadPath);
    console.log("Preload exists:", require("fs").existsSync(preloadPath));
    mainWindow = new electron_1.BrowserWindow({
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
        backgroundColor: "#FFFFFF",
        show: false, // Show only when ready
    });
    // Debug: Log paths
    console.log("App path:", electron_1.app.getPath("userData"));
    console.log("Preload path:", preloadPath);
    console.log("__dirname:", __dirname);
    console.log("isDev:", isDev);
    console.log("NODE_ENV:", process.env.NODE_ENV);
    mainWindow.once("ready-to-show", () => {
        mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.show();
    });
    
    if (isDev) {
        // In dev mode, connect to Vite dev server
        const vitePort = process.env.VITE_PORT || 5173;
        mainWindow.loadURL(`http://localhost:${vitePort}`);
        mainWindow.webContents.openDevTools();
        console.log(`Loading from Vite dev server: http://localhost:${vitePort}`);
    } else {
        // In production, load from dist folder
        const possiblePaths = [
            path_1.default.join(__dirname, "..", "..", "dist", "index.html"),
            path_1.default.join(__dirname, "../dist/index.html"),
            path_1.default.join(process.resourcesPath, "app.asar", "dist", "index.html"),
            path_1.default.join(process.cwd(), "dist", "index.html"),
        ];
        let indexPath = "";
        for (const testPath of possiblePaths) {
            if (fs_1.default.existsSync(testPath)) {
                indexPath = testPath;
                console.log("✓ Found index.html at:", indexPath);
                break;
            }
        }
        if (indexPath) {
            mainWindow.loadFile(indexPath);
        } else {
            console.error("❌ Could not find index.html in any expected location!");
        }
    }
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}
function initializeServices() {
    const dbPath = path_1.default.join(electron_1.app.getPath("userData"), "loan-management.db");
    db = new database_service_1.DatabaseService(dbPath);
    authService = new auth_service_1.AuthService(db);
    configService = new config_service_1.ConfigService(db);
    userService = new user_service_1.UserService(db);
    disbursementService = new disbursement_service_1.DisbursementService(db);
    promissoryNoteService = new promissory_note_service_1.PromissoryNoteService(db);
    pdfService = new pdf_service_1.PDFService();
    pdfParserService = new pdf_parser_service_1.PDFParserService();
    pdfSignatureValidator = new pdf_signature_validator_service_1.PDFSignatureValidatorService();
    eSignatureService = new esignature_service_1.ESignatureService();
    signWellService = new signwell_service_1.SignWellService();
    emailService = new email_service_1.EmailService();
    interestService = new interest_service_1.InterestService(db);
    bankReconciliationService = new bank_reconciliation_service_1.BankReconciliationService(db);
    debitNoteService = new debit_note_service_1.DebitNoteService(db);
    reportsService = new reports_service_1.ReportsService(db);
    backupService = new backup_service_1.BackupService(dbPath);
    clientService = new client_service_1.ClientService(db.getDatabase());
    // Calculate interests daily
    interestService.calculateAllActiveInterests();
    // Enable auto backup every 24 hours
    backupService.enableAutoBackup(24);
    console.log(`Database initialized at: ${dbPath}`);
}
electron_1.app.whenReady().then(() => {
    initializeServices();
    createWindow();
    electron_1.app.on("activate", () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        db === null || db === void 0 ? void 0 : db.close();
        electron_1.app.quit();
    }
});
electron_1.app.on("before-quit", async () => {
    // Cleanup
});
// ==================== IPC HANDLERS ====================
// Auth
electron_1.ipcMain.handle("auth:login", async (_, username, password) => {
    return authService === null || authService === void 0 ? void 0 : authService.login(username, password);
});
electron_1.ipcMain.handle("auth:logout", async (_, userId) => {
    return authService === null || authService === void 0 ? void 0 : authService.logout(userId);
});
electron_1.ipcMain.handle("auth:changePassword", async (_, userId, oldPassword, newPassword) => {
    return authService === null || authService === void 0 ? void 0 : authService.changePassword(userId, oldPassword, newPassword);
});
// Users
electron_1.ipcMain.handle("users:getAll", async () => {
    return userService === null || userService === void 0 ? void 0 : userService.getAllUsers();
});
electron_1.ipcMain.handle("users:getById", async (_, id) => {
    return userService === null || userService === void 0 ? void 0 : userService.getUserById(id);
});
electron_1.ipcMain.handle("users:create", async (_, data) => {
    return userService === null || userService === void 0 ? void 0 : userService.createUser(data);
});
electron_1.ipcMain.handle("users:update", async (_, id, data) => {
    return userService === null || userService === void 0 ? void 0 : userService.updateUser(id, data);
});
electron_1.ipcMain.handle("users:delete", async (_, id) => {
    return userService === null || userService === void 0 ? void 0 : userService.deleteUser(id);
});
electron_1.ipcMain.handle("users:resetPassword", async (_, userId, newPassword) => {
    return userService === null || userService === void 0 ? void 0 : userService.resetPassword(userId, newPassword);
});
// Config
electron_1.ipcMain.handle("config:get", async () => {
    if (!configService) {
        throw new Error("Config service not initialized");
    }
    try {
        return configService.getConfig();
    }
    catch (error) {
        if ((error === null || error === void 0 ? void 0 : error.message) === "Master secret not set") {
            return {
                error: "MASTER_SECRET_REQUIRED",
                message: "Master secret required to access encrypted configuration",
            };
        }
        throw error;
    }
});
electron_1.ipcMain.handle("config:update", async (_, data) => {
    return configService === null || configService === void 0 ? void 0 : configService.updateConfig(data);
});
electron_1.ipcMain.handle("config:unlock", async (_, secret) => {
    if (!secret || secret.length < 8) {
        return { success: false, error: "Master secret deve ter pelo menos 8 caracteres" };
    }
    try {
        (0, secret_manager_1.setMasterSecret)(secret);
        // Test by fetching config to ensure secret works
        configService === null || configService === void 0 ? void 0 : configService.getConfig();
        return { success: true };
    }
    catch (error) {
        (0, secret_manager_1.clearMasterSecret)();
        return {
            success: false,
            error: (error === null || error === void 0 ? void 0 : error.message) || "Falha ao validar master secret",
        };
    }
});
electron_1.ipcMain.handle("config:lock", async () => {
    (0, secret_manager_1.clearMasterSecret)();
    return { success: true };
});
electron_1.ipcMain.handle("config:setupIntegrations", async () => {
    try {
        // Setup default integrations (SignWell + Email)
        if (configService) {
            // Update email config
            configService.updateConfig({
                email: {
                    host: "mail.infomaniak.com",
                    port: 587,
                    secure: false,
                    user: "operations@wmf-corp.com",
                    pass: "2fEfeUwtPxYQPNqp",
                    bankEmail: "bank@example.com",
                    hasPassword: true,
                },
            });
            // Update SignWell config
            configService.updateConfig({
                signwell: {
                    apiKey: "YWNjZXNzOjJhMWM2Y2FjYWI0ZGU2MmY0YjhjYTM0ZjFiNGY0MGU5",
                    appUniqueId: "ac92e9b6-d96e-4b74-a7a7-9466d106338b",
                    testMode: true,
                },
            });
            // Update lender signatories
            configService.updateConfig({
                lenderSignatories: [
                    {
                        name: "John Smith",
                        email: "andreirachadel07@gmail.com",
                        role: "CFO",
                    },
                    { name: "Jane Doe", email: "jane.doe@wmf-corp.com", role: "CEO" },
                ],
            });
        }
        return { success: true, message: "Integrations configured successfully!" };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// Audit Log
electron_1.ipcMain.handle("audit:log", async (_, userId, action, details) => {
    return db === null || db === void 0 ? void 0 : db.logAudit(userId, action, details);
});
electron_1.ipcMain.handle("audit:getAll", async (_, filters) => {
    return db === null || db === void 0 ? void 0 : db.getAuditLogs(filters);
});
// Disbursements
electron_1.ipcMain.handle("disbursements:getAll", async (_, filters) => {
    return disbursementService === null || disbursementService === void 0 ? void 0 : disbursementService.getAllDisbursements(filters);
});
electron_1.ipcMain.handle("disbursements:getById", async (_, id) => {
    return disbursementService === null || disbursementService === void 0 ? void 0 : disbursementService.getDisbursementById(id);
});
electron_1.ipcMain.handle("disbursements:create", async (_, data) => {
    return disbursementService === null || disbursementService === void 0 ? void 0 : disbursementService.createDisbursement(data);
});
electron_1.ipcMain.handle("disbursements:update", async (_, id, data) => {
    return disbursementService === null || disbursementService === void 0 ? void 0 : disbursementService.updateDisbursement(id, data);
});
electron_1.ipcMain.handle("disbursements:approve", async (_, id, approvedBy, signedRequestPath) => {
    return disbursementService === null || disbursementService === void 0 ? void 0 : disbursementService.approveDisbursement(id, approvedBy, signedRequestPath);
});
electron_1.ipcMain.handle("disbursements:cancel", async (_, id) => {
    return disbursementService === null || disbursementService === void 0 ? void 0 : disbursementService.cancelDisbursement(id);
});
electron_1.ipcMain.handle("disbursements:uploadDocument", async (_, id, fieldName, filePath) => {
    return disbursementService === null || disbursementService === void 0 ? void 0 : disbursementService.uploadDocument(id, fieldName, filePath);
});
// Promissory Notes
electron_1.ipcMain.handle("promissoryNotes:getAll", async (_, filters) => {
    return promissoryNoteService === null || promissoryNoteService === void 0 ? void 0 : promissoryNoteService.getAllPromissoryNotes(filters);
});
electron_1.ipcMain.handle("promissoryNotes:getById", async (_, id) => {
    return promissoryNoteService === null || promissoryNoteService === void 0 ? void 0 : promissoryNoteService.getPromissoryNoteById(id);
});
electron_1.ipcMain.handle("promissoryNotes:getByDisbursementId", async (_, disbursementId) => {
    return promissoryNoteService === null || promissoryNoteService === void 0 ? void 0 : promissoryNoteService.getByDisbursementId(disbursementId);
});
electron_1.ipcMain.handle("promissoryNotes:create", async (_, data) => {
    return promissoryNoteService === null || promissoryNoteService === void 0 ? void 0 : promissoryNoteService.createPromissoryNote(data);
});
electron_1.ipcMain.handle("promissoryNotes:update", async (_, id, data) => {
    return promissoryNoteService === null || promissoryNoteService === void 0 ? void 0 : promissoryNoteService.updatePromissoryNote(id, data);
});
electron_1.ipcMain.handle("promissoryNotes:settle", async (_, id, amount, date) => {
    return promissoryNoteService === null || promissoryNoteService === void 0 ? void 0 : promissoryNoteService.settlePromissoryNote(id, amount, date);
});
electron_1.ipcMain.handle("promissoryNotes:updateOverdue", async () => {
    return promissoryNoteService === null || promissoryNoteService === void 0 ? void 0 : promissoryNoteService.updateOverdueStatus();
});
// PDF Generation
electron_1.ipcMain.handle("pdf:generatePromissoryNote", async (_, data) => {
    return pdfService === null || pdfService === void 0 ? void 0 : pdfService.generatePromissoryNote(data);
});
electron_1.ipcMain.handle("pdf:generateWireTransfer", async (_, data) => {
    return pdfService === null || pdfService === void 0 ? void 0 : pdfService.generateWireTransferOrder(data);
});
electron_1.ipcMain.handle("pdf:generateDebitNote", async (_, data) => {
    return pdfService === null || pdfService === void 0 ? void 0 : pdfService.generateDebitNote(data);
});
// Interest Calculations
electron_1.ipcMain.handle("interest:calculateAll", async () => {
    return interestService === null || interestService === void 0 ? void 0 : interestService.calculateAllActiveInterests();
});
electron_1.ipcMain.handle("interest:getForPN", async (_, pnId, asOfDate) => {
    return interestService === null || interestService === void 0 ? void 0 : interestService.getInterestForPromissoryNote(pnId, asOfDate);
});
electron_1.ipcMain.handle("interest:getTotal", async () => {
    return interestService === null || interestService === void 0 ? void 0 : interestService.getTotalAccumulatedInterest();
});
electron_1.ipcMain.handle("interest:getHistory", async (_, pnId, startDate, endDate) => {
    return interestService === null || interestService === void 0 ? void 0 : interestService.getInterestHistory(pnId, startDate, endDate);
});
// Bank Reconciliation
electron_1.ipcMain.handle("bankRecon:getAll", async (_, filters) => {
    return bankReconciliationService === null || bankReconciliationService === void 0 ? void 0 : bankReconciliationService.getAllTransactions(filters);
});
electron_1.ipcMain.handle("bankRecon:import", async (_, transaction) => {
    return bankReconciliationService === null || bankReconciliationService === void 0 ? void 0 : bankReconciliationService.importTransaction(transaction);
});
electron_1.ipcMain.handle("bankRecon:importCSV", async (_, filePath) => {
    return bankReconciliationService === null || bankReconciliationService === void 0 ? void 0 : bankReconciliationService.importFromCSV(filePath);
});
electron_1.ipcMain.handle("bankRecon:match", async (_, transactionId, pnId, userId) => {
    return bankReconciliationService === null || bankReconciliationService === void 0 ? void 0 : bankReconciliationService.matchTransaction(transactionId, pnId, userId);
});
electron_1.ipcMain.handle("bankRecon:unmatch", async (_, transactionId) => {
    return bankReconciliationService === null || bankReconciliationService === void 0 ? void 0 : bankReconciliationService.unmatchTransaction(transactionId);
});
electron_1.ipcMain.handle("bankRecon:suggestMatches", async (_, transactionId) => {
    return bankReconciliationService === null || bankReconciliationService === void 0 ? void 0 : bankReconciliationService.suggestMatches(transactionId);
});
electron_1.ipcMain.handle("bankRecon:getSummary", async () => {
    return bankReconciliationService === null || bankReconciliationService === void 0 ? void 0 : bankReconciliationService.getReconciliationSummary();
});
// Debit Notes
electron_1.ipcMain.handle("debitNotes:getAll", async () => {
    return debitNoteService === null || debitNoteService === void 0 ? void 0 : debitNoteService.getAllDebitNotes();
});
electron_1.ipcMain.handle("debitNotes:getById", async (_, id) => {
    return debitNoteService === null || debitNoteService === void 0 ? void 0 : debitNoteService.getDebitNoteById(id);
});
electron_1.ipcMain.handle("debitNotes:create", async (_, data) => {
    return debitNoteService === null || debitNoteService === void 0 ? void 0 : debitNoteService.createDebitNote(data);
});
electron_1.ipcMain.handle("debitNotes:update", async (_, id, data) => {
    return debitNoteService === null || debitNoteService === void 0 ? void 0 : debitNoteService.updateDebitNote(id, data);
});
electron_1.ipcMain.handle("debitNotes:markPaid", async (_, id) => {
    return debitNoteService === null || debitNoteService === void 0 ? void 0 : debitNoteService.markAsPaid(id);
});
electron_1.ipcMain.handle("debitNotes:updateOverdue", async () => {
    return debitNoteService === null || debitNoteService === void 0 ? void 0 : debitNoteService.updateOverdueStatus();
});
// Reports
electron_1.ipcMain.handle("reports:getDashboardKPIs", async () => {
    return reportsService === null || reportsService === void 0 ? void 0 : reportsService.getDashboardKPIs();
});
electron_1.ipcMain.handle("reports:getAgingReport", async () => {
    return reportsService === null || reportsService === void 0 ? void 0 : reportsService.getAgingReport();
});
electron_1.ipcMain.handle("reports:getTimeSeries", async (_, startDate, endDate) => {
    return reportsService === null || reportsService === void 0 ? void 0 : reportsService.getTimeSeriesData(startDate, endDate);
});
electron_1.ipcMain.handle("reports:getPeriodReport", async (_, startDate, endDate) => {
    return reportsService === null || reportsService === void 0 ? void 0 : reportsService.getPeriodReport(startDate, endDate);
});
electron_1.ipcMain.handle("reports:getTopPNs", async (_, limit) => {
    return reportsService === null || reportsService === void 0 ? void 0 : reportsService.getTopPromissoryNotes(limit);
});
electron_1.ipcMain.handle("reports:getAcquiredAssets", async () => {
    return reportsService === null || reportsService === void 0 ? void 0 : reportsService.getAcquiredAssets();
});
electron_1.ipcMain.handle("reports:getSignwellNotifications", async () => {
    try {
        if (reportsService && typeof reportsService.getSignwellNotifications === 'function') {
            return reportsService.getSignwellNotifications();
        }
    }
    catch (error) {
        console.error('Failed to get SignWell notifications:', error);
    }
    return [];
});
// Backup
electron_1.ipcMain.handle("backup:create", async () => {
    return backupService === null || backupService === void 0 ? void 0 : backupService.createBackup();
});
electron_1.ipcMain.handle("backup:restore", async (_, backupFile) => {
    return backupService === null || backupService === void 0 ? void 0 : backupService.restoreBackup(backupFile);
});
electron_1.ipcMain.handle("backup:list", async () => {
    return backupService === null || backupService === void 0 ? void 0 : backupService.getBackupList();
});
// Clients
electron_1.ipcMain.handle("clients:getAll", async () => {
    return clientService === null || clientService === void 0 ? void 0 : clientService.getAllClients();
});
electron_1.ipcMain.handle("clients:getActive", async () => {
    return clientService === null || clientService === void 0 ? void 0 : clientService.getActiveClients();
});
electron_1.ipcMain.handle("clients:getById", async (_, id) => {
    return clientService === null || clientService === void 0 ? void 0 : clientService.getClientById(id);
});
electron_1.ipcMain.handle("clients:create", async (_, data) => {
    return clientService === null || clientService === void 0 ? void 0 : clientService.createClient(data);
});
electron_1.ipcMain.handle("clients:update", async (_, id, data) => {
    return clientService === null || clientService === void 0 ? void 0 : clientService.updateClient(id, data);
});
electron_1.ipcMain.handle("clients:delete", async (_, id) => {
    return clientService === null || clientService === void 0 ? void 0 : clientService.deleteClient(id);
});
electron_1.ipcMain.handle("clients:getStats", async (_, id) => {
    return clientService === null || clientService === void 0 ? void 0 : clientService.getClientStats(id);
});
// PDF Parsing
electron_1.ipcMain.handle("parsePDF", async (_, base64Data) => {
    return pdfParserService === null || pdfParserService === void 0 ? void 0 : pdfParserService.parsePDF(base64Data);
});
// PDF Viewer - Open PDF in new window
electron_1.ipcMain.handle("openPDF", async (_, pdfPath) => {
    const fs = require("fs");
    if (!fs.existsSync(pdfPath)) {
        console.error("PDF file not found:", pdfPath);
        return;
    }
    // Create new window for PDF
    const pdfWindow = new electron_1.BrowserWindow({
        width: 900,
        height: 700,
        autoHideMenuBar: true,
        backgroundColor: "#FFFFFF",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    // Load PDF file
    pdfWindow.loadFile(pdfPath);
    pdfWindow.on("closed", () => {
        // Window will be garbage collected
    });
});
// Upload Signed PN
electron_1.ipcMain.handle("uploadSignedPN", async (_, pnId, base64Data, fileName) => {
    try {
        // Save uploaded file
        const filePath = await (pdfSignatureValidator === null || pdfSignatureValidator === void 0 ? void 0 : pdfSignatureValidator.saveUploadedPDF(base64Data, fileName));
        if (!filePath) {
            return { success: false, error: "Failed to save file" };
        }
        // Validate signature
        const validation = pdfSignatureValidator === null || pdfSignatureValidator === void 0 ? void 0 : pdfSignatureValidator.validateSignature(filePath);
        if (!(validation === null || validation === void 0 ? void 0 : validation.isSigned)) {
            return {
                success: false,
                error: (validation === null || validation === void 0 ? void 0 : validation.error) ||
                    "PDF does not contain a valid digital signature",
            };
        }
        // Update PN with signed path
        const updateResult = promissoryNoteService === null || promissoryNoteService === void 0 ? void 0 : promissoryNoteService.updatePromissoryNote(pnId, {
            signedPnPath: filePath,
        });
        if (!(updateResult === null || updateResult === void 0 ? void 0 : updateResult.success)) {
            return { success: false, error: "Failed to update promissory note" };
        }
        return {
            success: true,
            filePath,
            signatureInfo: {
                signerName: validation.signerName,
                signDate: validation.signDate,
                certificateValid: validation.certificateValid,
            },
        };
    }
    catch (error) {
        console.error("Upload signed PN error:", error);
        return { success: false, error: error.message };
    }
});
// Validate PDF Signature
electron_1.ipcMain.handle("validatePDFSignature", async (_, pdfPath) => {
    return pdfSignatureValidator === null || pdfSignatureValidator === void 0 ? void 0 : pdfSignatureValidator.validateSignature(pdfPath);
});
// ==================== SIGNWELL HANDLERS ====================
// SignWell - Run Migration (add columns if needed)
electron_1.ipcMain.handle("signwell:runMigration", async () => {
    try {
        const dbInstance = db === null || db === void 0 ? void 0 : db.getDatabase();
        if (!dbInstance) {
            return { success: false, error: "Database not initialized" };
        }
        // Check if columns already exist
        const tableInfo = dbInstance.prepare("PRAGMA table_info(config)").all();
        const hasSignwellToken = tableInfo.some((col) => col.name === 'signwell_api_token');
        if (hasSignwellToken) {
            return { success: true, message: "SignWell columns already exist" };
        }
        // Add columns to config
        dbInstance.exec(`
      ALTER TABLE config ADD COLUMN signwell_application_id TEXT;
      ALTER TABLE config ADD COLUMN signwell_client_id TEXT;
      ALTER TABLE config ADD COLUMN signwell_secret_key TEXT;
      ALTER TABLE config ADD COLUMN signwell_api_key TEXT;
      ALTER TABLE config ADD COLUMN signwell_test_mode INTEGER DEFAULT 1;
    `);
        // Add columns to promissory_notes
        dbInstance.exec(`
      ALTER TABLE promissory_notes ADD COLUMN signwell_document_id TEXT;
      ALTER TABLE promissory_notes ADD COLUMN signwell_status TEXT;
      ALTER TABLE promissory_notes ADD COLUMN signwell_embed_url TEXT;
      ALTER TABLE promissory_notes ADD COLUMN signwell_completed_at TEXT;
    `);
        // Add columns to disbursements
        dbInstance.exec(`
      ALTER TABLE disbursements ADD COLUMN wire_transfer_signwell_document_id TEXT;
      ALTER TABLE disbursements ADD COLUMN wire_transfer_signwell_status TEXT;
      ALTER TABLE disbursements ADD COLUMN wire_transfer_signwell_embed_url TEXT;
    `);
        // Insert default credentials
        dbInstance.prepare(`
      UPDATE config 
      SET 
        signwell_application_id = ?,
        signwell_client_id = ?,
        signwell_secret_key = ?,
        signwell_api_key = ?,
        signwell_test_mode = 1
      WHERE id = 1
    `).run('01b6fa87d977448d9663a371e4ad293a67b7ad53', '3d8bc232b790a97e2ec459629fdabc05', '15851806701fcedfd2435189527ccb43', '7c0af648fe4d7ceeba5f5b087f5ec51d9e232047dd64d7c2628a32bf8484e243');
        return { success: true, message: "SignWell migration completed successfully!" };
    }
    catch (error) {
        console.error("SignWell migration error:", error);
        return { success: false, error: error.message };
    }
});
// SignWell - Create Document
electron_1.ipcMain.handle("signwell:createDocument", async (_, data) => {
    var _a, _b;
    try {
        // Get SignWell config
        const config = configService === null || configService === void 0 ? void 0 : configService.getConfig();
        if (!((_a = config === null || config === void 0 ? void 0 : config.signwell) === null || _a === void 0 ? void 0 : _a.apiKey)) {
            return {
                success: false,
                error: "SignWell not configured. Please add API Key in Settings.",
            };
        }
        // Initialize SignWell if needed
        if (!signWellService) {
            return { success: false, error: "SignWell service not initialized" };
        }
        signWellService.initialize({
            apiKey: config.signwell.apiKey,
            appUniqueId: config.signwell.appUniqueId,
            testMode: config.signwell.testMode,
        });
        // Read PDF file and convert to base64
        const fs = require("fs");
        const pdfBuffer = fs.readFileSync(data.pdfPath);
        const pdfBase64 = pdfBuffer.toString("base64");
        // Create document in SignWell
        const document = await signWellService.createDocument({
            name: data.name,
            files: [
                {
                    name: data.pdfName,
                    file_base64: pdfBase64,
                },
            ],
            recipients: data.recipients.map((r, index) => ({
                name: r.name,
                email: r.email,
                order: index + 1,
            })),
            draft: true, // Create as draft so we can use embedded requesting
        });
        return {
            success: true,
            documentId: document.id,
            status: document.status,
        };
    }
    catch (error) {
        console.error("SignWell create document error:", error);
        return { success: false, error: error.message };
    }
});
// SignWell - Get Embedded Requesting URL
electron_1.ipcMain.handle("signwell:getEmbeddedRequestingUrl", async (_, documentId) => {
    var _a, _b;
    try {
        const config = configService === null || configService === void 0 ? void 0 : configService.getConfig();
        if (!((_a = config === null || config === void 0 ? void 0 : config.signwell) === null || _a === void 0 ? void 0 : _a.clientId) || !((_b = config === null || config === void 0 ? void 0 : config.signwell) === null || _b === void 0 ? void 0 : _b.secretKey)) {
            return {
                success: false,
                error: "SignWell not configured.",
            };
        }
        if (!signWellService) {
            return { success: false, error: "SignWell service not initialized" };
        }
        signWellService.initialize({
            apiKey: config.signwell.apiKey,
            appUniqueId: config.signwell.appUniqueId,
            testMode: config.signwell.testMode,
        });
        const link = await signWellService.getEmbeddedRequestingLink(documentId);
        return {
            success: true,
            url: link.url,
            expiresAt: link.expires_at,
        };
    }
    catch (error) {
        console.error("SignWell get embedded URL error:", error);
        return { success: false, error: error.message };
    }
});
// SignWell - Get Document Status
electron_1.ipcMain.handle("signwell:getDocument", async (_, documentId) => {
    var _a, _b;
    try {
        const config = configService === null || configService === void 0 ? void 0 : configService.getConfig();
        if (!((_a = config === null || config === void 0 ? void 0 : config.signwell) === null || _a === void 0 ? void 0 : _a.clientId) || !((_b = config === null || config === void 0 ? void 0 : config.signwell) === null || _b === void 0 ? void 0 : _b.secretKey)) {
            return {
                success: false,
                error: "SignWell not configured.",
            };
        }
        if (!signWellService) {
            return { success: false, error: "SignWell service not initialized" };
        }
        signWellService.initialize({
            apiKey: config.signwell.apiKey,
            appUniqueId: config.signwell.appUniqueId,
            testMode: config.signwell.testMode,
        });
        const document = await signWellService.getDocument(documentId);
        return {
            success: true,
            document,
        };
    }
    catch (error) {
        console.error("SignWell get document error:", error);
        return { success: false, error: error.message };
    }
});
// SignWell - Download Completed PDF
electron_1.ipcMain.handle("signwell:downloadCompletedPDF", async (_, documentId, savePath) => {
    var _a, _b;
    try {
        const config = configService === null || configService === void 0 ? void 0 : configService.getConfig();
        if (!((_a = config === null || config === void 0 ? void 0 : config.signwell) === null || _a === void 0 ? void 0 : _a.clientId) || !((_b = config === null || config === void 0 ? void 0 : config.signwell) === null || _b === void 0 ? void 0 : _b.secretKey)) {
            return {
                success: false,
                error: "SignWell not configured.",
            };
        }
        if (!signWellService) {
            return { success: false, error: "SignWell service not initialized" };
        }
        signWellService.initialize({
            apiKey: config.signwell.apiKey,
            appUniqueId: config.signwell.appUniqueId,
            testMode: config.signwell.testMode,
        });
        const pdfBuffer = await signWellService.downloadCompletedPDF(documentId);
        // Save to file
        const fs = require("fs");
        fs.writeFileSync(savePath, pdfBuffer);
        return {
            success: true,
            path: savePath,
        };
    }
    catch (error) {
        console.error("SignWell download PDF error:", error);
        return { success: false, error: error.message };
    }
});
// SignWell - Send Reminder
electron_1.ipcMain.handle("signwell:sendReminder", async (_, documentId) => {
    var _a, _b;
    try {
        const config = configService === null || configService === void 0 ? void 0 : configService.getConfig();
        if (!((_a = config === null || config === void 0 ? void 0 : config.signwell) === null || _a === void 0 ? void 0 : _a.clientId) || !((_b = config === null || config === void 0 ? void 0 : config.signwell) === null || _b === void 0 ? void 0 : _b.secretKey)) {
            return {
                success: false,
                error: "SignWell not configured.",
            };
        }
        if (!signWellService) {
            return { success: false, error: "SignWell service not initialized" };
        }
        signWellService.initialize({
            apiKey: config.signwell.apiKey,
            appUniqueId: config.signwell.appUniqueId,
            testMode: config.signwell.testMode,
        });
        await signWellService.sendReminder(documentId);
        return { success: true };
    }
    catch (error) {
        console.error("SignWell send reminder error:", error);
        return { success: false, error: error.message };
    }
});
// SignWell - Update and Send Document
electron_1.ipcMain.handle("signwell:updateAndSend", async (_, data) => {
    var _a;
    try {
        const config = configService === null || configService === void 0 ? void 0 : configService.getConfig();
        if (!((_a = config === null || config === void 0 ? void 0 : config.signwell) === null || _a === void 0 ? void 0 : _a.apiToken)) {
            return {
                success: false,
                error: "SignWell not configured.",
            };
        }
        if (!signWellService) {
            return { success: false, error: "SignWell service not initialized" };
        }
        signWellService.initialize({
            apiToken: config.signwell.apiToken,
            testMode: config.signwell.testMode,
        });
        const document = await signWellService.updateAndSendDocument(data.documentId, {
            recipients: data.recipients,
            draft: false, // Send the document
        });
        return {
            success: true,
            document,
        };
    }
    catch (error) {
        console.error("SignWell update and send error:", error);
        return { success: false, error: error.message };
    }
});
