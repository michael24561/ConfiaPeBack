import { z } from 'zod';

export const createReporteSchema = z.object({
  body: z.object({
    motivo: z.string({
      required_error: 'El motivo es requerido',
    }).min(5, 'El motivo debe tener al menos 5 caracteres'),
    descripcion: z.string({
      required_error: 'La descripción es requerida',
    }).min(10, 'La descripción debe tener al menos 10 caracteres'),
  }),
});

export const resolveReporteSchema = z.object({
  body: z.object({
    nuevoEstado: z.enum(['COMPLETADO', 'CANCELADO']),
  }),
});

export type CreateReporteInput = z.infer<typeof createReporteSchema>['body'];
export type ResolveReporteInput = z.infer<typeof resolveReporteSchema>['body'];
