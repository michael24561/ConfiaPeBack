import { prisma } from '../config/database';
import { EstadoTrabajo } from '@prisma/client';

export class AdminService {
  async getStats() {
    const [tecnicos, clientes, trabajos, servicios, trabajosCompletados] = await Promise.all([
      prisma.tecnico.count(),
      prisma.cliente.count(),
      prisma.trabajo.count(),
      prisma.servicio.count(),
      prisma.trabajo.findMany({
        where: {
          estado: EstadoTrabajo.COMPLETADO,
          precio: { not: null },
        },
        select: { precio: true },
      }),
    ]);

    const ingresosBrutosTotales = trabajosCompletados.reduce(
      (sum, job) => sum + Number(job.precio || 0),
      0
    );
    const ingresosPlataforma = ingresosBrutosTotales * 0.05;

    return { tecnicos, clientes, trabajos, servicios, ingresosPlataforma };
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
