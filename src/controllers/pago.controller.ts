import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil' as any,
  typescript: true
});

export const createPaymentIntent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { monto, tecnicoId, servicioId, metodoPago, successUrl } = req.body;

    // Validación mejorada
    if (!monto || monto <= 0 || !tecnicoId || !servicioId || !metodoPago) {
      res.status(400).json({
        error: 'Datos incompletos o inválidos',
        details: {
          monto: 'Debe ser mayor a 0',
          tecnicoId: 'Requerido',
          servicioId: 'Requerido',
          metodoPago: 'Requerido (stripe|yape)'
        }
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }

    // Crear producto y precio en Stripe
    const product = await stripe.products.create({
      name: `Servicio ${servicioId}`,
      metadata: { servicioId, tecnicoId }
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(monto * 100),
      currency: 'pen',
    });

    // Crear enlace de pago
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{
        price: price.id,
        quantity: 1,
      }],
      after_completion: {
        type: 'redirect',
        redirect: {
          url: successUrl || `${process.env.FRONTEND_URL}/pago-exitoso`
        }
      },
      metadata: {
        userId: req.user.id,
        tecnicoId,
        servicioId
      }
    });

    // Guardar transacción en DB
    const transaction = await prisma.transaccion.create({
      data: {
        userId: req.user.id,
        tecnicoId,
        servicioId,
        monto,
        estado: 'PENDIENTE',
        paymentLinkId: paymentLink.id,
        paymentLinkUrl: paymentLink.url,
        metodo: metodoPago
      }
    });

    res.json({
      paymentLink: paymentLink.url,
      transactionId: transaction.id
    });

  } catch (error: any) {
    console.error('Error en createPaymentLink:', error);
    res.status(500).json({
      error: 'Error al generar enlace de pago',
      details: error.message
    });
  }
};

// Confirmar pago manualmente (opcional)
export const confirmarPago = async (req: Request, res: Response): Promise<void> => {
  try {
    const { transaccionId } = req.body;

    if (!transaccionId) {
      res.status(400).json({ error: 'ID de transacción requerido' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }

    const transaccion = await prisma.transaccion.findUnique({
      where: { id: transaccionId }
    });

    if (!transaccion) {
      res.status(404).json({ error: 'Transacción no encontrada' });
      return;
    }

    if (transaccion.userId !== req.user.id) {
      res.status(403).json({ error: 'No autorizado' });
      return;
    }

    res.json(transaccion);
  } catch (error: any) {
    console.error('Error en confirmarPago:', error);
    res.status(500).json({
      error: 'Error al confirmar pago',
      details: error.message
    });
  }
};

// Webhook para actualizar estado cuando se completa el pago
export const webhookHandler = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // Actualizar transacción en la base de datos
    const paymentLinkId = typeof session.payment_link === 'string'
      ? session.payment_link
      : session.payment_link?.id || null;

    if (paymentLinkId) {
      await prisma.transaccion.updateMany({
        where: { paymentLinkId },
        data: { estado: 'COMPLETADO' }
      });
    }

    // Aquí puedes añadir lógica adicional (notificaciones, etc.)
  }

  res.json({ received: true });
};