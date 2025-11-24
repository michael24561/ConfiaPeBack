import { prisma } from '../config/database';
import { EstadoPago } from '@prisma/client';

export class AdminService {
  async getStats() {
    const [tecnicos, clientes, trabajos, pagosCompletados] = await Promise.all([
      prisma.tecnico.count(),
      prisma.cliente.count(),
      prisma.trabajo.count(),
      prisma.pago.findMany({
        where: {
          mpStatus: EstadoPago.APROBADO,
        },
        select: { montoTotal: true },
      }),
    ]);

    const ingresosBrutosTotales = pagosCompletados.reduce(
      (sum, pago) => sum + Number(pago.montoTotal || 0),
      0
    );
    const ingresosPlataforma = ingresosBrutosTotales;

    return { tecnicos, clientes, trabajos, ingresosPlataforma };
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
