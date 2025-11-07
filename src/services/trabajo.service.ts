import { Prisma, EstadoTrabajo, Rol, TipoNotificacion } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import {
  CreateTrabajoInput,
  GetTrabajosInput,
  UpdateEstadoTrabajoInput,
  UpdateTrabajoInput,
} from '../validators/trabajo.validator';

export class TrabajoService {
  /**
   * Crea un nuevo trabajo (solo clientes)
   */
  async createTrabajo(clienteId: string, data: CreateTrabajoInput) {
    const { tecnicoId, servicioNombre, descripcion, direccion, telefono, fechaProgramada } = data;

    // Verificar que el técnico existe y está disponible
    const tecnico = await prisma.tecnico.findUnique({
      where: { id: tecnicoId },
      include: { user: true },
    });

    if (!tecnico) {
      throw ApiError.notFound('Técnico no encontrado');
    }

    if (!tecnico.disponible) {
      throw ApiError.badRequest('El técnico no está disponible actualmente');
    }

    // Crear trabajo en transacción
    const trabajo = await prisma.$transaction(async (tx) => {
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
          cliente: {
            include: { user: true },
          },
          tecnico: {
            include: { user: true },
          },
        },
      });

      // Crear notificación para el técnico
      await tx.notificacion.create({
        data: {
          userId: tecnico.userId,
          tipo: TipoNotificacion.NUEVO_TRABAJO,
          titulo: 'Nueva solicitud de trabajo',
          mensaje: `${nuevoTrabajo.cliente.user.nombre} solicita: ${servicioNombre}`,
          metadata: {
            trabajoId: nuevoTrabajo.id,
            clienteNombre: nuevoTrabajo.cliente.user.nombre,
          },
        },
      });

