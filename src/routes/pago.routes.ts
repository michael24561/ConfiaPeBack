import { Router } from 'express'
import { pagoController } from '../controllers/pago.controller'
import { validateMiddleware } from '../middlewares/validation.middleware'
import { authMiddleware } from '../middlewares/auth.middleware'
import { createCheckoutSessionSchema } from '../validators/pago.validator'

const router: Router = Router()

// Todas las rutas en este archivo requieren autenticación y un body parseado
router.use(authMiddleware)

// Crea una sesión de checkout (CLIENTE)
router.post(
  '/create-checkout-session',
  validateMiddleware(createCheckoutSessionSchema),
  pagoController.createCheckoutSession
)

export default router