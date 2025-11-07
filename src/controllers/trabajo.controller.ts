import { Request, Response, NextFunction } from 'express';
import { trabajoService } from '../services/trabajo.service';
import { successResponse } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { prisma } from '../config/database';
import {
  CreateTrabajoInput,
  GetTrabajosInput,
  UpdateEstadoTrabajoInput,
  UpdateTrabajoInput,
} from '../validators/trabajo.validator';
import { Rol } from '@prisma/client';

export class TrabajoController {
  /**
   * POST /api/trabajos
   * Crea un nuevo trabajo (cliente)
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      if (req.user.rol !== Rol.CLIENTE) {
        throw ApiError.forbidden('Solo los clientes pueden crear trabajos');
      }

      // Obtener el clienteId del usuario
      const cliente = await prisma.cliente.findUnique({
        where: { userId: req.user.id },
      });

      if (!cliente) {
        throw ApiError.notFound('Perfil de cliente no encontrado');
      }

      const data: CreateTrabajoInput = req.body;
      const result = await trabajoService.createTrabajo(cliente.id, data);

      successResponse(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/trabajos
   * Lista trabajos del usuario autenticado
   */
  async getTrabajos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      const filters = req.query as GetTrabajosInput;
      const result = await trabajoService.getTrabajos(req.user.id, req.user.rol as Rol, filters);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/trabajos/:id
   * Obtiene un trabajo por ID
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      const { id } = req.params;
      if (!id) {
        throw ApiError.badRequest('ID de trabajo requerido');
      }

      const result = await trabajoService.getTrabajoById(id, req.user.id, req.user.rol as Rol);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/trabajos/:id/estado
   * Cambia el estado de un trabajo (técnico)
   */
  async updateEstado(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      if (req.user.rol !== Rol.TECNICO) {
        throw ApiError.forbidden('Solo los técnicos pueden cambiar el estado');
      }

      const { id } = req.params;
      if (!id) {
        throw ApiError.badRequest('ID de trabajo requerido');
      }

      const data: UpdateEstadoTrabajoInput = req.body;
      const result = await trabajoService.updateEstado(id, req.user.id, data);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/trabajos/:id
   * Actualiza un trabajo (cliente, solo PENDIENTE)
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      if (req.user.rol !== Rol.CLIENTE) {
        throw ApiError.forbidden('Solo los clientes pueden editar trabajos');
      }

      const { id } = req.params;
      if (!id) {
        throw ApiError.badRequest('ID de trabajo requerido');
      }

      const data: UpdateTrabajoInput = req.body;
      const result = await trabajoService.updateTrabajo(id, req.user.id, data);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/trabajos/:id/cancel
   * Cancela un trabajo
   */
  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      const { id } = req.params;
      if (!id) {
        throw ApiError.badRequest('ID de trabajo requerido');
      }

      const result = await trabajoService.cancelTrabajo(id, req.user.id, req.user.rol as Rol);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/trabajos/:id
   * Elimina un trabajo (cliente, solo PENDIENTE)
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      if (req.user.rol !== Rol.CLIENTE) {
        throw ApiError.forbidden('Solo los clientes pueden eliminar trabajos');
      }

      const { id } = req.params;
      if (!id) {
        throw ApiError.badRequest('ID de trabajo requerido');
      }

      const result = await trabajoService.deleteTrabajo(id, req.user.id);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const trabajoController = new TrabajoController();
