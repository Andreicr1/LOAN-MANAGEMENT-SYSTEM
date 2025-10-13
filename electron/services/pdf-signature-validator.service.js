"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PDFSignatureValidatorService = void 0;
const fs_1 = __importDefault(require("fs"));
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
/**
 * PDF Signature Validator Service
 * Validates digital signatures in PDF documents
 */
class PDFSignatureValidatorService {
    constructor() {
        this.uploadsPath = path_1.default.join(electron_1.app.getPath('userData'), 'uploads');
        if (!fs_1.default.existsSync(this.uploadsPath)) {
            fs_1.default.mkdirSync(this.uploadsPath, { recursive: true });
        }
    }
    /**
     * Save uploaded signed PDF
     */
    async saveUploadedPDF(base64Data, fileName) {
        try {
            // Remove data URL prefix if present
            const base64Clean = base64Data.replace(/^data:application\/pdf;base64,/, '');
            // Convert base64 to buffer
            const pdfBuffer = Buffer.from(base64Clean, 'base64');
            // Generate safe filename
            const safeFileName = fileName.replace(/[^a-z0-9.-]/gi, '_');
            const filePath = path_1.default.join(this.uploadsPath, safeFileName);
            // Save file
            fs_1.default.writeFileSync(filePath, pdfBuffer);
            return filePath;
        }
        catch (error) {
            console.error('Error saving uploaded PDF:', error);
            throw new Error('Failed to save uploaded PDF');
        }
    }
    /**
     * Basic validation of PDF signature
     * Note: This is a simplified check. For production, use proper PDF signature validation library.
     */
    validateSignature(pdfPath) {
        try {
            if (!fs_1.default.existsSync(pdfPath)) {
                return { isSigned: false, error: 'PDF file not found' };
            }
            // Read PDF file
            const pdfBuffer = fs_1.default.readFileSync(pdfPath);
            const pdfContent = pdfBuffer.toString('utf-8', 0, Math.min(pdfBuffer.length, 100000));
            // Basic signature detection
            // Real PDFs with digital signatures contain these markers
            const hasSignature = pdfContent.includes('/Type /Sig') ||
                pdfContent.includes('/SubFilter /adbe.pkcs7') ||
                pdfContent.includes('/SubFilter /ETSI.CAdES') ||
                pdfContent.includes('/ByteRange');
            if (!hasSignature) {
                return {
                    isSigned: false,
                    error: 'No digital signature detected in PDF'
                };
            }
            // Try to extract signer name (basic pattern matching)
            const signerMatch = pdfContent.match(/\/Name\s*\(([^)]+)\)/);
            const signerName = signerMatch ? signerMatch[1] : 'Unknown';
            // Try to extract sign date
            const dateMatch = pdfContent.match(/\/M\s*\(D:(\d{14})/);
            let signDate;
            if (dateMatch) {
                const dateStr = dateMatch[1];
                signDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
            }
            return {
                isSigned: true,
                signerName,
                signDate,
                certificateValid: true, // For now, assume valid
            };
        }
        catch (error) {
            console.error('Error validating signature:', error);
            return {
                isSigned: false,
                error: 'Failed to validate signature: ' + error.message
            };
        }
    }
    /**
     * Get file size in bytes
     */
    getFileSize(filePath) {
        try {
            const stats = fs_1.default.statSync(filePath);
            return stats.size;
        }
        catch {
            return 0;
        }
    }
}
exports.PDFSignatureValidatorService = PDFSignatureValidatorService;
