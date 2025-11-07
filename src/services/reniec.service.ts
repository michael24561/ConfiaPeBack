export interface ReniecData {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento: string;
}

// Agrega esta interfaz para tipar la respuesta de la API
interface ReniecApiResponse {
  success: boolean;
  message?: string;
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
}

export class ReniecService {
  private readonly API_URL = 'https://dniruc.apisperu.com/api/v1/dni';
  private readonly API_TOKEN = process.env.RENIECT_API_TOKEN;

  async getDniData(dni: string): Promise<ReniecData> {
    if (!this.API_TOKEN) {
      throw new Error('El token de la API de RENIEC no está configurado');
    }

    console.log(`[ReniecService] Obteniendo datos para el DNI: ${dni}`);

    const response = await fetch(`${this.API_URL}/${dni}?token=${this.API_TOKEN}`);

    if (!response.ok) {
      throw new Error(`Error al consultar la API de RENIEC: ${response.statusText}`);
    }

    // Aquí tienes que tipar la respuesta
    const data = await response.json() as ReniecApiResponse;

    if (!data.success) {
      throw new Error(data.message || 'Error al consultar la API de RENIEC');
    }

    return {
      dni: data.dni,
      nombres: data.nombres,
      apellidoPaterno: data.apellidoPaterno,
      apellidoMaterno: data.apellidoMaterno,
      fechaNacimiento: '-', // La API no devuelve este dato
    };
  }
}

export const reniecService = new ReniecService();