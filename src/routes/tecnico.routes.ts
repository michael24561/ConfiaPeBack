import { Router } from 'express';
import { tecnicoController } from '../controllers/tecnico.controller';
import { validateMiddleware } from '../middlewares/validation.middleware';
import { authMiddleware, optionalAuthMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/auth.middleware';
import { uploadImage, uploadCertificado } from '../middlewares/upload.middleware';
import {
  getTecnicosSchema,
  updateTecnicoSchema,
  addServicioSchema,
  addCertificadoSchema,
  addGaleriaSchema,
  updateHorariosSchema,
  updateConfiguracionSchema,
} from '../validators/tecnico.validator';
import { Rol } from '@prisma/client';

const router: Router = Router();

/**
 * GET /api/tecnicos
 * Lista técnicos con filtros (público, auth opcional para favoritos)
 * Query: categoria, q, calificacionMin, precioMax, disponible, verificado, orderBy, page, limit
 */
router.get(
  '/',
  optionalAuthMiddleware,
  validateMiddleware(getTecnicosSchema),
  tecnicoController.getTecnicos.bind(tecnicoController)
);

/**
 * GET /api/tecnicos/me
 * Obtiene el perfil del técnico autenticado
 * Requiere: Auth + Rol TECNICO
 * NOTA: Esta ruta debe ir ANTES de /:id
 */
router.get(
  '/me',
  authMiddleware,
  roleMiddleware(Rol.TECNICO),
  tecnicoController.getMyProfile.bind(tecnicoController)
);

/**
 * GET /api/tecnicos/me/ingresos
 * Obtiene el total de ingresos netos del técnico autenticado
 * Requiere: Auth + Rol TECNICO
 */
router.get(
  '/me/ingresos',
  authMiddleware,
  roleMiddleware(Rol.TECNICO),
  tecnicoController.getTechnicianIncome.bind(tecnicoController)
);

/**
 * GET /api/tecnicos/:id
 * Detalle completo de un técnico (público)
 */
router.get('/:id', tecnicoController.getTecnicoById.bind(tecnicoController));

/**
 * GET /api/tecnicos/:id/reniec
 * Obtiene los datos de RENIEC de un técnico
 * Requiere: Auth + Rol ADMIN
 */
router.get(
  '/:id/reniec',
  authMiddleware,
  roleMiddleware(Rol.ADMIN),
  tecnicoController.getReniecData.bind(tecnicoController)
);

/**
 * PUT /api/tecnicos/me
 * Actualiza el perfil del técnico
 * Requiere: Auth + Rol TECNICO
 * Body: { nombres?, apellidos?, oficio?, descripcion?, ubicacion?, experienciaAnios?, precioMin?, precioMax?, disponible? }
 */
router.put(
  '/me',
  authMiddleware,
  roleMiddleware(Rol.TECNICO),
  validateMiddleware(updateTecnicoSchema),
  tecnicoController.updateProfile.bind(tecnicoController)
);

/**
 * POST /api/tecnicos/me/servicios
 * Agrega un servicio ofrecido
 * Requiere: Auth + Rol TECNICO
 * Body: { nombre, descripcion?, precio? }
 */
router.post(
  '/me/servicios',
  authMiddleware,
  roleMiddleware(Rol.TECNICO),
  validateMiddleware(addServicioSchema),
  tecnicoController.addServicio.bind(tecnicoController)
);

/**
 * DELETE /api/tecnicos/me/servicios/:id
 * Elimina un servicio
 * Requiere: Auth + Rol TECNICO
 */
router.delete(
  '/me/servicios/:id',
  authMiddleware,
  roleMiddleware(Rol.TECNICO),
  tecnicoController.deleteServicio.bind(tecnicoController)
);

/**
 * POST /api/tecnicos/me/certificados
 * Agrega un certificado con imagen
 * Requiere: Auth + Rol TECNICO
 * Body (FormData): { nombre, institucion?, fechaObtencion?, file }
 */
router.post(
  '/me/certificados',
  authMiddleware,
  roleMiddleware(Rol.TECNICO),
  uploadCertificado.single('file'),
  validateMiddleware(addCertificadoSchema),
  tecnicoController.addCertificado.bind(tecnicoController)
);

/**
 * POST /api/tecnicos/me/galeria
 * Agrega una imagen a la galería
 * Requiere: Auth + Rol TECNICO
 * Body (FormData): { descripcion?, file }
 */
router.post(
  '/me/galeria',
  authMiddleware,
  roleMiddleware(Rol.TECNICO),
  uploadImage.single('file'),
  validateMiddleware(addGaleriaSchema),
  tecnicoController.addGaleriaItem.bind(tecnicoController)
);

/**
 * GET /api/tecnicos/me/horarios
 * Obtiene los horarios del técnico
 * Requiere: Auth + Rol TECNICO
 */
router.get(
  '/me/horarios',
  authMiddleware,
  roleMiddleware(Rol.TECNICO),
  tecnicoController.getHorarios.bind(tecnicoController)
);

/**
 * PUT /api/tecnicos/me/horarios
 * Actualiza los horarios del técnico
 * Requiere: Auth + Rol TECNICO
 * Body: { LUNES?, MARTES?, MIERCOLES?, JUEVES?, VIERNES?, SABADO?, DOMINGO? }
 * Cada día: { disponible, horaInicio, horaFin }
 */
router.put(
  '/me/horarios',
  authMiddleware,
  roleMiddleware(Rol.TECNICO),
  validateMiddleware(updateHorariosSchema),
  tecnicoController.updateHorarios.bind(tecnicoController)
);

/**
 * PATCH /api/tecnicos/me/configuracion
 * Actualiza la configuración del técnico
 * Requiere: Auth + Rol TECNICO
 * Body: { emergencias24x7?, notificacionesPush?, autoAceptarTrabajos? }
 */
router.patch(
  '/me/configuracion',
  authMiddleware,
  roleMiddleware(Rol.TECNICO),
  validateMiddleware(updateConfiguracionSchema),
  tecnicoController.updateConfiguracion.bind(tecnicoController)
);

router.patch(
  '/:id/reject-validation',
  authMiddleware,
  roleMiddleware(Rol.ADMIN),
  tecnicoController.rejectTecnicoValidation.bind(tecnicoController)
);

/**
 * GET /api/tecnicos/:id/validation-data
 * Obtiene los datos del técnico y de RENIEC para la validación
 * Requiere: Auth + Rol ADMIN
 */
router.get(
  '/:id/validation-data',
  authMiddleware,
  roleMiddleware(Rol.ADMIN),
  tecnicoController.getValidationData.bind(tecnicoController)
);

/**
 * PATCH /api/tecnicos/:id/approve-validation
 * Aprueba la validación de un técnico
 * Requiere: Auth + Rol ADMIN
 */
router.patch(
  '/:id/approve-validation',
  authMiddleware,
  roleMiddleware(Rol.ADMIN),
  tecnicoController.approveTecnicoValidation.bind(tecnicoController)
);

/**
 * PATCH /api/tecnicos/:id/reject-validation
 * Rechaza la validación de un técnico
 * Requiere: Auth + Rol ADMIN
 */
router.patch(
  '/:id/reject-validation',
  authMiddleware,
  roleMiddleware(Rol.ADMIN),
  tecnicoController.rejectTecnicoValidation.bind(tecnicoController)
);

export default router;
