import { prisma } from '../../../config/database'
import { CreateLogInput, GetLogsFilters, LogsPaginatedResponse } from './audit.types'

export class AuditService {
    /**
     * Crea un registro de auditoría para una acción administrativa
     */
    async createLog(data: CreateLogInput) {
        return prisma.adminLog.create({ data })
    }

    /**
     * Obtiene los logs de auditoría con filtros y paginación
     */
    async getLogs(filters: GetLogsFilters): Promise<LogsPaginatedResponse> {
        const { page = 1, limit = 50, adminUserId, entidadAfectada } = filters
        const skip = (page - 1) * limit

        const where: any = {}
        if (adminUserId) where.adminUserId = adminUserId
        if (entidadAfectada) where.entidadAfectada = entidadAfectada

        const [logs, total] = await Promise.all([
            prisma.adminLog.findMany({
                where,
                orderBy: { timestamp: 'desc' },
                skip,
                take: limit,
            }),
            prisma.adminLog.count({ where }),
        ])

        return {
            data: logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        }
    }

    /**
     * Obtiene los logs recientes para el feed de actividad
     */
    async getRecentLogs(limit: number = 10) {
        return prisma.adminLog.findMany({
            orderBy: { timestamp: 'desc' },
            take: limit,
        })
    }
}

export const auditService = new AuditService()
