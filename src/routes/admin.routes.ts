import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';
import { Rol } from '@prisma/client';

const router: Router = Router();

// Todas las rutas requieren autenticación + rol ADMIN
router.use(authMiddleware);
router.use(roleMiddleware(Rol.ADMIN));

/**
 * GET /api/admin/stats
 * Estadísticas generales para el dashboard de admin
 */
router.get('/stats', adminController.getStats.bind(adminController));

/**
 * GET /api/admin/tecnicos
 * Lista de todos los técnicos
 */
router.get('/tecnicos', adminController.getTecnicos.bind(adminController));

/**
 * GET /api/admin/clientes
 * Lista de todos los clientes
 */
router.get('/clientes', adminController.getClientes.bind(adminController));

/**
 * GET /api/admin/trabajos
 * Lista de todos los trabajos
 */
router.get('/trabajos', adminController.getTrabajos.bind(adminController));

/**
 * GET /api/admin/servicios
 * Lista de todos los servicios
 */
router.get('/servicios', adminController.getServicios.bind(adminController));

export default router;
