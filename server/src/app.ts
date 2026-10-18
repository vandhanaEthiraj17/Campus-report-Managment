

import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import authRoutes from './routes/authRoutes';
import locationRoutes from './routes/locationRoutes';
import complaintRoutes from './routes/complaintRoutes';
import adminRoutes from './routes/adminRoutes';
import assetRoutes from './routes/assetRoutes';
import maintenanceRoutes from './routes/maintenanceRoutes';
import intelligenceRoutes from './routes/intelligenceRoutes';
import sustainabilityRoutes from './routes/sustainabilityRoutes';

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

// Serve static uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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
app.use('/api/v1/assets', assetRoutes);
app.use('/api/v1/maintenance', maintenanceRoutes);
app.use('/api/v1/intelligence', intelligenceRoutes);
app.use('/api/v1/sustainability', sustainabilityRoutes);

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
import { checkAndProcessMaintenance } from './services/maintenanceSchedulerService';
import { ensureEmergencySetup } from './utils/ensureEmergencySetup';
import { ensureAssetSetup } from './utils/ensureAssetSetup';

// Start Server
app.listen(PORT, async () => {
  console.log(`[Server] Smart Campus Backend running on http://localhost:${PORT}`);
  
  // Ensure Emergency categories and departments are configured
  await ensureEmergencySetup();

  // Ensure Initial Campus Assets are seeded
  await ensureAssetSetup();

  // Run SLA Escalation check on startup and every 10 minutes
  checkAndEscalateComplaints();
  setInterval(checkAndEscalateComplaints, 10 * 60 * 1000);

  // Run Preventive Maintenance Scheduler on startup and every 15 minutes
  checkAndProcessMaintenance();
  setInterval(checkAndProcessMaintenance, 15 * 60 * 1000);
});

export default app;
