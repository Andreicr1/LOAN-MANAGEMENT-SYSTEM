import { app, BrowserWindow, ipcMain, dialog } from "electron";
import dotenv from "dotenv";
dotenv.config();
import path from "path";
import fs from "fs";
import { DatabaseService } from "./database/database.service";
import { AuthService } from "./services/auth.service";
import { ConfigService } from "./services/config.service";
import { UserService } from "./services/user.service";
import { DisbursementService } from "./services/disbursement.service";
import { PromissoryNoteService } from "./services/promissory-note.service";
import { PDFService } from "./services/pdf.service";
import { PDFParserService } from "./services/pdf-parser.service";
import { PDFSignatureValidatorService } from "./services/pdf-signature-validator.service";
import { ESignatureService } from "./services/esignature.service";
import { SignWellService } from "./services/signwell.service";
import { WebhookService } from "./services/webhook.service";
import { EmailService } from "./services/email.service";
import { InterestService } from "./services/interest.service";
import { BankReconciliationService } from "./services/bank-reconciliation.service";
import { DebitNoteService } from "./services/debit-note.service";
import { ReportsService } from "./services/reports.service";
import { BackupService } from "./services/backup.service";
import { ClientService } from "./services/client.service";
import {
  clearMasterSecret,
  encryptIfNeeded,
  isMasterSecretSet,
  setMasterSecret,
} from "./utils/secret-manager";

// DECISION: Keep database and services as singletons in main process
let mainWindow: BrowserWindow | null = null;
let db: DatabaseService | null = null;
let authService: AuthService | null = null;
let configService: ConfigService | null = null;
let userService: UserService | null = null;
let disbursementService: DisbursementService | null = null;
let promissoryNoteService: PromissoryNoteService | null = null;
let pdfService: PDFService | null = null;
let pdfParserService: PDFParserService | null = null;
let pdfSignatureValidator: PDFSignatureValidatorService | null = null;
let eSignatureService: ESignatureService | null = null;
let signWellService: SignWellService | null = null;
let webhookService: WebhookService | null = null;
let emailService: EmailService | null = null;
let interestService: InterestService | null = null;
let bankReconciliationService: BankReconciliationService | null = null;
let debitNoteService: DebitNoteService | null = null;
let reportsService: ReportsService | null = null;
let backupService: BackupService | null = null;
let clientService: ClientService | null = null;

const isDev =
  process.env.NODE_ENV === "development" || process.env.VITE_DEV_SERVER_URL;

function createWindow() {
  const preloadPath = path.join(__dirname, "preload.js");
  console.log("Creating window with preload:", preloadPath);
  console.log("Preload exists:", require("fs").existsSync(preloadPath));

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
      webSecurity: false, // Allow loading external resources in iframes (needed for SignWell)
      allowRunningInsecureContent: true, // Allow mixed content (HTTP in HTTPS context)
    },
    frame: true,
    backgroundColor: "#FFFFFF",
    show: false, // Show only when ready
  });

  // Debug: Log paths
  console.log("App path:", app.getPath("userData"));
  console.log("Preload path:", preloadPath);
  console.log("__dirname:", __dirname);
  console.log("isDev:", isDev);
  console.log("NODE_ENV:", process.env.NODE_ENV);

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
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
      path.join(__dirname, "..", "..", "dist", "index.html"),
      path.join(__dirname, "../dist/index.html"),
      path.join((process as any).resourcesPath || '', "app.asar", "dist", "index.html"),
      path.join(process.cwd(), "dist", "index.html"),
    ];

    let indexPath = "";
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
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
  const dbPath = path.join(app.getPath("userData"), "loan-management.db");
  db = new DatabaseService(dbPath);
  authService = new AuthService(db);
  configService = new ConfigService(db);
  userService = new UserService(db);
  disbursementService = new DisbursementService(db);
  promissoryNoteService = new PromissoryNoteService(db);
  pdfService = new PDFService();
  pdfParserService = new PDFParserService();
  pdfSignatureValidator = new PDFSignatureValidatorService();
  eSignatureService = new ESignatureService();
  signWellService = new SignWellService();
  webhookService = new WebhookService();
  emailService = new EmailService();
  interestService = new InterestService(db);
  bankReconciliationService = new BankReconciliationService(db);
  debitNoteService = new DebitNoteService(db);
  reportsService = new ReportsService(db);
  backupService = new BackupService(dbPath);
  clientService = new ClientService(db.getDatabase() as any);

  // Calculate interests daily
  interestService.calculateAllActiveInterests();

  // Enable auto backup every 24 hours
  backupService.enableAutoBackup(24);

  // Webhook server disabled for now - using manual "Check Status" button instead
  // startWebhookServer();

  console.log(`Database initialized at: ${dbPath}`);
}

