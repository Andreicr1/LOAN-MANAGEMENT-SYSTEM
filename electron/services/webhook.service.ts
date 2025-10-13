/**
 * Webhook Service
 * Receives real-time events from SignWell via a local webhook server.
 */

import express, { Application, Request, Response } from 'express';

export interface SignWellWebhookEvent {
  event: {
    hash: string;
    time: number;
    type:
      | 'document_created'
      | 'document_sent'
      | 'document_completed'
      | 'document_declined'
      | 'document_expired';
  };
  data: {
    object: {
      id: string;
      name: string;
      status: string;
      recipients: Array<{
        id: string;
        name: string;
        email: string;
        status: string;
      }>;
      files: Array<{
        name: string;
        pages_number: number;
      }>;
    };
    account_id: string;
    workspace_id: string;
  };
}

export type WebhookEventHandler = (event: SignWellWebhookEvent) => void | Promise<void>;

export class WebhookService {
  private app: Application;
  private server: any = null;
  private publicUrl = '';
  private eventHandlers: Map<string, WebhookEventHandler[]> = new Map();

  constructor() {
    this.app = express();
    this.app.use(express.json());

    // Webhook endpoint
    this.app.post('/webhooks/signwell', this.handleWebhook.bind(this));

    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', publicUrl: this.publicUrl });
    });
  }

  /**
   * Handle incoming webhook from SignWell.
   */
  private async handleWebhook(req: Request, res: Response) {
    try {
      const payload = req.body as SignWellWebhookEvent;

      console.log('[Webhook] Received event:', payload.event.type);
      console.log('[Webhook] Document ID:', payload.data.object.id);
      console.log('[Webhook] Document name:', payload.data.object.name);
      console.log('[Webhook] Status:', payload.data.object.status);

      // Call registered handlers for this event type
      const handlers = this.eventHandlers.get(payload.event.type) || [];
      for (const handler of handlers) {
        try {
          await handler(payload);
        } catch (error: any) {
          console.error('[Webhook] Handler error:', error?.message || error);
        }
      }

      res.sendStatus(200);
    } catch (error: any) {
      console.error('[Webhook] Error processing webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Register a handler for a specific event type.
   */
  on(eventType: SignWellWebhookEvent['event']['type'], handler: WebhookEventHandler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Start the webhook server.
   */
  async start(port: number = 3050): Promise<string> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(port, () => {
        this.publicUrl = `http://localhost:${port}`;
        console.log(`[Webhook] Server running at ${this.publicUrl}`);
        console.log(`[Webhook] SignWell endpoint: ${this.publicUrl}/webhooks/signwell`);
        resolve(this.publicUrl);
      });

      this.server.on('error', (error: any) => {
        console.error('[Webhook] Server error:', error);
        reject(error);
      });
    });
  }

  /**
   * Stop the webhook server.
   */
  async stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
      this.publicUrl = '';
      console.log('[Webhook] Server stopped');
    }
  }

  /**
   * Get the current public URL (local server address).
   */
  getPublicUrl(): string {
    return this.publicUrl;
  }
}
