import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateMiddleware } from '../middlewares/validation.middleware';
import {
  createConversationSchema,
  sendMessageSchema,
  markAsReadSchema,
  getMessagesSchema,
  getConversationSchema,
} from '../validators/chat.validator';

const router: Router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Conversaciones
router.post(
  '/conversations',
  validateMiddleware(createConversationSchema),
  chatController.createConversation.bind(chatController)
);

router.get(
  '/conversations',
  chatController.getConversations.bind(chatController)
);

router.get(
  '/conversations/:id',
  validateMiddleware(getConversationSchema),
  chatController.getConversation.bind(chatController)
);

router.get(
  '/conversations/:id/messages',
  validateMiddleware(getMessagesSchema),
  chatController.getMessages.bind(chatController)
);

// Mensajes
router.post(
  '/messages',
  validateMiddleware(sendMessageSchema),
  chatController.sendMessage.bind(chatController)
);

router.patch(
  '/messages/:id/read',
  validateMiddleware(markAsReadSchema),
  chatController.markAsRead.bind(chatController)
);

export default router;
