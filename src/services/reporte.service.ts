import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { EstadoTrabajo, Rol } from '@prisma/client';
import { CreateReporteInput, ResolveReporteInput } from '../validators/reporte.validator';

export class ReporteService {
  /**
   * Crea un reporte para un trabajo.
   * Puede ser creado por el cliente o el técnico involucrado.
   * Cambia el estado del trabajo a EN_DISPUTA.
   */
  async createReporte(trabajoId: string, userId: string, userRol: Rol, data: CreateReporteInput) {
    const trabajo = await prisma.trabajo.findUnique({
      where: { id: trabajoId },
      include: { cliente: true, tecnico: true },
    });

    if (!trabajo) {
      throw ApiError.notFound('Trabajo no encontrado');
    }

    // Verificar que el usuario sea parte del trabajo
    const isCliente = userRol === Rol.CLIENTE && trabajo.cliente.userId === userId;
    const isTecnico = userRol === Rol.TECNICO && trabajo.tecnico.userId === userId;

    if (!isCliente && !isTecnico) {
      throw ApiError.forbidden('No tienes permiso para reportar este trabajo');
    }

    // No se puede reportar un trabajo ya cancelado o en disputa
    if (trabajo.estado === EstadoTrabajo.CANCELADO || trabajo.estado === EstadoTrabajo.EN_DISPUTA) {
      throw ApiError.conflict(`El trabajo ya se encuentra en estado ${trabajo.estado}`);
    }

    const [reporte] = await prisma.$transaction([
      prisma.reporte.create({
        data: {
          trabajoId,
          reportadoPorId: userId,
          motivo: data.motivo,
          descripcion: data.descripcion,
        },
      }),
      prisma.trabajo.update({
        where: { id: trabajoId },
        data: { estado: EstadoTrabajo.EN_DISPUTA },
      }),
    ]);

    // Aquí se podría agregar una notificación para el admin y la otra parte.

    return reporte;
  }

  /**
   * Obtiene todos los trabajos que están en disputa (para el admin).
   */
  async getReportesActivos() {
    return prisma.trabajo.findMany({
      where: {
        estado: EstadoTrabajo.EN_DISPUTA,
      },
      include: {
        reportes: {
          orderBy: {
            fecha: 'desc',
          },
          include: {
            reportadoPor: {
              select: {
                id: true,
                nombre: true,
                rol: true,
              },
            },
          },
        },
        cliente: { include: { user: true } },
        tecnico: { include: { user: true } },
      },
      orderBy: {
        fechaSolicitud: 'desc',
      },
    });
  }

  /**
   * Resuelve una disputa (solo admin).
   * Cambia el estado del trabajo a COMPLETADO o CANCELADO.
   */
  async resolveReporte(trabajoId: string, data: ResolveReporteInput) {
    const trabajo = await prisma.trabajo.findUnique({
      where: { id: trabajoId },
    });

    if (!trabajo) {
      throw ApiError.notFound('Trabajo no encontrado');
    }

    if (trabajo.estado !== EstadoTrabajo.EN_DISPUTA) {
      throw ApiError.badRequest('El trabajo no se encuentra en disputa');
    }

    const updatedTrabajo = await prisma.trabajo.update({
      where: { id: trabajoId },
      data: { estado: data.nuevoEstado },
    });

    // Aquí se podría notificar a ambas partes sobre la resolución.

    return updatedTrabajo;
  }
}

export const reporteService = new ReporteService();
