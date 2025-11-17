import { Router } from 'express';
import { reporteController } from '../controllers/reporte.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateMiddleware } from '../middlewares/validation.middleware'; // Corrected import
import { createReporteSchema, getAdminReportesSchema, resolveReporteSchema } from '../validators/reporte.validator';
import { checkRole } from '../middlewares/checkRole.middleware';
import { Rol } from '@prisma/client';

const router: Router = Router(); // Added type annotation

// Ruta para crear un reporte (cliente o técnico)
router.post(
  '/trabajos/:trabajoId/reportar',
  authMiddleware,
  validateMiddleware(createReporteSchema), // Corrected usage
  reporteController.create
);

// Rutas para administradores
router.get(
  '/admin/reportes/disputa',
  authMiddleware,
  checkRole([Rol.ADMIN]),
  reporteController.getDisputedTrabajos
);

router.get(
  '/admin/reportes',
  authMiddleware,
  checkRole([Rol.ADMIN]),
  validateMiddleware(getAdminReportesSchema), // Corrected usage
  reporteController.getAdminReportes
);

router.post(
  '/admin/reportes/:trabajoId/resolver',
  authMiddleware,
  checkRole([Rol.ADMIN]),
  validateMiddleware(resolveReporteSchema), // Corrected usage
  reporteController.resolve
);

export default router;
