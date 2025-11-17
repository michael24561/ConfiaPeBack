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

export const getAdminReportesSchema = z.object({
  query: z.object({
    estado: z.enum(['PENDIENTE', 'RECHAZADO', 'NECESITA_VISITA', 'COTIZADO', 'ACEPTADO', 'EN_PROGRESO', 'COMPLETADO', 'CANCELADO', 'EN_DISPUTA', 'todos']).optional(),
    tecnicoId: z.string().uuid('ID de técnico inválido').optional(),
    clienteId: z.string().uuid('ID de cliente inválido').optional(),
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
  }),
});

export type CreateReporteInput = z.infer<typeof createReporteSchema>['body'];
export type ResolveReporteInput = z.infer<typeof resolveReporteSchema>['body'];
export type GetAdminReportesInput = z.infer<typeof getAdminReportesSchema>['query'];
