import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import authRoutes from './routes/authRoutes';
import locationRoutes from './routes/locationRoutes';
import complaintRoutes from './routes/complaintRoutes';
import adminRoutes from './routes/adminRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(
  cors({
    origin: '*', // Allow all origins for dev environment
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check API
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    service: 'Smart Campus Issue Management API',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', locationRoutes);
app.use('/api/v1/complaints', complaintRoutes);
app.use('/api/v1/admin', adminRoutes);

// 404 Route Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: `API Endpoint Not Found: ${req.method} ${req.originalUrl}` });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Global Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

import { checkAndEscalateComplaints } from './services/escalationService';

// Start Server
app.listen(PORT, () => {
  console.log(`[Server] Smart Campus Backend running on http://localhost:${PORT}`);
  
  // Run SLA Escalation check on startup and every 10 minutes
  checkAndEscalateComplaints();
  setInterval(checkAndEscalateComplaints, 10 * 60 * 1000);
});

export default app;
