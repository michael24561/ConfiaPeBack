import { z } from 'zod'

export const updateUserSchema = z.object({
    nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
    telefono: z.string().optional(),
    avatarUrl: z.string().url('URL de avatar inválida').optional(),
    direccion: z.string().optional(),
    rol: z.enum(['CLIENTE', 'TECNICO', 'ADMIN']).optional(),
})

export const updateUserStatusSchema = z.object({
    isActive: z.boolean(),
    motivo: z.string().min(10, 'El motivo debe tener al menos 10 caracteres'),
})

export const deleteUserSchema = z.object({
    motivo: z.string().min(10, 'El motivo debe tener al menos 10 caracteres'),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>
export type DeleteUserInput = z.infer<typeof deleteUserSchema>
