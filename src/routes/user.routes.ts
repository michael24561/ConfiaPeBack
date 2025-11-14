import { Router } from 'express';
import { UserController } from '../controllers/user.controller'; // Import the class
import { authMiddleware } from '../middlewares/auth.middleware';

const router: Router = Router();
const myUserController = new UserController(); // Instantiate the class locally

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/users
 * Get a paginated list of all users (excluding admins and the current user).
 * Query params: page, limit
 */
router.get('/', myUserController.getUsers.bind(myUserController));

/**
 * GET /api/users/chat-eligible
 * Get a paginated list of users eligible for chat (technicians and admin).
 * Query params: page, limit, q (search query)
 */
router.get('/chat-eligible', myUserController.getChatEligibleUsers.bind(myUserController));

/**
 * GET /api/users/admin
 * Get the admin user.
 */
router.get('/admin', myUserController.getAdmin.bind(myUserController));

export default router;
