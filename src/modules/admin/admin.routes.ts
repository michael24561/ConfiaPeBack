import { Router } from 'express'
import { authMiddleware, roleMiddleware } from '../../middlewares/auth.middleware'
import { validateMiddleware } from '../../middlewares/validation.middleware'
import { Rol } from '@prisma/client'

// Controllers
import { usersAdminController } from './users/users.controller'
import { ratingsAdminController } from './ratings/ratings.controller'
import { statsAdminController } from './stats/stats.controller'
import { reporteController } from '../../controllers/reporte.controller'
import { adminController } from '../../controllers/admin.controller'
import { adminTrabajoController } from '../../controllers/admin.trabajo.controller'

// Validators
import { updateUserSchema, updateUserStatusSchema, deleteUserSchema } from './users/users.validator'
import { resolveReporteSchema } from '../../validators/reporte.validator'

const router: Router = Router()

// ============================================
// MIDDLEWARE GLOBAL: Autenticación + Rol ADMIN
// ============================================
router.use(authMiddleware)
router.use(roleMiddleware(Rol.ADMIN))

// ============================================
// ESTADÍSTICAS
// ============================================
router.get('/stats', statsAdminController.getStats)

// ============================================
// GESTIÓN DE USUARIOS
// ============================================
router.get('/users', usersAdminController.getUsers)
router.get('/users/:id', usersAdminController.getUserById)
router.put('/users/:id', validateMiddleware(updateUserSchema), usersAdminController.updateUser)
router.patch('/users/:id/status', validateMiddleware(updateUserStatusSchema), usersAdminController.updateUserStatus)
router.delete('/users/:id', validateMiddleware(deleteUserSchema), usersAdminController.deleteUser)

// ============================================
// MODERACIÓN DE CALIFICACIONES
// ============================================
router.get('/calificaciones', ratingsAdminController.getRatings)
router.delete('/calificaciones/:id', ratingsAdminController.deleteRating)

// ============================================
// RUTAS EXISTENTES (Compatibilidad)
// ============================================

// Técnicos
router.get('/tecnicos', adminController.getTecnicos.bind(adminController))

// Clientes
router.get('/clientes', adminController.getClientes.bind(adminController))

// Trabajos
router.get('/trabajos', adminController.getTrabajos.bind(adminController))
router.patch('/trabajos/:id/estado', adminTrabajoController.updateEstado)

// Servicios
router.get('/servicios', adminController.getServicios.bind(adminController))

// Reportes
router.get('/reportes/disputa', reporteController.getDisputedTrabajos.bind(reporteController))
router.get('/reportes', reporteController.getAdminReportes.bind(reporteController))
router.post('/reportes/:trabajoId/resolver', validateMiddleware(resolveReporteSchema), reporteController.resolve.bind(reporteController))

export default router
