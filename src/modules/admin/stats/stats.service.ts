import { prisma } from '../../../config/database'
import { EstadoPago, EstadoTrabajo } from '@prisma/client'

export class StatsAdminService {
    /**
     * Obtiene estadísticas completas para el dashboard
     */
    async getStats() {
        const [
            totalTecnicos,
            totalClientes,
            totalTrabajos,
            pagosCompletados,
            tecnicosVerificados,
            trabajosPendientes,
            disputasAbiertas,
        ] = await Promise.all([
            prisma.tecnico.count(),
            prisma.cliente.count(),
            prisma.trabajo.count(),
            this.getPagosCompletados(),
            prisma.tecnico.count({ where: { verificado: true } }),
            prisma.trabajo.count({ where: { estado: EstadoTrabajo.PENDIENTE } }),
            prisma.trabajo.count({ where: { estado: EstadoTrabajo.EN_DISPUTA } }),
        ])

        // Obtener series temporales
        const trabajosPorDia = await this.getTrabajosPorDia(30)
        const usuariosPorDia = await this.getUsuariosPorDia(30)
        const ingresosPorDia = await this.getIngresosPorDia(30)

        return {
            totales: {
                tecnicos: totalTecnicos,
                clientes: totalClientes,
                trabajos: totalTrabajos,
                ingresosPlataforma: pagosCompletados.total,
                tecnicosVerificados,
                trabajosPendientes,
                disputasAbiertas,
            },
            series: {
                trabajosPorDia,
                usuariosPorDia,
                ingresosPorDia,
            },
        }
    }

    private async getPagosCompletados() {
        const pagos = await prisma.pago.findMany({
            where: { mpStatus: EstadoPago.APROBADO },
            select: { montoTotal: true, comisionPlataforma: true },
        })

        const total = pagos.reduce((sum, p) => sum + Number(p.comisionPlataforma || 0), 0)
        const montoTotal = pagos.reduce((sum, p) => sum + Number(p.montoTotal || 0), 0)

        return { total, montoTotal, count: pagos.length }
    }

    private async getTrabajosPorDia(dias: number) {
        const fechaInicio = new Date()
        fechaInicio.setDate(fechaInicio.getDate() - dias)
        fechaInicio.setHours(0, 0, 0, 0)

        const trabajos = await prisma.trabajo.findMany({
            where: { fechaSolicitud: { gte: fechaInicio } },
            select: { fechaSolicitud: true },
        })

        return this.agruparPorDia(trabajos, dias, 'fechaSolicitud')
    }

    private async getUsuariosPorDia(dias: number) {
        const fechaInicio = new Date()
        fechaInicio.setDate(fechaInicio.getDate() - dias)
        fechaInicio.setHours(0, 0, 0, 0)

        const usuarios = await prisma.user.findMany({
            where: { createdAt: { gte: fechaInicio } },
            select: { createdAt: true },
        })

        return this.agruparPorDia(usuarios, dias, 'createdAt')
    }

    private async getIngresosPorDia(dias: number) {
        const fechaInicio = new Date()
        fechaInicio.setDate(fechaInicio.getDate() - dias)
        fechaInicio.setHours(0, 0, 0, 0)

        const pagos = await prisma.pago.findMany({
            where: {
                mpStatus: EstadoPago.APROBADO,
                fechaPago: { gte: fechaInicio },
            },
            select: { fechaPago: true, comisionPlataforma: true },
        })

        // Agrupar por día
        const porDia = new Map<string, number>()

        // Inicializar todos los días con 0
        for (let i = 0; i < dias; i++) {
            const fecha = new Date()
            fecha.setDate(fecha.getDate() - (dias - 1 - i))
            const fechaStr = fecha.toISOString().split('T')[0]
            if (fechaStr) porDia.set(fechaStr, 0)
        }

        // Sumar los ingresos
        pagos.forEach((pago) => {
            if (pago.fechaPago) {
                const fechaStr = pago.fechaPago.toISOString().split('T')[0]
                if (fechaStr) {
                    const actual = porDia.get(fechaStr) || 0
                    porDia.set(fechaStr, actual + Number(pago.comisionPlataforma || 0))
                }
            }
        })

        return Array.from(porDia.entries())
            .map(([fecha, valor]) => ({ fecha, valor }))
            .sort((a, b) => a.fecha.localeCompare(b.fecha))
    }

    private agruparPorDia(data: any[], dias: number, campoFecha: string) {
        const resultado = new Map<string, number>()

        // Inicializar todos los días con 0
        for (let i = 0; i < dias; i++) {
            const fecha = new Date()
            fecha.setDate(fecha.getDate() - (dias - 1 - i))
            const fechaStr = fecha.toISOString().split('T')[0]
            if (fechaStr) resultado.set(fechaStr, 0)
        }

        // Contar elementos por día
        data.forEach((item) => {
            const fechaValue = item[campoFecha]
            if (fechaValue) {
                const fecha = new Date(fechaValue).toISOString().split('T')[0]
                if (fecha) {
                    const actual = resultado.get(fecha) || 0
                    resultado.set(fecha, actual + 1)
                }
            }
        })

        return Array.from(resultado.entries())
            .map(([fecha, valor]) => ({ fecha, valor }))
            .sort((a, b) => a.fecha.localeCompare(b.fecha))
    }
}

export const statsAdminService = new StatsAdminService()
