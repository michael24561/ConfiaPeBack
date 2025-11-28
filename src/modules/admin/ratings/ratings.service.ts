import { prisma } from '../../../config/database'
import { ApiError } from '../../../utils/ApiError'
import { auditService } from '../audit/audit.service'

export class RatingsAdminService {
    /**
     * Elimina una calificación (moderación)
     */
    async deleteRating(
        ratingId: string,
        motivo: string,
        adminUserId: string,
        adminUserEmail: string
    ) {
        const rating = await prisma.calificacion.findUnique({
            where: { id: ratingId },
            include: {
                trabajo: {
                    select: {
                        id: true,
                        servicioNombre: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        nombre: true,
                        email: true,
                    },
                },
            },
        })

        if (!rating) throw ApiError.notFound('Calificación no encontrada')

        // Eliminar la calificación
        await prisma.calificacion.delete({ where: { id: ratingId } })

        // Registrar en auditoría
        await auditService.createLog({
            adminUserId,
            adminUserEmail,
            accion: 'DELETE_RATING',
            entidadAfectada: 'Calificacion',
            idEntidadAfectada: ratingId,
            detalles: {
                motivo,
                trabajoId: rating.trabajoId,
                trabajoNombre: rating.trabajo.servicioNombre,
                puntuacion: rating.puntuacion,
                comentario: rating.comentario,
                usuarioId: rating.userId,
                usuarioNombre: rating.user.nombre,
            },
        })

        return { success: true, message: 'Calificación eliminada correctamente' }
    }

    /**
     * Lista todas las calificaciones con filtros
     */
    async getRatings(filters: {
        puntuacion?: number
        page?: number
        limit?: number
    }) {
        const { page = 1, limit = 20, puntuacion } = filters
        const skip = (page - 1) * limit

        const where: any = {}
        if (puntuacion) where.puntuacion = puntuacion

        const [ratings, total] = await Promise.all([
            prisma.calificacion.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            nombre: true,
                            email: true,
                        },
                    },
                    trabajo: {
                        select: {
                            id: true,
                            servicioNombre: true,
                            tecnico: {
                                select: {
                                    id: true,
                                    user: {
                                        select: {
                                            nombre: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                orderBy: { fechaCreacion: 'desc' },
                skip,
                take: limit,
            }),
            prisma.calificacion.count({ where }),
        ])

        return {
            data: ratings,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        }
    }
}

export const ratingsAdminService = new RatingsAdminService()
