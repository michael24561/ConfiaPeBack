import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../config/jwt';
import { ApiError } from '../utils/ApiError';
import { Rol } from '@prisma/client';

export const authMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Token no proporcionado');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw ApiError.unauthorized('Token inválido');
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(ApiError.unauthorized('Token inválido o expirado'));
    }
  }
};

// Alias for compatibility with routes
export const validarJWT = authMiddleware;

// Middleware de autenticación opcional (no lanza error si no hay token)
export const optionalAuthMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        const decoded = verifyAccessToken(token);
        req.user = decoded;
      }
    }

    // Continuar sin error incluso si no hay token
    next();
  } catch (error) {
    // Ignorar errores de token y continuar sin usuario autenticado
    next();
  }
};

export const roleMiddleware = (...roles: Rol[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Usuario no autenticado'));
    }

    if (!roles.includes(req.user.rol as Rol)) {
      return next(ApiError.forbidden('No tienes permisos para acceder a este recurso'));
    }

    next();
  };
};
