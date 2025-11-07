import { Request, Response, NextFunction } from 'express';
import { favoritoService } from '../services/favorito.service';
import { ApiError } from '../utils/ApiError';
import { Rol } from '@prisma/client';

class FavoritoController {
  /**
   * GET /api/favoritos
   * Obtiene todos los favoritos del cliente
   */
  async getFavoritos(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const rol = req.user!.rol as Rol;

      const favoritos = await favoritoService.getFavoritos(userId, rol);

      res.status(200).json({
        success: true,
        data: favoritos,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/favoritos
   * Agrega un técnico a favoritos
   */
  async addFavorito(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const rol = req.user!.rol as Rol;
      const { tecnicoId } = req.body;

      if (!tecnicoId) {
        throw new ApiError(400, 'El campo tecnicoId es requerido');
      }

      const favorito = await favoritoService.addFavorito(userId, rol, tecnicoId);

      res.status(201).json({
        success: true,
        data: favorito,
        message: 'Técnico agregado a favoritos',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/favoritos/:tecnicoId
   * Elimina un técnico de favoritos
   */
  async removeFavorito(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const rol = req.user!.rol as Rol;
      const { tecnicoId } = req.params;

      if (!tecnicoId) {
        throw new ApiError(400, 'El campo tecnicoId es requerido');
      }

      const result = await favoritoService.removeFavorito(userId, rol, tecnicoId);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Técnico eliminado de favoritos',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/favoritos/check/:tecnicoId
   * Verifica si un técnico está en favoritos
   */
  async checkFavorito(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const rol = req.user!.rol as Rol;
      const { tecnicoId } = req.params;

      if (!tecnicoId) {
        throw new ApiError(400, 'El campo tecnicoId es requerido');
      }

      const isFavorito = await favoritoService.isFavorito(userId, rol, tecnicoId);

      res.status(200).json({
        success: true,
        data: { isFavorito },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const favoritoController = new FavoritoController();
