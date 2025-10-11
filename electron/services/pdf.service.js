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
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
var PDFService = /** @class */ (function () {
    function PDFService() {
        // DECISION: Store PDFs in app data directory
        this.docsPath = path.join(app.getPath('userData'), 'documents');
        if (!fs.existsSync(this.docsPath)) {
            fs.mkdirSync(this.docsPath, { recursive: true });
        }
    }
    PDFService.prototype.generatePromissoryNote = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var _a, _b, _c, _d, _e, _f;
                        try {
                            // Validate required data
                            if (!((_a = data.lender) === null || _a === void 0 ? void 0 : _a.name) || !((_b = data.lender) === null || _b === void 0 ? void 0 : _b.address) || !((_c = data.lender) === null || _c === void 0 ? void 0 : _c.jurisdiction)) {
                                throw new Error('Lender information is incomplete. Please configure in Settings.');
                            }
                            if (!((_d = data.borrower) === null || _d === void 0 ? void 0 : _d.name) || !((_e = data.borrower) === null || _e === void 0 ? void 0 : _e.address) || !((_f = data.borrower) === null || _f === void 0 ? void 0 : _f.jurisdiction)) {
                                throw new Error('Borrower information is incomplete. Please configure in Settings.');
                            }
                            var fileName = "".concat(data.pnNumber.replace(/\//g, '-'), "_Generated.pdf");
                            var filePath_1 = path.join(_this.docsPath, fileName);
                            var doc_1 = new PDFDocument({ size: 'LETTER', margin: 50 });
                            var stream = fs.createWriteStream(filePath_1);
                            doc_1.pipe(stream);
                            // Header
                            doc_1.fontSize(20).font('Helvetica-Bold').text('PROMISSORY NOTE', { align: 'center' });
                            doc_1.moveDown(0.5);
                            doc_1.fontSize(14).font('Helvetica').text(data.pnNumber, { align: 'center' });
                            doc_1.moveDown(2);
                            // Principal Amount
                            doc_1.fontSize(12).font('Helvetica-Bold').text('PRINCIPAL AMOUNT:', 50, doc_1.y);
                            doc_1.fontSize(16).font('Helvetica-Bold')
                                .text("USD ".concat(_this.formatMoney(data.principalAmount)), 50, doc_1.y, { align: 'left' });
                            doc_1.moveDown(1.5);
                            // Issue and Due Date
                            doc_1.fontSize(11).font('Helvetica');
                            doc_1.text("Issue Date: ".concat(_this.formatDate(data.issueDate)), 50, doc_1.y);
                            doc_1.text("Due Date: ".concat(_this.formatDate(data.dueDate)), 50, doc_1.y);
                            doc_1.moveDown(1.5);
                            // Main Body
                            doc_1.fontSize(10).font('Helvetica');
                            doc_1.text("FOR VALUE RECEIVED, the undersigned (the \"Borrower\"), promises to pay to the order of ".concat(data.lender.name, " ") +
                                "(the \"Lender\"), having its principal place of business at ".concat(data.lender.address, ", ") +
                                "the principal sum of ".concat(_this.formatMoney(data.principalAmount), " United States Dollars (USD ").concat(_this.formatMoney(data.principalAmount), "), ") +
                                "together with interest thereon at the rate of ".concat(data.interestRate, "% per annum."), { align: 'justify', lineGap: 4 });
                            doc_1.moveDown(1);
                            // Interest
                            doc_1.fontSize(10).font('Helvetica-Bold').text('Interest:');
                            doc_1.font('Helvetica').text("Interest shall accrue daily on the outstanding principal balance at an annual rate of ".concat(data.interestRate, "%, ") +
                                "calculated on a 360-day year basis. Interest shall be payable monthly in arrears.", { align: 'justify', lineGap: 4 });
                            doc_1.moveDown(1);
                            // Payment Terms
                            doc_1.font('Helvetica-Bold').text('Payment Terms:');
                            doc_1.font('Helvetica').text("The entire outstanding principal amount, together with all accrued and unpaid interest, shall be due and " +
                                "payable on ".concat(_this.formatDate(data.dueDate), " (the \"Maturity Date\")."), { align: 'justify', lineGap: 4 });
                            doc_1.moveDown(1);
                            // Reference
                            doc_1.font('Helvetica-Bold').text('Reference:');
                            doc_1.font('Helvetica').text("Disbursement Request: ".concat(data.requestNumber));
                            if (data.assetsList && data.assetsList.length > 0) {
                                doc_1.moveDown(0.5);
                                doc_1.text('Assets to be acquired:');
                                data.assetsList.forEach(function (asset, index) {
                                    doc_1.text("  ".concat(index + 1, ". ").concat(asset), { indent: 20 });
                                });
                            }
                            doc_1.moveDown(1.5);
                            // Governing Law
                            doc_1.font('Helvetica-Bold').text('Governing Law:');
                            doc_1.font('Helvetica').text("This Promissory Note shall be governed by and construed in accordance with the laws of ".concat(data.lender.jurisdiction, ", ") +
                                "without regard to its conflict of law provisions.", { align: 'justify', lineGap: 4 });
                            doc_1.moveDown(2);
                            // Parties
                            doc_1.fontSize(9).font('Helvetica-Bold');
                            doc_1.text('LENDER:', 50, doc_1.y);
                            doc_1.font('Helvetica');
                            doc_1.text(data.lender.name);
                            doc_1.text(data.lender.address);
                            doc_1.text(data.lender.jurisdiction);
                            doc_1.moveDown(1);
                            doc_1.font('Helvetica-Bold');
                            doc_1.text('BORROWER:', 50, doc_1.y);
                            doc_1.font('Helvetica');
                            doc_1.text(data.borrower.name);
                            doc_1.text(data.borrower.address);
                            doc_1.text(data.borrower.jurisdiction);
                            doc_1.moveDown(2);
                            // Signature Lines
                            doc_1.moveDown(2);
                            doc_1.fontSize(10).font('Helvetica');
                            doc_1.text('_________________________________', 50, doc_1.y + 20);
                            doc_1.text('Authorized Signature - Borrower', 50, doc_1.y + 5);
                            doc_1.text("Date: ______________", 50, doc_1.y + 5);
                            // Footer
                            doc_1.fontSize(8).font('Helvetica-Oblique')
                                .text("Document generated on ".concat(new Date().toLocaleDateString('en-US')), 50, doc_1.page.height - 50, { align: 'center' });
                            doc_1.end();
                            stream.on('finish', function () { return resolve(filePath_1); });
                            stream.on('error', function (err) {
                                console.error('Stream error:', err);
                                reject(err);
                            });
                        }
                        catch (error) {
                            console.error('PDF generation error:', error);
                            reject(error);
                        }
                    })];
            });
        });
    };
    PDFService.prototype.generateWireTransferOrder = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var fileName = "WireTransfer_".concat(data.pnNumber.replace(/\//g, '-'), ".pdf");
                        var filePath = path.join(_this.docsPath, fileName);
                        var doc = new PDFDocument({ size: 'LETTER', margin: 50 });
                        var stream = fs.createWriteStream(filePath);
                        doc.pipe(stream);
                        // Header
                        doc.fontSize(18).font('Helvetica-Bold').text('WIRE TRANSFER ORDER', { align: 'center' });
                        doc.moveDown(2);
                        // Amount Box
                        doc.rect(50, doc.y, 500, 60).stroke();
                        doc.fontSize(12).font('Helvetica').text('TRANSFER AMOUNT:', 60, doc.y + 10);
                        doc.fontSize(20).font('Helvetica-Bold')
                            .text("USD ".concat(_this.formatMoney(data.amount)), 60, doc.y + 10);
                        doc.moveDown(5);
                        // Beneficiary Information
                        doc.fontSize(12).font('Helvetica-Bold').text('BENEFICIARY INFORMATION:', 50, doc.y);
                        doc.moveDown(0.5);
                        doc.fontSize(11).font('Helvetica');
                        doc.text("Name: ".concat(data.beneficiary.name), 70, doc.y);
                        doc.text("Address: ".concat(data.beneficiary.address), 70, doc.y);
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
                            data.assetsList.forEach(function (asset, index) {
                                doc.text("".concat(index + 1, ". ").concat(asset), 70, doc.y);
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
                        doc.text("Date: ______________", 70, doc.y + 5);
                        // Footer
                        doc.fontSize(8).font('Helvetica-Oblique')
                            .text("Wire Transfer Order - Generated on ".concat(new Date().toLocaleDateString('en-US')), 50, doc.page.height - 50, { align: 'center' });
                        doc.end();
                        stream.on('finish', function () { return resolve(filePath); });
                        stream.on('error', reject);
                    })];
            });
        });
    };
    PDFService.prototype.generateDebitNote = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var fileName = "".concat(data.dnNumber.replace(/\//g, '-'), ".pdf");
                        var filePath = path.join(_this.docsPath, fileName);
                        var doc = new PDFDocument({ size: 'LETTER', margin: 50 });
                        var stream = fs.createWriteStream(filePath);
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
                        doc.text("Issue Date: ".concat(_this.formatDate(data.issueDate)), 50, doc.y);
                        doc.text("Due Date: ".concat(_this.formatDate(data.dueDate)), 50, doc.y);
                        doc.text("Period: ".concat(_this.formatDate(data.periodStart), " to ").concat(_this.formatDate(data.periodEnd)), 50, doc.y);
                        doc.moveDown(2);
                        // Table Header
                        doc.fontSize(10).font('Helvetica-Bold');
                        doc.text('INTEREST CHARGES:', 50, doc.y);
                        doc.moveDown(1);
                        // Table
                        var tableTop = doc.y;
                        var col1 = 50;
                        var col2 = 150;
                        var col3 = 250;
                        var col4 = 320;
                        var col5 = 380;
                        var col6 = 450;
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
                        var y = tableTop + 25;
                        doc.font('Helvetica');
                        data.items.forEach(function (item) {
                            doc.text(item.pnNumber, col1, y);
                            doc.text(_this.formatMoney(item.principalAmount), col2, y);
                            doc.text(item.days.toString(), col3, y);
                            doc.text("".concat(item.rate, "%"), col4, y);
                            doc.text(_this.formatMoney(item.interestAmount), col5, y);
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
                        doc.text("USD ".concat(_this.formatMoney(data.totalInterest)), col5, y);
                        doc.moveDown(3);
                        // Payment Instructions
                        doc.fontSize(10).font('Helvetica-Bold');
                        doc.text('PAYMENT INSTRUCTIONS:', 50, doc.y);
                        doc.moveDown(0.5);
                        doc.font('Helvetica');
                        doc.text('Please remit payment by wire transfer to the following account:', 50, doc.y);
                        doc.text('Bank details will be provided separately.', 50, doc.y);
                        doc.text("Reference: ".concat(data.dnNumber), 50, doc.y);
                        doc.moveDown(2);
                        // Terms
                        doc.fontSize(9).font('Helvetica');
                        doc.text("This debit note is issued for interest accrued on promissory notes as detailed above. " +
                            "Payment is due by ".concat(_this.formatDate(data.dueDate), ". Late payments may incur additional charges."), 50, doc.y, { align: 'justify', lineGap: 3 });
                        // Footer
                        doc.fontSize(8).font('Helvetica-Oblique')
                            .text("Debit Note generated on ".concat(new Date().toLocaleDateString('en-US')), 50, doc.page.height - 50, { align: 'center' });
                        doc.end();
                        stream.on('finish', function () { return resolve(filePath); });
                        stream.on('error', reject);
                    })];
            });
        });
    };
    PDFService.prototype.formatMoney = function (amount) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };
    PDFService.prototype.formatDate = function (dateString) {
        var date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };
    return PDFService;
}());
module.exports = { PDFService };
