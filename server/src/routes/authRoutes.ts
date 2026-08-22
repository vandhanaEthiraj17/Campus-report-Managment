import { Router } from 'express';
import { register, login, getMe, registerSendOtp, registerVerifyOtp, getAuthConfig } from '../controllers/authController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/register-send-otp', registerSendOtp);
router.post('/register-verify-otp', registerVerifyOtp);
router.post('/login', login);
router.get('/me', authenticateToken, getMe);
router.get('/config', getAuthConfig);

export default router;
