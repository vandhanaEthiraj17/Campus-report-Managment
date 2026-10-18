import { Router } from 'express';
import {
  scheduleMaintenance,
  getMaintenanceTasks,
  startMaintenance,
  completeMaintenance,
  cancelMaintenance,
} from '../controllers/maintenanceController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken);

// Schedule maintenance (Admin only)
router.post('/schedule', authorizeRoles('ADMIN'), scheduleMaintenance);

// List maintenance tasks (Admin sees all, Staff sees assigned/department tasks)
router.get('/tasks', authorizeRoles('ADMIN', 'STAFF'), getMaintenanceTasks);

// Start maintenance (Staff or Admin)
router.patch('/:id/start', authorizeRoles('ADMIN', 'STAFF'), startMaintenance);

// Record maintenance completion (Staff or Admin)
router.post('/:id/complete', authorizeRoles('ADMIN', 'STAFF'), completeMaintenance);

// Cancel maintenance task (Admin only)
router.patch('/:id/cancel', authorizeRoles('ADMIN'), cancelMaintenance);

export default router;
