import { stripe } from '../config/stripe'
import { prisma } from '../config/database'
import { ApiError } from '../utils/ApiError'


const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

export class StripeService {
  /**
   * Crea una cuenta de Stripe Connect para un técnico o la recupera si ya existe.
   * @param tecnicoUserId - El ID del usuario técnico.
   */
  async createConnectAccount(tecnicoUserId: string) {
    const tecnico = await prisma.tecnico.findUnique({
      where: { userId: tecnicoUserId },
      include: { user: true }, // Incluir datos del usuario
    })

    if (!tecnico) {
      throw new ApiError(404, 'Perfil de técnico no encontrado.')
    }

    // Si ya tiene una cuenta de Stripe, simplemente la devolvemos.
    if (tecnico.stripeAccountId) {
      console.log(`El técnico ${tecnico.id} ya tiene una cuenta de Stripe: ${tecnico.stripeAccountId}`)
      // Verificamos el estado actual para devolver la información más reciente.
      const account = await stripe.accounts.retrieve(tecnico.stripeAccountId)
      const onboardingComplete = account.charges_enabled && account.details_submitted
      
      if (tecnico.stripeOnboardingComplete !== onboardingComplete) {
        await prisma.tecnico.update({
          where: { id: tecnico.id },
          data: { stripeOnboardingComplete: onboardingComplete },
        })
      }

      return { 
        stripeAccountId: tecnico.stripeAccountId, 
        onboardingComplete,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      }
    }

    console.log(`Creando nueva cuenta de Stripe Connect para el técnico ${tecnico.id}...`)
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'PE', // Perú
      email: tecnico.user.email,
      business_type: 'individual',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      individual: {
        first_name: tecnico.nombres ?? '',
        last_name: tecnico.apellidos ?? '',
        email: tecnico.user.email,
      },
    })

    const updatedTecnico = await prisma.tecnico.update({
      where: { id: tecnico.id },
      data: { stripeAccountId: account.id },
    })

    console.log(`Cuenta ${account.id} creada y asociada al técnico ${tecnico.id}.`)
    return { stripeAccountId: updatedTecnico.stripeAccountId, onboardingComplete: updatedTecnico.stripeOnboardingComplete }
  }

  /**
   * Crea un link de onboarding para que el técnico complete su registro en Stripe.
   * @param stripeAccountId - El ID de la cuenta de Stripe Connect del técnico.
   */
  async createAccountLink(stripeAccountId: string) {
    console.log(`Creando link de onboarding para la cuenta ${stripeAccountId}...`)
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${FRONTEND_URL}/tecnico/perfil?stripe_refresh=true`,
      return_url: `${FRONTEND_URL}/tecnico/perfil?stripe_return=true`,
      type: 'account_onboarding',
    })

    console.log(`Link creado: ${accountLink.url}`)
    return { url: accountLink.url }
  }

  /**
   * Recupera el estado de una cuenta de Stripe Connect.
   * @param tecnicoUserId - El ID del usuario técnico.
   */
  async getAccountStatus(tecnicoUserId: string) {
    console.log(`Consultando estado de la cuenta para el usuario técnico ${tecnicoUserId}...`)
    
    const tecnico = await prisma.tecnico.findUnique({
      where: { userId: tecnicoUserId },
    })

    if (!tecnico || !tecnico.stripeAccountId) {
      throw new ApiError(404, 'No se encontró una cuenta de Stripe asociada a este técnico.')
    }
    
    const stripeAccountId = tecnico.stripeAccountId
    const account = await stripe.accounts.retrieve(stripeAccountId)
    
    const onboardingComplete = account.charges_enabled && account.details_submitted
    console.log(`La cuenta ${stripeAccountId} tiene onboardingComplete: ${onboardingComplete}`)

    // Actualizar el estado en nuestra base de datos si ha cambiado
    if (tecnico.stripeOnboardingComplete !== onboardingComplete) {
      await prisma.tecnico.update({
        where: { id: tecnico.id },
        data: { stripeOnboardingComplete: onboardingComplete },
      })
      console.log(`Estado de onboarding actualizado en la BD para el técnico ${tecnico.id}.`)
    }

    return {
      stripeAccountId,
      onboardingComplete,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    }
  }
}

export const stripeService = new StripeService()
