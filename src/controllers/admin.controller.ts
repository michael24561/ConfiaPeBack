import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service';
import { successResponse } from '../utils/response';

export class AdminController {
  async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await adminService.getStats();
      successResponse(res, stats, 200);
    } catch (error) {
      next(error);
    }
  }

  async getTecnicos(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tecnicos = await adminService.getTecnicos();
      successResponse(res, tecnicos, 200);
    } catch (error) {
      next(error);
    }
  }

  async getClientes(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientes = await adminService.getClientes();
      successResponse(res, clientes, 200);
    } catch (error) {
      next(error);
    }
  }

  async getTrabajos(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const trabajos = await adminService.getTrabajos();
      successResponse(res, trabajos, 200);
    } catch (error) {
      next(error);
    }
  }

  async getServicios(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const servicios = await adminService.getServicios();
      successResponse(res, servicios, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
