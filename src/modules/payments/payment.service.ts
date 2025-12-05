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
    console.log('--- Iniciando createPaymentPreference ---');
    const { trabajoId } = data;
    console.log(`Cliente User ID: ${clienteUserId}, Trabajo ID: ${trabajoId}`);

    // 1. Validar el trabajo
    console.log('Buscando trabajo en la base de datos...');
    const trabajo = await prisma.trabajo.findUnique({
      where: { id: trabajoId },
      include: {
        cliente: { include: { user: true } },
        tecnico: { include: { user: true } },
        pago: true,
      },
    });

    if (!trabajo) {
      console.error(`Error: Trabajo con ID ${trabajoId} no encontrado.`);
      throw new ApiError(404, 'Trabajo no encontrado');
    }
    console.log('Trabajo encontrado:', trabajo.id);

    if (trabajo.cliente.userId !== clienteUserId) {
      console.error(`Error: Usuario ${clienteUserId} no tiene permiso para pagar el trabajo ${trabajoId}.`);
      throw new ApiError(403, 'No tienes permiso para pagar este trabajo');
    }
    if (trabajo.estado !== EstadoTrabajo.COTIZADO) {
      console.error(`Error: El trabajo ${trabajoId} no está en estado "COTIZADO". Estado actual: ${trabajo.estado}`);
      throw new ApiError(400, 'Este trabajo no está en estado "COTIZADO" y no puede ser pagado');
    }
    if (!trabajo.precio) {
      console.error(`Error: El trabajo ${trabajoId} no tiene un precio asignado.`);
      throw new ApiError(400, 'El trabajo no tiene un precio asignado');
    }
    if (trabajo.pago && trabajo.pago.mpStatus === EstadoPago.APROBADO) {
      console.error(`Error: El trabajo ${trabajoId} ya ha sido pagado.`);
      throw new ApiError(400, 'Este trabajo ya ha sido pagado');
    }

    // 2. Definir montos (100% para la plataforma)
    const amount = trabajo.precio;
    const platformFee = amount; // La plataforma recibe el 100%
    const technicianAmount = 0; // El pago al técnico es manual
    console.log(`Monto total: ${amount}, Comisión plataforma: ${platformFee}`);

    // 3. Crear o actualizar el registro de Pago en nuestra BD
    console.log('Creando o actualizando registro de pago en la BD...');
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
    console.log('Registro de pago creado/actualizado:', pago.id);

    // 4. Usar el cliente principal de MP de la plataforma
    const preference = new Preference(mpClient);

    try {
      console.log('Creando preferencia de pago en Mercado Pago...');
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
          back_urls: {
            success: `${FRONTEND_URL}/cliente/trabajos/${trabajo.id}?pago=exitoso`,
            failure: `${FRONTEND_URL}/cliente/trabajos/${trabajo.id}?pago=cancelado`,
            pending: `${FRONTEND_URL}/cliente/trabajos/${trabajo.id}?pago=pendiente`,
          },
        },
      });
      
      console.log('Preferencia de Mercado Pago creada exitosamente.');
      // Explicitly check for id and init_point
      if (!preferenceResponse.id) {
        console.error('Error: No se recibió ID de preferencia de Mercado Pago.');
        throw new ApiError(500, 'Error al crear la preferencia de pago: ID de preferencia no recibido de Mercado Pago.');
      }
      if (!preferenceResponse.init_point) {
        console.error('Error: No se recibió init_point de Mercado Pago.');
        throw new ApiError(500, 'Error al crear la preferencia de pago: Punto de inicio no recibido de Mercado Pago.');
      }
      console.log(`Preferencia ID: ${preferenceResponse.id}, Init Point: ${preferenceResponse.init_point}`);

      // 6. Guardar el ID de la preferencia en nuestro registro
      console.log('Actualizando el pago en la BD con el ID de la preferencia de MP...');
      await prisma.pago.update({
        where: { id: pago.id },
        data: { mpPaymentId: preferenceResponse.id }, // Guardamos el ID de la PREFERENCIA
      });
      console.log('Pago actualizado con éxito.');

      console.log('--- Finalizando createPaymentPreference con éxito ---');
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
    console.log(`--- Iniciando getPaymentStatus para Pago ID: ${pagoId} ---`);
    console.log(`Usuario solicitante: ${user.id}, Rol: ${user.rol}`);

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
      console.error(`Error: Pago con ID ${pagoId} no encontrado.`);
      throw new ApiError(404, 'Pago no encontrado');
    }

    console.log('Pago encontrado:', payment);

    // Validar permisos
    if (user.rol === Rol.CLIENTE && payment.clienteId !== user.id) {
      console.error(`Error de permiso: Cliente ${user.id} intentó acceder al pago ${pagoId} que pertenece a ${payment.clienteId}.`);
      throw ApiError.forbidden('No tienes permiso para ver este pago.');
    }
    if (user.rol === Rol.TECNICO && payment.tecnico.userId !== user.id) {
      console.error(`Error de permiso: Técnico ${user.id} intentó acceder al pago ${pagoId} que pertenece al técnico ${payment.tecnico.userId}.`);
      throw ApiError.forbidden('No tienes permiso para ver este pago.');
    }

    console.log(`--- Finalizando getPaymentStatus para Pago ID: ${pagoId} con éxito ---`);
    return payment;
  }
}
