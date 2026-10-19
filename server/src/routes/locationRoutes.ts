import { Router } from 'express';
import {
  getLocations,
  getLocationTree,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  getUnresolvedComplaintsByLocation,
  getCategories,
  getDepartments,
} from '../controllers/locationController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();

// Location queries
router.get('/locations', getLocations);
router.get('/locations/hierarchy', getLocationTree);
router.get('/locations/:id', getLocationById);
router.get('/locations/:id/unresolved-complaints', authenticateToken, getUnresolvedComplaintsByLocation);

// Admin Location Management
router.post('/locations', authenticateToken, authorizeRoles('ADMIN'), createLocation);
router.patch('/locations/:id', authenticateToken, authorizeRoles('ADMIN'), updateLocation);
router.delete('/locations/:id', authenticateToken, authorizeRoles('ADMIN'), deleteLocation);

// Categories & Departments
router.get('/categories', getCategories);
router.get('/departments', getDepartments);

export default router;
