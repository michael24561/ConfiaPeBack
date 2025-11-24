import { MercadoPagoConfig } from 'mercadopago';

// Validación de variables
const requiredEnvVars = [
  'MP_ACCESS_TOKEN',
  'MP_PUBLIC_KEY', 
  'MP_CLIENT_ID',
  'MP_CLIENT_SECRET'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    // throw new Error(`Variable de entorno ${varName} no configurada`);
    console.warn(`ADVERTENCIA: La variable de entorno ${varName} no está configurada. Esto puede ser normal en desarrollo si no se usa OAuth o el cliente principal.`);
  }
});

// Cliente principal de Mercado Pago (para operaciones del marketplace)
export const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
  options: {
    timeout: 5000
  }
});

export const mpCredentials = {
  clientId: process.env.MP_CLIENT_ID!,
  clientSecret: process.env.MP_CLIENT_SECRET!,
  publicKey: process.env.MP_PUBLIC_KEY!,
  redirectUri: process.env.MP_REDIRECT_URI!
};

export const platformConfig = {
  feePercentage: parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '10'),
  webhookUrl: process.env.WEBHOOK_URL || '',
  webhookSecret: process.env.MP_WEBHOOK_SECRET || ''
};
