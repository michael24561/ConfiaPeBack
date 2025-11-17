import { prisma } from '../config/database'
import { ApiError } from '../utils/ApiError'
import { z } from 'zod'
import { createCalificacionSchema } from '../validators/calificacion.validator'
import { TipoNotificacion } from '@prisma/client'
import { sendEventToUser } from '../websockets/notification.emitter'

type CreateCalificacionInput = z.infer<typeof createCalificacionSchema>['body']

export class CalificacionService {
  async crearCalificacion(userId: string, data: CreateCalificacionInput) {
    const { trabajoId, puntuacion, comentario, fotos = [], esPublico = true } = data

    const trabajo = await prisma.trabajo.findUnique({
      where: { id: trabajoId },
      include: {
        cliente: { include: { user: true } },
        tecnico: { include: { user: true } },
        calificacion: true,
      },
    })

    if (!trabajo) {
      throw new ApiError(404, 'El trabajo no fue encontrado.')
    }
    if (trabajo.cliente.userId !== userId) {
      throw new ApiError(403, 'No tienes permiso para calificar este trabajo.')
    }
    if (trabajo.estado !== 'COMPLETADO') {
      throw new ApiError(400, 'Solo se pueden calificar trabajos completados.')
    }
    if (trabajo.calificacion) {
      throw new ApiError(400, 'Este trabajo ya ha sido calificado.')
    }

    const calificacion = await prisma.$transaction(async (tx) => {
      const nuevaCalificacion = await tx.calificacion.create({
        data: {
          trabajoId,
          puntuacion,
          comentario,
          fotos: JSON.stringify(fotos),
          esPublico,
          userId,
        },
      })

      const notificacion = await tx.notificacion.create({
        data: {
          userId: trabajo.tecnico.userId,
          tipo: TipoNotificacion.CALIFICACION,
          titulo: '¡Has recibido una nueva calificación!',
          mensaje: `${trabajo.cliente.user.nombre} ha calificado tu trabajo "${trabajo.servicioNombre}" con ${puntuacion} estrellas.`,
          metadata: {
            trabajoId: trabajo.id,
            calificacionId: nuevaCalificacion.id,
          },
        },
      })
      
      sendEventToUser(notificacion.userId, 'new_notification', notificacion);

      return nuevaCalificacion
    })

    this.actualizarRatingTecnico(trabajo.tecnicoId).catch(err => {
      console.error(`Error asíncrono al actualizar el rating del técnico ${trabajo.tecnicoId}:`, err)
    })

    return calificacion
  }

  private async actualizarRatingTecnico(tecnicoId: string) {
    console.log(`Iniciando actualización de rating para el técnico: ${tecnicoId}`)

    const avgRating = await prisma.calificacion.aggregate({
      _avg: {
        puntuacion: true,
      },
      where: {
        trabajo: {
          tecnicoId: tecnicoId,
        },
      },
    })

    const nuevoPromedio = avgRating._avg.puntuacion || 0
    console.log(`El nuevo promedio de calificación calculado es: ${nuevoPromedio}`)

    await prisma.tecnico.update({
      where: { id: tecnicoId },
      data: { calificacionPromedio: nuevoPromedio },
    })

    console.log(`Rating del técnico ${tecnicoId} actualizado a ${nuevoPromedio}.`)
  }

