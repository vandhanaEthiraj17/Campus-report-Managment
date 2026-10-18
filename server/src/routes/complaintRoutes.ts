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
  translateVoiceInput,
  triggerEmergencyAlertManual,
  getEmergencyLogs,
} from '../controllers/complaintController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure Multer storage
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|mp4|mov|avi|mkv|webm/i;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images and videos are allowed!'));
  }
});

router.use(authenticateToken);

router.post('/upload', upload.single('file'), (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({ url: fileUrl });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'File upload failed.' });
  }
});

router.get('/check-duplicate', checkDuplicates);
router.post('/translate', translateVoiceInput);
router.get('/emergency-logs', getEmergencyLogs);
router.post('/', createComplaint);
router.get('/', getComplaints);
router.get('/:id', getComplaintById);
router.post('/:id/upvote', upvoteComplaint);
router.post('/:id/emergency-notify', authorizeRoles('ADMIN', 'STAFF'), triggerEmergencyAlertManual);
router.patch('/:id/assign', authorizeRoles('ADMIN'), assignComplaint);
router.patch('/:id/status', updateStatus);
router.post('/:id/resolve', authorizeRoles('STAFF', 'ADMIN'), resolveComplaint);
router.post('/:id/verify', verifyComplaint);

export default router;
