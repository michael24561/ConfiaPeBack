import { stripe } from '../config/stripe'
import { prisma } from '../config/database'
import { ApiError } from '../utils/ApiError'
import { CreateCheckoutSessionInput } from '../validators/pago.validator'
import { EstadoTrabajo, EstadoPago, TipoNotificacion } from '@prisma/client'
import Stripe from 'stripe'

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

export class PagoService {
  /**
   * Crea una sesión de Stripe Checkout para un trabajo específico.
   */
  async createCheckoutSession(clienteUserId: string, data: CreateCheckoutSessionInput) {
    console.log('Iniciando creación de sesión de checkout para el trabajo:', data.trabajoId)
    const { trabajoId } = data

    // 1. Validar el trabajo
    const trabajo = await prisma.trabajo.findUnique({
      where: { id: trabajoId },
      include: { cliente: { include: { user: true } }, tecnico: { include: { user: true } } },
    })

    if (!trabajo) {
      console.error(`Error: Trabajo no encontrado con ID: ${trabajoId}`)
      throw new ApiError(404, 'Trabajo no encontrado')
    }
    if (trabajo.cliente.userId !== clienteUserId) {
      console.error(`Error: Usuario ${clienteUserId} no tiene permiso para pagar el trabajo ${trabajoId}`)
      throw new ApiError(403, 'No tienes permiso para pagar este trabajo')
    }
    if (trabajo.estado !== EstadoTrabajo.COTIZADO) {
      console.error(`Error: El trabajo ${trabajoId} no está en estado COTIZADO. Estado actual: ${trabajo.estado}`)
      throw new ApiError(400, 'Este trabajo no está en estado "COTIZADO" y no puede ser pagado')
    }
    if (!trabajo.precio) {
      console.error(`Error: El trabajo ${trabajoId} no tiene un precio asignado.`)
      throw new ApiError(400, 'El trabajo no tiene un precio asignado')
    }
    console.log('Trabajo validado exitosamente.')

    // 2. Crear o recuperar el registro de Pago
    let pago = await prisma.pago.findUnique({ where: { trabajoId } })

    if (!pago) {
      pago = await prisma.pago.create({
        data: {
          trabajoId,
          monto: trabajo.precio,
          estado: EstadoPago.PENDIENTE,
        },
      })
      console.log(`Nuevo registro de pago creado con ID: ${pago.id}`)
    } else if (pago.estado === EstadoPago.PAGADO) {
      console.error(`Error: El trabajo ${trabajoId} ya ha sido pagado.`)
      throw new ApiError(400, 'Este trabajo ya ha sido pagado')
    } else {
      console.log(`Registro de pago existente encontrado con ID: ${pago.id}`)
    }

    // 3. Crear la sesión de Stripe Checkout
    try {
      console.log('Creando sesión en Stripe...')
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'pen', // Soles Peruanos
              product_data: {
                name: `Servicio: ${trabajo.servicioNombre}`,
                description: `Pago por servicio de ${trabajo.tecnico.user.nombre} para el trabajo #${trabajo.id.substring(0, 8)}`,
                images: [trabajo.tecnico.user.avatarUrl || ''],
              },
              unit_amount: Math.round(Number(trabajo.precio) * 100), // El monto en centavos
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        customer_email: trabajo.cliente.user.email,
        success_url: `${FRONTEND_URL}/cliente/trabajos?pago=exitoso&trabajoId=${trabajoId}`,
        cancel_url: `${FRONTEND_URL}/cliente/trabajos?pago=cancelado&trabajoId=${trabajoId}`,
        metadata: {
          trabajoId: trabajo.id,
          pagoId: pago.id,
        },
      })
      console.log(`Sesión de Stripe creada con ID: ${session.id}`)

      // 4. Guardar el ID de la sesión de Stripe en el pago
      await prisma.pago.update({
        where: { id: pago.id },
        data: { stripeSessionId: session.id },
      })
      console.log(`ID de sesión de Stripe guardado en el pago ${pago.id}`)

