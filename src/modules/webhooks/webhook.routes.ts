import { Router } from 'express';
import { WebhookController } from './webhook.controller';

const router: Router = Router();
const controller = new WebhookController();

// Endpoint para recibir las notificaciones de Mercado Pago
// No usa el middleware de express.raw porque el body ya es parseado a JSON por el middleware global
router.post('/mercadopago', controller.handleWebhook);

export default router;
