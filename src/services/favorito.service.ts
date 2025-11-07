import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { logger } from '../config/logger';
import { Rol } from '@prisma/client';

class FavoritoService {
  /**
   * Obtiene todos los favoritos de un cliente
   */
  async getFavoritos(userId: string, rol: Rol) {
    try {
      // Verificar que el usuario es cliente
      if (rol !== Rol.CLIENTE) {
        throw new ApiError(403, 'Solo los clientes pueden tener favoritos');
      }

      // Buscar el cliente
      const cliente = await prisma.cliente.findUnique({
        where: { userId },
      });

      if (!cliente) {
        throw new ApiError(404, 'Cliente no encontrado');
      }

      // Obtener favoritos con información del técnico
      const favoritos = await prisma.favorito.findMany({
        where: { clienteId: cliente.id },
        include: {
          tecnico: {
            include: {
              user: {
                select: {
                  nombre: true,
                  email: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return favoritos;
    } catch (error) {
      logger.error('Error al obtener favoritos:', error);
      throw error;
    }
  }

  /**
   * Agrega un técnico a favoritos
   */
  async addFavorito(userId: string, rol: Rol, tecnicoId: string) {
    try {
      // Verificar que el usuario es cliente
      if (rol !== Rol.CLIENTE) {
        throw new ApiError(403, 'Solo los clientes pueden agregar favoritos');
      }

      // Buscar el cliente
      const cliente = await prisma.cliente.findUnique({
        where: { userId },
      });

      if (!cliente) {
        throw new ApiError(404, 'Cliente no encontrado');
      }

      // Verificar que el técnico existe
      const tecnico = await prisma.tecnico.findUnique({
        where: { id: tecnicoId },
      });

      if (!tecnico) {
        throw new ApiError(404, 'Técnico no encontrado');
      }

      // Verificar si ya está en favoritos
      const existingFavorito = await prisma.favorito.findUnique({
        where: {
          clienteId_tecnicoId: {
            clienteId: cliente.id,
            tecnicoId,
          },
        },
      });

      if (existingFavorito) {
        throw new ApiError(400, 'El técnico ya está en favoritos');
      }

      // Crear favorito
      const favorito = await prisma.favorito.create({
        data: {
          clienteId: cliente.id,
          tecnicoId,
        },
        include: {
          tecnico: {
            include: {
              user: {
                select: {
                  nombre: true,
                  email: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      logger.info(`Cliente ${cliente.id} agregó a favoritos al técnico ${tecnicoId}`);
      return favorito;
    } catch (error) {
      logger.error('Error al agregar favorito:', error);
      throw error;
    }
  }

  /**
   * Elimina un técnico de favoritos
   */
  async removeFavorito(userId: string, rol: Rol, tecnicoId: string) {
    try {
      // Verificar que el usuario es cliente
      if (rol !== Rol.CLIENTE) {
        throw new ApiError(403, 'Solo los clientes pueden eliminar favoritos');
      }

      // Buscar el cliente
      const cliente = await prisma.cliente.findUnique({
        where: { userId },
      });

      if (!cliente) {
        throw new ApiError(404, 'Cliente no encontrado');
      }

      // Verificar que el favorito existe
      const favorito = await prisma.favorito.findUnique({
        where: {
          clienteId_tecnicoId: {
            clienteId: cliente.id,
            tecnicoId,
          },
        },
      });

      if (!favorito) {
        throw new ApiError(404, 'Favorito no encontrado');
      }

      // Eliminar favorito
      await prisma.favorito.delete({
        where: {
          clienteId_tecnicoId: {
            clienteId: cliente.id,
            tecnicoId,
          },
        },
      });

      logger.info(`Cliente ${cliente.id} eliminó de favoritos al técnico ${tecnicoId}`);
      return { message: 'Técnico eliminado de favoritos' };
    } catch (error) {
      logger.error('Error al eliminar favorito:', error);
      throw error;
    }
  }

  /**
   * Verifica si un técnico está en favoritos
   */
  async isFavorito(userId: string, rol: Rol, tecnicoId: string): Promise<boolean> {
    try {
      // Verificar que el usuario es cliente
      if (rol !== Rol.CLIENTE) {
        return false;
      }

      // Buscar el cliente
      const cliente = await prisma.cliente.findUnique({
        where: { userId },
      });

      if (!cliente) {
        return false;
      }

      // Verificar si existe el favorito
      const favorito = await prisma.favorito.findUnique({
        where: {
          clienteId_tecnicoId: {
            clienteId: cliente.id,
            tecnicoId,
          },
        },
      });

      return !!favorito;
    } catch (error) {
      logger.error('Error al verificar favorito:', error);
      return false;
    }
  }
}

export const favoritoService = new FavoritoService();
