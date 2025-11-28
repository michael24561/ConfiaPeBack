import { Prisma, EstadoPago } from '@prisma/client';
import { prisma } from '../config/database';
import { uploadToCloudinary } from '../config/cloudinary';
import { ApiError } from '../utils/ApiError';
import {
  GetTecnicosInput,
  UpdateTecnicoInput,
  AddServicioInput,
  AddCertificadoInput,
  UpdateCertificadoInput,
  AddGaleriaInput,
  UpdateHorariosInput,
  UpdateConfiguracionInput,
} from '../validators/tecnico.validator';

import { reniecService } from './reniec.service';

export class TecnicoService {
  /**
   * Lista técnicos con filtros y paginación
   */
  async getTecnicos(filters: GetTecnicosInput, userId?: string) {
    const {
      categoria,
      q: busqueda,
      calificacionMin,
      disponible,
      verificado,
      orderBy = 'relevancia',
      page = 1,
      limit = 12,
    } = filters;

    const skip = (page - 1) * limit;

    // Construir filtros WHERE
    const where: Prisma.TecnicoWhereInput = {
      AND: [
        categoria && categoria !== 'todos' ? { oficio: categoria } : {},
        calificacionMin ? { calificacionPromedio: { gte: calificacionMin } } : {},
        disponible !== undefined ? { disponible } : {},
        verificado !== undefined ? { verificado } : {},
        busqueda
          ? {
            OR: [
              { nombres: { contains: busqueda, mode: 'insensitive' } },
              { apellidos: { contains: busqueda, mode: 'insensitive' } },
              { oficio: { contains: busqueda, mode: 'insensitive' } },
              { user: { nombre: { contains: busqueda, mode: 'insensitive' } } },
            ],
          }
          : {},
      ],
    };

    // Construir ORDER BY
    let orderByClause: Prisma.TecnicoOrderByWithRelationInput = {};
    switch (orderBy) {
      case 'calificacion':
        orderByClause = { calificacionPromedio: 'desc' };
        break;
      case 'trabajos':
        orderByClause = { trabajosCompletados: 'desc' };
        break;
      default:
        orderByClause = { calificacionPromedio: 'desc' };
    }

    // Obtener clienteId si hay usuario autenticado
    let clienteId: string | null = null;
    if (userId) {
      const cliente = await prisma.cliente.findUnique({
        where: { userId },
        select: { id: true }
      });
      clienteId = cliente?.id || null;
    }

    // Ejecutar queries en paralelo
    const [tecnicos, total] = await Promise.all([
      prisma.tecnico.findMany({
        where,
        select: {
          id: true,
          nombres: true,
          apellidos: true,
          oficio: true,
          descripcion: true,
          ubicacion: true,
          calificacionPromedio: true,
          trabajosCompletados: true,
          experienciaAnios: true,
          verificado: true,
          disponible: true,
          user: {
            select: {
              nombre: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              trabajos: {
                where: {
                  calificacion: {
                    isNot: null,
                  },
                },
              },
            },
          },
        },
        orderBy: orderByClause,
        skip,
        take: limit,
      }),
      prisma.tecnico.count({ where }),
    ]);

    // Si hay un cliente autenticado, agregar información de favoritos
    let tecnicosConFavoritos = tecnicos;
    if (clienteId) {
      const favoritos = await prisma.favorito.findMany({
        where: { clienteId },
        select: { tecnicoId: true }
      });
      const favoritosSet = new Set(favoritos.map(f => f.tecnicoId));

      tecnicosConFavoritos = tecnicos.map(tecnico => ({
        ...tecnico,
        esFavorito: favoritosSet.has(tecnico.id)
      }));
    } else {
      tecnicosConFavoritos = tecnicos.map(tecnico => ({
        ...tecnico,
        esFavorito: false
      }));
    }

    return {
      data: tecnicosConFavoritos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtiene un técnico por ID con toda su información
   */
  async getTecnicoById(id: string) {
    const [tecnico, calificacionesCount] = await Promise.all([
      prisma.tecnico.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              nombre: true,
              email: true,
              telefono: true,
              avatarUrl: true,
            },
          },
          servicios: {
            select: {
              id: true,
              nombre: true,
              descripcion: true,
              precio: true,
            },
          },
          horarios: {
            select: {
              id: true,
              diaSemana: true,
              disponible: true,
              horaInicio: true,
              horaFin: true,
            },
            orderBy: {
              diaSemana: 'asc',
            },
          },
          certificados: {
            select: {
              id: true,
              nombre: true,
              institucion: true,
              imagenUrl: true,
              fechaObtencion: true,
            },
          },
          galeria: {
            select: {
              id: true,
              imagenUrl: true,
              descripcion: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      }),
      prisma.calificacion.count({
        where: {
          trabajo: {
            tecnicoId: id,
          },
        },
      }),
    ]);

    if (!tecnico) {
      throw ApiError.notFound('Técnico no encontrado');
    }

    const calificaciones: any[] = [];
    const reviewStats = this.getReviewStats(calificaciones);

    return {
      ...tecnico,
      calificaciones,
      reviewStats,
      _count: {
        calificaciones: calificacionesCount,
      },
    };
  }

