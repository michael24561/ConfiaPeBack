import { z } from 'zod';

// Schema para crear conversación
export const createConversationSchema = z.object({
  body: z.object({
    tecnicoId: z.string().uuid('El ID del técnico debe ser un UUID válido'),
  }),
});

// Schema para enviar mensaje
export const sendMessageSchema = z.object({
  body: z.object({
    chatId: z.string().uuid('El ID del chat debe ser un UUID válido'),
    texto: z.string().min(1, 'El mensaje no puede estar vacío').max(2000, 'El mensaje no puede exceder 2000 caracteres'),
  }),
});

// Schema para marcar mensaje como leído
export const markAsReadSchema = z.object({
  params: z.object({
    id: z.string().uuid('El ID del mensaje debe ser un UUID válido'),
  }),
});

// Schema para obtener mensajes paginados
export const getMessagesSchema = z.object({
  params: z.object({
    id: z.string().uuid('El ID de la conversación debe ser un UUID válido'),
  }),
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1)).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).default('50'),
  }),
});

// Schema para obtener conversación específica
export const getConversationSchema = z.object({
  params: z.object({
    id: z.string().uuid('El ID de la conversación debe ser un UUID válido'),
  }),
});

// Types exportados
export type CreateConversationInput = z.infer<typeof createConversationSchema>['body'];
export type SendMessageInput = z.infer<typeof sendMessageSchema>['body'];
export type GetMessagesQuery = z.infer<typeof getMessagesSchema>['query'];
export type GetMessagesParams = z.infer<typeof getMessagesSchema>['params'];