      return nuevoTrabajo;
    });

    return trabajo;
  }

  /**
   * Lista trabajos según el rol del usuario
   */
  async getTrabajos(userId: string, userRol: Rol, filters: GetTrabajosInput) {
    const { estado, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    // Construir filtros WHERE según el rol
    const where: Prisma.TrabajoWhereInput = {
      ...(estado && { estado }),
      ...(userRol === Rol.CLIENTE && { cliente: { userId } }),
      ...(userRol === Rol.TECNICO && { tecnico: { userId } }),
    };

    const [trabajos, total] = await Promise.all([
      prisma.trabajo.findMany({
        where,
        include: {
          cliente: {
            include: {
              user: {
                select: {
                  nombre: true,
                  telefono: true,
                  avatarUrl: true,
                },
              },
            },
          },
          tecnico: {
            include: {
              user: {
                select: {
                  nombre: true,
                  telefono: true,
                  avatarUrl: true,
                },
              },
            },
          },
          review: {
            select: {
              id: true,
              calificacion: true,
              comentario: true,
            },
          },
        },
        orderBy: {
          fechaSolicitud: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.trabajo.count({ where }),
    ]);

    return {
      data: trabajos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtiene un trabajo por ID
   */
  async getTrabajoById(trabajoId: string, userId: string, userRol: Rol) {
    const trabajo = await prisma.trabajo.findUnique({
      where: { id: trabajoId },
      include: {
        cliente: {
          include: {
            user: {
              select: {
                nombre: true,
                email: true,
                telefono: true,
                avatarUrl: true,
              },
            },
          },
        },
        tecnico: {
          include: {
            user: {
              select: {
                nombre: true,
                email: true,
                telefono: true,
                avatarUrl: true,
              },
            },
          },
        },
        review: true,
      },
    });

    if (!trabajo) {
      throw ApiError.notFound('Trabajo no encontrado');
    }

    // Verificar que el usuario tiene acceso
    const isOwner =
      (userRol === Rol.CLIENTE && trabajo.cliente.userId === userId) ||
      (userRol === Rol.TECNICO && trabajo.tecnico.userId === userId);

    if (!isOwner && userRol !== Rol.ADMIN) {
      throw ApiError.forbidden('No tienes acceso a este trabajo');
    }

    return trabajo;
  }

  /**
   * Cambia el estado de un trabajo (técnico)
   */
  async updateEstado(trabajoId: string, userId: string, data: UpdateEstadoTrabajoInput) {
    const { estado, precio } = data;

    const trabajo = await prisma.trabajo.findUnique({
      where: { id: trabajoId },
      include: {
        tecnico: { include: { user: true } },
        cliente: { include: { user: true } },
      },
    });

    if (!trabajo) {
      throw ApiError.notFound('Trabajo no encontrado');
    }

    // Verificar que es el técnico del trabajo
    if (trabajo.tecnico.userId !== userId) {
      throw ApiError.forbidden('No tienes permiso para modificar este trabajo');
    }

    // Validar transición de estado
    const validTransitions: Record<EstadoTrabajo, EstadoTrabajo[]> = {
      PENDIENTE: [EstadoTrabajo.ACEPTADO, EstadoTrabajo.CANCELADO],
      ACEPTADO: [EstadoTrabajo.EN_PROGRESO, EstadoTrabajo.CANCELADO],
      EN_PROGRESO: [EstadoTrabajo.COMPLETADO, EstadoTrabajo.CANCELADO],
      COMPLETADO: [],
      CANCELADO: [],
    };

    if (!validTransitions[trabajo.estado].includes(estado as EstadoTrabajo)) {
      throw ApiError.badRequest(
        `No se puede cambiar de ${trabajo.estado} a ${estado}`
      );
    }

    // Actualizar trabajo y crear notificación
    const updated = await prisma.$transaction(async (tx) => {
      const trabajoActualizado = await tx.trabajo.update({
        where: { id: trabajoId },
        data: {
          estado: estado as EstadoTrabajo,
          ...(precio && { precio }),
          ...(estado === 'COMPLETADO' && { fechaCompletado: new Date() }),
        },
        include: {
          cliente: { include: { user: true } },
          tecnico: { include: { user: true } },
        },
      });

      // Incrementar contador si se completa
      if (estado === 'COMPLETADO') {
        await tx.tecnico.update({
          where: { id: trabajo.tecnico.id },
          data: { trabajosCompletados: { increment: 1 } },
        });
      }

      // Notificar al cliente
      const mensajes: Record<string, string> = {
        ACEPTADO: 'ha aceptado tu solicitud de trabajo',
        EN_PROGRESO: 'ha iniciado el trabajo',
        COMPLETADO: 'ha completado el trabajo',
        CANCELADO: 'ha cancelado el trabajo',
      };

      await tx.notificacion.create({
        data: {
          userId: trabajo.cliente.userId,
          tipo: TipoNotificacion.NUEVO_TRABAJO,
          titulo: `Estado del trabajo actualizado`,
          mensaje: `${trabajo.tecnico.user.nombre} ${mensajes[estado]} - ${trabajo.servicioNombre}`,
          metadata: {
            trabajoId: trabajo.id,
            nuevoEstado: estado,
          },
        },
      });

      return trabajoActualizado;
    });

    return updated;
  }

  /**
   * Actualiza información del trabajo (cliente, solo si PENDIENTE)
   */
  async updateTrabajo(trabajoId: string, userId: string, data: UpdateTrabajoInput) {
    const trabajo = await prisma.trabajo.findUnique({
      where: { id: trabajoId },
      include: { cliente: true },
    });

    if (!trabajo) {
      throw ApiError.notFound('Trabajo no encontrado');
    }

    // Verificar que es el cliente del trabajo
    if (trabajo.cliente.userId !== userId) {
      throw ApiError.forbidden('No tienes permiso para modificar este trabajo');
    }

    // Solo permitir editar si está PENDIENTE
    if (trabajo.estado !== EstadoTrabajo.PENDIENTE) {
      throw ApiError.badRequest('Solo se pueden editar trabajos en estado PENDIENTE');
    }

    const updated = await prisma.trabajo.update({
      where: { id: trabajoId },
      data: {
        ...(data.servicioNombre && { servicioNombre: data.servicioNombre }),
        ...(data.descripcion && { descripcion: data.descripcion }),
        ...(data.direccion && { direccion: data.direccion }),
        ...(data.telefono && { telefono: data.telefono }),
        ...(data.fechaProgramada && { fechaProgramada: new Date(data.fechaProgramada) }),
        ...(data.precio && { precio: data.precio }),
      },
      include: {
        cliente: { include: { user: true } },
        tecnico: { include: { user: true } },
      },
    });

    return updated;
  }

  /**
   * Cancela un trabajo
   */
  async cancelTrabajo(trabajoId: string, userId: string, userRol: Rol) {
    const trabajo = await prisma.trabajo.findUnique({
      where: { id: trabajoId },
      include: {
        cliente: { include: { user: true } },
        tecnico: { include: { user: true } },
      },
    });

    if (!trabajo) {
      throw ApiError.notFound('Trabajo no encontrado');
    }

    // Verificar permiso
    const isOwner =
      (userRol === Rol.CLIENTE && trabajo.cliente.userId === userId) ||
      (userRol === Rol.TECNICO && trabajo.tecnico.userId === userId);

    if (!isOwner) {
      throw ApiError.forbidden('No tienes permiso para cancelar este trabajo');
    }

    // No permitir cancelar si ya está COMPLETADO
    if (trabajo.estado === EstadoTrabajo.COMPLETADO) {
      throw ApiError.badRequest('No se puede cancelar un trabajo completado');
    }

    if (trabajo.estado === EstadoTrabajo.CANCELADO) {
      throw ApiError.badRequest('El trabajo ya está cancelado');
    }

    // Actualizar y notificar
    const updated = await prisma.$transaction(async (tx) => {
      const trabajoActualizado = await tx.trabajo.update({
        where: { id: trabajoId },
        data: { estado: EstadoTrabajo.CANCELADO },
        include: {
          cliente: { include: { user: true } },
          tecnico: { include: { user: true } },
        },
      });

      // Notificar a la otra parte
      const recipientUserId =
        userRol === Rol.CLIENTE ? trabajo.tecnico.userId : trabajo.cliente.userId;
      const senderName =
        userRol === Rol.CLIENTE ? trabajo.cliente.user.nombre : trabajo.tecnico.user.nombre;

      await tx.notificacion.create({
        data: {
          userId: recipientUserId,
          tipo: TipoNotificacion.NUEVO_TRABAJO,
          titulo: 'Trabajo cancelado',
          mensaje: `${senderName} ha cancelado el trabajo: ${trabajo.servicioNombre}`,
          metadata: {
            trabajoId: trabajo.id,
            estado: 'CANCELADO',
          },
        },
      });

      return trabajoActualizado;
    });

    return updated;
  }

  /**
   * Elimina un trabajo (solo cliente, solo si PENDIENTE)
   */
  async deleteTrabajo(trabajoId: string, userId: string) {
    const trabajo = await prisma.trabajo.findUnique({
      where: { id: trabajoId },
      include: { cliente: true },
    });

    if (!trabajo) {
      throw ApiError.notFound('Trabajo no encontrado');
    }

    if (trabajo.cliente.userId !== userId) {
      throw ApiError.forbidden('No tienes permiso para eliminar este trabajo');
    }

    if (trabajo.estado !== EstadoTrabajo.PENDIENTE) {
      throw ApiError.badRequest('Solo se pueden eliminar trabajos en estado PENDIENTE');
    }

    await prisma.trabajo.delete({
      where: { id: trabajoId },
    });

    return { message: 'Trabajo eliminado correctamente' };
  }
}

export const trabajoService = new TrabajoService();
