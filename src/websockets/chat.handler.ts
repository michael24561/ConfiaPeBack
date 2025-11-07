import { Server, Socket } from 'socket.io';
import { chatService } from '../services/chat.service';
import { logger } from '../config/logger';

// Mapa de usuarios conectados (userId -> socketId)
const connectedUsers = new Map<string, string>();

export const chatHandler = (io: Server, socket: Socket) => {
  const userId = socket.data.user.id;
  const userRol = socket.data.user.rol;

  logger.info(`Usuario ${userId} conectado al chat`);

  // Registrar usuario conectado
  connectedUsers.set(userId, socket.id);

  // Notificar a otros usuarios que este usuario está online
  socket.broadcast.emit('user_online', { userId });

  /**
   * Unirse a una sala de chat
   */
  socket.on('join_chat', async ({ chatId }: { chatId: string }) => {
    try {
      // Verificar que el usuario es participante del chat
      await chatService.getConversation(chatId, userId, userRol);

      // Unirse a la sala
      socket.join(`chat:${chatId}`);
      logger.info(`Usuario ${userId} se unió al chat ${chatId}`);
    } catch (error) {
      logger.error('Error al unirse al chat:', error);
      socket.emit('error', { message: 'No autorizado para unirse a este chat' });
    }
  });

  /**
   * Enviar mensaje en tiempo real
   */
  socket.on('send_message', async ({ chatId, texto }: { chatId: string; texto: string }) => {
    try {
      // Validar texto
      if (!texto || texto.trim().length === 0) {
        socket.emit('error', { message: 'El mensaje no puede estar vacío' });
        return;
      }

      if (texto.length > 2000) {
        socket.emit('error', { message: 'El mensaje no puede exceder 2000 caracteres' });
        return;
      }

      // Crear mensaje usando el servicio
      const message = await chatService.sendMessage({ chatId, texto }, userId, userRol);

      // Emitir mensaje a todos los participantes de la sala
      io.to(`chat:${chatId}`).emit('message_received', {
        chatId,
        message: {
          id: message.id,
          remitenteId: message.remitenteId,
          texto: message.texto,
          timestamp: message.timestamp,
          remitente: message.remitente,
        },
      });

      logger.info(`Mensaje enviado en chat ${chatId} por usuario ${userId}`);
    } catch (error) {
      logger.error('Error al enviar mensaje:', error);
      socket.emit('error', { message: 'Error al enviar mensaje' });
    }
  });

  /**
   * Indicador de escritura
   */
  socket.on('typing', ({ chatId }: { chatId: string }) => {
    // Emitir a todos en la sala excepto al emisor
    socket.to(`chat:${chatId}`).emit('typing_indicator', {
      chatId,
      userId,
    });
  });

  /**
   * Marcar mensajes como leídos
   */
  socket.on('read_messages', async ({ chatId, messageIds }: { chatId: string; messageIds: string[] }) => {
    try {
      // Validar que el usuario es participante
      await chatService.getConversation(chatId, userId, userRol);

      // Marcar mensajes como leídos
      await chatService.markMessagesAsRead(messageIds, userId);

      // Notificar a la sala que los mensajes fueron leídos
      socket.to(`chat:${chatId}`).emit('messages_read', {
        chatId,
        messageIds,
        readBy: userId,
      });

      logger.info(`Usuario ${userId} marcó ${messageIds.length} mensajes como leídos en chat ${chatId}`);
    } catch (error) {
      logger.error('Error al marcar mensajes como leídos:', error);
      socket.emit('error', { message: 'Error al marcar mensajes como leídos' });
    }
  });

  /**
   * Salir de una sala de chat
   */
  socket.on('leave_chat', ({ chatId }: { chatId: string }) => {
    socket.leave(`chat:${chatId}`);
    logger.info(`Usuario ${userId} salió del chat ${chatId}`);
  });

  /**
   * Desconexión
   */
  socket.on('disconnect', () => {
    // Eliminar de usuarios conectados
    connectedUsers.delete(userId);

    // Notificar a otros usuarios que este usuario está offline
    socket.broadcast.emit('user_offline', { userId });

    logger.info(`Usuario ${userId} desconectado del chat`);
  });
};

/**
 * Verifica si un usuario está online
 */
export const isUserOnline = (userId: string): boolean => {
  return connectedUsers.has(userId);
};

/**
 * Obtiene el socket ID de un usuario
 */
export const getUserSocketId = (userId: string): string | undefined => {
  return connectedUsers.get(userId);
};
