import bcrypt from 'bcryptjs';
import { Rol } from '@prisma/client';
import { prisma } from '../config/database';
import { generateTokens, verifyRefreshToken } from '../config/jwt';
import { uploadToCloudinary } from '../config/cloudinary';
import { ApiError } from '../utils/ApiError';
import {
  RegisterClienteInput,
  RegisterTecnicoInput,
  LoginInput,
} from '../validators/auth.validator';

const BCRYPT_ROUNDS = 10;

interface AuthResponse {
  user: {
    id: string;
    email: string;
    nombre: string;
    telefono: string | null;
    rol: Rol;
    avatarUrl: string | null;
    perfilId?: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export class AuthService {
  /**
   * Registra un nuevo cliente en el sistema
   */
  async registerCliente(data: RegisterClienteInput): Promise<AuthResponse> {
    const { nombreCompleto, email, telefono, password } = data;

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw ApiError.conflict('El email ya está registrado');
    }

    // Hashear password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Crear usuario y cliente en una transacción
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          nombre: nombreCompleto,
          telefono: telefono || null,
          rol: Rol.CLIENTE,
        },
      });

      const cliente = await tx.cliente.create({
        data: {
          userId: user.id,
        },
      });

      return { user, cliente };
    });

    // Generar tokens
    const tokens = generateTokens({
      id: result.user.id,
      email: result.user.email,
      rol: result.user.rol,
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        nombre: result.user.nombre,
        telefono: result.user.telefono,
        rol: result.user.rol,
        avatarUrl: result.user.avatarUrl,
        perfilId: result.cliente.id,
      },
      tokens,
    };
  }

  /**
   * Registra un nuevo técnico en el sistema con certificados
   */
  async registerTecnico(
    data: RegisterTecnicoInput,
    files?: Express.Multer.File[]
  ): Promise<AuthResponse> {
    const {
      email,
      password,
      nombre,
      dni,
      // Campos opcionales
      telefono,
      nombres,
      apellidos,
      oficio,
      descripcion,
      ubicacion,
      experienciaAnios,
    } = data;

    // Si no hay nombres/apellidos pero hay nombre, intentar separar
    let finalNombres = nombres;
    let finalApellidos = apellidos;
    if (!nombres && !apellidos && nombre) {
      const parts = nombre.trim().split(' ');
      if (parts.length >= 2) {
        finalNombres = parts[0];
        finalApellidos = parts.slice(1).join(' ');
      } else {
        finalNombres = nombre;
      }
    }

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw ApiError.conflict('El email ya está registrado');
    }

    // Verificar si el DNI ya existe
    const existingTecnico = await prisma.tecnico.findUnique({
      where: { dni },
    });

    if (existingTecnico) {
      throw ApiError.conflict('El DNI ya está registrado');
    }

    // Hashear password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Subir certificados a Cloudinary si existen
    const certificadosUrls: Array<{ nombre: string; imagenUrl: string }> = [];

    if (files && files.length > 0) {
      for (const file of files) {
        try {
          const result = await uploadToCloudinary(file, 'confiape/certificados');
          certificadosUrls.push({
            nombre: file.originalname,
            imagenUrl: result.url,
          });
        } catch (error) {
          throw ApiError.badRequest(`Error al subir certificado: ${file.originalname}`);
        }
      }
    }

    // Crear usuario, técnico y certificados en una transacción
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          nombre,
          telefono: telefono || null,
          rol: Rol.TECNICO,
        },
      });

      const tecnico = await tx.tecnico.create({
        data: {
          userId: user.id,
          dni,
          ...(finalNombres && { nombres: finalNombres }),
          ...(finalApellidos && { apellidos: finalApellidos }),
          ...(oficio && { oficio }),
          ...(descripcion && { descripcion }),
          ...(ubicacion && { ubicacion }),
          ...(experienciaAnios !== undefined && { experienciaAnios }),
        },
      });

      // Crear certificados si existen
      if (certificadosUrls.length > 0) {
        await tx.certificado.createMany({
          data: certificadosUrls.map((cert) => ({
            tecnicoId: tecnico.id,
            nombre: cert.nombre,
            imagenUrl: cert.imagenUrl,
          })),
        });
      }

      return { user, tecnico };
    });

    // Generar tokens
    const tokens = generateTokens({
      id: result.user.id,
      email: result.user.email,
      rol: result.user.rol,
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        nombre: result.user.nombre,
        telefono: result.user.telefono,
        rol: result.user.rol,
        avatarUrl: result.user.avatarUrl,
        perfilId: result.tecnico.id,
      },
      tokens,
    };
  }

  /**
   * Autentica un usuario y genera tokens
   */
  async login(data: LoginInput): Promise<AuthResponse> {
    const { email, password } = data;

    // Buscar usuario por email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        cliente: true,
        tecnico: true,
      },
    });

    if (!user) {
      throw ApiError.unauthorized('Credenciales inválidas');
    }

    // Verificar que el usuario esté activo
    if (!user.isActive) {
      throw ApiError.forbidden('La cuenta está desactivada. Contacta con soporte');
    }

    // Comparar password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw ApiError.unauthorized('Credenciales inválidas');
    }

    // Generar tokens
    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      rol: user.rol,
    });

    // Determinar perfilId según el rol
    const userResponse: AuthResponse['user'] = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      telefono: user.telefono,
      rol: user.rol,
      avatarUrl: user.avatarUrl,
    };

    if (user.rol === Rol.CLIENTE && user.cliente) {
      userResponse.perfilId = user.cliente.id;
    } else if (user.rol === Rol.TECNICO && user.tecnico) {
      userResponse.perfilId = user.tecnico.id;
    }

    return {
      user: userResponse,
      tokens,
    };
  }

  /**
   * Refresca el access token usando el refresh token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Verificar refresh token
      const decoded = verifyRefreshToken(refreshToken);

      // Verificar que el usuario siga existiendo y esté activo
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user) {
        throw ApiError.unauthorized('Usuario no encontrado');
      }

      if (!user.isActive) {
        throw ApiError.forbidden('La cuenta está desactivada');
      }

      // Generar nuevos tokens
      const tokens = generateTokens({
        id: user.id,
        email: user.email,
        rol: user.rol,
      });

      return tokens;
    } catch (error) {
      throw ApiError.unauthorized('Refresh token inválido o expirado');
    }
  }

  /**
   * Obtiene la información del usuario autenticado
   */
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        telefono: true,
        rol: true,
        avatarUrl: true,
        emailVerified: true,
        isActive: true,
        createdAt: true,
        cliente: {
          select: {
            id: true,
          },
        },
        tecnico: {
          select: {
            id: true,
            dni: true,
            nombres: true,
            apellidos: true,
            oficio: true,
            descripcion: true,
            ubicacion: true,
            experienciaAnios: true,
            calificacionPromedio: true,
            trabajosCompletados: true,
            verificado: true,
            disponible: true,
          },
        },
      },
    });

    if (!user) {
      throw ApiError.notFound('Usuario no encontrado');
    }

    // Formatear respuesta según el rol
    const response: any = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      telefono: user.telefono,
      rol: user.rol,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };

    if (user.rol === Rol.CLIENTE && user.cliente) {
      response.perfil = {
        perfilId: user.cliente.id,
        tipo: 'CLIENTE',
      };
    } else if (user.rol === Rol.TECNICO && user.tecnico) {
      const { id, ...tecnicoData } = user.tecnico;
      response.perfil = {
        perfilId: id,
        tipo: 'TECNICO',
        ...tecnicoData,
      };
    }

    return response;
  }

  /**
   * Actualiza el avatar del usuario
   */
  async updateAvatar(userId: string, avatarUrl: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        email: true,
        nombre: true,
        telefono: true,
        rol: true,
        avatarUrl: true,
      },
    });

    return user;
  }
}

export const authService = new AuthService();
