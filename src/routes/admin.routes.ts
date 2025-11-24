import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { reporteController } from '../controllers/reporte.controller';
import { adminTrabajoController } from '../controllers/admin.trabajo.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';
import { validateMiddleware } from '../middlewares/validation.middleware';
import { resolveReporteSchema } from '../validators/reporte.validator';
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
 * PATCH /api/admin/trabajos/:id/estado
 * Actualiza el estado de un trabajo (solo admin)
 */
router.patch('/trabajos/:id/estado', adminTrabajoController.updateEstado);

/**
 * GET /api/admin/servicios
 * Lista de todos los servicios
 */
router.get('/servicios', adminController.getServicios.bind(adminController));

// =================================================================
// RUTAS DE REPORTES (ADMIN)
// =================================================================

/**
 * GET /api/admin/reportes/disputa
 * Obtiene una lista de todos los trabajos en disputa.
 */
router.get('/reportes/disputa', reporteController.getDisputedTrabajos.bind(reporteController));

/**
 * GET /api/admin/reportes
 * Obtiene una lista de todos los reportes con filtros y paginación.
 */
router.get('/reportes', reporteController.getAdminReportes.bind(reporteController));

/**
 * POST /api/admin/reportes/:trabajoId/resolver
 * Resuelve una disputa de un trabajo.
 */
router.post('/reportes/:trabajoId/resolver', validateMiddleware(resolveReporteSchema), reporteController.resolve.bind(reporteController));


export default router;
