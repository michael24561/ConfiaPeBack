import { z } from 'zod';

/**
 * Schema para filtros de búsqueda de técnicos
 */
export const getTecnicosSchema = z.object({
  query: z.object({
    categoria: z.string().optional(),
    q: z.string().optional(),
    calificacionMin: z.string().transform(Number).pipe(z.number().min(1).max(5)).optional(),
    precioMax: z.string().transform(Number).pipe(z.number().positive()).optional(),
    disponible: z.string().transform((val) => val === 'true').optional(),
    verificado: z.string().transform((val) => val === 'true').optional(),
    orderBy: z.enum(['relevancia', 'calificacion', 'precio', 'trabajos']).optional(),
    page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
    limit: z.string().transform(Number).pipe(z.number().int().positive().max(50)).optional(),
  }),
});

export type GetTecnicosInput = z.infer<typeof getTecnicosSchema>['query'];

/**
 * Schema para actualizar perfil de técnico
 */
export const updateTecnicoSchema = z.object({
  body: z.object({
    nombres: z.string().min(2).max(50).optional(),
    apellidos: z.string().min(2).max(50).optional(),
    oficio: z.string().min(2).max(100).optional(),
    descripcion: z.string().min(10).max(1000).optional(),
    ubicacion: z.string().min(5).max(200).optional(),
    experienciaAnios: z.number().int().min(0).max(50).optional(),
    precioMin: z.number().positive().optional(),
    precioMax: z.number().positive().optional(),
    disponible: z.boolean().optional(),
  }).refine(
    (data) => {
      if (data.precioMin !== undefined && data.precioMax !== undefined) {
        return data.precioMin <= data.precioMax;
      }
      return true;
    },
    {
      message: 'precioMin debe ser menor o igual a precioMax',
    }
  ),
});

export type UpdateTecnicoInput = z.infer<typeof updateTecnicoSchema>['body'];

/**
 * Schema para agregar un servicio
 */
export const addServicioSchema = z.object({
  body: z.object({
    nombre: z.string().min(3).max(100),
    descripcion: z.string().max(500).optional(),
    precio: z.number().positive().optional(),
  }),
});

export type AddServicioInput = z.infer<typeof addServicioSchema>['body'];

/**
 * Schema para agregar certificado
 */
export const addCertificadoSchema = z.object({
  body: z.object({
    nombre: z.string().min(3).max(100),
    institucion: z.string().max(100).optional(),
    fechaObtencion: z.string().datetime().optional(),
  }),
});

export type AddCertificadoInput = z.infer<typeof addCertificadoSchema>['body'];

/**
 * Schema para agregar imagen a galería
 */
export const addGaleriaSchema = z.object({
  body: z.object({
    descripcion: z.string().max(200).optional(),
  }),
});

export type AddGaleriaInput = z.infer<typeof addGaleriaSchema>['body'];

/**
 * Schema para actualizar horarios
 */
export const updateHorariosSchema = z.object({
  body: z.object({
    LUNES: z
      .object({
        disponible: z.boolean(),
        horaInicio: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato: HH:mm'),
        horaFin: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato: HH:mm'),
      })
      .optional(),
    MARTES: z
      .object({
        disponible: z.boolean(),
        horaInicio: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato: HH:mm'),
        horaFin: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato: HH:mm'),
      })
      .optional(),
    MIERCOLES: z
      .object({
        disponible: z.boolean(),
        horaInicio: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato: HH:mm'),
        horaFin: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato: HH:mm'),
      })
      .optional(),
    JUEVES: z
      .object({
        disponible: z.boolean(),
        horaInicio: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato: HH:mm'),
        horaFin: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato: HH:mm'),
      })
      .optional(),
    VIERNES: z
      .object({
        disponible: z.boolean(),
        horaInicio: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato: HH:mm'),
        horaFin: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato: HH:mm'),
      })
      .optional(),
    SABADO: z
      .object({
        disponible: z.boolean(),
        horaInicio: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato: HH:mm'),
        horaFin: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato: HH:mm'),
      })
      .optional(),
    DOMINGO: z
      .object({
        disponible: z.boolean(),
        horaInicio: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato: HH:mm'),
        horaFin: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato: HH:mm'),
      })
      .optional(),
  }),
});

export type UpdateHorariosInput = z.infer<typeof updateHorariosSchema>['body'];

/**
 * Schema para actualizar configuración
 */
export const updateConfiguracionSchema = z.object({
  body: z.object({
    emergencias24x7: z.boolean().optional(),
    notificacionesPush: z.boolean().optional(),
    autoAceptarTrabajos: z.boolean().optional(),
  }),
});

export type UpdateConfiguracionInput = z.infer<typeof updateConfiguracionSchema>['body'];
