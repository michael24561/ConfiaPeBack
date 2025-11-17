import { Router } from 'express'
import { trabajoController } from '../controllers/trabajo.controller'
import { reporteController } from '../controllers/reporte.controller'
import { validateMiddleware } from '../middlewares/validation.middleware'
import { authMiddleware, roleMiddleware } from '../middlewares/auth.middleware'
import { Rol } from '@prisma/client'
import {
  createTrabajoSchema,
  getTrabajosSchema,
  proponerCotizacionSchema,
} from '../validators/trabajo.validator'
import { createReporteSchema } from '../validators/reporte.validator'

const router: Router = Router()

// Todas las rutas requieren autenticación
router.use(authMiddleware)

// =================================================================
// RUTAS DE ADMINISTRACIÓN
// =================================================================

// Lista todos los trabajos para el panel de administración
router.get(
  '/admin',
  roleMiddleware(Rol.ADMIN),
  trabajoController.getAdminTrabajos
)

// =================================================================
// RUTAS CORE
// =================================================================

// Crea una nueva solicitud de trabajo (CLIENTE)
router.post('/', validateMiddleware(createTrabajoSchema), trabajoController.create)

// Lista trabajos del usuario autenticado (CLIENTE o TECNICO)
router.get('/', validateMiddleware(getTrabajosSchema), trabajoController.getTrabajos)

// Obtiene detalle de un trabajo (CLIENTE o TECNICO)
router.get('/:id', trabajoController.getById)

// =================================================================
// RUTAS DE ACCIONES DEL TÉCNICO
// =================================================================

// Técnico solicita una visita de evaluación
router.post('/:id/solicitar-visita', trabajoController.solicitarVisita)

// Técnico propone una cotización
router.post('/:id/cotizar', validateMiddleware(proponerCotizacionSchema), trabajoController.proponerCotizacion)

// Técnico rechaza una solicitud pendiente
router.post('/:id/rechazar-solicitud', trabajoController.rechazarSolicitud)

// Técnico inicia un trabajo aceptado
router.post('/:id/iniciar', trabajoController.iniciarTrabajo)

// Técnico completa un trabajo en progreso
router.post('/:id/completar', trabajoController.completarTrabajo)

// =================================================================
// RUTAS DE ACCIONES DEL CLIENTE
// =================================================================

// Cliente acepta una cotización
router.post('/:id/aceptar-cotizacion', trabajoController.aceptarCotizacion)

// Cliente rechaza una cotización
router.post('/:id/rechazar-cotizacion', trabajoController.rechazarCotizacion)

// =================================================================
// RUTA COMPARTIDA
// =================================================================

// Cancela un trabajo en curso (ACEPTADO o EN_PROGRESO)
router.patch('/:id/cancelar', trabajoController.cancelar)

// =================================================================
// RUTA DE REPORTES
// =================================================================

// Cliente o Técnico reporta un problema con un trabajo
router.post('/:trabajoId/reportar', validateMiddleware(createReporteSchema), reporteController.create.bind(reporteController))

export default router