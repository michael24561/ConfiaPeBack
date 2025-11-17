import { prisma } from '../config/database';
import { stripe } from '../config/stripe';
import { ApiError } from '../utils/ApiError';
import { EstadoPago, EstadoTrabajo, TipoNotificacion } from '@prisma/client';
import { sendEventToUser } from '../websockets/notification.emitter';

export class PayoutService {
  public PLATFORM_FEE_PERCENTAGE = 0.10; // 10% de comisión para la plataforma

  async createPayout(trabajoId: string) {
    console.log(`Iniciando proceso de payout para el trabajo: ${trabajoId}`);

    const trabajo = await prisma.trabajo.findUnique({
      where: { id: trabajoId },
      include: {
        pago: true,
        tecnico: { include: { user: true } },
        cliente: { include: { user: true } },
      },
    });

    if (!trabajo) {
      throw new ApiError(404, 'Trabajo no encontrado.');
    }
    if (!trabajo.pago) {
      throw new ApiError(400, 'Este trabajo no tiene un registro de pago asociado.');
    }
    if (trabajo.pago.estado !== EstadoPago.PAGADO) {
      throw new ApiError(400, 'El pago de este trabajo aún no ha sido completado.');
    }
    if (trabajo.estado !== EstadoTrabajo.COMPLETADO) {
      throw new ApiError(400, 'El trabajo debe estar en estado "COMPLETADO" para realizar el payout.');
    }
    if (!trabajo.tecnico.stripeAccountId || !trabajo.tecnico.stripeOnboardingComplete) {
      throw new ApiError(400, 'El técnico no tiene una cuenta de Stripe Connect configurada o completa.');
    }
    if (trabajo.pago.payoutRealizado) { // Asumiendo que añadiremos este campo al modelo Pago
      throw new ApiError(400, 'El payout para este trabajo ya ha sido realizado.');
    }

    const montoTotal = Number(trabajo.precio);
    const montoTecnico = montoTotal * (1 - this.PLATFORM_FEE_PERCENTAGE);
    const montoEnCentavos = Math.round(montoTecnico * 100);

    if (montoEnCentavos <= 0) {
      throw new ApiError(400, 'El monto a pagar al técnico debe ser mayor que cero.');
    }

    console.log(`Monto total del trabajo: ${montoTotal}, Monto a transferir al técnico: ${montoTecnico}`);

    try {
      const transfer = await stripe.transfers.create({
        amount: montoEnCentavos,
        currency: 'pen',
        destination: trabajo.tecnico.stripeAccountId,
        transfer_group: `payout_trabajo_${trabajo.id}`,
        metadata: {
          trabajoId: trabajo.id,
          tecnicoId: trabajo.tecnico.id,
          clienteId: trabajo.cliente.id,
        },
      });

      console.log(`Transferencia de Stripe creada: ${transfer.id}`);

      // Actualizar el registro de Pago para marcar que el payout ha sido realizado
      await prisma.pago.update({
        where: { id: trabajo.pago.id },
        data: {
          payoutRealizado: true, // Este campo debe ser añadido al modelo Pago
          fechaPayout: new Date(),
          stripeTransferId: transfer.id, // Este campo debe ser añadido al modelo Pago
        },
      });

      // Notificar al técnico
      const notificacion = await prisma.notificacion.create({
        data: {
          userId: trabajo.tecnico.userId,
          tipo: TipoNotificacion.PAGO,
          titulo: '¡Pago de trabajo recibido!',
          mensaje: `Has recibido un pago de S/ ${montoTecnico.toFixed(2)} por el trabajo "${trabajo.servicioNombre}".`,
          metadata: { trabajoId: trabajo.id, transferId: transfer.id },
        },
      });
      sendEventToUser(notificacion.userId, 'new_notification', notificacion);

      return { success: true, transferId: transfer.id, monto: montoTecnico };
    } catch (error: any) {
      console.error(`Error al crear la transferencia de Stripe para el trabajo ${trabajoId}:`, error);
      throw new ApiError(500, `Error al procesar el pago al técnico: ${error.message}`);
    }
  }
}

export const payoutService = new PayoutService();
