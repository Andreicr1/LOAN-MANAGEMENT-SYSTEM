/**
 * SignWell API Service
 * Integration with SignWell electronic signature platform
 * Documentation: https://developers.signwell.com/reference/getting-started-with-your-api-1
 */

interface SignWellConfig {
  apiKey?: string;
  testMode: boolean;
}

interface SignWellRecipient {
  id: string; // Required by SignWell API
  name: string;
  email: string;
  send_email?: boolean;
  send_email_delay?: number;
  order?: number;
}

interface CreateDocumentRequest {
  name?: string;
  subject?: string;
  message?: string;
  files: Array<{
    name: string;
    file_base64: string;
  }>;
  recipients?: SignWellRecipient[];
  test_mode?: boolean;
  draft?: boolean;
  with_signature_page?: boolean;
  reminders?: boolean;
  apply_signing_order?: boolean;
  embedded_signing?: boolean;
  embedded_signing_notifications?: boolean;
  text_tags?: boolean;
  allow_decline?: boolean;
  allow_reassign?: boolean;
  expires_in?: number;
  api_application_id?: string;
}

interface SignWellDocument {
  id: string;
  name: string;
  status: string; // "draft", "awaiting_signature", "completed", "declined", "expired"
  created_at: string;
  updated_at: string;
  completed_at?: string;
  embedded_edit_url?: string;
  recipients: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
    signed_at?: string;
  }>;
  files: Array<{
    id: string;
    name: string;
    url: string;
  }>;
}

interface EmbeddedRequestingLink {
  url: string;
  expires_at: string | null;
}

export class SignWellService {
  private config: SignWellConfig | null = null;
  private readonly baseUrl = 'https://www.signwell.com/api/v1';

  /**
   * Initialize the SignWell service with API credentials
   */
  initialize(config: SignWellConfig): void {
    this.config = config;
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!(this.config?.apiKey);
  }

  /**
   * Get authorization headers
   */
  private getHeaders(): HeadersInit {
    if (!this.config || !this.config.apiKey) {
      throw new Error('SignWell API Key not configured');
    }

    return {
      'Content-Type': 'application/json',
      'X-Api-Key': this.config.apiKey,
    };
  }

  /**
   * Create a new document
   * https://developers.signwell.com/reference/create-document
   */
  async createDocument(request: CreateDocumentRequest): Promise<SignWellDocument> {
    if (!this.config) {
      throw new Error('SignWell service not configured');
    }

    console.log('[SignWell] Creating document with API Key');
    console.log('[SignWell] Test mode:', this.config.testMode);
    console.log('[SignWell] Document name:', request.name);
    console.log('[SignWell] Recipients count:', request.recipients?.length || 0);

    const payload = {
      ...request,
      test_mode: this.config.testMode,
    };

    const headers = this.getHeaders();
    console.log('[SignWell] Request payload:', JSON.stringify({
      ...payload,
      files: payload.files?.map(f => ({ name: f.name, size: f.file_base64?.length }))
    }, null, 2));

    const response = await fetch(`${this.baseUrl}/documents`, {
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
      } catch (e) {
        errorMessage = `SignWell API error (${response.status}): ${responseText}`;
      }
      throw new Error(errorMessage);
    }

    if (!responseText) {
      throw new Error('SignWell API returned empty response');
    }

    try {
      return JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Failed to parse SignWell response: ${responseText.substring(0, 100)}`);
    }
  }

  /**
   * Get document details
   * https://developers.signwell.com/reference/get-document
   */
  async getDocument(documentId: string): Promise<SignWellDocument> {
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
   * Send document for signing
   * https://developers.signwell.com/reference/send-document
   */
  async sendDocument(
    documentId: string,
    data?: {
      metadata?: Record<string, any>;
      decline_redirect_url?: string;
    }
  ): Promise<SignWellDocument> {
    if (!this.config) {
      throw new Error('SignWell service not configured');
    }

    const response = await fetch(`${this.baseUrl}/documents/${documentId}/send`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data || {}),
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
  async getEmbeddedRequestingLink(documentId: string): Promise<EmbeddedRequestingLink> {
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
  async getEmbeddedSigningLink(
    documentId: string,
    recipientId: string
  ): Promise<{ url: string }> {
    if (!this.config) {
      throw new Error('SignWell service not configured');
    }

    const response = await fetch(
      `${this.baseUrl}/documents/${documentId}/recipients/${recipientId}/embedded_signing_link`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

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
  async downloadCompletedPDF(documentId: string): Promise<Buffer> {
    if (!this.config) {
      throw new Error('SignWell service not configured');
    }

    const response = await fetch(
      `${this.baseUrl}/documents/${documentId}/completed_pdf`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

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
  async sendReminder(documentId: string): Promise<{ success: boolean }> {
    if (!this.config) {
      throw new Error('SignWell service not configured');
    }

    const response = await fetch(
      `${this.baseUrl}/documents/${documentId}/remind`,
      {
        method: 'POST',
        headers: this.getHeaders(),
      }
    );

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
  async deleteDocument(documentId: string): Promise<{ success: boolean }> {
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
  async createTemplate(data: {
    name: string;
    files: Array<{
      name: string;
      file_base64: string;
    }>;
    placeholders?: Array<{
      name: string;
      value: string;
    }>;
  }): Promise<any> {
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
  async createDocumentFromTemplate(
    templateId: string,
    data: {
      name: string;
      recipients: SignWellRecipient[];
      placeholders?: Record<string, string>;
      test_mode?: boolean;
    }
  ): Promise<SignWellDocument> {
    if (!this.config) {
      throw new Error('SignWell service not configured');
    }

    const payload = {
      ...data,
      test_mode: this.config.testMode,
    };

    const response = await fetch(
      `${this.baseUrl}/templates/${templateId}/create_document`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`SignWell API error: ${JSON.stringify(error)}`);
    }

    return await response.json();
  }
}

