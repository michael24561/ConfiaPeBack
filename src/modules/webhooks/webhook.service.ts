import { EstadoPago, EstadoTrabajo, TipoNotificacion } from '@prisma/client';
import { Payment } from 'mercadopago';
import { mpClient } from '../../config/mercadopago';
import { WebhookPayload } from '../../types/mercadopago.types';
import { prisma } from '../../config/database';

export class WebhookService {
  /**
   * Procesa una notificación de webhook de Mercado Pago.
   */
  async processWebhook(payload: WebhookPayload): Promise<void> {
    console.log('[Webhook] === INICIO DE PROCESAMIENTO DE WEBHOOK ===');
    console.log('[Webhook] Payload recibido:', JSON.stringify(payload, null, 2));

    // Solo procesamos notificaciones de tipo 'payment'
    if (payload.type !== 'payment') {
      console.log(`[Webhook] Notificación de tipo '${payload.type}' ignorada. Finalizando.`);
      console.log('[Webhook] === FIN DE PROCESAMIENTO DE WEBHOOK ===');
      return;
    }

    const mpPaymentId = payload.data.id;
    console.log(`[Webhook] Procesando notificación para el pago de MP con ID: ${mpPaymentId}`);

    try {
      // 1. Obtener los detalles completos del pago desde Mercado Pago
      console.log(`[Webhook] Consultando API de Mercado Pago para el pago ID: ${mpPaymentId}...`);
      const payment = new Payment(mpClient);
      const paymentData = await payment.get({ id: mpPaymentId });
      console.log('[Webhook] Datos del pago recibidos de MP:', JSON.stringify(paymentData, null, 2));

      if (!paymentData.external_reference) {
        console.error(`[Webhook] CRÍTICO: El pago ${mpPaymentId} no tiene 'external_reference'. No se puede procesar. Finalizando.`);
        console.log('[Webhook] === FIN DE PROCESAMIENTO DE WEBHOOK ===');
        return;
      }

      const pagoId = paymentData.external_reference; // Este es el ID de nuestro modelo Pago
      console.log(`[Webhook] External Reference (ID de Pago Local) extraído: ${pagoId}`);

      // 2. Buscar el pago en nuestra base de datos
      console.log(`[Webhook] Buscando el pago local con ID: ${pagoId} en la BD...`);
      const localPago = await prisma.pago.findUnique({
        where: { id: pagoId },
      });

      if (!localPago) {
        console.error(`[Webhook] CRÍTICO: No se encontró el registro de pago local con ID: ${pagoId}. Finalizando.`);
        console.log('[Webhook] === FIN DE PROCESAMIENTO DE WEBHOOK ===');
        return;
      }
      console.log('[Webhook] Pago local encontrado:', localPago);

      // Si el pago ya fue aprobado, no hacemos nada para evitar duplicados
      if (localPago.mpStatus === EstadoPago.APROBADO) {
        console.warn(`[Webhook] El pago ${pagoId} ya fue aprobado anteriormente. Ignorando evento para evitar duplicidad. Finalizando.`);
        console.log('[Webhook] === FIN DE PROCESAMIENTO DE WEBHOOK ===');
        return;
      }

      // 3. Mapear el estado de Mercado Pago a nuestro enum
      const newStatus = this.mapPaymentStatus(paymentData.status);
      console.log(`[Webhook] Estado del pago ${mpPaymentId} en MP: '${paymentData.status}'. Mapeado a nuestro estado interno: '${newStatus}'.`);

      // 4. Iniciar una transacción para actualizar nuestra base de datos
      console.log('[Webhook] Iniciando transacción en la base de datos...');
      await prisma.$transaction(async (tx) => {
        console.log(`[Webhook] [TX] Actualizando el registro de Pago ID: ${pagoId}...`);
        // Actualizar el registro de Pago
        await tx.pago.update({
          where: { id: pagoId },
          data: {
            mpPaymentId: mpPaymentId, // Guardar el ID del PAGO final
            mpStatus: newStatus,
            mpStatusDetail: paymentData.status_detail || null,
            metodoPago: paymentData.payment_method_id || null,
            cuotas: paymentData.installments || 1,
            fechaPago: paymentData.date_approved ? new Date(paymentData.date_approved) : null,
          },
        });
        console.log(`[Webhook] [TX] Registro de pago local ${pagoId} actualizado a estado '${newStatus}'.`);

        // Si el pago fue aprobado, actualizamos el trabajo y notificamos
        if (newStatus === EstadoPago.APROBADO) {
          console.log(`[Webhook] [TX] El pago fue aprobado. Actualizando el trabajo ID: ${localPago.trabajoId}...`);
          const trabajo = await tx.trabajo.update({
            where: { id: localPago.trabajoId },
            data: { estado: EstadoTrabajo.ACEPTADO },
            include: {
              cliente: { include: { user: true } },
              tecnico: { include: { user: true } },
            },
          });
          console.log(`[Webhook] [TX] Trabajo ${trabajo.id} actualizado a estado 'ACEPTADO'.`);

          // Crear notificación para el técnico
          console.log(`[Webhook] [TX] Creando notificación para el técnico ID: ${trabajo.tecnico.userId}...`);
          await tx.notificacion.create({
            data: {
              userId: trabajo.tecnico.userId,
              tipo: TipoNotificacion.PAGO,
              titulo: '¡Cotización aceptada y pagada!',
              mensaje: `${trabajo.cliente.user.nombre} ha pagado y aceptado tu cotización de S/ ${trabajo.precio?.toFixed(2)}.`,
              metadata: { trabajoId: trabajo.id },
            },
          });
          console.log(`[Webhook] [TX] Notificación creada para el técnico ${trabajo.tecnico.userId}.`);
        }
      });

      console.log('[Webhook] Transacción completada exitosamente.');
      console.log(`[Webhook] === FIN DE PROCESAMIENTO DE WEBHOOK (ÉXITO) ===`);
    } catch (error) {
      console.error(`[Webhook] CRÍTICO: Error procesando la notificación para el pago ${mpPaymentId}:`, error);
      console.log('[Webhook] === FIN DE PROCESAMIENTO DE WEBHOOK (ERROR) ===');
      // No relanzamos el error para evitar que Mercado Pago reintente indefinidamente
      // si es un error de lógica interna. En producción, se debería notificar a un sistema de monitoreo.
    }
  }

  /**
   * Mapea los estados de Mercado Pago a nuestro enum `EstadoPago`.
   */
  private mapPaymentStatus(mpStatus: string | undefined): EstadoPago {
    if (!mpStatus) return EstadoPago.PENDIENTE;

    const statusMap: Record<string, EstadoPago> = {
      pending: EstadoPago.PENDIENTE,
      approved: EstadoPago.APROBADO,
      authorized: EstadoPago.APROBADO,
      in_process: EstadoPago.EN_PROCESO,
      in_mediation: EstadoPago.EN_PROCESO,
      rejected: EstadoPago.RECHAZADO,
      cancelled: EstadoPago.CANCELADO,
      refunded: EstadoPago.REEMBOLSADO,
      charged_back: EstadoPago.REEMBOLSADO,
    };

    return statusMap[mpStatus] || EstadoPago.PENDIENTE;
  }
}
