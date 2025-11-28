import { Request, Response, NextFunction } from 'express';
import { disponibilidadService } from '../services/disponibilidad.service';
import { successResponse } from '../utils/response';
import { ApiError } from '../utils/ApiError';

export class DisponibilidadController {
    async addException(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user) throw ApiError.unauthorized('Usuario no autenticado');

            const result = await disponibilidadService.addException(req.user.id, req.body);
            successResponse(res, result, 201);
        } catch (error) {
            next(error);
        }
    }

    async getExceptions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user) throw ApiError.unauthorized('Usuario no autenticado');

            const result = await disponibilidadService.getExceptions(req.user.id);
            successResponse(res, result, 200);
        } catch (error) {
            next(error);
        }
    }

    async deleteException(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user) throw ApiError.unauthorized('Usuario no autenticado');
            const { id } = req.params;

            if (!id) throw ApiError.badRequest('ID de excepción requerido');

            const result = await disponibilidadService.deleteException(req.user.id, id);
            successResponse(res, result, 200);
        } catch (error) {
            next(error);
        }
    }

    async checkAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { tecnicoId } = req.params;
            const { date } = req.query;

            if (!tecnicoId || !date) {
                throw ApiError.badRequest('Tecnico ID y fecha son requeridos');
            }

            const result = await disponibilidadService.checkAvailability(tecnicoId, date as string);
            successResponse(res, result, 200);
        } catch (error) {
            next(error);
        }
    }
}

export const disponibilidadController = new DisponibilidadController();
