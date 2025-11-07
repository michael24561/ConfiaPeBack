import { Router } from 'express';
import { reviewController } from '../controllers/review.controller';
import { validateMiddleware } from '../middlewares/validation.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createReviewSchema,
  respondReviewSchema,
  getReviewsSchema,
} from '../validators/review.validator';

const router: Router = Router();

/**
 * GET /api/reviews/tecnico/:tecnicoId
 * Lista reviews de un técnico (público)
 * Query: calificacion?, page?, limit?
 */
router.get(
  '/tecnico/:tecnicoId',
  validateMiddleware(getReviewsSchema),
  reviewController.getByTecnico.bind(reviewController)
);

/**
 * GET /api/reviews/tecnico/:tecnicoId/stats
 * Estadísticas de reviews de un técnico (público)
 */
router.get(
  '/tecnico/:tecnicoId/stats',
  reviewController.getStats.bind(reviewController)
);

/**
 * GET /api/reviews/:id
 * Obtiene una review por ID (público)
 */
router.get('/:id', reviewController.getById.bind(reviewController));

/**
 * POST /api/reviews
 * Crea una nueva review
 * Requiere: Auth + Rol CLIENTE
 * Body: { trabajoId, calificacion, comentario }
 */
router.post(
  '/',
  authMiddleware,
  validateMiddleware(createReviewSchema),
  reviewController.create.bind(reviewController)
);

/**
 * PUT /api/reviews/:id/respuesta
 * Responde a una review
 * Requiere: Auth + Rol TECNICO
 * Body: { respuesta }
 */
router.put(
  '/:id/respuesta',
  authMiddleware,
  validateMiddleware(respondReviewSchema),
  reviewController.respond.bind(reviewController)
);

/**
 * DELETE /api/reviews/:id
 * Elimina una review (solo sin respuesta)
 * Requiere: Auth + Rol CLIENTE
 */
router.delete('/:id', authMiddleware, reviewController.delete.bind(reviewController));

export default router;
