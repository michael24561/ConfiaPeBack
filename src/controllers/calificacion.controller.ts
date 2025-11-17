import { Request, Response, NextFunction } from 'express'
import { calificacionService } from '../services/calificacion.service'
import { successResponse, paginatedResponse } from '../utils/response' // Added paginatedResponse
import { ApiError } from '../utils/ApiError'

export class CalificacionController {
  async crearCalificacion(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new ApiError(401, 'No autenticado')
      }
      const calificacion = await calificacionService.crearCalificacion(req.user.id, req.body)
      successResponse(res, calificacion, 201)
    } catch (error) {
      next(error)
    }
  }

  async obtenerCalificaciones(req: Request, res: Response, next: NextFunction) {
    try {
      const { tecnicoId } = req.params
      const { page, limit, calificacion } = req.query

      if (!tecnicoId) {
        throw new ApiError(400, 'ID de técnico requerido')
      }
      
      const filters: { page?: number, limit?: number, calificacion?: string } = {};
      if (page) filters.page = parseInt(page as string);
      if (limit) filters.limit = parseInt(limit as string);
      if (calificacion) filters.calificacion = calificacion as string;

      const result = await calificacionService.obtenerCalificacionesPorTecnico(tecnicoId, filters)
      paginatedResponse(res, result.data, result.pagination)
    } catch (error) {
      next(error)
    }
  }

  async getAdminCalificaciones(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, tecnicoId, clienteId } = req.query;
      const filters: { page?: number, limit?: number, tecnicoId?: string, clienteId?: string } = {};
      if (page) filters.page = parseInt(page as string);
      if (limit) filters.limit = parseInt(limit as string);
      if (tecnicoId) filters.tecnicoId = tecnicoId as string;
      if (clienteId) filters.clienteId = clienteId as string;

      const result = await calificacionService.getAdminCalificaciones(filters);
      paginatedResponse(res, result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async deleteCalificacion(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        throw new ApiError(400, 'ID de calificación requerido');
      }
      const result = await calificacionService.deleteCalificacion(id);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async updateOwnCalificacion(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new ApiError(401, 'No autenticado');
      }
      const { id } = req.params;
      if (!id) {
        throw new ApiError(400, 'ID de calificación requerido');
      }
      const result = await calificacionService.updateOwnCalificacion(req.user.id, id, req.body);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async deleteOwnCalificacion(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new ApiError(401, 'No autenticado');
      }
      const { id } = req.params;
      if (!id) {
        throw new ApiError(400, 'ID de calificación requerido');
      }
      const result = await calificacionService.deleteOwnCalificacion(req.user.id, id);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const calificacionController = new CalificacionController()
