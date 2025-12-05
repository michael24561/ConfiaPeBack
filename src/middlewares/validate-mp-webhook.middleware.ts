import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface WebhookRequest extends Request {
  webhookPayload?: any;
}

/**
 * Middleware para validar la firma de los webhooks de Mercado Pago.
 * El middleware `express.raw({ type: 'application/json' })` DEBE ejecutarse antes que este.
 *
 * @see https://www.mercadopago.com.ar/developers/es/docs/security/webhooks
 */
export const validateMpWebhookMiddleware = (req: WebhookRequest, res: Response, next: NextFunction): void | Response => {
  const signatureHeader = req.headers['x-signature'] as string;
  const requestId = req.headers['x-request-id'] as string;
  
  if (!signatureHeader || !requestId) {
    return res.status(401).json({ error: 'Missing x-signature or x-request-id header' });
  }

  // 1. Parsear la firma del header de forma segura
  const parts = signatureHeader.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    if (key && value) {
      acc[key.trim()] = value.trim();
    }
    return acc;
  }, {} as { [key: string]: string });

  const ts = parts.ts;
  const hash = parts.v1;

  if (!ts || !hash) {
    return res.status(401).json({ error: 'Invalid signature format. Missing "ts" or "v1".' });
  }

  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    console.error('MP_WEBHOOK_SECRET is not configured.');
    return res.status(500).json({ error: 'Webhook secret is not configured on the server.' });
  }

  // 2. Parsear el cuerpo de la solicitud (que es un Buffer)
  let payload: any;
  try {
    if (req.body instanceof Buffer) {
      payload = JSON.parse(req.body.toString('utf-8'));
    } else {
      // Si ya está parseado, lo usamos, pero no es el flujo esperado.
      payload = req.body;
    }
  } catch (error) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  // Asegurarse de que el payload tiene el formato esperado
  if (!payload.data || !payload.data.id) {
    return res.status(400).json({ error: 'Invalid payload structure. Missing data.id.' });
  }

  // 3. Construir el template para la firma
  const template = `id:${payload.data.id};request-id:${requestId};ts:${ts};`;

  // 4. Calcular el HMAC
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(template);
  const calculatedHash = hmac.digest('hex');
  
  // 5. Comparar las firmas
  if (calculatedHash !== hash) {
    console.warn('Invalid Mercado Pago webhook signature.', {
      requestId,
      receivedHash: hash,
      calculatedHash,
    });
    return res.status(403).json({ error: 'Invalid signature' });
  }
  
  // 6. Anexar el payload parseado al request para el siguiente middleware/controlador
  req.webhookPayload = payload;

  next();
};