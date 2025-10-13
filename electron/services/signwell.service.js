"use strict";
/**
 * SignWell API Service
 * Integration with SignWell electronic signature platform
 * Documentation: https://developers.signwell.com/reference/getting-started-with-your-api-1
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignWellService = void 0;
class SignWellService {
    constructor() {
        this.config = null;
        this.baseUrl = 'https://www.signwell.com/api/v1';
    }
    /**
     * Initialize the SignWell service with API credentials
     */
    initialize(config) {
        this.config = config;
    }
    /**
     * Check if service is configured
     */
    isConfigured() {
        var _a;
        return !!((_a = this.config) === null || _a === void 0 ? void 0 : _a.apiKey);
    }
    /**
     * Get authorization headers
     */
    getHeaders() {
        if (!this.config) {
            throw new Error('SignWell service not configured');
        }
        return {
            'X-Api-Key': this.config.apiKey,
            'Content-Type': 'application/json',
        };
    }
    /**
     * Create a new document
     * https://developers.signwell.com/reference/create-document
     */
    async createDocument(request) {
        var _a, _b;
        if (!this.config) {
            throw new Error('SignWell service not configured');
        }
        console.log('[SignWell] Creating document with API Key:', ((_a = this.config.apiKey) === null || _a === void 0 ? void 0 : _a.substring(0, 20)) + '...');
        console.log('[SignWell] Test mode:', this.config.testMode);
        const payload = {
            ...request,
            test_mode: this.config.testMode,
        };
        const headers = this.getHeaders();
        console.log('[SignWell] Request headers:', headers);
        const response = await fetch(`${this.baseUrl}/documents/`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        console.log('[SignWell] Response status:', response.status);
        console.log('[SignWell] Response headers:', Object.fromEntries(response.headers.entries()));
        const responseText = await response.text();
        console.log('[SignWell] Response body:', responseText.substring(0, 200));
        if (!response.ok) {
            let errorMessage = responseText;
            try {
                const error = JSON.parse(responseText);
                errorMessage = `SignWell API error: ${JSON.stringify(error)}`;
            }
            catch (e) {
                errorMessage = `SignWell API error (${response.status}): ${responseText}`;
            }
            throw new Error(errorMessage);
        }
        if (!responseText) {
            throw new Error('SignWell API returned empty response');
        }
        try {
            return JSON.parse(responseText);
        }
        catch (e) {
            throw new Error(`Failed to parse SignWell response: ${responseText.substring(0, 100)}`);
        }
    }
    /**
     * Get document details
     * https://developers.signwell.com/reference/get-document
     */
    async getDocument(documentId) {
        if (!this.config) {
            throw new Error('SignWell service not configured');
        }
        const response = await fetch(`${this.baseUrl}/documents/${documentId}`, {
            method: 'GET',
            headers: this.getHeaders(),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`SignWell API error: ${JSON.stringify(error)}`);
        }
        return await response.json();
    }
    /**
     * Update and send document
     * https://developers.signwell.com/reference/update-and-send-document
     */
    async updateAndSendDocument(documentId, data) {
        if (!this.config) {
            throw new Error('SignWell service not configured');
        }
        const response = await fetch(`${this.baseUrl}/documents/${documentId}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`SignWell API error: ${JSON.stringify(error)}`);
        }
        return await response.json();
    }
    /**
     * Get embedded requesting link for a document
     * The embedded_edit_url is returned directly from Get Document
     * https://developers.signwell.com/reference/get-the-edit-link
     */
    async getEmbeddedRequestingLink(documentId) {
        if (!this.config) {
            throw new Error('SignWell service not configured');
        }
        
        // Get document to retrieve embedded_edit_url
        const document = await this.getDocument(documentId);
        
        if (!document.embedded_edit_url) {
            throw new Error('Document must be in draft mode to get embedded_edit_url');
        }
        
        return {
            url: document.embedded_edit_url,
            expires_at: null // URL expires after first use
        };
    }
    /**
     * Get embedded signing link for a recipient
     * This allows recipients to sign the document in an iframe
     */
    async getEmbeddedSigningLink(documentId, recipientId) {
        if (!this.config) {
            throw new Error('SignWell service not configured');
        }
        const response = await fetch(`${this.baseUrl}/documents/${documentId}/recipients/${recipientId}/embedded_signing_link`, {
            method: 'GET',
            headers: this.getHeaders(),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`SignWell API error: ${JSON.stringify(error)}`);
        }
        return await response.json();
    }
    /**
     * Download completed PDF
     * https://developers.signwell.com/reference/completed-pdf
     */
    async downloadCompletedPDF(documentId) {
        if (!this.config) {
            throw new Error('SignWell service not configured');
        }
        const response = await fetch(`${this.baseUrl}/documents/${documentId}/completed_pdf`, {
            method: 'GET',
            headers: this.getHeaders(),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`SignWell API error: ${error}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }
    /**
     * Send reminder to recipients
     * https://developers.signwell.com/reference/send-reminder
     */
    async sendReminder(documentId) {
        if (!this.config) {
            throw new Error('SignWell service not configured');
        }
        const response = await fetch(`${this.baseUrl}/documents/${documentId}/remind`, {
            method: 'POST',
            headers: this.getHeaders(),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`SignWell API error: ${JSON.stringify(error)}`);
        }
        return { success: true };
    }
    /**
     * Delete a document
     * https://developers.signwell.com/reference/delete-document
     */
    async deleteDocument(documentId) {
        if (!this.config) {
            throw new Error('SignWell service not configured');
        }
        const response = await fetch(`${this.baseUrl}/documents/${documentId}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        if (!response.ok && response.status !== 204) {
            const error = await response.json();
            throw new Error(`SignWell API error: ${JSON.stringify(error)}`);
        }
        return { success: true };
    }
    /**
     * Create a template
     * https://developers.signwell.com/reference/create-template
     */
    async createTemplate(data) {
        if (!this.config) {
            throw new Error('SignWell service not configured');
        }
        const response = await fetch(`${this.baseUrl}/templates`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`SignWell API error: ${JSON.stringify(error)}`);
        }
        return await response.json();
    }
    /**
     * Create document from template
     * https://developers.signwell.com/reference/create-document-from-template
     */
    async createDocumentFromTemplate(templateId, data) {
        if (!this.config) {
            throw new Error('SignWell service not configured');
        }
        const payload = {
            ...data,
            test_mode: this.config.testMode,
        };
        const response = await fetch(`${this.baseUrl}/templates/${templateId}/create_document`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`SignWell API error: ${JSON.stringify(error)}`);
        }
        return await response.json();
    }
}
exports.SignWellService = SignWellService;
