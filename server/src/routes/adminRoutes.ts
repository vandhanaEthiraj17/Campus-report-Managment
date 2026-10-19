import { Router } from 'express';
import { getAnalyticsOverview, getUsers, updateUserRole, createUser, getAuditLogs } from '../controllers/adminController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken);
router.use(authorizeRoles('ADMIN'));

router.get('/analytics/overview', getAnalyticsOverview);
router.get('/analytics', getAnalyticsOverview);
router.get('/users', getUsers);
router.post('/users', createUser);
router.patch('/users/:userId', updateUserRole);
router.get('/audit-logs', getAuditLogs);

export default router;
