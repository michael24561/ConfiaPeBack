import { Prisma, EstadoTrabajo, Rol, TipoNotificacion } from '@prisma/client'
import { prisma } from '../config/database'
import { ApiError } from '../utils/ApiError'
import {
  CreateTrabajoInput,
  GetTrabajosInput,
  ProponerCotizacionInput,
} from '../validators/trabajo.validator'
import { sendEventToUser } from '../websockets/notification.emitter'

export class TrabajoService {
  // =================================================================
  // METODOS DE LECTURA (GET)
  // =================================================================

  /**
   * Crea un nuevo trabajo (solo clientes)
   */
  async createTrabajo(clienteId: string, data: CreateTrabajoInput) {
    const { tecnicoId, servicioNombre, descripcion, direccion, telefono, fechaProgramada } = data

    const tecnico = await prisma.tecnico.findUnique({
      where: { id: tecnicoId },
      include: { user: true },
    })

    if (!tecnico) throw ApiError.notFound('Técnico no encontrado')
    if (!tecnico.disponible) throw ApiError.badRequest('El técnico no está disponible actualmente')

    return prisma.$transaction(async (tx) => {
      const nuevoTrabajo = await tx.trabajo.create({
        data: {
          clienteId,
          tecnicoId,
          servicioNombre,
          descripcion,
          direccion,
          telefono,
          estado: EstadoTrabajo.PENDIENTE,
          ...(fechaProgramada && { fechaProgramada: new Date(fechaProgramada) }),
        },
        include: {
          cliente: { include: { user: true } },
          tecnico: { include: { user: true } },
        },
      })

      const notificacion = await tx.notificacion.create({
        data: {
          userId: tecnico.userId,
          tipo: TipoNotificacion.NUEVO_TRABAJO,
          titulo: 'Nueva solicitud de trabajo',
          mensaje: `${nuevoTrabajo.cliente.user.nombre} solicita: ${servicioNombre}`,
          metadata: { trabajoId: nuevoTrabajo.id },
        },
      })

      sendEventToUser(notificacion.userId, 'new_notification', notificacion);

      return nuevoTrabajo
    })
  }

  /**
   * Lista trabajos según el rol del usuario
   */
  async getTrabajos(userId: string, userRol: Rol, filters: GetTrabajosInput) {
    const { estado, page = 1, limit = 10 } = filters
    const skip = (page - 1) * limit

    const where: Prisma.TrabajoWhereInput = {
      ...(estado && { estado }),
      ...(userRol === Rol.CLIENTE && { cliente: { userId } }),
      ...(userRol === Rol.TECNICO && { tecnico: { userId } }),
    }

    const [trabajos, total] = await Promise.all([
      prisma.trabajo.findMany({
        where,
        include: {
          cliente: { include: { user: { select: { nombre: true, avatarUrl: true } } } },
          tecnico: { include: { user: { select: { nombre: true, avatarUrl: true } } } },
          calificacion: { select: { id: true, puntuacion: true, comentario: true } },
        },
        orderBy: { fechaSolicitud: 'desc' },
        skip,
        take: limit,
      }),
      prisma.trabajo.count({ where }),
    ])

    return {
      data: trabajos,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }
  }

  /**
   * Obtiene un trabajo por ID, validando que el usuario sea participante.
   */
  async getTrabajoById(trabajoId: string, userId: string, userRol: Rol) {
    const trabajo = await this._getTrabajoAndValidateOwner(trabajoId, userId, userRol, true) // Pass true to include pago
    return trabajo
  }

  /**
   * Lista todos los trabajos para el panel de administración con filtros y paginación.
   */
  async getAdminTrabajos(filters: { estado?: EstadoTrabajo; tecnicoId?: string; clienteId?: string; page?: number; limit?: number }) {
    const page = filters.page ? Number(filters.page) : 1;
    const limit = filters.limit ? Number(filters.limit) : 10;
    const { estado, tecnicoId, clienteId } = filters
    const skip = (page - 1) * limit

    const where: Prisma.TrabajoWhereInput = {
      ...(estado && { estado }),
      ...(tecnicoId && { tecnicoId }),
      ...(clienteId && { clienteId }),
    }

    const [trabajos, total] = await Promise.all([
      prisma.trabajo.findMany({
        where,
        include: {
          cliente: { include: { user: { select: { nombre: true, avatarUrl: true } } } },
          tecnico: { include: { user: { select: { nombre: true, avatarUrl: true } } } },
          calificacion: { select: { id: true, puntuacion: true } },
        },
        orderBy: { fechaSolicitud: 'desc' },
        skip,
        take: limit,
      }),
      prisma.trabajo.count({ where }),
    ])

    return {
      data: trabajos,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }
  }

  // =================================================================
  // ACCIONES DEL TÉCNICO
  // =================================================================