  /**
   * Obtiene el perfil del técnico autenticado
   */
  async getMyProfile(userId: string) {
    const tecnico = await prisma.tecnico.findUnique({
      where: { userId },
      include: {
        user: true,
        servicios: true,
        horarios: true,
        certificados: true,
        galeria: true,
        configuracion: true,
      },
    });

    if (!tecnico) {
      throw ApiError.notFound('Perfil de técnico no encontrado');
    }

    return tecnico;
  }

  /**
   * Actualiza el perfil del técnico
   */
  async updateProfile(userId: string, data: UpdateTecnicoInput) {
    const tecnico = await prisma.tecnico.findUnique({
      where: { userId },
    });

    if (!tecnico) {
      throw ApiError.notFound('Perfil de técnico no encontrado');
    }

    const updated = await prisma.tecnico.update({
      where: { id: tecnico.id },
      data: {
        ...(data.nombres !== undefined && { nombres: data.nombres }),
        ...(data.apellidos !== undefined && { apellidos: data.apellidos }),
        ...(data.oficio !== undefined && { oficio: data.oficio }),
        ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
        ...(data.ubicacion !== undefined && { ubicacion: data.ubicacion }),
        ...(data.experienciaAnios !== undefined && { experienciaAnios: data.experienciaAnios }),
        ...(data.disponible !== undefined && { disponible: data.disponible }),
      },
      include: {
        user: true,
      },
    });

    return updated;
  }

  /**
   * Agrega un servicio al técnico
   */
  async addServicio(userId: string, data: AddServicioInput) {
    const tecnico = await prisma.tecnico.findUnique({
      where: { userId },
    });

    if (!tecnico) {
      throw ApiError.notFound('Perfil de técnico no encontrado');
    }

    const servicio = await prisma.servicio.create({
      data: {
        tecnicoId: tecnico.id,
        nombre: data.nombre,
        ...(data.descripcion && { descripcion: data.descripcion }),
        ...(data.precio && { precio: data.precio }),
      },
    });

    return servicio;
  }

  /**
   * Elimina un servicio del técnico
   */
  async deleteServicio(userId: string, servicioId: string) {
    const tecnico = await prisma.tecnico.findUnique({
      where: { userId },
    });

    if (!tecnico) {
      throw ApiError.notFound('Perfil de técnico no encontrado');
    }

    const result = await prisma.servicio.deleteMany({
      where: {
        id: servicioId,
        tecnicoId: tecnico.id,
      },
    });

    if (result.count === 0) {
      throw ApiError.notFound('Servicio no encontrado o no pertenece al técnico');
    }

    return { message: 'Servicio eliminado correctamente' };
  }

  /**
   * Agrega un certificado con imagen
   */
  async addCertificado(userId: string, data: AddCertificadoInput, file?: Express.Multer.File) {
    const tecnico = await prisma.tecnico.findUnique({
      where: { userId },
    });

    if (!tecnico) {
      throw ApiError.notFound('Perfil de técnico no encontrado');
    }

    if (!file) {
      throw ApiError.badRequest('Debe proporcionar una imagen del certificado');
    }

    // Subir imagen a Cloudinary
    const uploadResult = await uploadToCloudinary(file, 'confiape/certificados');

    const certificado = await prisma.certificado.create({
      data: {
        tecnicoId: tecnico.id,
        nombre: data.nombre,
        imagenUrl: uploadResult.url,
        ...(data.institucion && { institucion: data.institucion }),
        ...(data.fechaObtencion && { fechaObtencion: new Date(data.fechaObtencion) }),
      },
    });

    return certificado;
  }

