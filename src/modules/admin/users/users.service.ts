import { prisma } from '../../../config/database'
import { ApiError } from '../../../utils/ApiError'
import { auditService } from '../audit/audit.service'
import { UpdateUserInput, UpdateUserStatusInput } from './users.validator'

export class UsersAdminService {
    /**
     * Obtiene un usuario por ID con toda su información
     */
    async getUserById(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                cliente: {
                    include: {
                        trabajos: {
                            take: 5,
                            orderBy: { fechaSolicitud: 'desc' },
                        },
                        favoritos: true,
                    },
                },
                tecnico: {
                    include: {
                        certificados: true,
                        servicios: true,
                        trabajos: {
                            take: 5,
                            orderBy: { fechaSolicitud: 'desc' },
                        },
                    },
                },
                calificaciones: {
                    take: 5,
                    orderBy: { fechaCreacion: 'desc' },
                },
            },
        })

        if (!user) throw ApiError.notFound('Usuario no encontrado')
        return user
    }

    /**
     * Actualiza la información de un usuario
     */
    async updateUser(
        userId: string,
        data: UpdateUserInput,
        adminUserId: string,
        adminUserEmail: string
    ) {
        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (!user) throw ApiError.notFound('Usuario no encontrado')

        // Filter out undefined values
        const updateData: any = {}
        if (data.nombre !== undefined) updateData.nombre = data.nombre
        if (data.telefono !== undefined) updateData.telefono = data.telefono
        if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl
        if (data.direccion !== undefined) updateData.direccion = data.direccion
        if (data.rol !== undefined) updateData.rol = data.rol

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
        })

        // Registrar en auditoría
        await auditService.createLog({
            adminUserId,
            adminUserEmail,
            accion: 'UPDATE_USER',
            entidadAfectada: 'User',
            idEntidadAfectada: userId,
            detalles: {
                cambios: data,
                usuarioEmail: user.email,
            },
        })

        return updatedUser
    }

    /**
     * Cambia el estado de un usuario (activo/suspendido)
     */
    async updateUserStatus(
        userId: string,
        statusData: UpdateUserStatusInput,
        adminUserId: string,
        adminUserEmail: string
    ) {
        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (!user) throw ApiError.notFound('Usuario no encontrado')

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { isActive: statusData.isActive },
        })

        // Registrar en auditoría
        await auditService.createLog({
            adminUserId,
            adminUserEmail,
            accion: statusData.isActive ? 'ACTIVATE_USER' : 'SUSPEND_USER',
            entidadAfectada: 'User',
            idEntidadAfectada: userId,
            detalles: {
                motivo: statusData.motivo,
                nuevoEstado: statusData.isActive ? 'ACTIVO' : 'SUSPENDIDO',
                usuarioEmail: user.email,
                usuarioRol: user.rol,
            },
        })

        return updatedUser
    }

    /**
     * Realiza un borrado lógico de un usuario
     */
    async deleteUser(
        userId: string,
        motivo: string,
        adminUserId: string,
        adminUserEmail: string
    ) {
        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (!user) throw ApiError.notFound('Usuario no encontrado')

        // Borrado lógico: desactivar el usuario
        const deletedUser = await prisma.user.update({
            where: { id: userId },
            data: { isActive: false },
        })

        // Registrar en auditoría
        await auditService.createLog({
            adminUserId,
            adminUserEmail,
            accion: 'DELETE_USER',
            entidadAfectada: 'User',
            idEntidadAfectada: userId,
            detalles: {
                motivo,
                usuarioEmail: user.email,
                usuarioRol: user.rol,
            },
        })

        return deletedUser
    }

    /**
     * Lista todos los usuarios con filtros y paginación
     */
    async getUsers(filters: {
        rol?: string
        isActive?: boolean
        page?: number
        limit?: number
    }) {
        const { page = 1, limit = 20, rol, isActive } = filters
        const skip = (page - 1) * limit

        const where: any = {}
        if (rol) where.rol = rol
        if (isActive !== undefined) where.isActive = isActive

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                include: {
                    cliente: true,
                    tecnico: {
                        select: {
                            id: true,
                            oficio: true,
                            verificado: true,
                            calificacionPromedio: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.user.count({ where }),
        ])

        return {
            data: users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        }
    }
}

export const usersAdminService = new UsersAdminService()
