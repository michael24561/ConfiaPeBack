import { prisma } from '../config/database';

export class AdminService {
  async getStats() {
    const [tecnicos, clientes, trabajos, servicios] = await Promise.all([
      prisma.tecnico.count(),
      prisma.cliente.count(),
      prisma.trabajo.count(),
      prisma.servicio.count(),
    ]);
    return { tecnicos, clientes, trabajos, servicios };
  }

  async getTecnicos() {
    return prisma.tecnico.findMany({
      include: {
        user: true,
      },
    });
  }

  async getClientes() {
    return prisma.cliente.findMany({
      include: {
        user: true,
      },
    });
  }

  async getTrabajos() {
    return prisma.trabajo.findMany({
      include: {
        cliente: {
          include: {
            user: true,
          },
        },
        tecnico: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async getServicios() {
    return prisma.servicio.findMany();
  }
}

export const adminService = new AdminService();