  /**
   * Técnico solicita una visita de evaluación.
   * PENDIENTE -> NECESITA_VISITA
   */
  async solicitarVisita(trabajoId: string, tecnicoUserId: string) {
    const trabajo = await this._getTrabajoAndValidateOwner(trabajoId, tecnicoUserId, Rol.TECNICO)

    if (trabajo.estado !== 'PENDIENTE') {
      throw ApiError.badRequest(`No se puede solicitar visita para un trabajo en estado ${trabajo.estado}`)
    }

    return this._updateEstado(
      trabajo,
      'NECESITA_VISITA',
      trabajo.cliente.userId,
      'Visita requerida',
      `${trabajo.tecnico.user.nombre} necesita una visita para cotizar tu trabajo.`,
      TipoNotificacion.SISTEMA
    )
  }

  /**
   * Técnico propone una cotización.
   * PENDIENTE o NECESITA_VISITA -> COTIZADO
   */
  async proponerCotizacion(trabajoId: string, tecnicoUserId: string, data: ProponerCotizacionInput) {
    const trabajo = await this._getTrabajoAndValidateOwner(trabajoId, tecnicoUserId, Rol.TECNICO)

    if (!['PENDIENTE', 'NECESITA_VISITA'].includes(trabajo.estado)) {
      throw ApiError.badRequest(`No se puede cotizar un trabajo en estado ${trabajo.estado}`)
    }

    return this._updateEstado(
      trabajo,
      'COTIZADO',
      trabajo.cliente.userId,
      'Tienes una nueva cotización',
      `${trabajo.tecnico.user.nombre} ha cotizado tu trabajo en S/ ${data.precio.toFixed(2)}.`,
      TipoNotificacion.SISTEMA,
      { precio: data.precio }
    )
  }

  /**
   * Técnico rechaza una nueva solicitud.
   * PENDIENTE -> RECHAZADO
   */
  async rechazarSolicitud(trabajoId: string, tecnicoUserId: string) {
    const trabajo = await this._getTrabajoAndValidateOwner(trabajoId, tecnicoUserId, Rol.TECNICO)

    if (trabajo.estado !== 'PENDIENTE') {
      throw ApiError.badRequest(`No se puede rechazar un trabajo en estado ${trabajo.estado}`)
    }

    return this._updateEstado(
      trabajo,
      'RECHAZADO',
      trabajo.cliente.userId,
      'Solicitud rechazada',
      `${trabajo.tecnico.user.nombre} no está disponible para tu solicitud.`,
      TipoNotificacion.SISTEMA
    )
  }

  /**
   * Técnico inicia un trabajo aceptado.
   * ACEPTADO -> EN_PROGRESO
   */
  async iniciarTrabajo(trabajoId: string, tecnicoUserId: string) {
    const trabajo = await this._getTrabajoAndValidateOwner(trabajoId, tecnicoUserId, Rol.TECNICO)

    if (trabajo.estado !== 'ACEPTADO') {
      throw ApiError.badRequest(`No se puede iniciar un trabajo en estado ${trabajo.estado}`)
    }

    return this._updateEstado(
      trabajo,
      'EN_PROGRESO',
      trabajo.cliente.userId,
      'Trabajo en progreso',
      `${trabajo.tecnico.user.nombre} ha comenzado a trabajar en tu solicitud.`,
      TipoNotificacion.SISTEMA
    )
  }

  /**
   * Técnico completa un trabajo.
   * EN_PROGRESO -> COMPLETADO
   */
  async completarTrabajo(trabajoId: string, tecnicoUserId: string) {
    const trabajo = await this._getTrabajoAndValidateOwner(trabajoId, tecnicoUserId, Rol.TECNICO)

    if (trabajo.estado !== 'EN_PROGRESO') {
      throw ApiError.badRequest(`No se puede completar un trabajo en estado ${trabajo.estado}`)
    }

    const updated = await prisma.$transaction(async (tx) => {
      const trabajoActualizado = await this._updateEstado(
        trabajo,
        'COMPLETADO',
        trabajo.cliente.userId,
        '¡Trabajo completado!',
        `${trabajo.tecnico.user.nombre} ha finalizado el trabajo. ¡No olvides calificarlo!`,
        TipoNotificacion.SISTEMA,
        { fechaCompletado: new Date() },
        tx
      )

      await tx.tecnico.update({
        where: { id: trabajo.tecnicoId },
        data: { trabajosCompletados: { increment: 1 } },
      })

      return trabajoActualizado
    })

    return updated
  }

  // =================================================================
  // ACCIONES DEL CLIENTE
  // =================================================================

