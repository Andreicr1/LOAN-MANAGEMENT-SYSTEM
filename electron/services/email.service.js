"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const nodemailer = __importStar(require("nodemailer"));
class EmailService {
    constructor() {
        this.transporter = null;
        this.config = null;
    }
    async initialize(config) {
        this.config = config;
        const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: config.auth,
            tls: {
                rejectUnauthorized: false // For development/testing
            }
        });
        // Verify connection
        try {
            await transporter.verify();
            this.transporter = transporter;
            console.log('Email service ready');
        }
        catch (error) {
            console.error('Email service verification failed:', error);
            throw error;
        }
    }
    async sendEmail(message) {
        if (!this.transporter || !this.config) {
            throw new Error('Email service not initialized');
        }
        const mailOptions = {
            from: this.config.from,
            to: message.to,
            cc: message.cc,
            subject: message.subject,
            text: message.text,
            html: message.html,
            attachments: message.attachments
        };
        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Email sent:', info.messageId);
            return info.messageId;
        }
        catch (error) {
            console.error('Failed to send email:', error);
            throw error;
        }
    }
    async sendWireTransferToBank(bankEmail, wireTransferPdfPath, disbursementNumber, amount, borrowerName) {
        const subject = `Wire Transfer Order - Disbursement ${disbursementNumber}`;
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0a3c10;">Wire Transfer Order</h2>
        
        <p>Dear Banking Partner,</p>
        
        <p>Please find attached the signed Wire Transfer Order for the following disbursement:</p>
        
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background-color: #f5f5f5; width: 40%;">
              <strong>Disbursement Number:</strong>
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${disbursementNumber}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background-color: #f5f5f5;">
              <strong>Borrower:</strong>
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${borrowerName}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background-color: #f5f5f5;">
              <strong>Amount:</strong>
            </td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${amount}
            </td>
          </tr>
        </table>
        
        <p>This wire transfer has been electronically signed and approved by all authorized signatories.</p>
        
        <p>Please process this transfer at your earliest convenience and confirm receipt.</p>
        
        <p style="margin-top: 30px;">Best regards,<br>
        Operations Team<br>
        Whole Max Financial Corp<br>
        operations@wmf-corp.com</p>
        
        <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #666;">
          This is an automated message from the Whole Max Loan Management System. 
          The attached document has been digitally signed via DocuSign.
        </p>
      </div>
    `;
        const text = `
Wire Transfer Order - Disbursement ${disbursementNumber}

Dear Banking Partner,

Please find attached the signed Wire Transfer Order for the following disbursement:

Disbursement Number: ${disbursementNumber}
Borrower: ${borrowerName}
Amount: ${amount}

This wire transfer has been electronically signed and approved by all authorized signatories.

Please process this transfer at your earliest convenience and confirm receipt.

Best regards,
Operations Team
Whole Max Financial Corp
operations@wmf-corp.com
    `.trim();
        return await this.sendEmail({
            to: bankEmail,
            subject,
            text,
            html,
            attachments: [{
                    filename: `Wire_Transfer_Order_${disbursementNumber}.pdf`,
                    path: wireTransferPdfPath,
                    contentType: 'application/pdf'
                }]
        });
    }
    async sendDocumentForSignature(recipient, documentType, disbursementNumber, signingUrl) {
        const docName = documentType === 'PN' ? 'Promissory Note' : 'Wire Transfer Order';
        const subject = `Action Required: Sign ${docName} - Disbursement ${disbursementNumber}`;
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0a3c10;">Electronic Signature Required</h2>
        
        <p>Dear Signatory,</p>
        
        <p>A ${docName} for Disbursement ${disbursementNumber} requires your electronic signature.</p>
        
        <div style="margin: 30px 0; padding: 20px; background-color: #f5f5f5; border-radius: 5px;">
          <p style="margin: 0 0 15px 0;"><strong>Document:</strong> ${docName}</p>
          <p style="margin: 0 0 15px 0;"><strong>Disbursement:</strong> ${disbursementNumber}</p>
          <p style="margin: 0;"><strong>Action Required:</strong> Electronic Signature</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${signingUrl}" style="display: inline-block; padding: 12px 30px; background-color: #0a3c10; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Sign Document
          </a>
        </div>
        
        <p><strong>Important:</strong> This link will expire in 5 days. Please sign the document at your earliest convenience.</p>
        
        <p style="margin-top: 30px;">Best regards,<br>
        Operations Team<br>
        Whole Max Financial Corp</p>
        
        <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #666;">
          This email was sent from the Whole Max Loan Management System. 
          You are receiving this because you are listed as an authorized signatory.
        </p>
      </div>
    `;
        const text = `
Electronic Signature Required

Dear Signatory,

A ${docName} for Disbursement ${disbursementNumber} requires your electronic signature.

Document: ${docName}
Disbursement: ${disbursementNumber}
Action Required: Electronic Signature

Please click the following link to sign the document:
${signingUrl}

Important: This link will expire in 5 days. Please sign the document at your earliest convenience.

Best regards,
Operations Team
Whole Max Financial Corp
    `.trim();
        return await this.sendEmail({
            to: recipient,
            subject,
            text,
            html
        });
    }
    async sendSignatureConfirmation(recipient, documentType, disbursementNumber, signedBy, signedDate) {
        const docName = documentType === 'PN' ? 'Promissory Note' : 'Wire Transfer Order';
        const subject = `${docName} Signed - Disbursement ${disbursementNumber}`;
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0a3c10;">Document Successfully Signed</h2>
        
        <p>Dear ${signedBy},</p>
        
        <p>Thank you for signing the ${docName}. Your signature has been recorded.</p>
        
        <div style="margin: 30px 0; padding: 20px; background-color: #f0f8f0; border-radius: 5px; border-left: 4px solid #0a3c10;">
          <p style="margin: 0 0 10px 0;"><strong>Document:</strong> ${docName}</p>
          <p style="margin: 0 0 10px 0;"><strong>Disbursement:</strong> ${disbursementNumber}</p>
          <p style="margin: 0 0 10px 0;"><strong>Signed by:</strong> ${signedBy}</p>
          <p style="margin: 0;"><strong>Date Signed:</strong> ${signedDate}</p>
        </div>
        
        <p>A copy of the signed document will be available in the system for your records.</p>
        
        <p style="margin-top: 30px;">Best regards,<br>
        Operations Team<br>
        Whole Max Financial Corp</p>
      </div>
    `;
        const text = `
Document Successfully Signed

Dear ${signedBy},

Thank you for signing the ${docName}. Your signature has been recorded.

Document: ${docName}
Disbursement: ${disbursementNumber}
Signed by: ${signedBy}
Date Signed: ${signedDate}

A copy of the signed document will be available in the system for your records.

Best regards,
Operations Team
Whole Max Financial Corp
    `.trim();
        return await this.sendEmail({
            to: recipient,
            subject,
            text,
            html
        });
    }
}
exports.EmailService = EmailService;
