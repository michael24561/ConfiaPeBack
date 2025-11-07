import { z } from 'zod';

/**
 * Schema para crear un trabajo (cliente)
 */
export const createTrabajoSchema = z.object({
  body: z.object({
    tecnicoId: z.string().uuid('ID de técnico inválido'),
    servicioNombre: z.string().min(3, 'Nombre del servicio muy corto').max(100),
    descripcion: z.string().min(10, 'Descripción muy corta').max(1000),
    direccion: z.string().min(10, 'Dirección muy corta').max(300),
    telefono: z.string().regex(/^\+51\d{9}$/, 'Formato: +51XXXXXXXXX'),
    fechaProgramada: z.string().datetime().optional(),
  }),
});

export type CreateTrabajoInput = z.infer<typeof createTrabajoSchema>['body'];

/**
 * Schema para listar trabajos
 */
export const getTrabajosSchema = z.object({
  query: z.object({
    estado: z
      .enum(['PENDIENTE', 'ACEPTADO', 'EN_PROGRESO', 'COMPLETADO', 'CANCELADO'])
      .optional(),
    page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
    limit: z.string().transform(Number).pipe(z.number().int().positive().max(50)).optional(),
  }),
});

export type GetTrabajosInput = z.infer<typeof getTrabajosSchema>['query'];

/**
 * Schema para cambiar estado de trabajo (técnico)
 */
export const updateEstadoTrabajoSchema = z.object({
  body: z.object({
    estado: z.enum(['ACEPTADO', 'EN_PROGRESO', 'COMPLETADO', 'CANCELADO']),
    precio: z.number().positive().optional(),
  }),
});

export type UpdateEstadoTrabajoInput = z.infer<typeof updateEstadoTrabajoSchema>['body'];

/**
 * Schema para actualizar trabajo (general)
 */
export const updateTrabajoSchema = z.object({
  body: z.object({
    servicioNombre: z.string().min(3).max(100).optional(),
    descripcion: z.string().min(10).max(1000).optional(),
    direccion: z.string().min(10).max(300).optional(),
    telefono: z.string().regex(/^\+51\d{9}$/).optional(),
    fechaProgramada: z.string().datetime().optional(),
    precio: z.number().positive().optional(),
  }),
});

export type UpdateTrabajoInput = z.infer<typeof updateTrabajoSchema>['body'];
