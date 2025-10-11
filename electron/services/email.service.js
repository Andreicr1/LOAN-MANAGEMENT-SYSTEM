const nodemailer = require('nodemailer');
const path = require('path');
const { app } = require('electron');

var EmailService = /** @class */ (function () {
    function EmailService() {
        this.transporter = null;
        this.config = null;
    }
    EmailService.prototype.initialize = function (config) {
        return __awaiter(this, void 0, void 0, function () {
            var transporter, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.config = config;
                        transporter = nodemailer.createTransport({
                            host: config.host,
                            port: config.port,
                            secure: config.secure,
                            auth: config.auth,
                            tls: {
                                rejectUnauthorized: false // For development/testing
                            }
                        });
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, transporter.verify()];
                    case 2:
                        _a.sent();
                        this.transporter = transporter;
                        console.log('Email service ready');
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        console.error('Email service verification failed:', error_1);
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    EmailService.prototype.sendEmail = function (message) {
        return __awaiter(this, void 0, void 0, function () {
            var mailOptions, info, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.transporter || !this.config) {
                            throw new Error('Email service not initialized');
                        }
                        mailOptions = {
                            from: this.config.from,
                            to: message.to,
                            cc: message.cc,
                            subject: message.subject,
                            text: message.text,
                            html: message.html,
                            attachments: message.attachments
                        };
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.transporter.sendMail(mailOptions)];
                    case 2:
                        info = _a.sent();
                        console.log('Email sent:', info.messageId);
                        return [2 /*return*/, info.messageId];
                    case 3:
                        error_2 = _a.sent();
                        console.error('Failed to send email:', error_2);
                        throw error_2;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    EmailService.prototype.sendWireTransferToBank = function (bankEmail, wireTransferPdfPath, disbursementNumber, amount, borrowerName) {
        return __awaiter(this, void 0, void 0, function () {
            var subject, html, text;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        subject = "Wire Transfer Order - Disbursement ".concat(disbursementNumber);
                        html = "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n        <h2 style=\"color: #0a3c10;\">Wire Transfer Order</h2>\n        \n        <p>Dear Banking Partner,</p>\n        \n        <p>Please find attached the signed Wire Transfer Order for the following disbursement:</p>\n        \n        <table style=\"border-collapse: collapse; width: 100%; margin: 20px 0;\">\n          <tr>\n            <td style=\"padding: 8px; border: 1px solid #ddd; background-color: #f5f5f5; width: 40%;\">\n              <strong>Disbursement Number:</strong>\n            </td>\n            <td style=\"padding: 8px; border: 1px solid #ddd;\">\n              ".concat(disbursementNumber, "\n            </td>\n          </tr>\n          <tr>\n            <td style=\"padding: 8px; border: 1px solid #ddd; background-color: #f5f5f5;\">\n              <strong>Borrower:</strong>\n            </td>\n            <td style=\"padding: 8px; border: 1px solid #ddd;\">\n              ").concat(borrowerName, "\n            </td>\n          </tr>\n          <tr>\n            <td style=\"padding: 8px; border: 1px solid #ddd; background-color: #f5f5f5;\">\n              <strong>Amount:</strong>\n            </td>\n            <td style=\"padding: 8px; border: 1px solid #ddd;\">\n              ").concat(amount, "\n            </td>\n          </tr>\n        </table>\n        \n        <p>This wire transfer has been electronically signed and approved by all authorized signatories.</p>\n        \n        <p>Please process this transfer at your earliest convenience and confirm receipt.</p>\n        \n        <p style=\"margin-top: 30px;\">Best regards,<br>\n        Operations Team<br>\n        Whole Max Financial Corp<br>\n        operations@wmf-corp.com</p>\n        \n        <hr style=\"margin-top: 40px; border: none; border-top: 1px solid #ddd;\">\n        <p style=\"font-size: 12px; color: #666;\">\n          This is an automated message from the Whole Max Loan Management System. \n          The attached document has been digitally signed via DocuSign.\n        </p>\n      </div>\n    ");
                        text = "\nWire Transfer Order - Disbursement ".concat(disbursementNumber, "\n\nDear Banking Partner,\n\nPlease find attached the signed Wire Transfer Order for the following disbursement:\n\nDisbursement Number: ").concat(disbursementNumber, "\nBorrower: ").concat(borrowerName, "\nAmount: ").concat(amount, "\n\nThis wire transfer has been electronically signed and approved by all authorized signatories.\n\nPlease process this transfer at your earliest convenience and confirm receipt.\n\nBest regards,\nOperations Team\nWhole Max Financial Corp\noperations@wmf-corp.com\n    ").trim();
                        return [4 /*yield*/, this.sendEmail({
                                to: bankEmail,
                                subject: subject,
                                text: text,
                                html: html,
                                attachments: [{
                                        filename: "Wire_Transfer_Order_".concat(disbursementNumber, ".pdf"),
                                        path: wireTransferPdfPath,
                                        contentType: 'application/pdf'
                                    }]
                            })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return EmailService;
}());

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
        while (_) try {
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

module.exports = { EmailService };

