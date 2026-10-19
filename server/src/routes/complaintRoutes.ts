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

const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.mov', '.webm']);
const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTS.has(rawExt) ? rawExt : '.bin';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
    cb(null, uniqueSuffix);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();

    if (ALLOWED_EXTS.has(rawExt) && ALLOWED_MIMES.has(mime)) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, GIF images and MP4, MOV, WebM videos are permitted.'));
  },
});

router.use(authenticateToken);

router.post('/upload', (req: any, res: any) => {
  upload.single('file')(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size exceeds maximum permitted limit of 25MB.' });
      }
      return res.status(400).json({ message: `Upload validation error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message || 'File upload failed.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({ url: fileUrl });
  });
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
