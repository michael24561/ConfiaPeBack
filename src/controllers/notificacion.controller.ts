import { Request, Response, NextFunction } from 'express';
import { notificacionService } from '../services/notificacion.service';
import { successResponse } from '../utils/response';
import { ApiError } from '../utils/ApiError';

export class NotificacionController {
  async getNotificaciones(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new ApiError(401, 'No autenticado');
      const notificaciones = await notificacionService.getNotificaciones(req.user.id);
      successResponse(res, notificaciones);
    } catch (error) {
      next(error);
    }
  }

  async marcarComoLeida(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new ApiError(401, 'No autenticado');
      const { id } = req.params;
      if (!id) throw new ApiError(400, 'ID de notificación requerido');
      
      const notificacion = await notificacionService.marcarComoLeida(id, req.user.id);
      successResponse(res, notificacion);
    } catch (error) {
      next(error);
    }
  }

  async marcarTodasComoLeidas(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new ApiError(401, 'No autenticado');
      const result = await notificacionService.marcarTodasComoLeidas(req.user.id);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const notificacionController = new NotificacionController();
