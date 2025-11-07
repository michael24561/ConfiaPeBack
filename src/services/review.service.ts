import { Prisma, TipoNotificacion, EstadoTrabajo } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import {
  CreateReviewInput,
  RespondReviewInput,
  GetReviewsInput,
} from '../validators/review.validator';

export class ReviewService {
  /**
   * Crea una review (solo cliente que completó el trabajo)
   */
  async createReview(userId: string, data: CreateReviewInput) {
    const { trabajoId, calificacion, comentario } = data;

    // Verificar que el trabajo existe
    const trabajo = await prisma.trabajo.findUnique({
      where: { id: trabajoId },
      include: {
        cliente: true,
        tecnico: { include: { user: true } },
        review: true,
      },
    });

    if (!trabajo) {
      throw ApiError.notFound('Trabajo no encontrado');
    }

    // Verificar que el usuario es el cliente del trabajo
    if (trabajo.cliente?.userId !== userId) {
      throw ApiError.forbidden('No puedes calificar este trabajo');
    }

    // Verificar que el trabajo está COMPLETADO
    if (trabajo.estado !== EstadoTrabajo.COMPLETADO) {
      throw ApiError.badRequest('Solo se pueden calificar trabajos completados');
    }

    // Verificar que no existe una review previa
    if (trabajo.review) {
      throw ApiError.conflict('Ya existe una calificación para este trabajo');
    }

    // Crear review y recalcular promedio del técnico
    const review = await prisma.$transaction(async (tx) => {
      const nuevaReview = await tx.review.create({
        data: {
          trabajoId,
          clienteId: trabajo.cliente.id,
          tecnicoId: trabajo.tecnico.id,
          calificacion,
          comentario,
        },
        include: {
          cliente: {
            include: { user: true },
          },
          trabajo: {
            select: {
              servicioNombre: true,
              precio: true,
            },
          },
        },
      });

      // Recalcular calificación promedio del técnico
      const reviews = await tx.review.findMany({
        where: { tecnicoId: trabajo.tecnico.id },
        select: { calificacion: true },
      });

      const promedio = reviews.reduce((sum, r) => sum + r.calificacion, 0) / reviews.length;

      await tx.tecnico.update({
        where: { id: trabajo.tecnico.id },
        data: { calificacionPromedio: promedio },
      });

      // Notificar al técnico
      await tx.notificacion.create({
        data: {
          userId: trabajo.tecnico.userId,
          tipo: TipoNotificacion.CALIFICACION,
          titulo: 'Nueva calificación recibida',
          mensaje: `${nuevaReview.cliente.user.nombre} te calificó con ${calificacion} estrellas`,
          metadata: {
            reviewId: nuevaReview.id,
            calificacion,
            trabajoId,
          },
        },
      });

      return nuevaReview;
    });

    return review;
  }

  /**
   * Responde a una review (técnico)
   */
  async respondToReview(reviewId: string, userId: string, data: RespondReviewInput) {
    const { respuesta } = data;

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        tecnico: true,
        cliente: { include: { user: true } },
      },
    });

    if (!review) {
      throw ApiError.notFound('Calificación no encontrada');
    }

    // Verificar que es el técnico de la review
    if (review.tecnico.userId !== userId) {
      throw ApiError.forbidden('No puedes responder esta calificación');
    }

    // Verificar que no tiene respuesta previa
    if (review.respuesta) {
      throw ApiError.conflict('Ya respondiste a esta calificación');
    }

    // Actualizar review y notificar cliente
    const updated = await prisma.$transaction(async (tx) => {
      const reviewActualizada = await tx.review.update({
        where: { id: reviewId },
        data: { respuesta },
        include: {
          tecnico: { include: { user: true } },
          cliente: { include: { user: true } },
          trabajo: true,
        },
      });

      // Notificar al cliente
      await tx.notificacion.create({
        data: {
          userId: review.cliente.userId,
          tipo: TipoNotificacion.CALIFICACION,
          titulo: 'Respuesta a tu calificación',
          mensaje: `${reviewActualizada.tecnico.user.nombre} respondió a tu calificación`,
          metadata: {
            reviewId: review.id,
            trabajoId: review.trabajoId,
          },
        },
      });

      return reviewActualizada;
    });

    return updated;
  }

  /**
   * Lista reviews de un técnico (público)
   */
  async getReviewsByTecnico(tecnicoId: string, filters: GetReviewsInput) {
    const { calificacion, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {
      tecnicoId,
      ...(calificacion && { calificacion }),
    };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          cliente: {
            include: {
              user: {
                select: {
                  nombre: true,
                  avatarUrl: true,
                },
              },
            },
          },
          trabajo: {
            select: {
              servicioNombre: true,
              precio: true,
            },
          },
        },
        orderBy: {
          fechaCreacion: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);

    return {
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtiene una review por ID
   */
  async getReviewById(reviewId: string) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        cliente: {
          include: {
            user: {
              select: {
                nombre: true,
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
                avatarUrl: true,
              },
            },
          },
        },
        trabajo: {
          select: {
            servicioNombre: true,
            descripcion: true,
            precio: true,
            fechaSolicitud: true,
            fechaCompletado: true,
          },
        },
      },
    });

    if (!review) {
      throw ApiError.notFound('Calificación no encontrada');
    }

    return review;
  }

  /**
   * Elimina una review (solo cliente, solo si no tiene respuesta)
   */
  async deleteReview(reviewId: string, userId: string) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        cliente: true,
        tecnico: true,
      },
    });

    if (!review) {
      throw ApiError.notFound('Calificación no encontrada');
    }

    if (review.cliente.userId !== userId) {
      throw ApiError.forbidden('No puedes eliminar esta calificación');
    }

    if (review.respuesta) {
      throw ApiError.badRequest('No se pueden eliminar calificaciones que ya tienen respuesta');
    }

    // Eliminar y recalcular promedio
    await prisma.$transaction(async (tx) => {
      await tx.review.delete({
        where: { id: reviewId },
      });

      // Recalcular promedio
      const reviews = await tx.review.findMany({
        where: { tecnicoId: review.tecnicoId },
        select: { calificacion: true },
      });

      const promedio = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.calificacion, 0) / reviews.length
        : 0;

      await tx.tecnico.update({
        where: { id: review.tecnicoId },
        data: { calificacionPromedio: promedio },
      });
    });

    return { message: 'Calificación eliminada correctamente' };
  }

  /**
   * Obtiene estadísticas de reviews de un técnico
   */
  async getReviewStats(tecnicoId: string) {
    const reviews = await prisma.review.findMany({
      where: { tecnicoId },
      select: { calificacion: true },
    });

    const total = reviews.length;
    if (total === 0) {
      return {
        promedio: 0,
        total: 0,
        distribucion: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        porcentajePositivos: 0,
      };
    }

    const distribucion = reviews.reduce(
      (acc, review) => {
        const cal = review.calificacion;
        if (cal >= 1 && cal <= 5 && acc[cal] !== undefined) {
          acc[cal]++;
        }
        return acc;
      },
      { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>
    );

    const promedio = reviews.reduce((sum, r) => sum + r.calificacion, 0) / total;
    const positivos = (distribucion[4] || 0) + (distribucion[5] || 0);
    const porcentajePositivos = (positivos / total) * 100;

    return {
      promedio: Math.round(promedio * 10) / 10,
      total,
      distribucion,
      porcentajePositivos: Math.round(porcentajePositivos),
    };
  }
}

export const reviewService = new ReviewService();
