import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router: Router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/users
 * Get a paginated list of all users (excluding admins and the current user).
 * Query params: page, limit
 */
router.get('/', userController.getUsers.bind(userController));

export default router;
