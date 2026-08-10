import { Router } from 'express';
import {
  getLocations,
  createLocation,
  getCategories,
  getDepartments,
} from '../controllers/locationController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();

router.get('/locations', getLocations);
router.post('/locations', authenticateToken, authorizeRoles('ADMIN'), createLocation);
router.get('/categories', getCategories);
router.get('/departments', getDepartments);

export default router;
