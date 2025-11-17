import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { Prisma, EstadoTrabajo, Rol, EstadoReporte } from '@prisma/client'; // Import EstadoReporte from @prisma/client
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
   * Lista todos los reportes para el panel de administración con filtros y paginación.
   */
  async getAdminReportes(filters: { 
        estado?: EstadoTrabajo | undefined; 
        tecnicoId?: string | undefined; 
        clienteId?: string | undefined; 
        page?: number | undefined; 
        limit?: number | undefined 
    }) {
    const { estado, tecnicoId, clienteId } = filters
    const page = Number(filters.page || 1)
    const limit = Number(filters.limit || 10)
    const skip = (page - 1) * limit

    const where: Prisma.ReporteWhereInput = {
      trabajo: {}, // Inicializar trabajo como un objeto vacío
    }

   if (estado) {
      (where.trabajo as Prisma.TrabajoWhereInput).estado = estado
    }
    if (tecnicoId !== undefined) {
      (where.trabajo as Prisma.TrabajoWhereInput).tecnicoId = tecnicoId
    }
    if (clienteId !== undefined) {
      (where.trabajo as Prisma.TrabajoWhereInput).clienteId = clienteId
    }

    const [reportes, total] = await Promise.all([
      prisma.reporte.findMany({
        where,
        include: {
          trabajo: {
            include: {
              cliente: { include: { user: { select: { nombre: true, avatarUrl: true } } } },
              tecnico: { include: { user: { select: { nombre: true, avatarUrl: true } } } },
            },
          },
          reportadoPor: { select: { nombre: true, rol: true } },
        },
        orderBy: { fecha: 'desc' },
        skip,
        take: limit,
      }),
      prisma.reporte.count({ where }),
    ])

    return {
      data: reportes,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }
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

    const updatedTrabajo = await prisma.$transaction(async (tx) => {
      const updatedJob = await tx.trabajo.update({
        where: { id: trabajoId },
        data: { estado: data.nuevoEstado },
      });

      let newReporteEstado: EstadoReporte;
      if (data.nuevoEstado === EstadoTrabajo.COMPLETADO) {
        newReporteEstado = EstadoReporte.RESUELTO;
      } else if (data.nuevoEstado === EstadoTrabajo.CANCELADO) {
        newReporteEstado = EstadoReporte.RECHAZADO; // Or RESUELTO, depending on business logic for cancelled jobs
      } else {
        // If the job state is changed to something else, reports might remain EN_REVISION or PENDIENTE
        // For now, we'll only resolve/reject if job is completed/cancelled
        newReporteEstado = EstadoReporte.EN_REVISION; // Default or keep current if not explicitly resolved/rejected
      }

      // Update all reports associated with this job
      await tx.reporte.updateMany({
        where: { trabajoId: trabajoId },
        data: {
          estado: {
            set: newReporteEstado,
          },
        },
      });

      return updatedJob;
    });

    // Aquí se podría agregar una notificación para el admin y la otra parte.

    return updatedTrabajo;
  }
}

export const reporteService = new ReporteService();
