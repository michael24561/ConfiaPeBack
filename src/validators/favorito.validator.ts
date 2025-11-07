import { z } from 'zod';

/**
 * Validación para agregar favorito
 */
export const addFavoritoSchema = z.object({
  body: z.object({
    tecnicoId: z.string().uuid('ID de técnico inválido'),
  }),
});

/**
 * Validación para eliminar/verificar favorito
 */
export const favoritoParamsSchema = z.object({
  params: z.object({
    tecnicoId: z.string().uuid('ID de técnico inválido'),
  }),
});
