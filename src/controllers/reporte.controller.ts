import { Request, Response, NextFunction } from 'express';
import { reporteService } from '../services/reporte.service';
import { successResponse } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { Rol } from '@prisma/client';

export class ReporteController {
  /**
   * POST /api/trabajos/:trabajoId/reportar
   * Crea un nuevo reporte para un trabajo
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }
      const { trabajoId } = req.params;
      if (!trabajoId) {
        throw ApiError.badRequest('El ID del trabajo es requerido');
      }

      const result = await reporteService.createReporte(trabajoId, req.user.id, req.user.rol as Rol, req.body);
      successResponse(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/reportes
   * Obtiene todos los trabajos en disputa (solo admin)
   */
  async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await reporteService.getReportesActivos();
      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/reportes/:trabajoId/resolver
   * Resuelve una disputa (solo admin)
   */
  async resolve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { trabajoId } = req.params;
      if (!trabajoId) {
        throw ApiError.badRequest('El ID del trabajo es requerido');
      }

      const result = await reporteService.resolveReporte(trabajoId, req.body);
      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const reporteController = new ReporteController();
