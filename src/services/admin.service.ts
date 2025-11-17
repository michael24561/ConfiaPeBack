import { prisma } from '../config/database';
import { EstadoPago } from '@prisma/client';
import { payoutService } from './payout.service';

export class AdminService {
  async getStats() {
    const [tecnicos, clientes, trabajos, pagosCompletados] = await Promise.all([
      prisma.tecnico.count(),
      prisma.cliente.count(),
      prisma.trabajo.count(),
      prisma.pago.findMany({
        where: {
          estado: EstadoPago.PAGADO,
        },
        select: { monto: true },
      }),
    ]);

    const ingresosBrutosTotales = pagosCompletados.reduce(
      (sum, pago) => sum + Number(pago.monto || 0),
      0
    );
    const ingresosPlataforma = ingresosBrutosTotales * payoutService.PLATFORM_FEE_PERCENTAGE;

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
