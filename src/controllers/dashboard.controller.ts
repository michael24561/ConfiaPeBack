import { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { successResponse } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { Rol } from '@prisma/client';

export class DashboardController {
  /**
   * GET /api/dashboard/stats
   * Obtiene estadísticas generales del técnico
   */
  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      if (req.user.rol !== Rol.TECNICO) {
        throw ApiError.forbidden('Solo los técnicos pueden acceder al dashboard');
      }

      const result = await dashboardService.getTecnicoStats(req.user.id);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/dashboard/ingresos
   * Obtiene datos de ingresos con gráficos
   */
  async getIngresos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      if (req.user.rol !== Rol.TECNICO) {
        throw ApiError.forbidden('Solo los técnicos pueden acceder a ingresos');
      }

      const periodo = (req.query.periodo as 'semana' | 'mes' | 'año') || 'mes';

      const result = await dashboardService.getIngresos(req.user.id, periodo);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/dashboard/clientes
   * Obtiene lista de clientes del técnico
   */
  async getClientes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      if (req.user.rol !== Rol.TECNICO) {
        throw ApiError.forbidden('Solo los técnicos pueden ver sus clientes');
      }

      const result = await dashboardService.getClientes(req.user.id);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/dashboard/rendimiento
   * Obtiene estadísticas de rendimiento
   */
  async getRendimiento(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      if (req.user.rol !== Rol.TECNICO) {
        throw ApiError.forbidden('Solo los técnicos pueden ver su rendimiento');
      }

      const result = await dashboardService.getRendimiento(req.user.id);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
