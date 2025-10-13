"use strict";
/**
 * Webhook Service
 * Receives real-time events from SignWell via a local webhook server.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookService = void 0;
const express_1 = __importDefault(require("express"));
class WebhookService {
    constructor() {
        this.server = null;
        this.publicUrl = '';
        this.eventHandlers = new Map();
        this.app = (0, express_1.default)();
        this.app.use(express_1.default.json());
        // Webhook endpoint
        this.app.post('/webhooks/signwell', this.handleWebhook.bind(this));
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok', publicUrl: this.publicUrl });
        });
    }
    /**
     * Handle incoming webhook from SignWell.
     */
    async handleWebhook(req, res) {
        try {
            const payload = req.body;
            console.log('[Webhook] Received event:', payload.event.type);
            console.log('[Webhook] Document ID:', payload.data.object.id);
            console.log('[Webhook] Document name:', payload.data.object.name);
            console.log('[Webhook] Status:', payload.data.object.status);
            // Call registered handlers for this event type
            const handlers = this.eventHandlers.get(payload.event.type) || [];
            for (const handler of handlers) {
                try {
                    await handler(payload);
                }
                catch (error) {
                    console.error('[Webhook] Handler error:', (error === null || error === void 0 ? void 0 : error.message) || error);
                }
            }
            res.sendStatus(200);
        }
        catch (error) {
            console.error('[Webhook] Error processing webhook:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Register a handler for a specific event type.
     */
    on(eventType, handler) {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        this.eventHandlers.get(eventType).push(handler);
    }
    /**
     * Start the webhook server.
     */
    async start(port = 3050) {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(port, () => {
                this.publicUrl = `http://localhost:${port}`;
                console.log(`[Webhook] Server running at ${this.publicUrl}`);
                console.log(`[Webhook] SignWell endpoint: ${this.publicUrl}/webhooks/signwell`);
                resolve(this.publicUrl);
            });
            this.server.on('error', (error) => {
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
    getPublicUrl() {
        return this.publicUrl;
    }
}
exports.WebhookService = WebhookService;
