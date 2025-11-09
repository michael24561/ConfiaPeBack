import { Server, Socket } from 'socket.io';
import { logger } from '../config/logger';
import { getUserSocketId } from './index'; // We will move getUserSocketId here

export const notificacionHandler = (io: Server, socket: Socket) => {
  const userId = socket.data.user.id;

  /**
   * Listen for a new job request created by a client.
   */
  socket.on('cliente:solicitud_creada', (data) => {
    try {
      const { tecnicoUserId, trabajo } = data;
      if (!tecnicoUserId || !trabajo) {
        logger.warn(`[Socket] Evento 'cliente:solicitud_creada' recibido con datos incompletos del usuario ${userId}`);
        return;
      }

      logger.info(`[Socket] Notificación de nuevo trabajo para técnico ${tecnicoUserId} de parte de ${userId}`);

      // Find the technician's socket
      const tecnicoSocketId = getUserSocketId(tecnicoUserId);

      if (tecnicoSocketId) {
        // Send a notification to the specific technician
        io.to(tecnicoSocketId).emit('tecnico:nueva_solicitud', {
          trabajo,
          mensaje: `Has recibido una nueva solicitud de trabajo de ${trabajo.cliente.user.nombre}.`
        });
        logger.info(`[Socket] Notificación enviada a técnico ${tecnicoUserId} en socket ${tecnicoSocketId}`);
      } else {
        logger.info(`[Socket] Técnico ${tecnicoUserId} no está conectado. La notificación se manejará a través de la base de datos.`);
        // The database notification is already created in the service, so no extra action is needed here.
      }
    } catch (error) {
      logger.error(`[Socket] Error en handler 'cliente:solicitud_creada':`, error);
    }
  });
};
