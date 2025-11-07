import { Router } from 'express';
import { trabajoController } from '../controllers/trabajo.controller';
import { validateMiddleware } from '../middlewares/validation.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createTrabajoSchema,
  getTrabajosSchema,
  updateEstadoTrabajoSchema,
  updateTrabajoSchema,
} from '../validators/trabajo.validator';

const router: Router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

/**
 * POST /api/trabajos
 * Crea una nueva solicitud de trabajo
 * Requiere: Auth + Rol CLIENTE
 * Body: { tecnicoId, servicioNombre, descripcion, direccion, telefono, fechaProgramada? }
 */
router.post(
  '/',
  validateMiddleware(createTrabajoSchema),
  trabajoController.create.bind(trabajoController)
);

/**
 * GET /api/trabajos
 * Lista trabajos del usuario autenticado
 * Requiere: Auth
 * Query: estado?, page?, limit?
 */
router.get(
  '/',
  validateMiddleware(getTrabajosSchema),
  trabajoController.getTrabajos.bind(trabajoController)
);

/**
 * GET /api/trabajos/:id
 * Obtiene detalle de un trabajo
 * Requiere: Auth (debe ser cliente o técnico del trabajo)
 */
router.get('/:id', trabajoController.getById.bind(trabajoController));

/**
 * PATCH /api/trabajos/:id/estado
 * Cambia el estado del trabajo
 * Requiere: Auth + Rol TECNICO
 * Body: { estado, precio? }
 */
router.patch(
  '/:id/estado',
  validateMiddleware(updateEstadoTrabajoSchema),
  trabajoController.updateEstado.bind(trabajoController)
);

/**
 * PUT /api/trabajos/:id
 * Actualiza información del trabajo (solo si PENDIENTE)
 * Requiere: Auth + Rol CLIENTE
 * Body: { servicioNombre?, descripcion?, direccion?, telefono?, fechaProgramada?, precio? }
 */
router.put(
  '/:id',
  validateMiddleware(updateTrabajoSchema),
  trabajoController.update.bind(trabajoController)
);

/**
 * PATCH /api/trabajos/:id/cancel
 * Cancela un trabajo
 * Requiere: Auth (cliente o técnico del trabajo)
 */
router.patch('/:id/cancel', trabajoController.cancel.bind(trabajoController));

/**
 * DELETE /api/trabajos/:id
 * Elimina un trabajo (solo si PENDIENTE)
 * Requiere: Auth + Rol CLIENTE
 */
router.delete('/:id', trabajoController.delete.bind(trabajoController));

export default router;
