import { Router } from 'express';
import { register, login, getMe, verifyIdentity, getAuthConfig } from '../controllers/authController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.post('/verify-identity', verifyIdentity);
router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateToken, getMe);
router.get('/config', getAuthConfig);

export default router;
