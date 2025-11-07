import { Router } from 'express';
import {
  createPaymentIntent,
  confirmarPago,
  webhookHandler
} from '../controllers/pago.controller';
import { validarJWT } from '../middlewares/auth.middleware';

const router: Router = Router();

// Rutas protegidas por JWT
router.post('/intent', validarJWT, createPaymentIntent);
router.post('/confirmar', validarJWT, confirmarPago);

// Webhook (no requiere JWT)
router.post('/webhook', webhookHandler);

export default router;
