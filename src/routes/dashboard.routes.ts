import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware';
import { Rol } from '@prisma/client';

const router: Router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// --- Rutas de Técnico ---

router.get('/stats', roleMiddleware(Rol.TECNICO), dashboardController.getStats);
router.get('/ingresos', roleMiddleware(Rol.TECNICO), dashboardController.getIngresos);
router.get('/clientes', roleMiddleware(Rol.TECNICO), dashboardController.getClientes);
router.get('/rendimiento', roleMiddleware(Rol.TECNICO), dashboardController.getRendimiento);

// --- Ruta de Cliente ---

router.get('/cliente-stats', roleMiddleware(Rol.CLIENTE), dashboardController.getClienteStats);

export default router;
