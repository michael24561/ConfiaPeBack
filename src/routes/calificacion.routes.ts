import { Router } from 'express';
import { calificacionController } from '../controllers/calificacion.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';
import { validateMiddleware } from '../middlewares/validation.middleware';
import { createCalificacionSchema, getCalificacionesSchema, updateCalificacionSchema } from '../validators/calificacion.validator';
import { Rol } from '@prisma/client';

const router: Router = Router();

// --- Admin Routes ---
router.get(
  '/admin',
  authMiddleware,
  roleMiddleware(Rol.ADMIN),
  calificacionController.getAdminCalificaciones
);

router.delete(
  '/admin/:id',
  authMiddleware,
  roleMiddleware(Rol.ADMIN),
  calificacionController.deleteCalificacion
);

// Todas las rutas de calificación requieren autenticación
router.use(authMiddleware);

// Crear una nueva calificación
router.post(
  '/',
  roleMiddleware(Rol.CLIENTE),
  validateMiddleware(createCalificacionSchema),
  calificacionController.crearCalificacion
);

// Modificar una calificación propia
router.put(
  '/:id',
  roleMiddleware(Rol.CLIENTE),
  validateMiddleware(updateCalificacionSchema),
  calificacionController.updateOwnCalificacion
);

// Eliminar una calificación propia
router.delete(
  '/:id',
  roleMiddleware(Rol.CLIENTE),
  calificacionController.deleteOwnCalificacion
);

// Obtener calificaciones de un técnico (ruta pública, pero requiere token)
router.get(
  '/tecnico/:tecnicoId',
  validateMiddleware(getCalificacionesSchema),
  calificacionController.obtenerCalificaciones
);

export default router;
