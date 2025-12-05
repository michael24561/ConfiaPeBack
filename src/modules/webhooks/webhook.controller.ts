import { Request, Response, NextFunction } from 'express';
import { WebhookService } from './webhook.service';
import { WebhookPayload } from '../../types/mercadopago.types';

const webhookService = new WebhookService();

interface WebhookRequest extends Request {
  webhookPayload?: any;
}

export class WebhookController {
  /**
   * @summary Recibe notificaciones de Mercado Pago
   * @description Endpoint para procesar webhooks de pagos. Ya ha sido validado por el middleware.
   * @route POST /api/webhooks/mercadopago
   */
  async handleWebhook(req: WebhookRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = req.webhookPayload as WebhookPayload;
      const topic = req.query.topic; // 'payment'
      const type = req.query.type; // 'payment' for new API

      console.log('[Webhook] Notificación validada y recibida:', { payload, query: req.query });

      // La nueva API de webhooks puede no tener 'type' en el payload, sino en el query param.
      // Nos aseguramos de que sea una notificación de pago.
      if (payload.type === 'payment' || topic === 'payment' || type === 'payment') {
        // Procesamos el webhook de forma asíncrona para responder rápidamente a Mercado Pago.
        webhookService.processWebhook(payload).catch(err => {
          // Logueamos el error pero no lo relanzamos para evitar que MP reintente indefinidamente.
          console.error('[Webhook] Error en el procesamiento asíncrono del webhook:', err);
        });
      } else {
        console.log('[Webhook] Tipo de notificación no relevante, ignorando.');
      }

      // Respondemos inmediatamente con un 200 OK para que Mercado Pago no siga reintentando.
      res.status(200).json({ received: true });
    } catch (error) {
      // Este catch es para errores sincrónicos en el controlador mismo.
      next(error);
    }
  }
}
