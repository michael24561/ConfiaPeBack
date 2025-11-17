import { z } from 'zod'

export const createCheckoutSessionSchema = z.object({
  body: z.object({
    trabajoId: z.string().uuid('ID de trabajo inválido'),
  }),
})

export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>['body']
