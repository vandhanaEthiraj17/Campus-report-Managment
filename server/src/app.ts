import path from 'path';
import http from 'http';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from './config/db';
import authRoutes from './routes/authRoutes';
import locationRoutes from './routes/locationRoutes';
import complaintRoutes from './routes/complaintRoutes';
import adminRoutes from './routes/adminRoutes';
import assetRoutes from './routes/assetRoutes';
import maintenanceRoutes from './routes/maintenanceRoutes';
import intelligenceRoutes from './routes/intelligenceRoutes';
import sustainabilityRoutes from './routes/sustainabilityRoutes';
import emergencyRoutes from './routes/emergencyRoutes';
import { checkAndEscalateComplaints } from './services/escalationService';
import { checkAndProcessMaintenance } from './services/maintenanceSchedulerService';
import { ensureEmergencySetup } from './utils/ensureEmergencySetup';
import { ensureAssetSetup } from './utils/ensureAssetSetup';
import { ensureCampusLocationsAndCategories } from './utils/ensureCampusLocations';
import { initSocketServer, getIO } from './services/socketService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// CORS Configuration
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((s) => s.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(
  cors({
    origin: process.env.NODE_ENV === 'production'
      ? (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Blocked by CORS policy'));
          }
        }
      : '*',
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health Check API with Database Readiness Status
app.get('/api/v1/health', (req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'CONNECTED' : dbState === 2 ? 'CONNECTING' : 'DISCONNECTED';
  const isHealthy = dbState === 1;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'OK' : 'DEGRADED',
    database: dbStatus,
    service: 'Smart Campus Issue Management API',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', locationRoutes);
app.use('/api/v1', emergencyRoutes);
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
  const isProduction = process.env.NODE_ENV === 'production';
  const status = err.status || 500;
  res.status(status).json({
    message: isProduction && status === 500 ? 'An unexpected server error occurred.' : (err.message || 'Internal Server Error'),
  });
});

let escalationInterval: NodeJS.Timeout | null = null;
let maintenanceInterval: NodeJS.Timeout | null = null;

// Create HTTP server and initialize Socket.IO
const httpServer = http.createServer(app);
initSocketServer(httpServer);

// Start Server
httpServer.listen(PORT, async () => {
  console.log(`[Server] Smart Campus Backend running on http://localhost:${PORT}`);
  
  // Ensure Campus Locations and Categories are populated
  await ensureCampusLocationsAndCategories();

  // Ensure Emergency categories and departments are configured
  await ensureEmergencySetup();

  // Ensure Initial Campus Assets are seeded (in non-production environments)
  await ensureAssetSetup();

  // Run SLA Escalation check on startup and every 10 minutes
  checkAndEscalateComplaints();
  escalationInterval = setInterval(checkAndEscalateComplaints, 10 * 60 * 1000);

  // Run Preventive Maintenance Scheduler on startup and every 15 minutes
  checkAndProcessMaintenance();
  maintenanceInterval = setInterval(checkAndProcessMaintenance, 15 * 60 * 1000);
});

// Graceful Process Termination Handlers
const gracefulShutdown = async (signal: string) => {
  console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
  if (escalationInterval) clearInterval(escalationInterval);
  if (maintenanceInterval) clearInterval(maintenanceInterval);

  const io = getIO();
  if (io) {
    io.close(() => console.log('[Socket.IO] WebSocket server closed.'));
  }

  httpServer.close(async () => {
    console.log('[Server] HTTP server closed cleanly.');
    try {
      await mongoose.connection.close();
      console.log('[MongoDB] Database connection closed.');
      process.exit(0);
    } catch (dbErr) {
      console.error('[MongoDB] Error during disconnect:', dbErr);
      process.exit(1);
    }
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export default app;