      return { url: session.url }
    } catch (error) {
      console.error('Error detallado al crear la sesión de Stripe Checkout:', error)
      throw new ApiError(500, 'No se pudo crear la sesión de pago')
    }
  }

  /**
   * Maneja los webhooks de Stripe para actualizar el estado de los pagos.
   */
  async handleWebhook(signature: string, body: Buffer) {
    console.log('--- Webhook de Stripe recibido ---')
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('FATAL: El secreto del webhook de Stripe (STRIPE_WEBHOOK_SECRET) no está configurado.')
      throw new ApiError(500, 'El secreto del webhook de Stripe no está configurado')
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      console.log(`Evento de Stripe construido exitosamente. Tipo: ${event.type}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      console.error(`Error al construir el evento de webhook: ${message}`)
      throw new ApiError(400, `Webhook Error: ${message}`)
    }

    // Manejar el evento
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session
        console.log(`Procesando evento checkout.session.completed para la sesión: ${session.id}`)
        await this.handleSuccessfulPayment(session)
        break
      // Puedes añadir más casos para otros eventos, como 'checkout.session.async_payment_failed'
      default:
        console.log(`--> Evento de webhook no manejado: ${event.type}`)
    }
    console.log('--- Fin del procesamiento del webhook ---')
  }

  private async handleSuccessfulPayment(session: Stripe.Checkout.Session) {
    const { trabajoId, pagoId } = session.metadata || {}
    console.log(`Metadatos recibidos: trabajoId=${trabajoId}, pagoId=${pagoId}`)

    if (!trabajoId || !pagoId) {
      console.error('CRÍTICO: El webhook de checkout.session.completed no contenía trabajoId o pagoId en los metadatos.')
      return
    }

    const pago = await prisma.pago.findUnique({ where: { id: pagoId } })
    if (!pago) {
      console.error(`Error: No se encontró el registro de pago con ID: ${pagoId}`)
      return
    }
    if (pago.estado === EstadoPago.PAGADO) {
      console.warn(`Advertencia: El pago ${pagoId} ya fue procesado anteriormente. Ignorando evento.`)
      return
    }

    console.log(`Iniciando transacción en la base de datos para el pago ${pagoId}...`)
    try {
      await prisma.$transaction(async (tx) => {
        // 1. Actualizar el estado del Pago
        console.log(`1. Actualizando estado del pago ${pagoId} a PAGADO.`)
        await tx.pago.update({
          where: { id: pagoId },
          data: {
            estado: EstadoPago.PAGADO,
            fechaPago: new Date(),
          },
        })

        // 2. Actualizar el estado del Trabajo
        console.log(`2. Actualizando estado del trabajo ${trabajoId} a ACEPTADO.`)
        const trabajo = await tx.trabajo.update({
          where: { id: trabajoId },
          data: { estado: EstadoTrabajo.ACEPTADO },
          include: { cliente: { include: { user: true } }, tecnico: { include: { user: true } } },
        })

        // 3. Crear notificación para el técnico
        console.log(`3. Creando notificación para el técnico ${trabajo.tecnico.userId}.`)
        await tx.notificacion.create({
          data: {
            userId: trabajo.tecnico.userId,
            tipo: TipoNotificacion.PAGO,
            titulo: '¡Cotización aceptada y pagada!',
            mensaje: `${trabajo.cliente.user.nombre} ha pagado y aceptado tu cotización de S/ ${trabajo.precio?.toFixed(2)}.`,
            metadata: { trabajoId: trabajo.id },
          },
        })
      })
      console.log(`Transacción completada exitosamente para el pago ${pagoId}.`)
    } catch (error) {
      console.error(`Error durante la transacción en la base de datos para el pago ${pagoId}:`, error)
      // No relanzamos el error para evitar que Stripe reintente indefinidamente si es un error de lógica,
      // pero en un sistema de producción real, aquí se debería notificar a un sistema de monitoreo.
    }
  }
}

export const pagoService = new PagoService()