async function startWebhookServer() {
  if (!webhookService) return;

  try {
    // Register event handlers
    webhookService.on('document_completed', async (event) => {
      console.log('[SignWell Event] Document completed:', event.data.object.name);
      
      const docId = event.data.object.id;
      const docName = event.data.object.name;
      const completedAtIso =
        (event.data.object as any)?.completed_at ||
        (typeof event.event.time === 'number'
          ? new Date(event.event.time * 1000).toISOString()
          : new Date().toISOString());
      
      try {
        // Get SignWell config
        const config = configService?.getConfig();
        if (!config?.signwell?.apiKey) {
          console.error('[SignWell Event] API Key not configured');
          return;
        }

        // Initialize SignWell service
        signWellService?.initialize({
          apiKey: config.signwell.apiKey || undefined,
          testMode: config.signwell.testMode,
        });

        // Download signed PDF
        const pdfBuffer = await signWellService!.downloadCompletedPDF(docId);
        
        // Determine save path based on document type
        let savePath: string = '';
        let updateResult: any;

        if (docName.includes('Promissory Note')) {
          // Extract PN number
          const pnNumber = docName.match(/PN-\d{4}-\d{3}/)?.[0];
          if (!pnNumber) {
            console.error('[SignWell Event] Could not extract PN number from:', docName);
            return;
          }

          savePath = path.join(
            app.getPath('userData'),
            'promissory-notes',
            `${pnNumber}_Signed.pdf`
          );

          // Ensure directory exists
          const dir = path.dirname(savePath);
          if (!require('fs').existsSync(dir)) {
            require('fs').mkdirSync(dir, { recursive: true });
          }

          // Save PDF
          require('fs').writeFileSync(savePath, pdfBuffer);
          console.log('[SignWell Event] Saved signed PN to:', savePath);

          // Update database - find PN by number
          const pn = promissoryNoteService?.getAllPromissoryNotes().find(
            (p: any) => p.pnNumber === pnNumber || p.pn_number === pnNumber
          );

          if (pn) {
            updateResult = await promissoryNoteService?.updatePromissoryNote(pn.id, {
              signedPnPath: savePath,
              signwellStatus: 'completed',
              signwellCompletedAt: completedAtIso,
            } as any);
            console.log('[SignWell Event] Updated PN:', pn.id);
          }
        } else if (docName.includes('Wire Transfer')) {
          // Extract request number
          const reqNumber = docName.match(/REQ-\d{4}-\d{3}/)?.[0];
          if (!reqNumber) {
            console.error('[SignWell Event] Could not extract Request Number from:', docName);
            return;
          }

          savePath = path.join(
            app.getPath('userData'),
            'wire-transfers',
            `${reqNumber}_WireTransfer_Signed.pdf`
          );

          // Ensure directory exists
          const dir = path.dirname(savePath);
          if (!require('fs').existsSync(dir)) {
            require('fs').mkdirSync(dir, { recursive: true });
          }

          // Save PDF
          require('fs').writeFileSync(savePath, pdfBuffer);
          console.log('[SignWell Event] Saved signed Wire Transfer to:', savePath);

          // Update database - find disbursement by request number
          const disb = disbursementService?.getAllDisbursements().find(
            (d: any) => d.requestNumber === reqNumber
          );

          if (disb) {
            updateResult = await disbursementService?.updateDisbursement(disb.id, {
              wireTransferSignedPath: savePath,
              wireTransferSignwellStatus: event.data.object.status || 'completed',
            });
          }
        }

        // Notify frontend
        if (mainWindow && savePath) {
          mainWindow.webContents.send('signwell:document-completed', {
            documentId: docId,
            documentName: docName,
            pdfPath: savePath,
            status: 'completed',
          });
        }

        console.log('[SignWell Event] Processing completed successfully!');
      } catch (error: any) {
        console.error('[SignWell Event] Error processing document:', error.message);
      }
    });

    // Start server
    const publicUrl = await webhookService.start(3050);
    console.log('[Webhook] Started successfully!');
    
    // Store webhook URL for reference
    if (mainWindow) {
      mainWindow.webContents.once('did-finish-load', () => {
        mainWindow?.webContents.send('webhook:url-ready', publicUrl);
      });
    }
  } catch (error: any) {
    console.error('[Webhook] Failed to start:', error.message);
  }
}

