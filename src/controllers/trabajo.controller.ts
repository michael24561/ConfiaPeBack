import { Request, Response, NextFunction } from 'express'
import { trabajoService } from '../services/trabajo.service'
import { successResponse } from '../utils/response'
import { ApiError } from '../utils/ApiError'
import { prisma } from '../config/database'
import { ProponerCotizacionInput } from '../validators/trabajo.validator'
import { Rol } from '@prisma/client'

// Helper para ejecutar una acción validando rol y extrayendo IDs
const handleAction = (
  action: (trabajoId: string, userId: string, data?: any) => Promise<any>,
  allowedRol?: Rol
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw ApiError.unauthorized('Usuario no autenticado')
      if (allowedRol && req.user.rol !== allowedRol) {
        throw ApiError.forbidden(`Esta acción solo puede ser realizada por un ${allowedRol}`)
      }

      const { id } = req.params
      if (!id) {
        throw ApiError.badRequest('ID de trabajo requerido en los parámetros')
      }
      const result = await action(id, req.user.id, req.body)
      successResponse(res, result, 200)
    } catch (error) {
      next(error)
    }
  }
}

export class TrabajoController {
  // =================================================================
  // METODOS DE LECTURA (GET)
  // =================================================================

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.rol !== Rol.CLIENTE) {
        throw ApiError.forbidden('Solo los clientes pueden crear trabajos')
      }
      const cliente = await prisma.cliente.findUnique({ where: { userId: req.user.id } })
      if (!cliente) throw ApiError.notFound('Perfil de cliente no encontrado')

      const result = await trabajoService.createTrabajo(cliente.id, req.body)
      successResponse(res, result, 201)
    } catch (error) {
      next(error)
    }
  }

  async getTrabajos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Usuario no autenticado')
      const result = await trabajoService.getTrabajos(req.user.id, req.user.rol as Rol, req.query)
      successResponse(res, result, 200)
    } catch (error) {
      next(error)
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Usuario no autenticado')
      const { id } = req.params
      if (!id) {
        throw ApiError.badRequest('ID de trabajo requerido en los parámetros')
      }
      const result = await trabajoService.getTrabajoById(id, req.user.id, req.user.rol as Rol)
      successResponse(res, result, 200)
    } catch (error) {
      next(error)
    }
  }

  // =================================================================
  // ACCIONES DEL TÉCNICO
  // =================================================================

  solicitarVisita = handleAction(
    (trabajoId, tecnicoUserId) => trabajoService.solicitarVisita(trabajoId, tecnicoUserId),
    Rol.TECNICO
  )

  proponerCotizacion = handleAction(
    (trabajoId, tecnicoUserId, data: ProponerCotizacionInput) =>
      trabajoService.proponerCotizacion(trabajoId, tecnicoUserId, data),
    Rol.TECNICO
  )

  rechazarSolicitud = handleAction(
    (trabajoId, tecnicoUserId) => trabajoService.rechazarSolicitud(trabajoId, tecnicoUserId),
    Rol.TECNICO
  )

  iniciarTrabajo = handleAction(
    (trabajoId, tecnicoUserId) => trabajoService.iniciarTrabajo(trabajoId, tecnicoUserId),
    Rol.TECNICO
  )

  completarTrabajo = handleAction(
    (trabajoId, tecnicoUserId) => trabajoService.completarTrabajo(trabajoId, tecnicoUserId),
    Rol.TECNICO
  )

  // =================================================================
  // ACCIONES DEL CLIENTE
  // =================================================================

  aceptarCotizacion = handleAction(
    (trabajoId, clienteUserId) => trabajoService.aceptarCotizacion(trabajoId, clienteUserId),
    Rol.CLIENTE
  )

  rechazarCotizacion = handleAction(
    (trabajoId, clienteUserId) => trabajoService.rechazarCotizacion(trabajoId, clienteUserId),
    Rol.CLIENTE
  )

  // =================================================================
  // ACCIONES COMPARTIDAS
  // =================================================================

  async cancelar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized('Usuario no autenticado')
      const { id } = req.params
      if (!id) {
        throw ApiError.badRequest('ID de trabajo requerido en los parámetros')
      }
      const result = await trabajoService.cancelarTrabajo(id, req.user.id, req.user.rol as Rol)
      successResponse(res, result, 200)
    } catch (error) {
      next(error)
    }
  }
}

export const trabajoController = new TrabajoController()