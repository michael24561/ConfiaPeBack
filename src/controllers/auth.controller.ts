import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { successResponse } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import { uploadToCloudinary } from '../config/cloudinary';
import {
  RegisterClienteInput,
  RegisterTecnicoInput,
  LoginInput,
  RefreshTokenInput,
} from '../validators/auth.validator';

export class AuthController {
  /**
   * POST /api/auth/register/cliente
   * Registra un nuevo cliente
   */
  async registerCliente(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: RegisterClienteInput = req.body;
      const result = await authService.registerCliente(data);

      successResponse(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/register/tecnico
   * Registra un nuevo técnico con certificados opcionales
   */
  async registerTecnico(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Parsear datos que vienen como strings desde FormData o JSON
      const data: RegisterTecnicoInput = {
        email: req.body.email,
        password: req.body.password,
        nombre: req.body.nombre,
        dni: req.body.dni,
        // Campos opcionales
        telefono: req.body.telefono,
        nombres: req.body.nombres,
        apellidos: req.body.apellidos,
        oficio: req.body.oficio,
        descripcion: req.body.descripcion,
        ubicacion: req.body.ubicacion,
      };

      // Parsear números opcionales solo si existen
      if (req.body.experienciaAnios !== undefined) {
        const parsed = parseInt(req.body.experienciaAnios, 10);
        if (isNaN(parsed)) {
          throw ApiError.badRequest('experienciaAnios debe ser un número entero');
        }
        data.experienciaAnios = parsed;
      }
      // Obtener archivos de certificados si existen
      const files = req.files as Express.Multer.File[] | undefined;

      const result = await authService.registerTecnico(data, files);

      successResponse(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   * Autentica un usuario y retorna tokens
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: LoginInput = req.body;
      const result = await authService.login(data);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/refresh
   * Refresca el access token
   */
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken }: RefreshTokenInput = req.body;
      const result = await authService.refreshToken(refreshToken);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   * Obtiene la información del usuario autenticado
   */
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      const result = await authService.getMe(req.user.id);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/auth/me/avatar
   * Actualiza el avatar del usuario
   */
  async updateAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      if (!req.file) {
        throw ApiError.badRequest('No se proporcionó ninguna imagen');
      }

      // Subir a Cloudinary
      const uploadResult = await uploadToCloudinary(req.file, 'confiape/avatars');

      // Actualizar avatar en la base de datos
      const user = await authService.updateAvatar(req.user.id, uploadResult.url);

      successResponse(res, { user, avatarUrl: uploadResult.url }, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
