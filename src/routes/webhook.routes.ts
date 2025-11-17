import { Router } from 'express'
import express from 'express'
import { pagoController } from '../controllers/pago.controller'

const router: Router = Router()

// El webhook de Stripe debe recibir el body en formato raw
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  pagoController.handleWebhook
)

export default router
