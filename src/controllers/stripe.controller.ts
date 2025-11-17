import { Request, Response, NextFunction } from 'express'
import { stripeService } from '../services/stripe.service'
import { successResponse } from '../utils/response'
import { ApiError } from '../utils/ApiError'
import { Rol } from '@prisma/client'

export class StripeController {
  /**
   * @summary Crea o recupera una cuenta de Stripe Connect para el técnico autenticado.
   * @route POST /api/stripe/connect/create-account
   */
  async createConnectAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.rol !== Rol.TECNICO) {
        throw new ApiError(403, 'Esta acción solo puede ser realizada por un técnico.')
      }
      const result = await stripeService.createConnectAccount(req.user.id)
      successResponse(res, result, 200)
    } catch (error) {
      next(error)
    }
  }

  /**
   * @summary Crea un link de onboarding para la cuenta de Stripe Connect.
   * @route POST /api/stripe/connect/create-account-link
   */
  async createAccountLink(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.rol !== Rol.TECNICO) {
        throw new ApiError(403, 'Esta acción solo puede ser realizada por un técnico.')
      }
      const { stripeAccountId } = req.body
      if (!stripeAccountId) {
        throw new ApiError(400, 'El ID de la cuenta de Stripe es requerido.')
      }
      const result = await stripeService.createAccountLink(stripeAccountId)
      successResponse(res, result, 200)
    } catch (error) {
      next(error)
    }
  }

  /**
   * @summary Obtiene el estado de la cuenta de Stripe Connect del técnico.
   * @route GET /api/stripe/connect/account-status
   */
  async getAccountStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.rol !== Rol.TECNICO) {
        throw new ApiError(403, 'Esta acción solo puede ser realizada por un técnico.')
      }
      // El servicio se encargará de encontrar el stripeAccountId a partir del userId
      const result = await stripeService.getAccountStatus(req.user.id)
      successResponse(res, result, 200)
    } catch (error) {
      next(error)
    }
  }
}

export const stripeController = new StripeController()
