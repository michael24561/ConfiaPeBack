import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateMiddleware } from '../middlewares/validation.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import { authLimiter } from '../middlewares/rateLimit.middleware';
import { uploadCertificado, uploadImage } from '../middlewares/upload.middleware';
import {
  registerClienteSchema,
  registerTecnicoSchema,
  loginSchema,
  refreshTokenSchema,
} from '../validators/auth.validator';

const router: Router = Router();

/**
 * POST /api/auth/register/cliente
 * Registro de nuevo cliente
 * Body: { nombreCompleto, email, telefono, password }
 */
router.post(
  '/register/cliente',
  authLimiter,
  validateMiddleware(registerClienteSchema),
  authController.registerCliente.bind(authController)
);

/**
 * POST /api/auth/register/tecnico
 * Registro de nuevo técnico con certificados opcionales
 * Body (FormData): { email, telefono, password, dni, nombres, apellidos, oficio, descripcion, ubicacion, experienciaAnios, precioMin, precioMax, certificados[] }
 */
router.post(
  '/register/tecnico',
  authLimiter,
  uploadCertificado.array('certificados', 3),
  validateMiddleware(registerTecnicoSchema),
  authController.registerTecnico.bind(authController)
);

/**
 * POST /api/auth/login
 * Inicio de sesión
 * Body: { email, password, tipoUsuario }
 */
router.post(
  '/login',
  authLimiter,
  validateMiddleware(loginSchema),
  authController.login.bind(authController)
);

/**
 * POST /api/auth/refresh
 * Refrescar access token
 * Body: { refreshToken }
 */
router.post(
  '/refresh',
  validateMiddleware(refreshTokenSchema),
  authController.refreshToken.bind(authController)
);

/**
 * GET /api/auth/me
 * Obtener información del usuario autenticado
 * Headers: Authorization: Bearer {accessToken}
 */
router.get('/me', authMiddleware, authController.me.bind(authController));

/**
 * PUT /api/auth/me/avatar
 * Actualizar avatar del usuario
 * Headers: Authorization: Bearer {accessToken}
 * Body (FormData): file
 */
router.put(
  '/me/avatar',
  authMiddleware,
  uploadImage.single('file'),
  authController.updateAvatar.bind(authController)
);

export default router;
