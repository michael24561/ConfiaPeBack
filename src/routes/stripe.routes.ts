import { Router } from 'express'
import { stripeController } from '../controllers/stripe.controller'
import { authMiddleware } from '../middlewares/auth.middleware'

const router: Router = Router()

// Todas las rutas en este archivo requieren autenticación
router.use(authMiddleware)

// Crea o recupera una cuenta de Stripe Connect para el técnico
router.post('/connect/create-account', stripeController.createConnectAccount)

// Crea un link de onboarding para la cuenta
router.post('/connect/create-account-link', stripeController.createAccountLink)

// Obtiene el estado de la cuenta del técnico
router.get('/connect/account-status', stripeController.getAccountStatus)

export default router
