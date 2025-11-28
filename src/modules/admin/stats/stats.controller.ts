import { Request, Response, NextFunction } from 'express'
import { statsAdminService } from './stats.service'
import { successResponse } from '../../../utils/response'

export class StatsAdminController {
    /**
     * GET /api/admin/stats
     * Obtiene estadísticas completas para el dashboard
     */
    async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const stats = await statsAdminService.getStats()
            successResponse(res, stats, 200)
        } catch (error) {
            next(error)
        }
    }
}

export const statsAdminController = new StatsAdminController()
