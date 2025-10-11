const fs = require('fs');
const { app } = require('electron');
const path = require('path');

/**
 * PDF Signature Validator Service
 * Validates digital signatures in PDF documents
 */
var PDFSignatureValidatorService = /** @class */ (function () {
    function PDFSignatureValidatorService() {
        this.uploadsPath = path.join(app.getPath('userData'), 'uploads');
        if (!fs.existsSync(this.uploadsPath)) {
            fs.mkdirSync(this.uploadsPath, { recursive: true });
        }
    }
    /**
     * Save uploaded signed PDF
     */
    PDFSignatureValidatorService.prototype.saveUploadedPDF = function (base64Data, fileName) {
        try {
            // Remove data URL prefix if present
            var base64Clean = base64Data.replace(/^data:application\/pdf;base64,/, '');
            // Convert base64 to buffer
            var pdfBuffer = Buffer.from(base64Clean, 'base64');
            // Generate safe filename
            var safeFileName = fileName.replace(/[^a-z0-9.-]/gi, '_');
            var filePath = path.join(this.uploadsPath, safeFileName);
            // Save file
            fs.writeFileSync(filePath, pdfBuffer);
            return Promise.resolve(filePath);
        }
        catch (error) {
            console.error('Error saving uploaded PDF:', error);
            return Promise.reject(new Error('Failed to save uploaded PDF'));
        }
    };
    /**
     * Basic validation of PDF signature
     * Note: This is a simplified check. For production, use proper PDF signature validation library.
     */
    PDFSignatureValidatorService.prototype.validateSignature = function (pdfPath) {
        try {
            if (!fs.existsSync(pdfPath)) {
                return { isSigned: false, error: 'PDF file not found' };
            }
            // Read PDF file
            var pdfBuffer = fs.readFileSync(pdfPath);
            var pdfContent = pdfBuffer.toString('utf-8', 0, Math.min(pdfBuffer.length, 100000));
            // Basic signature detection
            // Real PDFs with digital signatures contain these markers
            var hasSignature = pdfContent.includes('/Type /Sig') ||
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
            var signerMatch = pdfContent.match(/\/Name\s*\(([^)]+)\)/);
            var signerName = signerMatch ? signerMatch[1] : 'Unknown';
            // Try to extract sign date
            var dateMatch = pdfContent.match(/\/M\s*\(D:(\d{14})/);
            var signDate = void 0;
            if (dateMatch) {
                var dateStr = dateMatch[1];
                signDate = "".concat(dateStr.substring(0, 4), "-").concat(dateStr.substring(4, 6), "-").concat(dateStr.substring(6, 8));
            }
            return {
                isSigned: true,
                signerName: signerName,
                signDate: signDate,
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
    };
    /**
     * Get file size in bytes
     */
    PDFSignatureValidatorService.prototype.getFileSize = function (filePath) {
        try {
            var stats = fs.statSync(filePath);
            return stats.size;
        }
        catch (_a) {
            return 0;
        }
    };
    return PDFSignatureValidatorService;
}());

module.exports = { PDFSignatureValidatorService };

