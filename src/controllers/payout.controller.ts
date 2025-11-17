import { Request, Response, NextFunction } from 'express';
import { payoutService } from '../services/payout.service';
import { successResponse } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { Rol } from '@prisma/client';

export class PayoutController {
  async createPayout(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.rol !== Rol.ADMIN) {
        throw new ApiError(403, 'Esta acción solo puede ser realizada por un administrador.');
      }
      const { trabajoId } = req.params;
      if (!trabajoId) {
        throw new ApiError(400, 'ID de trabajo requerido.');
      }

      const result = await payoutService.createPayout(trabajoId);
      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const payoutController = new PayoutController();
