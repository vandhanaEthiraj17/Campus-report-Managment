import { Router } from 'express';
import {
  createComplaint,
  getComplaints,
  getComplaintById,
  checkDuplicates,
  upvoteComplaint,
  assignComplaint,
  updateStatus,
  resolveComplaint,
  verifyComplaint,
} from '../controllers/complaintController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/check-duplicate', checkDuplicates);
router.post('/', createComplaint);
router.get('/', getComplaints);
router.get('/:id', getComplaintById);
router.post('/:id/upvote', upvoteComplaint);
router.patch('/:id/assign', authorizeRoles('ADMIN'), assignComplaint);
router.patch('/:id/status', updateStatus);
router.post('/:id/resolve', authorizeRoles('STAFF', 'ADMIN'), resolveComplaint);
router.post('/:id/verify', verifyComplaint);

export default router;
