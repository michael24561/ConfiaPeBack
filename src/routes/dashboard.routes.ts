import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';
import { Rol } from '@prisma/client';

const router: Router = Router();

// Todas las rutas requieren autenticación + rol TECNICO
router.use(authMiddleware);
router.use(roleMiddleware(Rol.TECNICO));

/**
 * GET /api/dashboard/stats
 * Estadísticas generales del técnico
 * Requiere: Auth + Rol TECNICO
 */
router.get('/stats', dashboardController.getStats.bind(dashboardController));

/**
 * GET /api/dashboard/ingresos
 * Datos de ingresos con gráficos
 * Requiere: Auth + Rol TECNICO
 * Query: periodo? (semana|mes|año)
 */
router.get('/ingresos', dashboardController.getIngresos.bind(dashboardController));

/**
 * GET /api/dashboard/clientes
 * Lista de clientes del técnico
 * Requiere: Auth + Rol TECNICO
 */
router.get('/clientes', dashboardController.getClientes.bind(dashboardController));

/**
 * GET /api/dashboard/rendimiento
 * Estadísticas de rendimiento
 * Requiere: Auth + Rol TECNICO
 */
router.get('/rendimiento', dashboardController.getRendimiento.bind(dashboardController));

export default router;
