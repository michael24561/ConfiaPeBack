export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, ApiError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string = 'Bad Request') {
    return new ApiError(400, message);
  }

  static unauthorized(message: string = 'No autorizado') {
    return new ApiError(401, message);
  }

  static forbidden(message: string = 'Acceso denegado') {
    return new ApiError(403, message);
  }

  static notFound(message: string = 'Recurso no encontrado') {
    return new ApiError(404, message);
  }

  static conflict(message: string = 'Conflicto') {
    return new ApiError(409, message);
  }

  static internal(message: string = 'Error interno del servidor') {
    return new ApiError(500, message, false);
  }
}
