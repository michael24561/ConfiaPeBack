import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { EstadoTrabajo } from '@prisma/client';

export class DashboardService {
  /**
   * Obtiene estadísticas generales del técnico
   */
  async getTecnicoStats(userId: string) {
    const tecnico = await prisma.tecnico.findUnique({
      where: { userId },
    });

    if (!tecnico) {
      throw ApiError.notFound('Perfil de técnico no encontrado');
    }

    // Queries en paralelo para optimización
    const [
      trabajosCount,
      ingresosTotal,
      reviewsCount,
      trabajosPorEstado,
      ultimosTrabajos,
    ] = await Promise.all([
      // Total de trabajos
      prisma.trabajo.count({
        where: { tecnicoId: tecnico.id },
      }),
      // Ingresos totales
      prisma.trabajo.aggregate({
        where: {
          tecnicoId: tecnico.id,
          estado: EstadoTrabajo.COMPLETADO,
          precio: { not: null },
        },
        _sum: { precio: true },
      }),
      // Total de reviews
      prisma.review.count({
        where: { tecnicoId: tecnico.id },
      }),
      // Trabajos por estado
      prisma.trabajo.groupBy({
        by: ['estado'],
        where: { tecnicoId: tecnico.id },
        _count: true,
      }),
      // Últimos trabajos
      prisma.trabajo.findMany({
        where: { tecnicoId: tecnico.id },
        include: {
          cliente: {
            include: {
              user: {
                select: {
                  nombre: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: { fechaSolicitud: 'desc' },
        take: 5,
      }),
    ]);

    // Formatear datos
    const estadosCounts = {
      PENDIENTE: 0,
      ACEPTADO: 0,
      EN_PROGRESO: 0,
      COMPLETADO: 0,
      CANCELADO: 0,
    };

    trabajosPorEstado.forEach((item) => {
      estadosCounts[item.estado] = item._count;
    });

    return {
      trabajos: {
        total: trabajosCount,
        completados: estadosCounts.COMPLETADO,
        pendientes: estadosCounts.PENDIENTE,
        aceptados: estadosCounts.ACEPTADO,
        enProgreso: estadosCounts.EN_PROGRESO,
        cancelados: estadosCounts.CANCELADO,
      },
      ingresos: {
        total: Number(ingresosTotal._sum.precio || 0),
        promedioPorTrabajo:
          estadosCounts.COMPLETADO > 0
            ? Number(ingresosTotal._sum.precio || 0) / estadosCounts.COMPLETADO
            : 0,
      },
      reviews: {
        total: reviewsCount,
        calificacionPromedio: Number(tecnico.calificacionPromedio || 0),
      },
      ultimosTrabajos,
    };
  }

  /**
   * Obtiene datos de ingresos del técnico con gráficos
   */
  async getIngresos(userId: string, periodo: 'semana' | 'mes' | 'año' = 'mes') {
    const tecnico = await prisma.tecnico.findUnique({
      where: { userId },
    });

    if (!tecnico) {
      throw ApiError.notFound('Perfil de técnico no encontrado');
    }

    // Calcular fecha de inicio según periodo
    const now = new Date();
    const fechaInicio = new Date();

    switch (periodo) {
      case 'semana':
        fechaInicio.setDate(now.getDate() - 7);
        break;
      case 'mes':
        fechaInicio.setMonth(now.getMonth() - 1);
        break;
      case 'año':
        fechaInicio.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Trabajos completados en el periodo
    const trabajos = await prisma.trabajo.findMany({
      where: {
        tecnicoId: tecnico.id,
        estado: EstadoTrabajo.COMPLETADO,
        fechaCompletado: {
          gte: fechaInicio,
          lte: now,
        },
      },
      select: {
        precio: true,
        fechaCompletado: true,
        servicioNombre: true,
      },
      orderBy: {
        fechaCompletado: 'asc',
      },
    });

    // Calcular totales
    const ingresoTotal = trabajos.reduce((sum, t) => sum + Number(t.precio || 0), 0);

    // Agrupar por fecha para gráfico
    const ingresosPorFecha: Record<string, number> = {};
    trabajos.forEach((trabajo) => {
      if (trabajo.fechaCompletado) {
        const fecha = trabajo.fechaCompletado.toISOString().split('T')[0];
        if (fecha) {
          ingresosPorFecha[fecha] = (ingresosPorFecha[fecha] || 0) + Number(trabajo.precio || 0);
        }
      }
    });

    // Top servicios por ingreso
    const serviciosIngresos: Record<string, number> = {};
    trabajos.forEach((trabajo) => {
      const servicio = trabajo.servicioNombre || 'Sin especificar';
      serviciosIngresos[servicio] = (serviciosIngresos[servicio] || 0) + Number(trabajo.precio || 0);
    });

    const topServicios = Object.entries(serviciosIngresos)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([nombre, ingreso]) => ({ nombre, ingreso }));

    return {
      periodo,
      ingresoTotal,
      trabajosCompletados: trabajos.length,
      promedioPorTrabajo: trabajos.length > 0 ? ingresoTotal / trabajos.length : 0,
      grafico: Object.entries(ingresosPorFecha).map(([fecha, ingreso]) => ({
        fecha,
        ingreso,
      })),
      topServicios,
    };
  }

  /**
   * Obtiene lista de clientes del técnico
   */
  async getClientes(userId: string) {
    const tecnico = await prisma.tecnico.findUnique({
      where: { userId },
    });

    if (!tecnico) {
      throw ApiError.notFound('Perfil de técnico no encontrado');
    }

    // Obtener clientes únicos con sus trabajos
    const trabajos = await prisma.trabajo.findMany({
      where: { tecnicoId: tecnico.id },
      include: {
        cliente: {
          include: {
            user: {
              select: {
                nombre: true,
                email: true,
                telefono: true,
                avatarUrl: true,
              },
            },
          },
        },
        review: {
          select: {
            calificacion: true,
          },
        },
      },
      orderBy: {
        fechaSolicitud: 'desc',
      },
    });

    // Agrupar por cliente
    const clientesMap = new Map<
      string,
      {
        cliente: any;
        trabajosTotal: number;
        trabajosCompletados: number;
        ingresoTotal: number;
        ultimaInteraccion: Date;
        calificacionPromedio: number;
      }
    >();

    trabajos.forEach((trabajo) => {
      const clienteId = trabajo.cliente.id;

      if (!clientesMap.has(clienteId)) {
        clientesMap.set(clienteId, {
          cliente: trabajo.cliente,
          trabajosTotal: 0,
          trabajosCompletados: 0,
          ingresoTotal: 0,
          ultimaInteraccion: trabajo.fechaSolicitud,
          calificacionPromedio: 0,
        });
      }

      const data = clientesMap.get(clienteId)!;
      data.trabajosTotal++;

      if (trabajo.estado === EstadoTrabajo.COMPLETADO) {
        data.trabajosCompletados++;
        data.ingresoTotal += Number(trabajo.precio || 0);
      }

      if (trabajo.fechaSolicitud > data.ultimaInteraccion) {
        data.ultimaInteraccion = trabajo.fechaSolicitud;
      }
    });

    // Calcular calificación promedio por cliente
    const clientesArray = Array.from(clientesMap.values());

    for (const clienteData of clientesArray) {
      const reviews = await prisma.review.findMany({
        where: {
          clienteId: clienteData.cliente.id,
          tecnicoId: tecnico.id,
        },
        select: {
          calificacion: true,
        },
      });

      if (reviews.length > 0) {
        clienteData.calificacionPromedio =
          reviews.reduce((sum, r) => sum + r.calificacion, 0) / reviews.length;
      }
    }

    return {
      total: clientesArray.length,
      clientes: clientesArray
        .sort((a, b) => b.trabajosTotal - a.trabajosTotal)
        .map((data) => ({
          cliente: {
            id: data.cliente.id,
            ...data.cliente.user,
          },
          trabajosTotal: data.trabajosTotal,
          trabajosCompletados: data.trabajosCompletados,
          ingresoTotal: data.ingresoTotal,
          ultimaInteraccion: data.ultimaInteraccion,
          calificacionPromedio: Math.round(data.calificacionPromedio * 10) / 10,
        })),
    };
  }

  /**
   * Obtiene estadísticas de rendimiento
   */
  async getRendimiento(userId: string) {
    const tecnico = await prisma.tecnico.findUnique({
      where: { userId },
    });

    if (!tecnico) {
      throw ApiError.notFound('Perfil de técnico no encontrado');
    }

    const [trabajos, reviews] = await Promise.all([
      prisma.trabajo.findMany({
        where: {
          tecnicoId: tecnico.id,
          estado: EstadoTrabajo.COMPLETADO,
        },
        select: {
          fechaSolicitud: true,
          fechaCompletado: true,
        },
      }),
      prisma.review.findMany({
        where: { tecnicoId: tecnico.id },
        select: {
          calificacion: true,
          fechaCreacion: true,
        },
      }),
    ]);

    // Calcular tiempo promedio de completado
    const tiemposCompletado = trabajos
      .filter((t) => t.fechaCompletado)
      .map((t) => {
        const inicio = t.fechaSolicitud.getTime();
        const fin = t.fechaCompletado!.getTime();
        return (fin - inicio) / (1000 * 60 * 60); // horas
      });

    const tiempoPromedioHoras =
      tiemposCompletado.length > 0
        ? tiemposCompletado.reduce((sum, t) => sum + t, 0) / tiemposCompletado.length
        : 0;

    // Evolución de calificaciones (últimos 6 meses)
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

    const reviewsRecientes = reviews.filter((r) => r.fechaCreacion >= seisMesesAtras);

    return {
      trabajosCompletados: trabajos.length,
      tiempoPromedioCompletado: {
        horas: Math.round(tiempoPromedioHoras),
        dias: Math.round(tiempoPromedioHoras / 24),
      },
      calificaciones: {
        promedio: Number(tecnico.calificacionPromedio || 0),
        total: reviews.length,
        ultimos6Meses: reviewsRecientes.length,
      },
      tasaCompletado: await this.calcularTasaCompletado(tecnico.id),
    };
  }

  /**
   * Calcula tasa de completado (trabajos completados / total aceptados)
   */
  private async calcularTasaCompletado(tecnicoId: string): Promise<number> {
    const [completados, totales] = await Promise.all([
      prisma.trabajo.count({
        where: {
          tecnicoId,
          estado: EstadoTrabajo.COMPLETADO,
        },
      }),
      prisma.trabajo.count({
        where: {
          tecnicoId,
          estado: {
            in: [EstadoTrabajo.ACEPTADO, EstadoTrabajo.EN_PROGRESO, EstadoTrabajo.COMPLETADO],
          },
        },
      }),
    ]);

    return totales > 0 ? Math.round((completados / totales) * 100) : 0;
  }
}

export const dashboardService = new DashboardService();
