import { Request, Response, NextFunction } from 'express';
import { tecnicoService } from '../services/tecnico.service';
import { successResponse } from '../utils/response';
import { ApiError } from '../utils/ApiError';
import {
  GetTecnicosInput,
  UpdateTecnicoInput,
  AddServicioInput,
  AddCertificadoInput,
  UpdateCertificadoInput,
  AddGaleriaInput,
  UpdateHorariosInput,
  UpdateConfiguracionInput,
} from '../validators/tecnico.validator';

export class TecnicoController {
  /**
   * GET /api/tecnicos
   * Lista técnicos con filtros
   */
  async getTecnicos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = req.query as GetTecnicosInput;
      // Pasar el userId si el usuario está autenticado (opcional)
      const userId = req.user?.id;
      const result = await tecnicoService.getTecnicos(filters, userId);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tecnicos/:id
   * Obtiene el detalle completo de un técnico
   */
  async getTecnicoById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw ApiError.badRequest('ID de técnico requerido');
      }
      const result = await tecnicoService.getTecnicoById(id);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tecnicos/me
   * Obtiene el perfil del técnico autenticado
   */
  async getMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      const result = await tecnicoService.getMyProfile(req.user.id);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/tecnicos/me
   * Actualiza el perfil del técnico autenticado
   */
  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      const data: UpdateTecnicoInput = req.body;
      const result = await tecnicoService.updateProfile(req.user.id, data);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/tecnicos/me/servicios
   * Agrega un servicio al técnico
   */
  async addServicio(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      const data: AddServicioInput = req.body;
      const result = await tecnicoService.addServicio(req.user.id, data);

      successResponse(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/tecnicos/me/servicios/:id
   * Elimina un servicio del técnico
   */
  async deleteServicio(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      const { id } = req.params;
      if (!id) {
        throw ApiError.badRequest('ID de servicio requerido');
      }
      const result = await tecnicoService.deleteServicio(req.user.id, id);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/tecnicos/me/certificados
   * Agrega un certificado con imagen
   */
  async addCertificado(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      const data: AddCertificadoInput = req.body;
      const file = req.file;

      const result = await tecnicoService.addCertificado(req.user.id, data, file);

      successResponse(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/tecnicos/me/certificados/:id
   * Elimina un certificado del técnico
   */
  async deleteCertificado(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      const { id } = req.params;
      if (!id) {
        throw ApiError.badRequest('ID de certificado requerido');
      }
      const result = await tecnicoService.deleteCertificado(req.user.id, id);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/tecnicos/me/certificados/:id
   * Actualiza un certificado del técnico
   */
  async updateCertificado(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      const { id } = req.params;
      if (!id) {
        throw ApiError.badRequest('ID de certificado requerido');
      }

      const data: UpdateCertificadoInput = req.body;
      const result = await tecnicoService.updateCertificado(req.user.id, id, data);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/tecnicos/me/galeria
   * Agrega una imagen a la galería
   */
  async addGaleriaItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      const data: AddGaleriaInput = req.body;
      const file = req.file;

      const result = await tecnicoService.addGaleriaItem(req.user.id, data, file);

      successResponse(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tecnicos/me/horarios
   * Obtiene los horarios del técnico
   */
  async getHorarios(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      const result = await tecnicoService.getHorarios(req.user.id);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/tecnicos/me/horarios
   * Actualiza los horarios del técnico
   */
  async updateHorarios(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      const data: UpdateHorariosInput = req.body;
      const result = await tecnicoService.updateHorarios(req.user.id, data);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/tecnicos/me/configuracion
   * Actualiza la configuración del técnico
   */
  async updateConfiguracion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      const data: UpdateConfiguracionInput = req.body;
      const result = await tecnicoService.updateConfiguracion(req.user.id, data);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/tecnicos/:id/approve-validation
   * Aprueba la validación de un técnico
   */
  async approveTecnicoValidation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw ApiError.badRequest('ID de técnico requerido');
      }
      const result = await tecnicoService.updateVerificationStatus(id, true);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/tecnicos/:id/reject-validation
   * Rechaza la validación de un técnico
   */
  async rejectTecnicoValidation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw ApiError.badRequest('ID de técnico requerido');
      }
      const result = await tecnicoService.updateVerificationStatus(id, false);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async getReniecData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw ApiError.badRequest('ID de técnico requerido');
      }
      const result = await tecnicoService.getReniecData(id);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tecnicos/:id/validation-data
   * Obtiene los datos del técnico y de RENIEC para la validación
   */
  async getValidationData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw ApiError.badRequest('ID de técnico requerido');
      }
      const result = await tecnicoService.getValidationData(id);

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tecnicos/me/ingresos
   * Obtiene el total de ingresos netos del técnico autenticado.
   */
  async getTechnicianIncome(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }
      const result = await tecnicoService.getTechnicianNetIncome(req.user.id);
      successResponse(res, { totalNetIncome: result }, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const tecnicoController = new TecnicoController();
