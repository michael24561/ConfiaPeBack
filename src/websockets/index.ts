import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../config/jwt';
import { logger } from '../config/logger';
import { chatHandler } from './chat.handler';
import { notificacionHandler } from './notificacion.handler';

// --- User Connection Management ---
const connectedUsers = new Map<string, string>();

export const getUserSocketId = (userId: string): string | undefined => {
  return connectedUsers.get(userId);
};

export const isUserOnline = (userId: string): boolean => {
  return connectedUsers.has(userId);
};

const addUser = (userId: string, socketId: string) => {
  connectedUsers.set(userId, socketId);
  logger.info(`Usuario conectado: ${userId} en socket ${socketId}. Total: ${connectedUsers.size}`);
};

const removeUser = (userId: string) => {
  if (connectedUsers.has(userId)) {
    connectedUsers.delete(userId);
    logger.info(`Usuario desconectado: ${userId}. Total: ${connectedUsers.size}`);
  }
};
// ------------------------------------

/**
 * Inicializa los WebSocket handlers con autenticación JWT
 */
export const initializeWebSocket = (io: Server) => {
  io.use((socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Token no proporcionado'));
      
      const decoded = verifyAccessToken(token);
      socket.data.user = { id: decoded.id, email: decoded.email, rol: decoded.rol };
      next();
    } catch (error) {
      logger.error('Error en autenticación WebSocket:', error);
      next(new Error('Token inválido o expirado'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.user?.id;
    if (!userId) {
      logger.warn(`Conexión de socket ${socket.id} sin ID de usuario. Desconectando.`);
      socket.disconnect();
      return;
    }

    addUser(userId, socket.id);
    socket.broadcast.emit('user_online', { userId });

    // Registrar todos los handlers
    chatHandler(io, socket);
    notificacionHandler(io, socket);

    socket.on('disconnect', (reason) => {
      removeUser(userId);
      socket.broadcast.emit('user_offline', { userId });
      logger.info(`Socket ${socket.id} desconectado. Razón: ${reason}`);
    });

    socket.on('error', (error) => {
      logger.error(`Error en socket ${socket.id}:`, error);
    });
  });

  logger.info('WebSocket inicializado correctamente');
};
