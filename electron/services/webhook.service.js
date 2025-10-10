"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookService = void 0;
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const electron_1 = require("electron");

class WebhookService {
    constructor(docuSignService, emailService, disbursementService, promissoryNoteService) {
        this.docuSignService = docuSignService;
        this.emailService = emailService;
        this.disbursementService = disbursementService;
        this.promissoryNoteService = promissoryNoteService;
        this.server = null;
        this.config = null;
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    }
    
    setupMiddleware() {
        this.app.use(bodyParser.raw({ type: 'application/json' }));
    }
    
    setupRoutes() {
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });

        this.app.post('/webhook/docusign', async (req, res) => {
            try {
                const signature = req.headers['x-docusign-signature-1'];
                const payload = req.body.toString();

                if (this.config && !this.docuSignService.verifyWebhookSignature(signature, payload, this.config.secret)) {
                    console.error('Invalid webhook signature');
                    return res.status(401).send('Unauthorized');
                }

                const data = JSON.parse(payload);
                const notification = this.docuSignService.processWebhookNotification(data);
                console.log('DocuSign webhook received:', notification);

                await this.processDocuSignNotification(notification);
                res.status(200).send('OK');
            } catch (error) {
                console.error('Webhook processing error:', error);
                res.status(500).send('Internal Server Error');
            }
        });
    }
    
    async processDocuSignNotification(notification) {
        const { envelopeId, status, completedDate } = notification;
        const pnInfo = await this.findPromissoryNoteByEnvelopeId(envelopeId);
        const wtInfo = await this.findWireTransferByEnvelopeId(envelopeId);

        if (pnInfo) {
            await this.handlePromissoryNoteUpdate(pnInfo, status, completedDate, envelopeId);
        } else if (wtInfo) {
            await this.handleWireTransferUpdate(wtInfo, status, completedDate, envelopeId);
        } else {
            console.warn('No document found for envelope:', envelopeId);
        }
    }
    
    async handlePromissoryNoteUpdate(pnInfo, status, completedDate, envelopeId) {
        if (status === 'completed') {
            const signedPdf = await this.docuSignService.downloadDocument(envelopeId, '1');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `PN_${pnInfo.pn_number}_signed_${timestamp}.pdf`;
            const downloadsPath = electron_1.app.getPath('downloads');
            const filePath = path.join(downloadsPath, 'loan-management', 'promissory-notes', fileName);

            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(filePath, signedPdf);

            await this.promissoryNoteService.updatePromissoryNote(pnInfo.id, {
                signedPnPath: filePath,
                signatureDate: completedDate,
                signatureStatus: 'completed'
            });

            const config = await this.getConfig();
            if (config && config.emailUser) {
                const emailHtml = this.generatePNSignedEmailHtml(pnInfo, completedDate);
                await this.emailService.sendEmail({
                    from: config.emailUser,
                    to: config.emailUser,
                    subject: `Promissory Note ${pnInfo.pn_number} - Signed`,
                    html: emailHtml,
                    attachments: [{ filename: fileName, path: filePath }]
                });
            }
        } else {
            await this.promissoryNoteService.updatePromissoryNote(pnInfo.id, {
                signatureStatus: status
            });
        }
    }
    
    async handleWireTransferUpdate(wtInfo, status, completedDate, envelopeId) {
        if (status === 'completed') {
            const signedPdf = await this.docuSignService.downloadDocument(envelopeId, '1');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `WT_${wtInfo.disbursement_number}_signed_${timestamp}.pdf`;
            const downloadsPath = electron_1.app.getPath('downloads');
            const filePath = path.join(downloadsPath, 'loan-management', 'wire-transfers', fileName);

            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(filePath, signedPdf);

            await this.disbursementService.updateDisbursement(wtInfo.id, {
                wireTransferSignedPath: filePath,
                wireTransferSignatureStatus: 'completed'
            });

            const config = await this.getConfig();
            if (config && config.bankEmail && config.emailUser) {
                await this.sendWireTransferToBank(wtInfo, filePath, config);
            }
        } else {
            await this.disbursementService.updateDisbursement(wtInfo.id, {
                wireTransferSignatureStatus: status
            });
        }
    }
    
    async sendWireTransferToBank(disbursement, signedFilePath, config) {
        const emailHtml = `
      <h2>Wire Transfer Request - ${disbursement.disbursement_number}</h2>
      <p>Please process the attached signed wire transfer order.</p>
      <br>
      <p><strong>Amount:</strong> $${disbursement.total_loan_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
      <p><strong>Beneficiary:</strong> ${disbursement.borrower_name}</p>
      <br>
      <p>This is an automated request from the Loan Management System.</p>
    `;
        await this.emailService.sendEmail({
            from: config.emailUser,
            to: config.bankEmail,
            subject: `Wire Transfer Order - ${disbursement.disbursement_number}`,
            html: emailHtml,
            attachments: [{ filename: path.basename(signedFilePath), path: signedFilePath }]
        });

        await this.disbursementService.updateDisbursement(disbursement.id, {
            bankEmailSentDate: new Date().toISOString()
        });
    }
    
    generatePNSignedEmailHtml(pnInfo, signedDate) {
        return `
      <h2>Promissory Note Signed - ${pnInfo.pn_number}</h2>
      <p>The promissory note has been successfully signed by all parties.</p>
      <br>
      <table style="border-collapse: collapse; width: 100%;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>PN Number:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${pnInfo.pn_number}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Amount:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">$${pnInfo.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Signed Date:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${new Date(signedDate).toLocaleString()}</td>
        </tr>
      </table>
      <br>
      <p>The signed document is attached to this email.</p>
    `;
    }
    
    async findPromissoryNoteByEnvelopeId(envelopeId) {
        return null;
    }
    
    async findWireTransferByEnvelopeId(envelopeId) {
        return null;
    }
    
    async getConfig() {
        return null;
    }
    
    start(config) {
        if (this.server) {
            console.warn('Webhook server already running');
            return;
        }
        this.config = config;
        this.server = this.app.listen(config.port, () => {
            console.log(`Webhook server listening on port ${config.port}`);
        });
    }
    
    stop() {
        if (this.server) {
            this.server.close(() => {
                console.log('Webhook server stopped');
            });
            this.server = null;
        }
    }
}
exports.WebhookService = WebhookService;
