import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';

export interface AddExceptionInput {
    fecha: string; // YYYY-MM-DD
    disponible: boolean;
    horaInicio?: string;
    horaFin?: string;
    motivo?: string;
}

export class DisponibilidadService {
    /**
     * Agrega o actualiza una excepción de disponibilidad
     */
    async addException(userId: string, data: AddExceptionInput) {
        const tecnico = await prisma.tecnico.findUnique({
            where: { userId },
        });

        if (!tecnico) {
            throw ApiError.notFound('Perfil de técnico no encontrado');
        }

        const fecha = new Date(data.fecha);

        // Filter out undefined values for update and create
        const updateData: any = { disponible: data.disponible }
        if (data.horaInicio !== undefined) updateData.horaInicio = data.horaInicio
        if (data.horaFin !== undefined) updateData.horaFin = data.horaFin
        if (data.motivo !== undefined) updateData.motivo = data.motivo

        const createData: any = {
            tecnicoId: tecnico.id,
            fecha: fecha,
            disponible: data.disponible,
        }
        if (data.horaInicio !== undefined) createData.horaInicio = data.horaInicio
        if (data.horaFin !== undefined) createData.horaFin = data.horaFin
        if (data.motivo !== undefined) createData.motivo = data.motivo

        // Upsert exception
        const exception = await prisma.disponibilidadExcepcion.upsert({
            where: {
                tecnicoId_fecha: {
                    tecnicoId: tecnico.id,
                    fecha: fecha,
                },
            },
            update: updateData,
            create: createData,
        });

        return exception;
    }

    /**
     * Obtiene las excepciones de un técnico (futuras o rango)
     */
    async getExceptions(userId: string) {
        const tecnico = await prisma.tecnico.findUnique({
            where: { userId },
        });

        if (!tecnico) {
            throw ApiError.notFound('Perfil de técnico no encontrado');
        }

        const exceptions = await prisma.disponibilidadExcepcion.findMany({
            where: {
                tecnicoId: tecnico.id,
                fecha: {
                    gte: new Date(), // Solo futuras o actuales
                },
            },
            orderBy: {
                fecha: 'asc',
            },
        });

        return exceptions;
    }

    /**
     * Elimina una excepción
     */
    async deleteException(userId: string, exceptionId: string) {
        const tecnico = await prisma.tecnico.findUnique({
            where: { userId },
        });

        if (!tecnico) {
            throw ApiError.notFound('Perfil de técnico no encontrado');
        }

        await prisma.disponibilidadExcepcion.deleteMany({
            where: {
                id: exceptionId,
                tecnicoId: tecnico.id,
            },
        });

        return { message: 'Excepción eliminada' };
    }

    /**
     * Verifica la disponibilidad para una fecha específica
     * Retorna los slots disponibles o si el día está bloqueado
     */
    async checkAvailability(tecnicoId: string, dateStr: string) {
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Lunes, ...

        // Mapear getDay() a enum DiaSemana
        const dias = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
        const diaSemana = dias[dayOfWeek];

        // 1. Buscar excepción para esa fecha
        const exception = await prisma.disponibilidadExcepcion.findUnique({
            where: {
                tecnicoId_fecha: {
                    tecnicoId,
                    fecha: date,
                },
            },
        });

        // Si hay excepción, esa manda
        if (exception) {
            if (!exception.disponible) {
                return { available: false, reason: exception.motivo || 'No disponible' };
            }
            return {
                available: true,
                horaInicio: exception.horaInicio,
                horaFin: exception.horaFin,
                isException: true,
            };
        }

        // 2. Si no hay excepción, buscar horario regular
        // Prisma enum mapping might be tricky, let's try to query by string if possible or cast
        // Since DiaSemana is an enum in schema, we need to match it.

        const horario = await prisma.horario.findFirst({
            where: {
                tecnicoId,
                diaSemana: diaSemana as any, // Cast to any to avoid strict enum type issues in this context
            },
        });

        if (!horario || !horario.disponible) {
            return { available: false, reason: 'Día no laborable' };
        }

        return {
            available: true,
            horaInicio: horario.horaInicio,
            horaFin: horario.horaFin,
            isException: false,
        };
    }
}

export const disponibilidadService = new DisponibilidadService();
