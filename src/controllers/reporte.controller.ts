import { Request, Response, NextFunction } from 'express';
import { reporteService } from '../services/reporte.service';
import { successResponse, paginatedResponse } from '../utils/response'; // Modified import
import { ApiError } from '../utils/ApiError';
import { Rol, EstadoTrabajo } from '@prisma/client';
import { GetAdminReportesInput } from '../validators/reporte.validator';

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
   * GET /api/admin/reportes/disputa
   * Obtiene todos los trabajos en disputa (solo admin)
   */
  async getDisputedTrabajos(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await reporteService.getReportesActivos();
      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/reportes
   * Lista todos los reportes para el panel de administración
   */
  async getAdminReportes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = req.query as unknown as GetAdminReportesInput;
// This type is correct if GetAdminReportesInput allows all properties to be optional/undefined
      const finalFilters: {
          estado?: EstadoTrabajo | 'todos' | undefined;
          tecnicoId?: string | undefined;
          clienteId?: string | undefined;
          page?: number | undefined;
          limit?: number | undefined
      } = { ...filters };

      if (finalFilters.estado === 'todos') {
          // Correctly removes the 'todos' literal from the object
          delete finalFilters.estado;
      }
      
      const result = await reporteService.getAdminReportes(
        finalFilters as { 
            estado?: EstadoTrabajo | undefined; 
            tecnicoId?: string | undefined; 
            clienteId?: string | undefined; 
            page?: number | undefined; 
            limit?: number | undefined 
        }
    );

    paginatedResponse(res, result.data, result.pagination, 200); // Modified to use paginatedResponse
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