  async obtenerCalificacionesPorTecnico(tecnicoId: string, filters: { page?: number, limit?: number, calificacion?: string }) {
    const { page = 1, limit = 10, calificacion } = filters;
    const skip = (page - 1) * limit

    const where: any = {
      trabajo: {
        tecnicoId: tecnicoId,
      },
      esPublico: true,
    };

    if (calificacion && calificacion !== 'todos') {
      if (calificacion === '2_1') {
        where.puntuacion = { lte: 2 };
      } else {
        const rating = parseInt(calificacion);
        if (!isNaN(rating)) {
          where.puntuacion = { equals: rating };
        }
      }
    }

    const [calificaciones, total] = await Promise.all([
      prisma.calificacion.findMany({
        where,
        include: {
          user: {
            select: { nombre: true, avatarUrl: true },
          },
        },
        orderBy: {
          fechaCreacion: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.calificacion.count({
        where,
      }),
    ])

    const data = calificaciones.map(c => ({
      ...c,
      fotos: JSON.parse(c.fotos as string || '[]'),
    }))

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  async getAdminCalificaciones(filters: { page?: number, limit?: number, tecnicoId?: string, clienteId?: string }) {
    const { page = 1, limit = 10, tecnicoId, clienteId } = filters;
    const skip = (page - 1) * limit;

    const where = {
      ...(tecnicoId && { trabajo: { tecnicoId } }),
      ...(clienteId && { trabajo: { clienteId } }),
    };

    const [calificaciones, total] = await Promise.all([
      prisma.calificacion.findMany({
        where,
        include: {
          user: { select: { id: true, nombre: true, email: true } },
          trabajo: {
            select: {
              id: true,
              tecnico: { select: { id: true, nombres: true, apellidos: true } },
            },
          },
        },
        orderBy: { fechaCreacion: 'desc' },
        skip,
        take: limit,
      }),
      prisma.calificacion.count({ where }),
    ]);

    const data = calificaciones.map(c => ({
      ...c,
      fotos: JSON.parse(c.fotos as string || '[]'),
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async deleteCalificacion(calificacionId: string) {
    const calificacion = await prisma.calificacion.findUnique({
      where: { id: calificacionId },
      include: {
        trabajo: {
          select: { tecnicoId: true },
        },
      },
    });

    if (!calificacion) {
      throw new ApiError(404, 'Calificación no encontrada.');
    }

    const { tecnicoId } = calificacion.trabajo;

    await prisma.calificacion.delete({
      where: { id: calificacionId },
    });

    this.actualizarRatingTecnico(tecnicoId).catch(err => {
      console.error(`Error asíncrono al actualizar el rating del técnico ${tecnicoId} tras borrado:`, err);
    });

    return { message: 'Calificación eliminada correctamente.' };
  }

  async updateOwnCalificacion(userId: string, calificacionId: string, data: { puntuacion?: number, comentario?: string, esPublico?: boolean, fotos?: string[] }) {
    const calificacion = await prisma.calificacion.findUnique({
      where: { id: calificacionId },
      include: { trabajo: true },
    });

    if (!calificacion) {
      throw new ApiError(404, 'Calificación no encontrada.');
    }

    if (calificacion.userId !== userId) {
      throw new ApiError(403, 'No tienes permiso para editar esta calificación.');
    }

    const { fotos, ...rest } = data;
    const dataForUpdate: { puntuacion?: number; comentario?: string; esPublico?: boolean; fotos?: string } = {
      ...rest,
    };

    if (fotos) {
      dataForUpdate.fotos = JSON.stringify(fotos);
    }

    const updatedCalificacion = await prisma.calificacion.update({
      where: { id: calificacionId },
      data: dataForUpdate,
    });

    this.actualizarRatingTecnico(calificacion.trabajo.tecnicoId).catch(err => {
      console.error(`Error asíncrono al actualizar el rating del técnico ${calificacion.trabajo.tecnicoId} tras actualización:`, err);
    });

    return updatedCalificacion;
  }

  async deleteOwnCalificacion(userId: string, calificacionId: string) {
    const calificacion = await prisma.calificacion.findUnique({
      where: { id: calificacionId },
      include: { trabajo: true },
    });

    if (!calificacion) {
      throw new ApiError(404, 'Calificación no encontrada.');
    }

    if (calificacion.userId !== userId) {
      throw new ApiError(403, 'No tienes permiso para eliminar esta calificación.');
    }

    await prisma.calificacion.delete({
      where: { id: calificacionId },
    });

    this.actualizarRatingTecnico(calificacion.trabajo.tecnicoId).catch(err => {
      console.error(`Error asíncrono al actualizar el rating del técnico ${calificacion.trabajo.tecnicoId} tras borrado:`, err);
    });

    return { message: 'Calificación eliminada correctamente.' };
  }
}

export const calificacionService = new CalificacionService()