import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';

export class NotificacionService {
  async getNotificaciones(userId: string) {
    const notificaciones = await prisma.notificacion.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 100, // Limitar a las últimas 100 notificaciones
    });
    return notificaciones;
  }

  async marcarComoLeida(notificationId: string, userId: string) {
    const notificacion = await prisma.notificacion.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notificacion) {
      throw new ApiError(404, 'Notificación no encontrada o no pertenece al usuario.');
    }

    if (notificacion.leida) {
      return notificacion; // Ya está leída, no hacer nada
    }

    return prisma.notificacion.update({
      where: { id: notificationId },
      data: { leida: true },
    });
  }

  async marcarTodasComoLeidas(userId: string) {
    await prisma.notificacion.updateMany({
      where: {
        userId,
        leida: false,
      },
      data: {
        leida: true,
      },
    });
    return { message: 'Todas las notificaciones han sido marcadas como leídas.' };
  }
}

export const notificacionService = new NotificacionService();