  /**
   * Elimina un certificado del técnico
   */
  async deleteCertificado(userId: string, certificadoId: string) {
    const tecnico = await prisma.tecnico.findUnique({
      where: { userId },
    });

    if (!tecnico) {
      throw ApiError.notFound('Perfil de técnico no encontrado');
    }

    const result = await prisma.certificado.deleteMany({
      where: {
        id: certificadoId,
        tecnicoId: tecnico.id,
      },
    });

    if (result.count === 0) {
      throw ApiError.notFound('Certificado no encontrado o no pertenece al técnico');
    }

    return { message: 'Certificado eliminado correctamente' };
  }

  /**
   * Actualiza un certificado del técnico
   */
  async updateCertificado(userId: string, certificadoId: string, data: UpdateCertificadoInput) {
    const tecnico = await prisma.tecnico.findUnique({
      where: { userId },
    });

    if (!tecnico) {
      throw ApiError.notFound('Perfil de técnico no encontrado');
    }

    // Verificar que el certificado pertenezca al técnico
    const certificado = await prisma.certificado.findFirst({
      where: {
        id: certificadoId,
        tecnicoId: tecnico.id,
      },
    });

    if (!certificado) {
      throw ApiError.notFound('Certificado no encontrado o no pertenece al técnico');
    }

    const updatedCertificado = await prisma.certificado.update({
      where: { id: certificadoId },
      data: {
        ...(data.nombre && { nombre: data.nombre }),
        ...(data.institucion !== undefined && { institucion: data.institucion }),
        ...(data.fechaObtencion && { fechaObtencion: new Date(data.fechaObtencion) }),
      },
    });

    return updatedCertificado;
  }

  /**
   * Agrega una imagen a la galería del técnico
   */
  async addGaleriaItem(userId: string, data: AddGaleriaInput, file?: Express.Multer.File) {
    const tecnico = await prisma.tecnico.findUnique({
      where: { userId },
    });

    if (!tecnico) {
      throw ApiError.notFound('Perfil de técnico no encontrado');
    }

    if (!file) {
      throw ApiError.badRequest('Debe proporcionar una imagen');
    }

    // Subir imagen a Cloudinary
    const uploadResult = await uploadToCloudinary(file, 'confiape/galeria');

    const galeriaItem = await prisma.galeriaItem.create({
      data: {
        tecnicoId: tecnico.id,
        imagenUrl: uploadResult.url,
        ...(data.descripcion && { descripcion: data.descripcion }),
      },
    });

    return galeriaItem;
  }

  /**
   * Obtiene los horarios del técnico
   */
  async getHorarios(userId: string) {
    const tecnico = await prisma.tecnico.findUnique({
      where: { userId },
    });

    if (!tecnico) {
      throw ApiError.notFound('Perfil de técnico no encontrado');
    }

    const horarios = await prisma.horario.findMany({
      where: { tecnicoId: tecnico.id },
      orderBy: { diaSemana: 'asc' },
    });

    return horarios;
  }

  /**
   * Actualiza los horarios del técnico
   */
  async updateHorarios(userId: string, data: UpdateHorariosInput) {
    console.log(`[TecnicoService] Updating horarios for userId=${userId}`, data);
    const tecnico = await prisma.tecnico.findUnique({
      where: { userId },
    });

    if (!tecnico) {
      throw ApiError.notFound('Perfil de técnico no encontrado');
    }

    const operations = [];

    for (const [diaSemana, horario] of Object.entries(data)) {
      console.log(`[TecnicoService] Processing day: ${diaSemana}`, horario);
      if (horario && typeof horario === 'object' && 'disponible' in horario) {
        operations.push(
          prisma.horario.upsert({
            where: {
              tecnicoId_diaSemana: {
                tecnicoId: tecnico.id,
                diaSemana: diaSemana as any,
              },
            },
            update: {
              disponible: horario.disponible,
              horaInicio: horario.horaInicio,
              horaFin: horario.horaFin,
            },
            create: {
              tecnicoId: tecnico.id,
              diaSemana: diaSemana as any,
              disponible: horario.disponible,
              horaInicio: horario.horaInicio,
              horaFin: horario.horaFin,
            },
          })
        );
      }
    }

    const result = await prisma.$transaction(operations);

    return result;
  }

