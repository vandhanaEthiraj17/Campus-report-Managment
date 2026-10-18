import { Router } from 'express';
import {
  getSustainabilityOverview,
  getCostAnalytics,
  getLifecycleAssessments,
  getAssetLifecycle,
  exportReport,
} from '../controllers/sustainabilityController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken);

// Sustainability & resource efficiency overview (Admin & Staff)
router.get('/overview', authorizeRoles('ADMIN', 'STAFF'), getSustainabilityOverview);

// Financial cost analytics & breakdowns (Admin only)
router.get('/cost-analytics', authorizeRoles('ADMIN'), getCostAnalytics);

// Equipment repair vs replacement review list (Admin only)
router.get('/lifecycle-assessments', authorizeRoles('ADMIN'), getLifecycleAssessments);

// Asset lifecycle and remaining useful life (Admin & Staff)
router.get('/asset-lifecycle/:id', authorizeRoles('ADMIN', 'STAFF'), getAssetLifecycle);

// Secure CSV report exports with formula injection protection (Admin only)
router.get('/export/:reportType', authorizeRoles('ADMIN'), exportReport);

export default router;
