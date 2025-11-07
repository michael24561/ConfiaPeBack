import { Request, Response, NextFunction } from 'express';
import { reviewService } from '../services/review.service';
import { successResponse } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import {
  CreateReviewInput,
  RespondReviewInput,
  GetReviewsInput,
} from '../validators/review.validator';
import { Rol } from '@prisma/client';

export class ReviewController {
  /**
   * POST /api/reviews
   * Crea una nueva review (cliente)
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      if (req.user.rol !== Rol.CLIENTE) {
        throw ApiError.forbidden('Solo los clientes pueden crear calificaciones');
      }

      const data: CreateReviewInput = req.body;
      const result = await reviewService.createReview(req.user.id, data);

      successResponse(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/reviews/:id/respuesta
   * Responde a una review (técnico)
   */
  async respond(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      if (req.user.rol !== Rol.TECNICO) {
        throw ApiError.forbidden('Solo los técnicos pueden responder calificaciones');
      }

      const { id } = req.params;
      if (!id) {
        throw ApiError.badRequest('ID de review requerido');
      }

      const data: RespondReviewInput = req.body;
      const result = await reviewService.respondToReview(id, req.user.id, data);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/reviews/tecnico/:tecnicoId
   * Lista reviews de un técnico (público)
   */
  async getByTecnico(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tecnicoId } = req.params;
      if (!tecnicoId) {
        throw ApiError.badRequest('ID de técnico requerido');
      }

      const filters = req.query as GetReviewsInput;
      const result = await reviewService.getReviewsByTecnico(tecnicoId, filters);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/reviews/:id
   * Obtiene una review por ID
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw ApiError.badRequest('ID de review requerido');
      }

      const result = await reviewService.getReviewById(id);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/reviews/:id
   * Elimina una review (cliente, solo sin respuesta)
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      if (req.user.rol !== Rol.CLIENTE) {
        throw ApiError.forbidden('Solo los clientes pueden eliminar calificaciones');
      }

      const { id } = req.params;
      if (!id) {
        throw ApiError.badRequest('ID de review requerido');
      }

      const result = await reviewService.deleteReview(id, req.user.id);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/reviews/tecnico/:tecnicoId/stats
   * Obtiene estadísticas de reviews de un técnico
   */
  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tecnicoId } = req.params;
      if (!tecnicoId) {
        throw ApiError.badRequest('ID de técnico requerido');
      }

      const result = await reviewService.getReviewStats(tecnicoId);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const reviewController = new ReviewController();
