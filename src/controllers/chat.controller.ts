import { Request, Response, NextFunction } from 'express';
import { chatService } from '../services/chat.service';
import { successResponse } from '../utils/response';
import { CreateConversationInput, SendMessageInput } from '../validators/chat.validator';
import { ApiError } from '../utils/ApiError';
import { Rol } from '@prisma/client';

export class ChatController {
  /**
   * POST /api/chat/conversations
   * Crea o retorna conversación existente
   */
  async createConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const userRol = req.user!.rol;

      // Solo clientes pueden iniciar conversaciones
      if (userRol !== 'CLIENTE') {
        throw ApiError.forbidden('Solo los clientes pueden iniciar conversaciones');
      }

      const data = req.body as CreateConversationInput;
      const userRolTyped = userRol as Rol;

      const chat = await chatService.createOrGetConversation(userId, userRolTyped, data);

      successResponse(res, chat, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/chat/conversations
   * Lista conversaciones del usuario
   */
  async getConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const userRol = req.user!.rol as Rol;

      const conversations = await chatService.getConversations(userId, userRol);

      successResponse(res, conversations);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/chat/conversations/:id
   * Obtiene detalle de conversación
   */
  async getConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw ApiError.badRequest('ID de conversación requerido');
      }
      const userId = req.user!.id;
      const userRol = req.user!.rol as Rol;

      const conversation = await chatService.getConversation(id, userId, userRol);

      successResponse(res, conversation);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/chat/conversations/:id/messages
   * Obtiene mensajes paginados
   */
  async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw ApiError.badRequest('ID de chat requerido');
      }
      const userId = req.user!.id;
      const userRol = req.user!.rol as Rol;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await chatService.getMessages(id, userId, userRol, page, limit);

      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/messages
   * Envía un mensaje
   */
  async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const userRol = req.user!.rol;
      const data = req.body as SendMessageInput;
      const userRolTyped = userRol as Rol;

      const message = await chatService.sendMessage(data, userId, userRolTyped);

      successResponse(res, message, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/messages/:id/read
   * Marca mensaje como leído
   */
  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw ApiError.badRequest('ID de mensaje requerido');
      }
      const userId = req.user!.id;

      const message = await chatService.markAsRead(id, userId);

      successResponse(res, message);
    } catch (error) {
      next(error);
    }
  }
}

export const chatController = new ChatController();
