import { EstadoTrabajo, EstadoPago, Rol } from '@prisma/client';
import { Preference } from 'mercadopago';
import { mpClient } from '../../config/mercadopago';
import { CreatePaymentDTO } from '../../types/mercadopago.types';
import { ApiError } from '../../utils/ApiError';
import { prisma } from '../../config/database';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export class PaymentService {
  /**
   * Crea una preferencia de pago en Mercado Pago para un trabajo específico (pago directo a la plataforma).
   */
  async createPaymentPreference(clienteUserId: string, data: CreatePaymentDTO) {
    const { trabajoId } = data;

    // 1. Validar el trabajo
    const trabajo = await prisma.trabajo.findUnique({
      where: { id: trabajoId },
      include: {
        cliente: { include: { user: true } },
        tecnico: { include: { user: true } },
        pago: true,
      },
    });

    if (!trabajo) {
      throw new ApiError(404, 'Trabajo no encontrado');
    }
    if (trabajo.cliente.userId !== clienteUserId) {
      throw new ApiError(403, 'No tienes permiso para pagar este trabajo');
    }
    if (trabajo.estado !== EstadoTrabajo.COTIZADO) {
      throw new ApiError(400, 'Este trabajo no está en estado "COTIZADO" y no puede ser pagado');
    }
    if (!trabajo.precio) {
      throw new ApiError(400, 'El trabajo no tiene un precio asignado');
    }
    if (trabajo.pago && trabajo.pago.mpStatus === EstadoPago.APROBADO) {
      throw new ApiError(400, 'Este trabajo ya ha sido pagado');
    }

    // 2. Definir montos (100% para la plataforma)
    const amount = trabajo.precio;
    const platformFee = amount; // La plataforma recibe el 100%
    const technicianAmount = 0; // El pago al técnico es manual

    // 3. Crear o actualizar el registro de Pago en nuestra BD
    const pago = await prisma.pago.upsert({
      where: { trabajoId },
      create: {
        trabajoId,
        clienteId: clienteUserId,
        tecnicoId: trabajo.tecnicoId,
        montoTotal: amount,
        comisionPlataforma: platformFee,
        montoTecnico: technicianAmount,
        mpStatus: EstadoPago.PENDIENTE,
      },
      update: {
        montoTotal: amount,
        comisionPlataforma: platformFee,
        montoTecnico: technicianAmount,
      },
    });

    // 4. Usar el cliente principal de MP de la plataforma
    const preference = new Preference(mpClient);

    try {
      // 5. Crear la PREFERENCIA (sin application_fee)
      const preferenceResponse = await preference.create({
        body: {
          items: [
            {
              id: trabajo.id,
              title: trabajo.servicioNombre,
              description: `Servicio de ${trabajo.tecnico.user.nombre} - ${trabajo.descripcion.substring(0, 100)}`,
              quantity: 1,
              currency_id: 'PEN',
              unit_price: amount,
            },
          ],
          payer: {
            email: trabajo.cliente.user.email,
            name: trabajo.cliente.user.nombre,
          },
          external_reference: pago.id,
          notification_url: `${process.env.API_URL}/api/webhooks/mercadopago`,
          back_urls: {
            success: `${FRONTEND_URL}/cliente/trabajos?pago=exitoso&trabajoId=${trabajo.id}`,
            failure: `${FRONTEND_URL}/cliente/trabajos?pago=fallido&trabajoId=${trabajo.id}`,
            pending: `${FRONTEND_URL}/cliente/trabajos?pago=pendiente&trabajoId=${trabajo.id}`,
          },
          auto_return: 'approved',
        },
      });
      
      // Explicitly check for id and init_point
      if (!preferenceResponse.id) {
        throw new ApiError(500, 'Error al crear la preferencia de pago: ID de preferencia no recibido de Mercado Pago.');
      }
      if (!preferenceResponse.init_point) {
        throw new ApiError(500, 'Error al crear la preferencia de pago: Punto de inicio no recibido de Mercado Pago.');
      }

      // 6. Guardar el ID de la preferencia en nuestro registro
      await prisma.pago.update({
        where: { id: pago.id },
        data: { mpPaymentId: preferenceResponse.id }, // Guardamos el ID de la PREFERENCIA
      });

      return {
        preferenceId: preferenceResponse.id,
        init_point: preferenceResponse.init_point, // URL para pagar
      };
    } catch (error: any) {
      console.error('Error al crear la preferencia en Mercado Pago:', error.cause || error.message);
      throw new ApiError(500, 'Error al procesar el pago con Mercado Pago');
    }
  }

  /**
   * Obtiene el estado de un pago
   */
  async getPaymentStatus(pagoId: string, user: { id: string; rol: Rol }) {
    const payment = await prisma.pago.findUnique({
      where: { id: pagoId },
      include: {
        trabajo: {
          select: {
            servicioNombre: true,
            estado: true,
          },
        },
        cliente: { select: { id: true, nombre: true, email: true } },
        tecnico: {
          include: {
            user: { select: { id: true, nombre: true, email: true } },
          },
        },
      },
    });

    if (!payment) {
      throw new ApiError(404, 'Pago no encontrado');
    }

    // Validar permisos
    if (user.rol === Rol.CLIENTE && payment.clienteId !== user.id) {
      throw ApiError.forbidden('No tienes permiso para ver este pago.');
    }
    if (user.rol === Rol.TECNICO && payment.tecnico.userId !== user.id) {
      throw ApiError.forbidden('No tienes permiso para ver este pago.');
    }

    return payment;
  }
}
