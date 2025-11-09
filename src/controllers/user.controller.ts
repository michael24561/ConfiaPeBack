import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { successResponse } from '../utils/response';

export class UserController {
  async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const currentUserId = req.user!.id; // Assumes authMiddleware has run

      const result = await userService.getUsers(page, limit, currentUserId);
      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
