import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { checkRole } from '../../middlewares/checkRole.middleware';
import { Rol } from '@prisma/client';

const router: Router = Router();
const controller = new PaymentController();

// Todas las rutas en este archivo requieren autenticación
router.use(authMiddleware);

// Crea una preferencia de pago (CLIENTE)
router.post(
  '/create-preference',
  checkRole([Rol.CLIENTE]),
  controller.createPaymentPreference
);

// Obtiene el estado de un pago (CLIENTE, TECNICO, ADMIN)
router.get('/:id', controller.getPayment);

export default router;
