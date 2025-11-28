import { Request, Response, NextFunction } from 'express'
import { usersAdminService } from './users.service'
import { successResponse, paginatedResponse } from '../../../utils/response'

export class UsersAdminController {
    /**
     * GET /api/admin/users
     * Lista todos los usuarios con filtros
     */
    async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { rol, isActive, page, limit } = req.query

            const filters: any = {}
            if (rol) filters.rol = rol as string
            if (isActive !== undefined) filters.isActive = isActive === 'true'
            if (page) filters.page = parseInt(page as string)
            if (limit) filters.limit = parseInt(limit as string)

            const { data, pagination } = await usersAdminService.getUsers(filters)

            paginatedResponse(res, data, pagination, 200)
        } catch (error) {
            next(error)
        }
    }

    /**
     * GET /api/admin/users/:id
     * Obtiene un usuario por ID
     */
    async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params
            if (!id) {
                res.status(400).json({ success: false, error: 'ID requerido' })
                return
            }
            const user = await usersAdminService.getUserById(id)
            successResponse(res, user, 200)
        } catch (error) {
            next(error)
        }
    }

    /**
     * PUT /api/admin/users/:id
     * Actualiza la información de un usuario
     */
    async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params
            if (!id) {
                res.status(400).json({ success: false, error: 'ID requerido' })
                return
            }
            const user = await usersAdminService.updateUser(
                id,
                req.body,
                (req.user as any).userId,
                (req.user as any).email
            )
            successResponse(res, user, 200)
        } catch (error) {
            next(error)
        }
    }

    /**
     * PATCH /api/admin/users/:id/status
     * Cambia el estado de un usuario (activo/suspendido)
     */
    async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params
            if (!id) {
                res.status(400).json({ success: false, error: 'ID requerido' })
                return
            }
            const user = await usersAdminService.updateUserStatus(
                id,
                req.body,
                (req.user as any).userId,
                (req.user as any).email
            )
            successResponse(res, user, 200)
        } catch (error) {
            next(error)
        }
    }

    /**
     * DELETE /api/admin/users/:id
     * Realiza un borrado lógico de un usuario
     */
    async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
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
                    error: 'El motivo es requerido para eliminar un usuario',
                })
                return
            }

            const user = await usersAdminService.deleteUser(
                id,
                motivo,
                (req.user as any).userId,
                (req.user as any).email
            )
            successResponse(res, user, 200)
        } catch (error) {
            next(error)
        }
    }
}

export const usersAdminController = new UsersAdminController()