  /**
   * Actualiza la configuración del técnico
   */
  async updateConfiguracion(userId: string, data: UpdateConfiguracionInput) {
    const tecnico = await prisma.tecnico.findUnique({
      where: { userId },
    });

    if (!tecnico) {
      throw ApiError.notFound('Perfil de técnico no encontrado');
    }

    const configuracion = await prisma.configuracionTecnico.upsert({
      where: { tecnicoId: tecnico.id },
      update: {
        ...(data.emergencias24x7 !== undefined && { emergencias24x7: data.emergencias24x7 }),
        ...(data.notificacionesPush !== undefined && { notificacionesPush: data.notificacionesPush }),
        ...(data.autoAceptarTrabajos !== undefined && { autoAceptarTrabajos: data.autoAceptarTrabajos }),
      },
      create: {
        tecnicoId: tecnico.id,
        emergencias24x7: data.emergencias24x7 ?? false,
        notificacionesPush: data.notificacionesPush ?? true,
        autoAceptarTrabajos: data.autoAceptarTrabajos ?? false,
      },
    });

    return configuracion;
  }

  /**
   * Valida a un técnico cambiando el estado de `verificado` a `true`
   */
  async getReniecData(tecnicoId: string) {
    const tecnico = await prisma.tecnico.findUnique({
      where: { id: tecnicoId },
    });

    if (!tecnico) {
      throw ApiError.notFound('Técnico no encontrado');
    }

    return reniecService.getDniData(tecnico.dni);
  }

  /**
   * Actualiza el estado de verificación de un técnico.
   */
  async updateVerificationStatus(tecnicoId: string, status: boolean) {
    const tecnico = await prisma.tecnico.findUnique({
      where: { id: tecnicoId },
    });

    if (!tecnico) {
      throw ApiError.notFound('Técnico no encontrado');
    }

    const updatedTecnico = await prisma.tecnico.update({
      where: { id: tecnicoId },
      data: { verificado: status },
    });

    return updatedTecnico;
  }

  /**
   * Obtiene los datos del técnico y de RENIEC para la validación
   */
  async getValidationData(tecnicoId: string) {
    const tecnico = await prisma.tecnico.findUnique({
      where: { id: tecnicoId },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        dni: true,
        verificado: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!tecnico) {
      throw ApiError.notFound('Técnico no encontrado');
    }

    let reniecData = null;
    try {
      reniecData = await reniecService.getDniData(tecnico.dni);
    } catch (error) {
      console.warn(`No se pudieron obtener datos de RENIEC para el DNI ${tecnico.dni}:`, error);
      // No lanzamos error, simplemente devolvemos null para RENIEC
    }

    return {
      tecnicoData: {
        id: tecnico.id,
        nombres: tecnico.nombres,
        apellidos: tecnico.apellidos,
        dni: tecnico.dni,
        email: tecnico.user.email,
        verificado: tecnico.verificado,
      },
      reniecData,
    };
  }

  /**
   * Obtiene las estadísticas de reviews de un técnico a partir de una lista de calificaciones
   */
  private getReviewStats(calificaciones: any[]) {
    const total = calificaciones.length;
    if (total === 0) {
      return {
        promedio: 0,
        total: 0,
        distribucion: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }

    const distribucion = calificaciones.reduce(
      (acc, calificacion) => {
        const cal = calificacion.puntuacion;
        if (cal >= 1 && cal <= 5 && acc[cal] !== undefined) {
          acc[cal]++;
        }
        return acc;
      },
      { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>
    );

    const promedio = calificaciones.reduce((sum, calificacion) => sum + calificacion.puntuacion, 0) / total;

    return {
      promedio: Math.round(promedio * 10) / 10,
      total,
      distribucion,
    };
  }

  async getTechnicianNetIncome(userId: string): Promise<number> {
    const tecnico = await prisma.tecnico.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!tecnico) {
      throw ApiError.notFound('Perfil de técnico no encontrado.');
    }

    const pagosRealizados = await prisma.pago.findMany({
      where: {
        tecnicoId: tecnico.id,
        mpStatus: EstadoPago.APROBADO,
      },
      select: { montoTecnico: true },
    });

    const totalNeto = pagosRealizados.reduce((sum, pago) => {
      return sum + pago.montoTecnico;
    }, 0);

    return totalNeto;
  }
}

export const tecnicoService = new TecnicoService();
