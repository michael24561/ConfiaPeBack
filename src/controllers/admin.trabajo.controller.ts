import { Request, Response, NextFunction } from 'express';
import { adminTrabajoService } from '../services/admin.trabajo.service';
import { successResponse } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { EstadoTrabajo } from '@prisma/client';

export class AdminTrabajoController {
  async updateEstado(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new ApiError(401, 'No autenticado');
      }
      const { id } = req.params;
      const { nuevoEstado } = req.body;

      if (!id) {
        throw new ApiError(400, 'ID de trabajo requerido');
      }
      if (!nuevoEstado || !Object.values(EstadoTrabajo).includes(nuevoEstado)) {
        throw new ApiError(400, 'El nuevo estado no es válido');
      }

      const result = await adminTrabajoService.adminUpdateTrabajoEstado(id, nuevoEstado);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const adminTrabajoController = new AdminTrabajoController();