import express, { Router } from 'express';
import { WebhookController } from './webhook.controller';
import { validateMpWebhookMiddleware } from '../../middlewares/validate-mp-webhook.middleware';

const router: Router = Router();
const controller = new WebhookController();

// Endpoint para recibir las notificaciones de Mercado Pago.
// 1. Usamos express.raw() para obtener el body como Buffer, necesario para la validación de la firma.
// 2. Usamos nuestro middleware para validar que el webhook proviene de Mercado Pago.
// 3. Finalmente, procesamos la notificación.
router.post(
  '/mercadopago',
  express.raw({ type: 'application/json' }),
  validateMpWebhookMiddleware,
  controller.handleWebhook
);

export default router;
