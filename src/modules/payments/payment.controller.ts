import { Request, Response, NextFunction } from 'express';
import { PaymentService } from './payment.service';
import { successResponse } from '../../utils/response';
import { ApiError } from '../../utils/ApiError';
import { Rol } from '@prisma/client';

const paymentService = new PaymentService();

export class PaymentController {
  /**
   * @summary Crea una preferencia de pago en Mercado Pago
   * @description Solo los clientes pueden acceder.
   * @route POST /api/payments/create-preference
   */
  async createPaymentPreference(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.rol !== Rol.CLIENTE) {
        throw ApiError.forbidden('Solo los clientes pueden realizar pagos');
      }
      // El DTO se valida con un middleware que podríamos añadir
      const createPaymentDto = {
        trabajoId: req.body.trabajoId,
        payerEmail: req.user.email, // Usamos el email del usuario autenticado
      };

      const result = await paymentService.createPaymentPreference(req.user.id, createPaymentDto);
      successResponse(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @summary Obtiene el estado de un pago
   * @description Cliente o técnico pueden ver sus pagos. Admin puede ver todos.
   * @route GET /api/payments/:id
   */
  async getPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw ApiError.badRequest('El ID del pago es requerido.');
      }
      const payment = await paymentService.getPaymentStatus(id, { id: req.user!.id, rol: req.user!.rol });

      successResponse(res, payment);
    } catch (error) {
      next(error);
    }
  }
}
