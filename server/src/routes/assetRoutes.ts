import { Router } from 'express';
import {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  getAssetAnalytics,
} from '../controllers/assetController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken);

// Real-time Database Asset Analytics (Admin only)
router.get('/analytics', authorizeRoles('ADMIN'), getAssetAnalytics);

// Search & list campus assets (Authenticated users can view/select assets)
router.get('/', getAssets);

// Single asset detail with linked complaints and maintenance history
router.get('/:id', getAssetById);

// Admin-only management endpoints
router.post('/', authorizeRoles('ADMIN'), createAsset);
router.put('/:id', authorizeRoles('ADMIN'), updateAsset);
router.delete('/:id', authorizeRoles('ADMIN'), deleteAsset);

export default router;
