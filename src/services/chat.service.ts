import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { Rol } from '@prisma/client';
import { CreateConversationInput, SendMessageInput } from '../validators/chat.validator';

export class ChatService {
  /**
   * Crea o retorna conversación existente entre cliente y técnico
   */
  async createOrGetConversation(userId: string, userRol: Rol, data: CreateConversationInput) {
    const { tecnicoId, adminId, clienteId } = data;

    let chatWhereCondition: any;
    let chatCreateData: any;
    let includeTarget: any;

    if (userRol === Rol.CLIENTE) {
      const cliente = await this.getUserProfile(userId, Rol.CLIENTE);
      
      if (tecnicoId) {
        const tecnico = await prisma.tecnico.findUnique({ where: { id: tecnicoId } });
        if (!tecnico) throw ApiError.notFound('Técnico no encontrado');
        
        // VALIDACIÓN: Cliente solo puede chatear con técnico si hay trabajo en común.
        const trabajoExistente = await prisma.trabajo.findFirst({
          where: { clienteId: cliente.id, tecnicoId: tecnicoId },
        });
        if (!trabajoExistente) {
          throw ApiError.forbidden('No puedes iniciar una conversación si no existe un trabajo asignado con este técnico.');
        }

        chatWhereCondition = { clienteId: cliente.id, tecnicoId: tecnico.id, adminId: null };
        chatCreateData = { clienteId: cliente.id, tecnicoId: tecnico.id };
        includeTarget = { tecnico: this.includeTecnico() };

      } else if (adminId) {
        const admin = await prisma.user.findUnique({ where: { id: adminId, rol: Rol.ADMIN } });
        if (!admin) throw ApiError.notFound('Administrador no encontrado');

        chatWhereCondition = { clienteId: cliente.id, adminId: admin.id, tecnicoId: null };
        chatCreateData = { clienteId: cliente.id, adminId: admin.id };
        includeTarget = { admin: this.includeAdmin() };
      } else {
        throw ApiError.badRequest('Para un cliente, se debe proporcionar un tecnicoId o un adminId');
      }

    } else if (userRol === Rol.TECNICO) {
      if (!clienteId) {
        throw ApiError.badRequest('Para un técnico, se debe proporcionar un clienteId');
      }
      
      const tecnico = await this.getUserProfile(userId, Rol.TECNICO);
      const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
      if (!cliente) throw ApiError.notFound('Cliente no encontrado');

      // Opcional: Podrías agregar una validación similar a la del cliente aquí si es necesario

      chatWhereCondition = { clienteId: cliente.id, tecnicoId: tecnico.id, adminId: null };
      chatCreateData = { clienteId: cliente.id, tecnicoId: tecnico.id };
      includeTarget = { cliente: this.includeCliente() };

    } else {
      throw ApiError.forbidden('Este rol de usuario no puede iniciar conversaciones');
    }

    // Buscar conversación existente
    let chat = await prisma.chat.findFirst({
      where: chatWhereCondition,
      include: {
        cliente: this.includeCliente(),
        tecnico: this.includeTecnico(),
        admin: this.includeAdmin(),
      },
    });

    // Si no existe, crear nueva conversación
    if (!chat) {
      chat = await prisma.chat.create({
        data: chatCreateData,
        include: {
            cliente: this.includeCliente(),
            tecnico: this.includeTecnico(),
            admin: this.includeAdmin(),
        },
      });
    }

    return chat;
  }

  /**
   * Lista todas las conversaciones del usuario (cliente o técnico)
   */
  async getConversations(userId: string, userRol: Rol) {
    // Obtener el perfil (clienteId o tecnicoId/adminId) según el rol
    const profile = await this.getUserProfile(userId, userRol);

    let whereClause: any;

    if (userRol === Rol.CLIENTE) {
      whereClause = { clienteId: profile.id };
    } else if (userRol === Rol.TECNICO) {
      whereClause = { tecnicoId: profile.id };
    } else if (userRol === Rol.ADMIN) {
      whereClause = { adminId: profile.id };
    } else {
      throw ApiError.badRequest('Rol de usuario inválido');
    }

    const chats = await prisma.chat.findMany({
      where: whereClause,
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
        admin: { // Include admin relation
          select: {
            id: true,
            nombre: true,
            avatarUrl: true,
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
    return chats.map((chat) => {
      let otherParty: any;
      if (userRol === Rol.CLIENTE) {
        // For client, the other party is either a technician or an admin
        if (chat.tecnico) {
          otherParty = {
            id: chat.tecnico.id,
            nombre: chat.tecnico.user.nombre,
            oficio: chat.tecnico.oficio,
            avatarUrl: chat.tecnico.user.avatarUrl,
            rol: Rol.TECNICO,
          };
        } else if (chat.admin) {
          otherParty = {
            id: chat.admin.id,
            nombre: chat.admin.nombre,
            oficio: null, // Admin doesn't have an oficio
            avatarUrl: chat.admin.avatarUrl,
            rol: Rol.ADMIN,
          };
        }
      } else if (userRol === Rol.TECNICO || userRol === Rol.ADMIN) {
        // For technician or admin, the other party is always the client
        otherParty = {
          id: chat.cliente.id,
          nombre: chat.cliente.user.nombre,
          avatarUrl: chat.cliente.user.avatarUrl,
          rol: Rol.CLIENTE,
        };
      }

      return {
        id: chat.id,
        clienteId: chat.clienteId,
        tecnicoId: chat.tecnicoId,
        adminId: chat.adminId,
        ultimoMensaje: chat.ultimoMensaje,
        ultimoMensajeTimestamp: chat.ultimoMensajeTimestamp,
        noLeidos: chat.mensajes.length,
        otherParty: otherParty,
      };
    });
  }

  /**
   * Obtiene una conversación específica con validación de participante
   */
  async getConversation(chatId: string, userId: string, userRol: Rol) {
    const profile = await this.getUserProfile(userId, userRol);

    let whereClause: any;

    if (userRol === Rol.CLIENTE) {
      whereClause = { id: chatId, clienteId: profile.id };
    } else if (userRol === Rol.TECNICO) {
      whereClause = { id: chatId, tecnicoId: profile.id };
    } else if (userRol === Rol.ADMIN) {
      whereClause = { id: chatId, adminId: profile.id };
    } else {
      throw ApiError.badRequest('Rol de usuario inválido');
    }

    const chat = await prisma.chat.findFirst({
      where: whereClause,
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
        admin: { // Include admin relation
          select: {
            id: true,
            nombre: true,
            avatarUrl: true,
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

  private includeCliente() {
    return {
      select: {
        id: true,
        user: { select: { id: true, nombre: true, avatarUrl: true } },
      },
    };
  }

  private includeTecnico() {
    return {
      select: {
        id: true,
        oficio: true,
        user: { select: { id: true, nombre: true, avatarUrl: true } },
      },
    };
  }

  private includeAdmin() {
    return {
      select: {
        id: true,
        nombre: true,
        avatarUrl: true,
      },
    };
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
