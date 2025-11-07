import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { Rol } from '@prisma/client';
import { CreateConversationInput, SendMessageInput } from '../validators/chat.validator';

export class ChatService {
  /**
   * Crea o retorna conversación existente entre cliente y técnico
   */
  async createOrGetConversation(userId: string, userRol: Rol, data: CreateConversationInput) {
    const { tecnicoId } = data;

    // Obtener clienteId del usuario
    const cliente = await this.getUserProfile(userId, userRol);

    // Verificar que el técnico existe
    const tecnico = await prisma.tecnico.findUnique({
      where: { id: tecnicoId },
      select: { id: true, userId: true },
    });

    if (!tecnico) {
      throw ApiError.notFound('Técnico no encontrado');
    }

    // Buscar conversación existente
    let chat = await prisma.chat.findUnique({
      where: {
        clienteId_tecnicoId: {
          clienteId: cliente.id,
          tecnicoId,
        },
      },
      include: {
        cliente: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                nombre: true,
                avatarUrl: true,
              },
            },
          },
        },
        tecnico: {
          select: {
            id: true,
            oficio: true,
            user: {
              select: {
                id: true,
                nombre: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    // Si no existe, crear nueva conversación
    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          clienteId: cliente.id,
          tecnicoId,
        },
        include: {
          cliente: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  nombre: true,
                  avatarUrl: true,
                },
              },
            },
          },
          tecnico: {
            select: {
              id: true,
              oficio: true,
              user: {
                select: {
                  id: true,
                  nombre: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });
    }

    return chat;
  }

  /**
   * Lista todas las conversaciones del usuario (cliente o técnico)
   */
  async getConversations(userId: string, userRol: Rol) {
    // Obtener el perfil (clienteId o tecnicoId) según el rol
    const profile = await this.getUserProfile(userId, userRol);

    const where = userRol === Rol.CLIENTE
      ? { clienteId: profile.id }
      : { tecnicoId: profile.id };

    const chats = await prisma.chat.findMany({
      where,
      include: {
        cliente: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                nombre: true,
                avatarUrl: true,
              },
            },
          },
        },
        tecnico: {
          select: {
            id: true,
            oficio: true,
            user: {
              select: {
                id: true,
                nombre: true,
                avatarUrl: true,
              },
            },
          },
        },
        mensajes: {
          where: {
            leido: false,
            NOT: {
              remitenteId: userId, // No contar mensajes propios
            },
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        ultimoMensajeTimestamp: 'desc',
      },
    });

    // Formatear respuesta con contador de no leídos
    return chats.map((chat) => ({
      id: chat.id,
      tecnico: {
        id: chat.tecnico.id,
        nombre: chat.tecnico.user.nombre,
        oficio: chat.tecnico.oficio,
        avatarUrl: chat.tecnico.user.avatarUrl,
      },
      cliente: {
        id: chat.cliente.id,
        nombre: chat.cliente.user.nombre,
        avatarUrl: chat.cliente.user.avatarUrl,
      },
      ultimoMensaje: chat.ultimoMensaje,
      ultimoMensajeTimestamp: chat.ultimoMensajeTimestamp,
      noLeidos: chat.mensajes.length,
      // online se manejará vía WebSocket
    }));
  }

  /**
   * Obtiene una conversación específica con validación de participante
   */
  async getConversation(chatId: string, userId: string, userRol: Rol) {
    const profile = await this.getUserProfile(userId, userRol);

    const where = userRol === Rol.CLIENTE
      ? { id: chatId, clienteId: profile.id }
      : { id: chatId, tecnicoId: profile.id };

    const chat = await prisma.chat.findFirst({
      where,
      include: {
        cliente: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                nombre: true,
                avatarUrl: true,
              },
            },
          },
        },
        tecnico: {
          select: {
            id: true,
            oficio: true,
            user: {
              select: {
                id: true,
                nombre: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!chat) {
      throw ApiError.notFound('Conversación no encontrada');
    }

    return chat;
  }

  /**
   * Obtiene mensajes paginados de una conversación
   */
  async getMessages(chatId: string, userId: string, userRol: Rol, page: number = 1, limit: number = 50) {
    // Verificar que el usuario es participante del chat
    await this.getConversation(chatId, userId, userRol);

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.mensaje.findMany({
        where: { chatId },
        include: {
          remitente: {
            select: {
              id: true,
              nombre: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.mensaje.count({
        where: { chatId },
      }),
    ]);

    return {
      messages: messages.reverse(), // Invertir para orden cronológico
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Envía un mensaje en una conversación
   */
  async sendMessage(data: SendMessageInput, userId: string, userRol: Rol) {
    const { chatId, texto } = data;

    // Verificar que el usuario es participante
    await this.getConversation(chatId, userId, userRol);

    // Crear mensaje en transacción con actualización del chat
    const result = await prisma.$transaction(async (tx) => {
      const mensaje = await tx.mensaje.create({
        data: {
          chatId,
          remitenteId: userId,
          texto,
        },
        include: {
          remitente: {
            select: {
              id: true,
              nombre: true,
              avatarUrl: true,
            },
          },
        },
      });

      // Actualizar último mensaje del chat
      await tx.chat.update({
        where: { id: chatId },
        data: {
          ultimoMensaje: texto.substring(0, 100), // Truncar a 100 chars
          ultimoMensajeTimestamp: mensaje.timestamp,
        },
      });

      return mensaje;
    });

    return result;
  }

  /**
   * Marca un mensaje como leído
   */
  async markAsRead(messageId: string, userId: string) {
    const mensaje = await prisma.mensaje.findUnique({
      where: { id: messageId },
      select: { id: true, remitenteId: true, leido: true },
    });

    if (!mensaje) {
      throw ApiError.notFound('Mensaje no encontrado');
    }

    // No permitir marcar como leído mensajes propios
    if (mensaje.remitenteId === userId) {
      throw ApiError.badRequest('No puedes marcar como leído tus propios mensajes');
    }

    // Si ya está leído, no hacer nada
    if (mensaje.leido) {
      return mensaje;
    }

    // Marcar como leído
    const updated = await prisma.mensaje.update({
      where: { id: messageId },
      data: { leido: true },
    });

    return updated;
  }

  /**
   * Marca múltiples mensajes como leídos (para WebSocket)
   */
  async markMessagesAsRead(messageIds: string[], userId: string) {
    // Actualizar solo mensajes que no son del usuario y no están leídos
    const result = await prisma.mensaje.updateMany({
      where: {
        id: { in: messageIds },
        NOT: { remitenteId: userId },
        leido: false,
      },
      data: {
        leido: true,
      },
    });

    return result;
  }

  /**
   * Obtiene el perfil del usuario según su rol
   */
  private async getUserProfile(userId: string, rol: Rol) {
    if (rol === Rol.CLIENTE) {
      const cliente = await prisma.cliente.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!cliente) {
        throw ApiError.notFound('Perfil de cliente no encontrado');
      }

      return cliente;
    } else if (rol === Rol.TECNICO) {
      const tecnico = await prisma.tecnico.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!tecnico) {
        throw ApiError.notFound('Perfil de técnico no encontrado');
      }

      return tecnico;
    }

    throw ApiError.badRequest('Rol de usuario inválido');
  }
}

export const chatService = new ChatService();