  /**
   * Cliente acepta una cotización.
   * COTIZADO -> ACEPTADO
   */
  async aceptarCotizacion(trabajoId: string, clienteUserId: string) {
    const trabajo = await this._getTrabajoAndValidateOwner(trabajoId, clienteUserId, Rol.CLIENTE)

    if (trabajo.estado !== 'COTIZADO') {
      throw ApiError.badRequest(`No se puede aceptar una cotización para un trabajo en estado ${trabajo.estado}`)
    }

    return this._updateEstado(
      trabajo,
      'ACEPTADO',
      trabajo.tecnico.userId,
      '¡Cotización aceptada!',
      `${trabajo.cliente.user.nombre} ha aceptado tu cotización de S/ ${trabajo.precio?.toFixed(2)}.`,
      TipoNotificacion.PAGO
    )
  }

  /**
   * Cliente rechaza una cotización.
   * COTIZADO -> RECHAZADO
   */
  async rechazarCotizacion(trabajoId: string, clienteUserId: string) {
    const trabajo = await this._getTrabajoAndValidateOwner(trabajoId, clienteUserId, Rol.CLIENTE)

    if (trabajo.estado !== 'COTIZADO') {
      throw ApiError.badRequest(`No se puede rechazar una cotización para un trabajo en estado ${trabajo.estado}`)
    }

    return this._updateEstado(
      trabajo,
      'RECHAZADO',
      trabajo.tecnico.userId,
      'Cotización rechazada',
      `${trabajo.cliente.user.nombre} ha rechazado tu cotización.`,
      TipoNotificacion.SISTEMA
    )
  }

  /**
   * Cliente o Técnico cancelan un trabajo en curso.
   * ACEPTADO o EN_PROGRESO -> CANCELADO
   */
  async cancelarTrabajo(trabajoId: string, userId: string, userRol: Rol) {
    const trabajo = await this._getTrabajoAndValidateOwner(trabajoId, userId, userRol)

    if (!['ACEPTADO', 'EN_PROGRESO'].includes(trabajo.estado)) {
      throw ApiError.badRequest(`No se puede cancelar un trabajo en estado ${trabajo.estado}`)
    }

    const recipientUserId = userRol === Rol.CLIENTE ? trabajo.tecnico.userId : trabajo.cliente.userId
    const senderName = userRol === Rol.CLIENTE ? trabajo.cliente.user.nombre : trabajo.tecnico.user.nombre

    return this._updateEstado(
      trabajo,
      'CANCELADO',
      recipientUserId,
      'Trabajo cancelado',
      `${senderName} ha cancelado el trabajo: ${trabajo.servicioNombre}.`,
      TipoNotificacion.SISTEMA
    )
  }

  // =================================================================
  // MÉTODOS PRIVADOS
  // =================================================================

  /**
   * Método privado para obtener un trabajo y validar la propiedad.
   */
  private async _getTrabajoAndValidateOwner(trabajoId: string, userId: string, userRol: Rol, includePago: boolean = false) {
    const trabajo = await prisma.trabajo.findUnique({
      where: { id: trabajoId },
      include: {
        cliente: { include: { user: true } },
        tecnico: { include: { user: true } },
        ...(includePago && { pago: true }),
      },
    })

    if (!trabajo) {
      throw ApiError.notFound('Trabajo no encontrado')
    }

    const isOwner =
      (userRol === Rol.CLIENTE && trabajo.cliente.userId === userId) ||
      (userRol === Rol.TECNICO && trabajo.tecnico.userId === userId)

    if (!isOwner && userRol !== Rol.ADMIN) {
      throw ApiError.forbidden('No tienes acceso a este trabajo')
    }

    return trabajo
  }

  /**
   * Método privado para actualizar estado, datos y enviar notificación.
   */
  private async _updateEstado(
    trabajo: any,
    nuevoEstado: EstadoTrabajo,
    notificacionUserId: string,
    notificacionTitulo: string,
    notificacionMensaje: string,
    notificacionTipo: TipoNotificacion,
    extraData: Prisma.TrabajoUpdateInput = {},
    tx?: Prisma.TransactionClient
  ) {
    const prismaClient = tx || prisma;

    const trabajoActualizado = await prismaClient.trabajo.update({
      where: { id: trabajo.id },
      data: {
        estado: nuevoEstado,
        ...extraData,
      },
    });

    const notificacion = await prismaClient.notificacion.create({
      data: {
        userId: notificacionUserId,
        tipo: notificacionTipo,
        titulo: notificacionTitulo,
        mensaje: notificacionMensaje,
        metadata: {
          trabajoId: trabajo.id,
          nuevoEstado,
        },
      },
    });

    // Enviar notificación por WebSocket
    sendEventToUser(notificacion.userId, 'new_notification', notificacion);

    // Emitir evento de actualización de estado del trabajo a ambos usuarios
    sendEventToUser(trabajo.cliente.userId, 'trabajo:estado_actualizado', trabajoActualizado);
    sendEventToUser(trabajo.tecnico.userId, 'trabajo:estado_actualizado', trabajoActualizado);

    return trabajoActualizado
  }
}

export const trabajoService = new TrabajoService()