import { z } from 'zod'

export const createCalificacionSchema = z.object({
  body: z.object({
    trabajoId: z.string().uuid('ID de trabajo inválido'),
    puntuacion: z.number().min(1).max(5, 'La puntuación debe estar entre 1 y 5'),
    comentario: z.string().min(1, 'El comentario no puede estar vacío'),
    fotos: z.array(z.string().url('URL de foto inválida')).optional(),
    esPublico: z.boolean().optional(),
  }),
})

export const getCalificacionesSchema = z.object({
  params: z.object({
    tecnicoId: z.string().uuid('ID de técnico inválido'),
  }),
  query: z.object({
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
    calificacion: z.string().optional(),
  }),
});

export const updateCalificacionSchema = z.object({
  body: z.object({
    puntuacion: z.number().min(1).max(5, 'La puntuación debe estar entre 1 y 5').optional(),
    comentario: z.string().min(1, 'El comentario no puede estar vacío').optional(),
    esPublico: z.boolean().optional(),
    fotos: z.array(z.string().url('URL de foto inválida')).optional(),
  }).strict(),
});


export type CreateCalificacionInput = z.infer<typeof createCalificacionSchema>['body'];
export type GetCalificacionesInput = z.infer<typeof getCalificacionesSchema>['query'];
export type UpdateCalificacionInput = z.infer<typeof updateCalificacionSchema>['body'];
