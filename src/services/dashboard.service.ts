import { Prisma } from '@prisma/client';
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
      reviewsCount,
      trabajosPorEstado,
      ultimosTrabajos,
      trabajosCompletadosParaIngresos,
    ] = await Promise.all([
      // Total de trabajos
      prisma.trabajo.count({
        where: { tecnicoId: tecnico.id },
      }),
      // Total de calificaciones
      prisma.calificacion.count({
        where: { trabajo: { tecnicoId: tecnico.id } },
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
          calificacion: {
            select: {
              puntuacion: true,
            },
          },
        },
        orderBy: { fechaSolicitud: 'desc' },
        take: 5,
      }),
      // Trabajos completados para calcular ingresos netos
      prisma.trabajo.findMany({
        where: {
          tecnicoId: tecnico.id,
          estado: EstadoTrabajo.COMPLETADO,
          precio: { not: null },
        },
        select: { precio: true },
      }),
    ]);

    // Calcular ingresos netos (95% del total)
    const ingresosBrutos = trabajosCompletadosParaIngresos.reduce(
      (sum: number, job: { precio: Prisma.Decimal | null }) => sum + Number(job.precio || 0),
      0
    );
    const ingresosNetos = ingresosBrutos * 0.95;

    // Formatear datos
    const estadosCounts = {
      PENDIENTE: 0,
      RECHAZADO: 0,
      NECESITA_VISITA: 0,
      COTIZADO: 0,
      ACEPTADO: 0,
      EN_PROGRESO: 0,
      COMPLETADO: 0,
      CANCELADO: 0,
      EN_DISPUTA: 0,
    };

    trabajosPorEstado.forEach((item: { estado: EstadoTrabajo; _count: number }) => {
      if (item.estado in estadosCounts) {
        estadosCounts[item.estado] = item._count;
      }
    });

    return {
      trabajos: {
        total: trabajosCount,
        completados: estadosCounts.COMPLETADO,
        pendientes: estadosCounts.PENDIENTE,
        aceptados: estadosCounts.ACEPTADO,
        enProgreso: estadosCounts.EN_PROGRESO,
        cancelados: estadosCounts.CANCELADO,
        rechazados: estadosCounts.RECHAZADO,
        necesitaVisita: estadosCounts.NECESITA_VISITA,
        cotizados: estadosCounts.COTIZADO,
      },
      ingresos: {
        total: ingresosNetos,
        promedioPorTrabajo:
          estadosCounts.COMPLETADO > 0
            ? ingresosNetos / estadosCounts.COMPLETADO
            : 0,
      },
      reviews: {
        total: reviewsCount, // Ahora es calificacionesCount
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
    const ingresoBrutoTotal = trabajos.reduce((sum, t) => sum + Number(t.precio || 0), 0);
    const ingresoNetoTotal = ingresoBrutoTotal * 0.95; // Aplicar comisión del 5%

    // Agrupar por fecha para gráfico (usando ingreso bruto para el detalle)
    const ingresosPorFecha: Record<string, number> = {};
    trabajos.forEach((trabajo) => {
      if (trabajo.fechaCompletado) {
        const fecha = trabajo.fechaCompletado.toISOString().split('T')[0];
        if (fecha) {
          ingresosPorFecha[fecha] = (ingresosPorFecha[fecha] || 0) + Number(trabajo.precio || 0);
        }
      }
    });

    // Top servicios por ingreso (usando ingreso bruto)
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
      ingresoTotal: ingresoNetoTotal, // Devolver el neto
      trabajosCompletados: trabajos.length,
      promedioPorTrabajo: trabajos.length > 0 ? ingresoNetoTotal / trabajos.length : 0, // Promedio neto
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
        calificacion: {
          select: {
            puntuacion: true,
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
        cliente: {
          id: string;
          user: {
            nombre: string;
            email: string;
            telefono: string | null;
            avatarUrl: string | null;
          };
        };
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
      const calificaciones = await prisma.calificacion.findMany({
        where: {
          trabajo: {
            clienteId: clienteData.cliente.id,
            tecnicoId: tecnico.id,
          },
        },
        select: {
          puntuacion: true,
        },
      });

      if (calificaciones.length > 0) {
        clienteData.calificacionPromedio =
          calificaciones.reduce((sum, r) => sum + r.puntuacion, 0) / calificaciones.length;
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

    const [trabajos, calificaciones] = await Promise.all([
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
      prisma.calificacion.findMany({
        where: { trabajo: { tecnicoId: tecnico.id } },
        select: {
          puntuacion: true,
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
        ? tiemposCompletado.reduce((sum: number, t: number) => sum + t, 0) / tiemposCompletado.length
        : 0;

    // Evolución de calificaciones (últimos 6 meses)
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

    const calificacionesRecientes = calificaciones.filter((r) => r.fechaCreacion >= seisMesesAtras);

    return {
      trabajosCompletados: trabajos.length,
      tiempoPromedioCompletado: {
        horas: Math.round(tiempoPromedioHoras),
        dias: Math.round(tiempoPromedioHoras / 24),
      },
      calificaciones: {
        promedio: Number(tecnico.calificacionPromedio || 0),
        total: calificaciones.length,
        ultimos6Meses: calificacionesRecientes.length,
      },
      tasaCompletado: await this.calcularTasaCompletado(tecnico.id),
    };
  }

  /**
   * Obtiene estadísticas generales para el dashboard del cliente
   */
  async getClienteStats(userId: string) {
    const cliente = await prisma.cliente.findUnique({
      where: { userId },
    });

    if (!cliente) {
      throw ApiError.notFound('Perfil de cliente no encontrado');
    }

    const trabajosPorEstado = await prisma.trabajo.groupBy({
      by: ['estado'],
      where: { clienteId: cliente.id },
      _count: true,
    });

    const estados = {
      PENDIENTE: 0,
      RECHAZADO: 0,
      NECESITA_VISITA: 0,
      COTIZADO: 0,
      ACEPTADO: 0,
      EN_PROGRESO: 0,
      COMPLETADO: 0,
      CANCELADO: 0,
      EN_DISPUTA: 0,
    };

    trabajosPorEstado.forEach((item) => {
      if (item.estado in estados) {
        estados[item.estado] = item._count;
      }
    });

    const totalSolicitudes = await prisma.trabajo.count({
      where: { clienteId: cliente.id },
    });

    return {
      totalSolicitudes,
      solicitudesPendientes: estados.PENDIENTE,
      trabajosEnProgreso: estados.EN_PROGRESO,
      trabajosCompletados: estados.COMPLETADO,
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
