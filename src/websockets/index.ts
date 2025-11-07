import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../config/jwt';
import { logger } from '../config/logger';
import { chatHandler } from './chat.handler';

/**
 * Inicializa los WebSocket handlers con autenticación JWT
 */
export const initializeWebSocket = (io: Server) => {
  // Middleware de autenticación para Socket.io
  io.use((socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Token no proporcionado'));
      }

      // Verificar JWT
      const decoded = verifyAccessToken(token);

      // Guardar datos del usuario en el socket
      socket.data.user = {
        id: decoded.id,
        email: decoded.email,
        rol: decoded.rol,
      };

      next();
    } catch (error) {
      logger.error('Error en autenticación WebSocket:', error);
      next(new Error('Token inválido o expirado'));
    }
  });

  // Manejar conexiones
  io.on('connection', (socket: Socket) => {
    logger.info(`Cliente conectado: ${socket.id} - Usuario: ${socket.data.user?.id}`);

    // Registrar handlers de chat
    chatHandler(io, socket);

    // Handler de desconexión general (adicional al específico de chat)
    socket.on('disconnect', (reason) => {
      logger.info(`Cliente desconectado: ${socket.id} - Razón: ${reason}`);
    });

    // Handler de errores
    socket.on('error', (error) => {
      logger.error(`Error en socket ${socket.id}:`, error);
    });
  });

  logger.info('WebSocket inicializado correctamente');
};
