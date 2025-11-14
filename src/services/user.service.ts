import { prisma } from '../config/database';
import { Rol, Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError';

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

  async getChatEligibleUsers(page: number, limit: number, searchQuery: string, currentUserId: string) {
    const skip = (page - 1) * limit;

    const searchCondition = searchQuery
      ? {
          OR: [
            { nombres: { contains: searchQuery, mode: Prisma.QueryMode.insensitive } },
            { apellidos: { contains: searchQuery, mode: Prisma.QueryMode.insensitive } },
            { oficio: { contains: searchQuery, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : {};

    // Fetch Technicians
    const technicians = await prisma.tecnico.findMany({
      where: {
        userId: { not: currentUserId }, // Exclude current user
        disponible: true,
        ...searchCondition,
      },
      select: {
        id: true, // This is the Tecnico.id, which is needed for createConversation
        nombres: true,
        apellidos: true,
        oficio: true,
        user: {
          select: {
            id: true, // User.id
            avatarUrl: true,
            rol: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        user: {
          nombre: 'asc',
        },
      },
    });

    // Fetch Admin
    let adminUser: any[] = [];
    const adminSearchMatch = searchQuery ? 'admin'.includes(searchQuery.toLowerCase()) || 'soporte'.includes(searchQuery.toLowerCase()) : true; // Check if search query matches 'admin' or 'soporte'
    if (adminSearchMatch && page === 1) { // Only fetch admin on first page if search matches or is empty
      const admin = await prisma.user.findFirst({
        where: {
          rol: Rol.ADMIN,
          id: { not: currentUserId }, // Exclude current user if they are admin
          ...(searchQuery && { nombre: { contains: searchQuery, mode: Prisma.QueryMode.insensitive } }), // Apply search to admin name
        },
        select: {
          id: true, // User.id
          nombre: true,
          avatarUrl: true,
          rol: true,
        },
      });
      if (admin) {
        adminUser = [{
          id: admin.id, // For admin, we'll use User.id as their profile ID for chat
          userId: admin.id, // Also include User.id
          nombre: admin.nombre,
          avatarUrl: admin.avatarUrl,
          rol: admin.rol,
          oficio: null, // Admin doesn't have an oficio
        }];
      }
    }

    const formattedTechnicians = technicians.map(t => ({
      id: t.id, // Tecnico.id
      userId: t.user.id, // User.id
      nombre: `${t.nombres} ${t.apellidos}`,
      avatarUrl: t.user.avatarUrl,
      rol: t.user.rol,
      oficio: t.oficio,
    }));

    const combinedUsers = [...adminUser, ...formattedTechnicians];

    // For total count, we need to count technicians and admin separately
    const totalTechnicians = await prisma.tecnico.count({
      where: {
        userId: { not: currentUserId },
        disponible: true,
        ...searchCondition,
      },
    });

    let totalAdminCount = 0;
    if (adminSearchMatch) { // Only count admin if search matches or is empty
      totalAdminCount = await prisma.user.count({
        where: {
          rol: Rol.ADMIN,
          id: { not: currentUserId },
          ...(searchQuery && { nombre: { contains: searchQuery, mode: Prisma.QueryMode.insensitive } }), // Apply search to admin name
        },
      });
    }

    const total = totalTechnicians + totalAdminCount; // This total is approximate for pagination with combined results

    return {
      users: combinedUsers,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  }

  async getAdmin() {
    const admin = await prisma.user.findFirst({
      where: { rol: Rol.ADMIN },
      select: {
        id: true,
        nombre: true,
        avatarUrl: true,
      },
    });

    if (!admin) {
      throw new ApiError(404, 'No se encontró el usuario administrador.');
    }

    return admin;
  }
}

export const userService = new UserService();
