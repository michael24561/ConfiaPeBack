import { z } from 'zod';

// Schema para registro de Cliente
export const registerClienteSchema = z.object({
  body: z.object({
    nombreCompleto: z.string().min(3, 'El nombre completo debe tener al menos 3 caracteres').max(100),
    email: z.string().email('Email inválido'),
    telefono: z.string().regex(/^[0-9]{9}$/, 'El teléfono debe tener 9 dígitos').optional(),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  }),
});

// Schema para registro de Técnico (solo campos esenciales obligatorios)
export const registerTecnicoSchema = z.object({
  body: z.object({
    // Campos obligatorios
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres').max(100),
    dni: z.string().regex(/^[0-9]{8}$/, 'El DNI debe tener 8 dígitos'),

    // Campos opcionales (para completar después en el perfil)
    telefono: z.string().regex(/^[0-9]{9}$/, 'El teléfono debe tener 9 dígitos').optional(),
    nombres: z.string().min(2).max(50).optional(),
    apellidos: z.string().min(2).max(50).optional(),
    oficio: z.string().min(3).max(50).optional(),
    descripcion: z.string().min(20).max(500).optional(),
    ubicacion: z.string().min(3).max(100).optional(),
    experienciaAnios: z.union([
      z.number().int().min(0).max(50),
      z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(0).max(50))
    ]).optional(),
    precioMin: z.union([
      z.number().positive(),
      z.string().regex(/^\d+(\.\d{1,2})?$/).transform(Number).pipe(z.number().positive())
    ]).optional(),
    precioMax: z.union([
      z.number().positive(),
      z.string().regex(/^\d+(\.\d{1,2})?$/).transform(Number).pipe(z.number().positive())
    ]).optional(),
  }).refine((data) => {
    // Solo validar precios si ambos están presentes
    if (data.precioMin !== undefined && data.precioMax !== undefined) {
      return data.precioMax >= data.precioMin;
    }
    return true;
  }, {
    message: 'El precio máximo debe ser mayor o igual al precio mínimo',
    path: ['precioMax'],
  }),
});

// Schema para login
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'La contraseña es requerida'),
  }),
});

// Schema para refresh token
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'El refresh token es requerido'),
  }),
});

export type RegisterClienteInput = z.infer<typeof registerClienteSchema>['body'];
export type RegisterTecnicoInput = z.infer<typeof registerTecnicoSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];
