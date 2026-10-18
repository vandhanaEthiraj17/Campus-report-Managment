import { Router } from 'express';
import {
  getIntelligenceOverview,
  getAssetHealthList,
  getAssetHealthById,
  getRecurringIssues,
  getRecommendations,
  getRecommendationById,
  refreshIntelligence,
  reviewRecommendation,
  linkTaskToRecommendation,
  addressRecommendation,
  dismissRecommendation,
} from '../controllers/intelligenceController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken);

// Intelligence metrics overview & recurring patterns
router.get('/overview', authorizeRoles('ADMIN', 'STAFF'), getIntelligenceOverview);
router.get('/recurring-issues', authorizeRoles('ADMIN', 'STAFF'), getRecurringIssues);

// Asset health assessments
router.get('/health', authorizeRoles('ADMIN', 'STAFF'), getAssetHealthList);
router.get('/health/:id', authorizeRoles('ADMIN', 'STAFF'), getAssetHealthById);

// Recommendations queue & details
router.get('/recommendations', authorizeRoles('ADMIN', 'STAFF'), getRecommendations);
router.get('/recommendations/:id', authorizeRoles('ADMIN', 'STAFF'), getRecommendationById);

// Admin-only evaluation refresh
router.post('/refresh', authorizeRoles('ADMIN'), refreshIntelligence);

// Action workflows for authorized staff and administrators
router.patch('/recommendations/:id/review', authorizeRoles('ADMIN', 'STAFF'), reviewRecommendation);
router.post('/recommendations/:id/link-task', authorizeRoles('ADMIN', 'STAFF'), linkTaskToRecommendation);
router.patch('/recommendations/:id/address', authorizeRoles('ADMIN', 'STAFF'), addressRecommendation);
router.post('/recommendations/:id/dismiss', authorizeRoles('ADMIN', 'STAFF'), dismissRecommendation);

export default router;
