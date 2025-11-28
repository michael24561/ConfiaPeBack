import { Request, Response, NextFunction } from 'express'
import { ratingsAdminService } from './ratings.service'
import { successResponse, paginatedResponse } from '../../../utils/response'

export class RatingsAdminController {
    /**
     * GET /api/admin/calificaciones
     * Lista todas las calificaciones
     */
    async getRatings(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { puntuacion, page, limit } = req.query

            const filters: any = {}
            if (puntuacion) filters.puntuacion = parseInt(puntuacion as string)
            if (page) filters.page = parseInt(page as string)
            if (limit) filters.limit = parseInt(limit as string)

            const { data, pagination } = await ratingsAdminService.getRatings(filters)

            paginatedResponse(res, data, pagination, 200)
        } catch (error) {
            next(error)
        }
    }

    /**
     * DELETE /api/admin/calificaciones/:id
     * Elimina una calificación
     */
    async deleteRating(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params
            const { motivo } = req.body

            if (!id) {
                res.status(400).json({ success: false, error: 'ID requerido' })
                return
            }

            if (!motivo) {
                res.status(400).json({
                    success: false,
                    error: 'El motivo es requerido para eliminar una calificación',
                })
                return
            }

            const result = await ratingsAdminService.deleteRating(
                id,
                motivo,
                (req.user as any).userId,
                (req.user as any).email
            )

            successResponse(res, result, 200)
        } catch (error) {
            next(error)
        }
    }
}

export const ratingsAdminController = new RatingsAdminController()
