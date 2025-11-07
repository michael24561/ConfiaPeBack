import { Router } from 'express';
import { favoritoController } from '../controllers/favorito.controller';
import { validateMiddleware } from '../middlewares/validation.middleware';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';
import { addFavoritoSchema, favoritoParamsSchema } from '../validators/favorito.validator';
import { Rol } from '@prisma/client';

const router: Router = Router();

// Todas las rutas requieren autenticación y rol CLIENTE
router.use(authMiddleware);
router.use(roleMiddleware(Rol.CLIENTE));

/**
 * GET /api/favoritos
 * Obtiene todos los favoritos del cliente
 * Requiere: Auth + Rol CLIENTE
 */
router.get('/', favoritoController.getFavoritos.bind(favoritoController));

/**
 * POST /api/favoritos
 * Agrega un técnico a favoritos
 * Requiere: Auth + Rol CLIENTE
 * Body: { tecnicoId }
 */
router.post(
  '/',
  validateMiddleware(addFavoritoSchema),
  favoritoController.addFavorito.bind(favoritoController)
);

/**
 * GET /api/favoritos/check/:tecnicoId
 * Verifica si un técnico está en favoritos
 * Requiere: Auth + Rol CLIENTE
 */
router.get(
  '/check/:tecnicoId',
  validateMiddleware(favoritoParamsSchema),
  favoritoController.checkFavorito.bind(favoritoController)
);

/**
 * DELETE /api/favoritos/:tecnicoId
 * Elimina un técnico de favoritos
 * Requiere: Auth + Rol CLIENTE
 */
router.delete(
  '/:tecnicoId',
  validateMiddleware(favoritoParamsSchema),
  favoritoController.removeFavorito.bind(favoritoController)
);

export default router;
