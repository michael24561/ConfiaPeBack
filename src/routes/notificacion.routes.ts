import { Router } from 'express';
import { notificacionController } from '../controllers/notificacion.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router: Router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Obtener todas las notificaciones del usuario
router.get('/', notificacionController.getNotificaciones);

// Marcar todas las notificaciones como leídas
router.patch('/leidas', notificacionController.marcarTodasComoLeidas);

// Marcar una notificación como leída
router.patch('/:id/leida', notificacionController.marcarComoLeida);

export default router;