app.whenReady().then(() => {
  initializeServices();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    db?.close();
    webhookService?.stop();
    app.quit();
  }
});

app.on("before-quit", async () => {
  // Cleanup webhook server
  await webhookService?.stop();
});

// ==================== IPC HANDLERS ====================

// Auth
ipcMain.handle("auth:login", async (_, username: string, password: string) => {
  return authService?.login(username, password);
});

ipcMain.handle("auth:logout", async (_, userId: number) => {
  return authService?.logout(userId);
});

ipcMain.handle(
  "auth:changePassword",
  async (_, userId: number, oldPassword: string, newPassword: string) => {
    return authService?.changePassword(userId, oldPassword, newPassword);
  },
);

// Users
ipcMain.handle("users:getAll", async () => {
  return userService?.getAllUsers();
});

ipcMain.handle("users:getById", async (_, id: number) => {
  return userService?.getUserById(id);
});

ipcMain.handle("users:create", async (_, data: any) => {
  return userService?.createUser(data);
});

ipcMain.handle("users:update", async (_, id: number, data: any) => {
  return userService?.updateUser(id, data);
});

ipcMain.handle("users:delete", async (_, id: number) => {
  return userService?.deleteUser(id);
});

ipcMain.handle(
  "users:resetPassword",
  async (_, userId: number, newPassword: string) => {
    return userService?.resetPassword(userId, newPassword);
  },
);

// Config
ipcMain.handle("config:get", async () => {
  if (!configService) {
    throw new Error("Config service not initialized");
  }
  try {
    return configService.getConfig();
  } catch (error: any) {
    if (error?.message === "Master secret not set") {
      return {
        error: "MASTER_SECRET_REQUIRED",
        message: "Master secret required to access encrypted configuration",
      };
    }
    throw error;
  }
});

ipcMain.handle("config:update", async (_, data: any) => {
  return configService?.updateConfig(data);
});

ipcMain.handle("config:unlock", async (_, secret: string) => {
  if (!secret || secret.length < 8) {
    return { success: false, error: "Master secret deve ter pelo menos 8 caracteres" };
  }

  try {
    setMasterSecret(secret);
    // Test by fetching config to ensure secret works
    configService?.getConfig();
    return { success: true };
  } catch (error: any) {
    clearMasterSecret();
    return {
      success: false,
      error: error?.message || "Falha ao validar master secret",
    };
  }
});

ipcMain.handle("config:lock", async () => {
  clearMasterSecret();
  return { success: true };
});

