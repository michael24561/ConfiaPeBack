import Stripe from 'stripe'

const stripeApiKey = process.env.STRIPE_SECRET_KEY

if (!stripeApiKey) {
  throw new Error('La clave de API de Stripe no está configurada en las variables de entorno')
}

export const stripe = new Stripe(stripeApiKey, {
  apiVersion: '2025-10-29.clover',
  typescript: true,
})
