import { getSocketServerInstance } from './socket';
import { getUserSocketId } from './index';
import { logger } from '../config/logger';

export const sendEventToUser = (userId: string, event: string, data: any) => {
  const io = getSocketServerInstance();
  const socketId = getUserSocketId(userId);

  if (socketId) {
    logger.info(`Enviando evento '${event}' al usuario ${userId} en el socket ${socketId}`);
    io.to(socketId).emit(event, data);
  } else {
    logger.warn(`Usuario ${userId} no está conectado. No se puede enviar el evento '${event}' en tiempo real.`);
  }
};
