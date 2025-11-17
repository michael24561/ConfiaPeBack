import { Request, Response, NextFunction } from 'express';
import { Rol } from '@prisma/client';
import { ApiError } from '../utils/ApiError';

export const checkRole = (roles: Rol[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !req.user.rol) {
      return next(ApiError.unauthorized('No autenticado o rol no definido.'));
    }

    if (!roles.includes(req.user.rol as Rol)) {
      return next(ApiError.forbidden('Acceso denegado. No tienes el rol necesario.'));
    }

    next();
  };
};
