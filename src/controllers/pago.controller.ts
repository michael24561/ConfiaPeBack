import { Request, Response, NextFunction } from 'express'
import { pagoService } from '../services/pago.service'
import { successResponse } from '../utils/response'
import { ApiError } from '../utils/ApiError'
import { Rol } from '@prisma/client'

export class PagoController {
  /**
   * @summary Crea una sesión de checkout de Stripe
   * @description Solo los clientes pueden acceder.
   * @route POST /api/pagos/create-checkout-session
   */
  async createCheckoutSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.rol !== Rol.CLIENTE) {
        throw ApiError.forbidden('Solo los clientes pueden realizar pagos')
      }
      const result = await pagoService.createCheckoutSession(req.user.id, req.body)
      successResponse(res, result, 200)
    } catch (error) {
      next(error)
    }
  }

  /**
   * @summary Maneja los webhooks de Stripe
   * @description Endpoint para recibir notificaciones de Stripe.
   * @route POST /api/pagos/webhook
   */
  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    const signature = req.headers['stripe-signature'] as string
    try {
      await pagoService.handleWebhook(signature, req.body)
      res.status(200).json({ received: true })
    } catch (error) {
      next(error)
    }
  }
}

export const pagoController = new PagoController()