ipcMain.handle("config:setupIntegrations", async () => {
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
        } as any, // Cast to any to allow partial email updates
      });

      // Update SignWell config
      configService.updateConfig({
        signwell: {
          apiKey: "YWNjZXNzOjJhMWM2Y2FjYWI0ZGU2MmY0YjhjYTM0ZjFiNGY0MGU5",
          testMode: false, // PRODUCTION MODE - emails will be sent and requests will count
        } as any, // Cast to any to allow partial signwell updates
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
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Audit Log
ipcMain.handle(
  "audit:log",
  async (_, userId: number, action: string, details: any) => {
    return db?.logAudit(userId, action, details);
  },
);

ipcMain.handle("audit:getAll", async (_, filters?: any) => {
  return db?.getAuditLogs(filters);
});

// Disbursements
ipcMain.handle("disbursements:getAll", async (_, filters?: any) => {
  return disbursementService?.getAllDisbursements(filters);
});

ipcMain.handle("disbursements:getById", async (_, id: number) => {
  return disbursementService?.getDisbursementById(id);
});

ipcMain.handle("disbursements:create", async (_, data: any) => {
  return disbursementService?.createDisbursement(data);
});

ipcMain.handle("disbursements:update", async (_, id: number, data: any) => {
  return disbursementService?.updateDisbursement(id, data);
});

ipcMain.handle(
  "disbursements:approve",
  async (_, id: number, approvedBy: number, signedRequestPath?: string) => {
    return disbursementService?.approveDisbursement(
      id,
      approvedBy,
      signedRequestPath,
    );
  },
);

ipcMain.handle("disbursements:cancel", async (_, id: number) => {
  return disbursementService?.cancelDisbursement(id);
});

ipcMain.handle(
  "disbursements:uploadDocument",
  async (_, id: number, fieldName: string, filePath: string) => {
    return disbursementService?.uploadDocument(id, fieldName as any, filePath);
  },
);

// Promissory Notes
ipcMain.handle("promissoryNotes:getAll", async (_, filters?: any) => {
  return promissoryNoteService?.getAllPromissoryNotes(filters);
});

ipcMain.handle("promissoryNotes:getById", async (_, id: number) => {
  return promissoryNoteService?.getPromissoryNoteById(id);
});

ipcMain.handle(
  "promissoryNotes:getByDisbursementId",
  async (_, disbursementId: number) => {
    return promissoryNoteService?.getByDisbursementId(disbursementId);
  },
);

ipcMain.handle("promissoryNotes:create", async (_, data: any) => {
  return promissoryNoteService?.createPromissoryNote(data);
});

ipcMain.handle("promissoryNotes:update", async (_, id: number, data: any) => {
  return promissoryNoteService?.updatePromissoryNote(id, data);
});

ipcMain.handle(
  "promissoryNotes:settle",
  async (_, id: number, amount: number, date: string) => {
    return promissoryNoteService?.settlePromissoryNote(id, amount, date);
  },
);

ipcMain.handle("promissoryNotes:updateOverdue", async () => {
  return promissoryNoteService?.updateOverdueStatus();
});

// PDF Generation
ipcMain.handle("pdf:generatePromissoryNote", async (_, data: any) => {
  return pdfService?.generatePromissoryNote(data);
});

ipcMain.handle("pdf:generateWireTransfer", async (_, data: any) => {
  return pdfService?.generateWireTransferOrder(data);
});

ipcMain.handle("pdf:generateDebitNote", async (_, data: any) => {
  return pdfService?.generateDebitNote(data);
});

// Interest Calculations
ipcMain.handle("interest:calculateAll", async () => {
  return interestService?.calculateAllActiveInterests();
});

ipcMain.handle(
  "interest:getForPN",
  async (_, pnId: number, asOfDate?: string) => {
    return interestService?.getInterestForPromissoryNote(pnId, asOfDate);
  },
);

ipcMain.handle("interest:getTotal", async () => {
  return interestService?.getTotalAccumulatedInterest();
});

ipcMain.handle(
  "interest:getHistory",
  async (_, pnId: number, startDate: string, endDate: string) => {
    return interestService?.getInterestHistory(pnId, startDate, endDate);
  },
);

// Bank Reconciliation
ipcMain.handle("bankRecon:getAll", async (_, filters?: any) => {
  return bankReconciliationService?.getAllTransactions(filters);
});

ipcMain.handle("bankRecon:import", async (_, transaction: any) => {
  return bankReconciliationService?.importTransaction(transaction);
});

ipcMain.handle("bankRecon:importCSV", async (_, filePath: string) => {
  return bankReconciliationService?.importFromCSV(filePath);
});

ipcMain.handle(
  "bankRecon:match",
  async (_, transactionId: number, pnId: number, userId: number) => {
    return bankReconciliationService?.matchTransaction(
      transactionId,
      pnId,
      userId,
    );
  },
);

ipcMain.handle("bankRecon:unmatch", async (_, transactionId: number) => {
  return bankReconciliationService?.unmatchTransaction(transactionId);
});

ipcMain.handle("bankRecon:suggestMatches", async (_, transactionId: number) => {
  return bankReconciliationService?.suggestMatches(transactionId);
});

ipcMain.handle("bankRecon:getSummary", async () => {
  return bankReconciliationService?.getReconciliationSummary();
});

// Debit Notes
ipcMain.handle("debitNotes:getAll", async () => {
  return debitNoteService?.getAllDebitNotes();
});

ipcMain.handle("debitNotes:getById", async (_, id: number) => {
  return debitNoteService?.getDebitNoteById(id);
});

ipcMain.handle("debitNotes:create", async (_, data: any) => {
  return debitNoteService?.createDebitNote(data);
});

ipcMain.handle("debitNotes:update", async (_, id: number, data: any) => {
  return debitNoteService?.updateDebitNote(id, data);
});

ipcMain.handle("debitNotes:markPaid", async (_, id: number) => {
  return debitNoteService?.markAsPaid(id);
});

ipcMain.handle("debitNotes:updateOverdue", async () => {
  return debitNoteService?.updateOverdueStatus();
});

// Reports
ipcMain.handle("reports:getDashboardKPIs", async () => {
  return reportsService?.getDashboardKPIs();
});

ipcMain.handle("reports:getAgingReport", async () => {
  return reportsService?.getAgingReport();
});

ipcMain.handle(
  "reports:getTimeSeries",
  async (_, startDate: string, endDate: string) => {
    return reportsService?.getTimeSeriesData(startDate, endDate);
  },
);

ipcMain.handle(
  "reports:getPeriodReport",
  async (_, startDate: string, endDate: string) => {
    return reportsService?.getPeriodReport(startDate, endDate);
  },
);

ipcMain.handle("reports:getTopPNs", async (_, limit: number) => {
  return reportsService?.getTopPromissoryNotes(limit);
});

ipcMain.handle("reports:getAcquiredAssets", async () => {
  return reportsService?.getAcquiredAssets();
});

ipcMain.handle("reports:getSignwellNotifications", async () => {
  return reportsService?.getSignwellNotifications();
});

// Backup
ipcMain.handle("backup:create", async () => {
  return backupService?.createBackup();
});

ipcMain.handle("backup:restore", async (_, backupFile: string) => {
  return backupService?.restoreBackup(backupFile);
});

ipcMain.handle("backup:list", async () => {
  return backupService?.getBackupList();
});

// Clients
ipcMain.handle("clients:getAll", async () => {
  return clientService?.getAllClients();
});

ipcMain.handle("clients:getActive", async () => {
  return clientService?.getActiveClients();
});

ipcMain.handle("clients:getById", async (_, id: number) => {
  return clientService?.getClientById(id);
});

ipcMain.handle("clients:create", async (_, data: any) => {
  return clientService?.createClient(data);
});

ipcMain.handle("clients:update", async (_, id: number, data: any) => {
  return clientService?.updateClient(id, data);
});

ipcMain.handle("clients:delete", async (_, id: number) => {
  return clientService?.deleteClient(id);
});

ipcMain.handle("clients:getStats", async (_, id: number) => {
  return clientService?.getClientStats(id);
});

// PDF Parsing
ipcMain.handle("parsePDF", async (_, base64Data: string) => {
  return pdfParserService?.parsePDF(base64Data);
});

// PDF Viewer - Open PDF in new window
ipcMain.handle("openPDF", async (_, pdfPath: string) => {
  const fs = require("fs");

  if (!fs.existsSync(pdfPath)) {
    console.error("PDF file not found:", pdfPath);
    return;
  }

  // Create new window for PDF
  const pdfWindow = new BrowserWindow({
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
ipcMain.handle(
  "uploadSignedPN",
  async (_, pnId: number, base64Data: string, fileName: string) => {
    try {
      // Save uploaded file
      const filePath = await pdfSignatureValidator?.saveUploadedPDF(
        base64Data,
        fileName,
      );

      if (!filePath) {
        return { success: false, error: "Failed to save file" };
      }

      // Validate signature
      const validation = pdfSignatureValidator?.validateSignature(filePath);

      if (!validation?.isSigned) {
        return {
          success: false,
          error:
            validation?.error ||
            "PDF does not contain a valid digital signature",
        };
      }

      // Update PN with signed path
      const updateResult = promissoryNoteService?.updatePromissoryNote(
        pnId,
        {
          signedPnPath: filePath,
        }
      );

      if (!updateResult?.success) {
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
    } catch (error: any) {
      console.error("Upload signed PN error:", error);
      return { success: false, error: error.message };
    }
  },
);

// Validate PDF Signature
ipcMain.handle("validatePDFSignature", async (_, pdfPath: string) => {
  return pdfSignatureValidator?.validateSignature(pdfPath);
});

// ==================== SIGNWELL HANDLERS ====================

// SignWell - Run Migration (add columns if needed)
ipcMain.handle("signwell:runMigration", async () => {
  try {
    const dbInstance = db?.getDatabase();
    if (!dbInstance) {
      return { success: false, error: "Database not initialized" };
    }

    // Check if columns already exist
    const tableInfo = dbInstance.prepare("PRAGMA table_info(config)").all();
    const hasSignwellToken = tableInfo.some((col: any) => col.name === 'signwell_api_token');
    
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
    `).run(
      '01b6fa87d977448d9663a371e4ad293a67b7ad53',
      '3d8bc232b790a97e2ec459629fdabc05',
      '15851806701fcedfd2435189527ccb43',
      '7c0af648fe4d7ceeba5f5b087f5ec51d9e232047dd64d7c2628a32bf8484e243'
    );

    return { success: true, message: "SignWell migration completed successfully!" };
  } catch (error: any) {
    console.error("SignWell migration error:", error);
    return { success: false, error: error.message };
  }
});

// SignWell - Create Document
ipcMain.handle(
  "signwell:createDocument",
  async (
    _,
    data: {
      name: string;
      pdfPath: string;
      pdfName: string;
      recipients: Array<{ name: string; email: string }>;
    }
  ) => {
    try {
      // Get SignWell config
      const config = configService?.getConfig();
      if (!config?.signwell?.apiKey) {
        return {
          success: false,
          error: "SignWell not configured. Please add credentials in Settings.",
        };
      }

      // Initialize SignWell if needed
      if (!signWellService) {
        return { success: false, error: "SignWell service not initialized" };
      }

      signWellService.initialize({
        apiKey: config.signwell.apiKey || undefined,
        testMode: config.signwell.testMode,
      });

      // Read PDF file and convert to base64
      const fs = require("fs");
      const pdfBuffer = fs.readFileSync(data.pdfPath);
      const pdfBase64 = pdfBuffer.toString("base64");

      // Create document in SignWell with recipients (format per SignWell SDK docs)
      const document = await signWellService.createDocument({
        name: data.name,
        files: [
          {
            name: data.pdfName,
            file_base64: pdfBase64,
          },
        ],
        recipients: data.recipients.map((r: any, index: number) => ({
          id: String(index + 1),
          name: r.name,
          email: r.email,
          send_email: true, // Send email notification to recipients
          send_email_delay: 0, // Send immediately
        })),
        draft: true, // Create as draft so we can use embedded requesting
        embedded_signing: true, // Required to enable send_email
      } as any);

      return {
        success: true,
        documentId: document.id,
        status: document.status,
      };
    } catch (error: any) {
      console.error("SignWell create document error:", error);
      return { success: false, error: error.message };
    }
  }
);

// SignWell - Open Embedded Requesting in New Window
ipcMain.handle("signwell:openEmbeddedRequesting", async (_, documentId: string, documentName: string) => {
  try {
    const config = configService?.getConfig();
    if (!config?.signwell?.apiKey) {
      return {
        success: false,
        error: "SignWell not configured.",
      };
    }

    if (!signWellService) {
      return { success: false, error: "SignWell service not initialized" };
    }

    signWellService.initialize({
      apiKey: config.signwell.apiKey || undefined,
      testMode: config.signwell.testMode,
    });

    const link = await signWellService.getEmbeddedRequestingLink(documentId);

    // Create new window for SignWell editor
    const signwellWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      title: `SignWell - ${documentName}`,
      autoHideMenuBar: true,
      backgroundColor: "#FFFFFF",
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false, // Allow SignWell to load external resources
      },
    });

    // Load SignWell editor URL
    signwellWindow.loadURL(link.url);

    // Open DevTools in development
    if (isDev) {
      signwellWindow.webContents.openDevTools();
    }

    // Listen for navigation events to detect when document is sent
    signwellWindow.webContents.on('did-finish-load', () => {
      const currentUrl = signwellWindow.webContents.getURL();
      console.log('[SignWell Window] Page loaded:', currentUrl);
      
      // If URL contains "sent" or shows success page, document was likely sent
      if (currentUrl.includes('/sent') || currentUrl.includes('/success')) {
        console.log('[SignWell Window] Document appears to be sent, will auto-close in 5 seconds...');
        setTimeout(() => {
          if (!signwellWindow.isDestroyed()) {
            signwellWindow.close();
          }
        }, 5000);
      }
    });

    // Add keyboard shortcuts to close window
    signwellWindow.setMenu(null); // Remove default menu
    
    // Listen for keyboard shortcuts (Esc or Ctrl+W to close)
    signwellWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'Escape' || (input.control && input.key === 'w')) {
        signwellWindow.close();
      }
    });
    
    signwellWindow.on("closed", async () => {
      console.log('[SignWell Window] Closed, checking document status...');
      
      try {
        // Check if document is still draft and send it
        const doc = await signWellService!.getDocument(documentId);
        
        if (doc.status === 'draft' || doc.status === 'Draft') {
          console.log('[SignWell Window] Document still in draft, sending now...');
          
          // Send the document
          await signWellService!.sendDocument(documentId);
          console.log('[SignWell Window] Document sent successfully! Emails dispatched.');
        } else {
          console.log('[SignWell Window] Document status:', doc.status);
        }
      } catch (error: any) {
        console.error('[SignWell Window] Error sending document:', error.message);
      }
      
      // Notify renderer that window was closed
      mainWindow?.webContents.send("signwell:window-closed", documentId);
    });

    return {
      success: true,
      url: link.url,
      expiresAt: link.expires_at,
    };
  } catch (error: any) {
    console.error("SignWell open embedded window error:", error);
    return { success: false, error: error.message };
  }
});

// SignWell - Get Document Status
ipcMain.handle("signwell:getDocument", async (_, documentId: string) => {
  try {
    const config = configService?.getConfig();
    if (!config?.signwell?.apiKey) {
      return {
        success: false,
        error: "SignWell not configured.",
      };
    }

    if (!signWellService) {
      return { success: false, error: "SignWell service not initialized" };
    }

    signWellService.initialize({
      apiKey: config.signwell.apiKey || undefined,
      testMode: config.signwell.testMode,
    });

    const document = await signWellService.getDocument(documentId);

    return {
      success: true,
      document,
    };
  } catch (error: any) {
    console.error("SignWell get document error:", error);
    return { success: false, error: error.message };
  }
});

type SignwellDocumentType = "promissory_note" | "wire_transfer";

interface DownloadAttachResult {
  success: boolean;
  type?: SignwellDocumentType;
  path?: string;
  status?: string;
  completedAt?: string;
  error?: string;
}

async function downloadAndAttachSignwellDocument(
  documentId: string,
  documentType?: SignwellDocumentType,
): Promise<DownloadAttachResult> {
  try {
    if (!documentId) {
      return { success: false, error: "Missing documentId" };
    }

    const config = configService?.getConfig();
    if (!config?.signwell?.apiKey) {
      return {
        success: false,
        error: "SignWell not configured.",
      };
    }

    if (!signWellService) {
      return { success: false, error: "SignWell service not initialized" };
    }

    signWellService.initialize({
      apiKey: config.signwell.apiKey || undefined,
      testMode: config.signwell.testMode,
    });

    let metadata: {
      type: SignwellDocumentType | null;
      reference?: string;
      requestNumber?: string;
      disbursementId?: number;
      promissoryNoteId?: number;
    } = { type: null };

    let filePath = "";

    if (!documentType || documentType === "promissory_note") {
      const pn = promissoryNoteService?.getBySignwellDocumentId(documentId);
      if (pn) {
        metadata = {
          type: "promissory_note",
          reference: pn.pnNumber || pn.pn_number || "PromissoryNote",
          requestNumber: pn.requestNumber,
          disbursementId: pn.disbursementId,
          promissoryNoteId: pn.id,
        };
      }
    }

    if (!metadata.type && (!documentType || documentType === "wire_transfer")) {
      const disb = disbursementService?.getBySignwellDocumentId(documentId);
      if (disb) {
        metadata = {
          type: "wire_transfer",
          reference: disb.requestNumber,
          requestNumber: disb.requestNumber,
          disbursementId: disb.id,
        };
      }
    }

    if (!metadata.type) {
      return {
        success: false,
        error: "No associated operation found for SignWell document.",
      };
    }

    const documentDetails = await signWellService.getDocument(documentId).catch(() => null);
    const completedAt =
      (documentDetails as any)?.completed_at || new Date().toISOString();
    const status = (documentDetails as any)?.status || "completed";

    const pdfBuffer = await signWellService.downloadCompletedPDF(documentId);

    if (metadata.type === "promissory_note") {
      const safeReference = (metadata.reference || "PromissoryNote")
        .replace(/[^\w.-]+/g, "_")
        .replace(/_+/g, "_");
      const directory = path.join(app.getPath("userData"), "promissory-notes");
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      filePath = path.join(directory, `${safeReference}_Signed.pdf`);
      fs.writeFileSync(filePath, pdfBuffer);

      await promissoryNoteService?.updatePromissoryNote(metadata.promissoryNoteId!, {
        signedPnPath: filePath,
        signwellStatus: status,
        signwellCompletedAt: completedAt,
      } as any);
    } else if (metadata.type === "wire_transfer") {
      const safeReference = (metadata.reference || "WireTransfer")
        .replace(/[^\w.-]+/g, "_")
        .replace(/_+/g, "_");
      const directory = path.join(app.getPath("userData"), "wire-transfers");
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      filePath = path.join(
        directory,
        `${safeReference || "WireTransfer"}_Signed.pdf`,
      );
      fs.writeFileSync(filePath, pdfBuffer);

      await disbursementService?.updateDisbursement(metadata.disbursementId!, {
        wireTransferSignedPath: filePath,
        wireTransferSignwellStatus: status,
      });
    }

    if (mainWindow && metadata.type && filePath) {
      mainWindow.webContents.send("signwell:document-completed", {
        documentId,
        documentName: metadata.reference || "",
        pdfPath: filePath,
        status,
      });
    }

    return {
      success: true,
      type: metadata.type,
      path: filePath,
      status,
      completedAt,
    };
  } catch (error: any) {
    console.error("SignWell download and attach error:", error);
    return { success: false, error: error.message };
  }
}

// SignWell - Download Completed PDF
ipcMain.handle("signwell:downloadCompletedPDF", async (_, documentId: string, savePath: string) => {
  try {
    const config = configService?.getConfig();
    if (!config?.signwell?.apiKey) {
      return {
        success: false,
        error: "SignWell not configured.",
      };
    }

    if (!signWellService) {
      return { success: false, error: "SignWell service not initialized" };
    }

    signWellService.initialize({
      apiKey: config.signwell.apiKey || undefined,
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
  } catch (error: any) {
    console.error("SignWell download PDF error:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle(
  "signwell:downloadAndAttach",
  async (
    _,
    payload: {
      documentId: string;
      documentType?: "promissory_note" | "wire_transfer";
    },
  ) => {
    const { documentId, documentType } = payload || ({} as any);
    return downloadAndAttachSignwellDocument(documentId, documentType);
  },
);

ipcMain.handle("signwell:syncCompletedDocuments", async () => {
  try {
    const config = configService?.getConfig();
    if (!config?.signwell?.apiKey) {
      return {
        success: false,
        error: "SignWell not configured.",
      };
    }

    if (!signWellService) {
      return { success: false, error: "SignWell service not initialized" };
    }

    signWellService.initialize({
      apiKey: config.signwell.apiKey || undefined,
      testMode: config.signwell.testMode,
    });

    const pendingPNs =
      typeof promissoryNoteService?.getPendingSignwellDocuments === "function"
        ? promissoryNoteService!.getPendingSignwellDocuments()
        : [];

    const pendingWTs =
      typeof disbursementService?.getPendingSignwellWireTransfers === "function"
        ? disbursementService!.getPendingSignwellWireTransfers()
        : [];

    const summary = {
      processed: 0,
      completed: 0,
      errors: 0,
    };

    for (const pn of pendingPNs) {
      summary.processed += 1;
      const result = await downloadAndAttachSignwellDocument(pn.signwellDocumentId, "promissory_note");
      if (result.success) {
        summary.completed += 1;
      } else if (result.error) {
        summary.errors += 1;
      }
    }

    for (const wt of pendingWTs) {
      summary.processed += 1;
      const result = await downloadAndAttachSignwellDocument(wt.signwellDocumentId, "wire_transfer");
      if (result.success) {
        summary.completed += 1;
      } else if (result.error) {
        summary.errors += 1;
      }
    }

    return {
      success: true,
      summary,
      pendingPromissory: pendingPNs.length,
      pendingWireTransfers: pendingWTs.length,
    };
  } catch (error: any) {
    console.error("SignWell sync documents error:", error);
    return { success: false, error: error.message };
  }
});

// SignWell - Send Reminder
ipcMain.handle("signwell:sendReminder", async (_, documentId: string) => {
  try {
    const config = configService?.getConfig();
    if (!config?.signwell?.apiKey) {
      return {
        success: false,
        error: "SignWell not configured.",
      };
    }

    if (!signWellService) {
      return { success: false, error: "SignWell service not initialized" };
    }

    signWellService.initialize({
      apiKey: config.signwell.apiKey || undefined,
      testMode: config.signwell.testMode,
    });

    await signWellService.sendReminder(documentId);

    return { success: true };
  } catch (error: any) {
    console.error("SignWell send reminder error:", error);
    return { success: false, error: error.message };
  }
});

// SignWell - Update and Send Document
ipcMain.handle(
  "signwell:updateAndSend",
  async (
    _,
    data: {
      documentId: string;
      recipients?: Array<{ name: string; email: string }>;
    }
  ) => {
    try {
      const config = configService?.getConfig();
      if (!config?.signwell?.apiKey) {
        return {
          success: false,
          error: "SignWell not configured.",
        };
      }

      if (!signWellService) {
        return { success: false, error: "SignWell service not initialized" };
      }

      signWellService.initialize({
        apiKey: config.signwell.apiKey || undefined,
        testMode: config.signwell.testMode,
      });

      const document = await signWellService.sendDocument(
        data.documentId,
        {
          metadata: data.recipients ? {
            sent_from: 'loan-management-system'
          } : undefined,
        }
      );

      return {
        success: true,
        document,
      };
    } catch (error: any) {
      console.error("SignWell update and send error:", error);
      return { success: false, error: error.message };
    }
  }
);
