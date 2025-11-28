export interface CreateLogInput {
    adminUserId: string
    adminUserEmail: string
    accion: string
    entidadAfectada?: string
    idEntidadAfectada?: string
    detalles?: any
}

export interface GetLogsFilters {
    adminUserId?: string
    entidadAfectada?: string
    page?: number
    limit?: number
}

export interface LogsPaginatedResponse {
    data: any[]
    pagination: {
        page: number
        limit: number
        total: number
        pages: number
    }
}
