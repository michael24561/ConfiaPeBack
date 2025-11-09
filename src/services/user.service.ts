import { prisma } from '../config/database';
import { Rol } from '@prisma/client';

class UserService {
  async getUsers(page: number, limit: number, currentUserId: string) {
    const skip = (page - 1) * limit;

    const users = await prisma.user.findMany({
      where: {
        id: {
          not: currentUserId, // Exclude the current user
        },
        rol: {
          not: Rol.ADMIN, // Exclude admins
        },
        isActive: true,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        avatarUrl: true,
        rol: true,
        tecnico: {
          select: {
            oficio: true,
          }
        }
      },
      skip: skip,
      take: limit,
      orderBy: {
        nombre: 'asc',
      },
    });

    const totalUsers = await prisma.user.count({
      where: {
        id: {
          not: currentUserId,
        },
        rol: {
          not: Rol.ADMIN,
        },
        isActive: true,
      },
    });

    return {
      users: users.map(u => ({
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        avatarUrl: u.avatarUrl,
        rol: u.rol,
        oficio: u.tecnico?.oficio || null
      })),
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
    };
  }
}

export const userService = new UserService();
