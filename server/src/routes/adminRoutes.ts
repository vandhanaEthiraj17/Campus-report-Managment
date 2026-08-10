import { Router } from 'express';
import { getAnalyticsOverview, getUsers, updateUserRole } from '../controllers/adminController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken);
router.use(authorizeRoles('ADMIN'));

router.get('/analytics/overview', getAnalyticsOverview);
router.get('/users', getUsers);
router.patch('/users/:userId', updateUserRole);

export default router;
