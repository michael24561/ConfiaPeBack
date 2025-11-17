import { EstadoTrabajo } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { sendEventToUser } from '../websockets/notification.emitter';

export class AdminTrabajoService {
  /**
   * Permite a un administrador cambiar el estado de cualquier trabajo.
   * No tiene las mismas restricciones de flujo que las acciones de cliente/técnico.
   */
  async adminUpdateTrabajoEstado(trabajoId: string, nuevoEstado: EstadoTrabajo) {
    const trabajo = await prisma.trabajo.findUnique({
      where: { id: trabajoId },
      include: {
        cliente: { include: { user: true } },
        tecnico: { include: { user: true } },
      },
    });

    if (!trabajo) {
      throw new ApiError(404, 'Trabajo no encontrado');
    }

    const trabajoActualizado = await prisma.trabajo.update({
      where: { id: trabajoId },
      data: { estado: nuevoEstado },
    });

    // Notificar tanto al cliente como al técnico
    const mensaje = `Un administrador ha actualizado el estado de tu trabajo "${trabajo.servicioNombre}" a: ${nuevoEstado}.`;
    
    const notificacionCliente = await prisma.notificacion.create({
      data: {
        userId: trabajo.cliente.userId,
        tipo: 'SISTEMA',
        titulo: 'Actualización de Administrador',
        mensaje,
        metadata: { trabajoId },
      },
    });
    sendEventToUser(trabajo.cliente.userId, 'new_notification', notificacionCliente);

    const notificacionTecnico = await prisma.notificacion.create({
      data: {
        userId: trabajo.tecnico.userId,
        tipo: 'SISTEMA',
        titulo: 'Actualización de Administrador',
        mensaje,
        metadata: { trabajoId },
      },
    });
    sendEventToUser(trabajo.tecnico.userId, 'new_notification', notificacionTecnico);

    return trabajoActualizado;
  }
}

export const adminTrabajoService = new AdminTrabajoService();