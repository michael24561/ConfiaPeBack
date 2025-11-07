import { z } from 'zod';

/**
 * Schema para crear una review (cliente)
 */
export const createReviewSchema = z.object({
  body: z.object({
    trabajoId: z.string().uuid('ID de trabajo inválido'),
    calificacion: z.number().int().min(1, 'Calificación mínima: 1').max(5, 'Calificación máxima: 5'),
    comentario: z.string().min(10, 'Comentario muy corto').max(1000, 'Comentario muy largo'),
  }),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>['body'];

/**
 * Schema para responder a una review (técnico)
 */
export const respondReviewSchema = z.object({
  body: z.object({
    respuesta: z.string().min(10, 'Respuesta muy corta').max(500, 'Respuesta muy larga'),
  }),
});

export type RespondReviewInput = z.infer<typeof respondReviewSchema>['body'];

/**
 * Schema para listar reviews
 */
export const getReviewsSchema = z.object({
  query: z.object({
    calificacion: z.string().transform(Number).pipe(z.number().int().min(1).max(5)).optional(),
    page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
    limit: z.string().transform(Number).pipe(z.number().int().positive().max(50)).optional(),
  }),
});

export type GetReviewsInput = z.infer<typeof getReviewsSchema>['query'];
