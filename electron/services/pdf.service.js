"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PDFService = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
class PDFService {
    constructor() {
        // DECISION: Store PDFs in app data directory
        this.docsPath = path_1.default.join(electron_1.app.getPath('userData'), 'documents');
        if (!fs_1.default.existsSync(this.docsPath)) {
            fs_1.default.mkdirSync(this.docsPath, { recursive: true });
        }
    }
    async generatePromissoryNote(data) {
        return new Promise((resolve, reject) => {
            var _a, _b, _c, _d, _e, _f;
            try {
                // Validate required data
                if (!((_a = data.lender) === null || _a === void 0 ? void 0 : _a.name) || !((_b = data.lender) === null || _b === void 0 ? void 0 : _b.address) || !((_c = data.lender) === null || _c === void 0 ? void 0 : _c.jurisdiction)) {
                    throw new Error('Lender information is incomplete. Please configure in Settings.');
                }
                if (!((_d = data.borrower) === null || _d === void 0 ? void 0 : _d.name) || !((_e = data.borrower) === null || _e === void 0 ? void 0 : _e.address) || !((_f = data.borrower) === null || _f === void 0 ? void 0 : _f.jurisdiction)) {
                    throw new Error('Borrower information is incomplete. Please configure in Settings.');
                }
                const fileName = `${data.pnNumber.replace(/\//g, '-')}_Generated.pdf`;
                const filePath = path_1.default.join(this.docsPath, fileName);
                const doc = new pdfkit_1.default({ size: 'LETTER', margin: 50 });
                const stream = fs_1.default.createWriteStream(filePath);
                doc.pipe(stream);
                // Header
                doc.fontSize(20).font('Helvetica-Bold').text('PROMISSORY NOTE', { align: 'center' });
                doc.moveDown(0.5);
                doc.fontSize(14).font('Helvetica').text(data.pnNumber, { align: 'center' });
                doc.moveDown(2);
                // Principal Amount
                doc.fontSize(12).font('Helvetica-Bold').text('PRINCIPAL AMOUNT:', 50, doc.y);
                doc.fontSize(16).font('Helvetica-Bold')
                    .text(`USD ${this.formatMoney(data.principalAmount)}`, 50, doc.y, { align: 'left' });
                doc.moveDown(1.5);
                // Issue and Due Date
                doc.fontSize(11).font('Helvetica');
                doc.text(`Issue Date: ${this.formatDate(data.issueDate)}`, 50, doc.y);
                doc.text(`Due Date: ${this.formatDate(data.dueDate)}`, 50, doc.y);
                doc.moveDown(1.5);
                // Main Body
                doc.fontSize(10).font('Helvetica');
                doc.text(`FOR VALUE RECEIVED, the undersigned (the "Borrower"), promises to pay to the order of ${data.lender.name} ` +
                    `(the "Lender"), having its principal place of business at ${data.lender.address}, ` +
                    `the principal sum of ${this.formatMoney(data.principalAmount)} United States Dollars (USD ${this.formatMoney(data.principalAmount)}), ` +
                    `together with interest thereon at the rate of ${data.interestRate}% per annum.`, { align: 'justify', lineGap: 4 });
                doc.moveDown(1);
                // Interest
                doc.fontSize(10).font('Helvetica-Bold').text('Interest:');
                doc.font('Helvetica').text(`Interest shall accrue daily on the outstanding principal balance at an annual rate of ${data.interestRate}%, ` +
                    `calculated on a 360-day year basis. Interest shall be payable monthly in arrears.`, { align: 'justify', lineGap: 4 });
                doc.moveDown(1);
                // Payment Terms
                doc.font('Helvetica-Bold').text('Payment Terms:');
                doc.font('Helvetica').text(`The entire outstanding principal amount, together with all accrued and unpaid interest, shall be due and ` +
                    `payable on ${this.formatDate(data.dueDate)} (the "Maturity Date").`, { align: 'justify', lineGap: 4 });
                doc.moveDown(1);
                // Reference
                doc.font('Helvetica-Bold').text('Reference:');
                doc.font('Helvetica').text(`Disbursement Request: ${data.requestNumber}`);
                if (data.assetsList && data.assetsList.length > 0) {
                    doc.moveDown(0.5);
                    doc.text('Assets to be acquired:');
                    data.assetsList.forEach((asset, index) => {
                        doc.text(`  ${index + 1}. ${asset}`, { indent: 20 });
                    });
                }
                doc.moveDown(1.5);
                // Governing Law
                doc.font('Helvetica-Bold').text('Governing Law:');
                doc.font('Helvetica').text(`This Promissory Note shall be governed by and construed in accordance with the laws of ${data.lender.jurisdiction}, ` +
                    `without regard to its conflict of law provisions.`, { align: 'justify', lineGap: 4 });
                doc.moveDown(2);
                // Parties
                doc.fontSize(9).font('Helvetica-Bold');
                doc.text('LENDER:', 50, doc.y);
                doc.font('Helvetica');
                doc.text(data.lender.name);
                doc.text(data.lender.address);
                doc.text(data.lender.jurisdiction);
                doc.moveDown(1);
                doc.font('Helvetica-Bold');
                doc.text('BORROWER:', 50, doc.y);
                doc.font('Helvetica');
                doc.text(data.borrower.name);
                doc.text(data.borrower.address);
                doc.text(data.borrower.jurisdiction);
                doc.moveDown(2);
                // Signature Lines
                doc.moveDown(2);
                doc.fontSize(10).font('Helvetica');
                doc.text('_________________________________', 50, doc.y + 20);
                doc.text('Authorized Signature - Borrower', 50, doc.y + 5);
                doc.text(`Date: ______________`, 50, doc.y + 5);
                // Footer
                doc.fontSize(8).font('Helvetica-Oblique')
                    .text(`Document generated on ${new Date().toLocaleDateString('en-US')}`, 50, doc.page.height - 50, { align: 'center' });
                doc.end();
                stream.on('finish', () => resolve(filePath));
                stream.on('error', (err) => {
                    console.error('Stream error:', err);
                    reject(err);
                });
            }
            catch (error) {
                console.error('PDF generation error:', error);
                reject(error);
            }
        });
    }
    async generateWireTransferOrder(data) {
        return new Promise((resolve, reject) => {
            const fileName = `WireTransfer_${data.pnNumber.replace(/\//g, '-')}.pdf`;
            const filePath = path_1.default.join(this.docsPath, fileName);
            const doc = new pdfkit_1.default({ size: 'LETTER', margin: 50 });
            const stream = fs_1.default.createWriteStream(filePath);
            doc.pipe(stream);
            // Header
            doc.fontSize(18).font('Helvetica-Bold').text('WIRE TRANSFER ORDER', { align: 'center' });
            doc.moveDown(2);
            // Amount Box
            doc.rect(50, doc.y, 500, 60).stroke();
            doc.fontSize(12).font('Helvetica').text('TRANSFER AMOUNT:', 60, doc.y + 10);
            doc.fontSize(20).font('Helvetica-Bold')
                .text(`USD ${this.formatMoney(data.amount)}`, 60, doc.y + 10);
            doc.moveDown(5);
            // Beneficiary Information
            doc.fontSize(12).font('Helvetica-Bold').text('BENEFICIARY INFORMATION:', 50, doc.y);
            doc.moveDown(0.5);
            doc.fontSize(11).font('Helvetica');
            doc.text(`Name: ${data.beneficiary.name}`, 70, doc.y);
            doc.text(`Address: ${data.beneficiary.address}`, 70, doc.y);
            doc.moveDown(1.5);
            // Payment Reference
            doc.fontSize(12).font('Helvetica-Bold').text('PAYMENT REFERENCE:', 50, doc.y);
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica');
            doc.text(data.reference, 70, doc.y);
            doc.moveDown(1.5);
            // Assets List
            if (data.assetsList && data.assetsList.length > 0) {
                doc.fontSize(12).font('Helvetica-Bold').text('ASSETS TO BE ACQUIRED:', 50, doc.y);
                doc.moveDown(0.5);
                doc.fontSize(10).font('Helvetica');
                data.assetsList.forEach((asset, index) => {
                    doc.text(`${index + 1}. ${asset}`, 70, doc.y);
                });
                doc.moveDown(1.5);
            }
            // Instructions
            doc.fontSize(12).font('Helvetica-Bold').text('SPECIAL INSTRUCTIONS:', 50, doc.y);
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica');
            doc.text('• Ensure reference number is included in wire transfer details', 70, doc.y);
            doc.text('• Request confirmation of transfer upon completion', 70, doc.y);
            doc.text('• Notify borrower immediately upon successful transfer', 70, doc.y);
            doc.moveDown(2);
            // Authorization
            doc.fontSize(11).font('Helvetica-Bold').text('AUTHORIZATION:', 50, doc.y);
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica');
            doc.text('I hereby authorize the execution of this wire transfer as specified above.', 70, doc.y, { align: 'justify' });
            doc.moveDown(3);
            // Signature Line
            doc.text('_________________________________', 70, doc.y);
            doc.text('Authorized Signature', 70, doc.y + 5);
            doc.text(`Date: ______________`, 70, doc.y + 5);
            // Footer
            doc.fontSize(8).font('Helvetica-Oblique')
                .text(`Wire Transfer Order - Generated on ${new Date().toLocaleDateString('en-US')}`, 50, doc.page.height - 50, { align: 'center' });
            doc.end();
            stream.on('finish', () => resolve(filePath));
            stream.on('error', reject);
        });
    }
    async generateDebitNote(data) {
        return new Promise((resolve, reject) => {
            const fileName = `${data.dnNumber.replace(/\//g, '-')}.pdf`;
            const filePath = path_1.default.join(this.docsPath, fileName);
            const doc = new pdfkit_1.default({ size: 'LETTER', margin: 50 });
            const stream = fs_1.default.createWriteStream(filePath);
            doc.pipe(stream);
            // Header
            doc.fontSize(20).font('Helvetica-Bold').text('DEBIT NOTE', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(14).font('Helvetica').text(data.dnNumber, { align: 'center' });
            doc.moveDown(2);
            // To/From
            doc.fontSize(10).font('Helvetica-Bold');
            doc.text('TO:', 50, doc.y);
            doc.font('Helvetica');
            doc.text(data.borrower.name, 100, doc.y - 14);
            doc.text(data.borrower.address, 100, doc.y);
            doc.moveDown(1);
            doc.font('Helvetica-Bold');
            doc.text('FROM:', 50, doc.y);
            doc.font('Helvetica');
            doc.text(data.lender.name, 100, doc.y - 14);
            doc.text(data.lender.address, 100, doc.y);
            doc.moveDown(2);
            // Dates
            doc.font('Helvetica-Bold');
            doc.text(`Issue Date: ${this.formatDate(data.issueDate)}`, 50, doc.y);
            doc.text(`Due Date: ${this.formatDate(data.dueDate)}`, 50, doc.y);
            doc.text(`Period: ${this.formatDate(data.periodStart)} to ${this.formatDate(data.periodEnd)}`, 50, doc.y);
            doc.moveDown(2);
            // Table Header
            doc.fontSize(10).font('Helvetica-Bold');
            doc.text('INTEREST CHARGES:', 50, doc.y);
            doc.moveDown(1);
            // Table
            const tableTop = doc.y;
            const col1 = 50;
            const col2 = 150;
            const col3 = 250;
            const col4 = 320;
            const col5 = 380;
            const col6 = 450;
            // Headers
            doc.fontSize(9).font('Helvetica-Bold');
            doc.text('PN Number', col1, tableTop);
            doc.text('Principal', col2, tableTop);
            doc.text('Days', col3, tableTop);
            doc.text('Rate', col4, tableTop);
            doc.text('Interest', col5, tableTop);
            // Line
            doc.moveTo(col1, tableTop + 15)
                .lineTo(550, tableTop + 15)
                .stroke();
            // Items
            let y = tableTop + 25;
            doc.font('Helvetica');
            data.items.forEach(item => {
                doc.text(item.pnNumber, col1, y);
                doc.text(this.formatMoney(item.principalAmount), col2, y);
                doc.text(item.days.toString(), col3, y);
                doc.text(`${item.rate}%`, col4, y);
                doc.text(this.formatMoney(item.interestAmount), col5, y);
                y += 20;
            });
            // Total Line
            doc.moveTo(col1, y)
                .lineTo(550, y)
                .stroke();
            // Total
            y += 10;
            doc.font('Helvetica-Bold');
            doc.text('TOTAL INTEREST DUE:', col1, y);
            doc.fontSize(12);
            doc.text(`USD ${this.formatMoney(data.totalInterest)}`, col5, y);
            doc.moveDown(3);
            // Payment Instructions
            doc.fontSize(10).font('Helvetica-Bold');
            doc.text('PAYMENT INSTRUCTIONS:', 50, doc.y);
            doc.moveDown(0.5);
            doc.font('Helvetica');
            doc.text('Please remit payment by wire transfer to the following account:', 50, doc.y);
            doc.text('Bank details will be provided separately.', 50, doc.y);
            doc.text(`Reference: ${data.dnNumber}`, 50, doc.y);
            doc.moveDown(2);
            // Terms
            doc.fontSize(9).font('Helvetica');
            doc.text(`This debit note is issued for interest accrued on promissory notes as detailed above. ` +
                `Payment is due by ${this.formatDate(data.dueDate)}. Late payments may incur additional charges.`, 50, doc.y, { align: 'justify', lineGap: 3 });
            // Footer
            doc.fontSize(8).font('Helvetica-Oblique')
                .text(`Debit Note generated on ${new Date().toLocaleDateString('en-US')}`, 50, doc.page.height - 50, { align: 'center' });
            doc.end();
            stream.on('finish', () => resolve(filePath));
            stream.on('error', reject);
        });
    }
    formatMoney(amount) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    }
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}
exports.PDFService = PDFService;
