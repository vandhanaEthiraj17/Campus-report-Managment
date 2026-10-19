import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../middlewares/authMiddleware';

let io: SocketIOServer | null = null;

interface SocketUserPayload {
  id: string;
  userId?: string;
  name?: string;
  email?: string;
  role: string;
  department?: string;
}

/**
 * Initializes the Socket.IO server on top of the Express HTTP server
 */
export const initSocketServer = (httpServer: HttpServer): SocketIOServer => {
  const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:3000';

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigin,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 15000,
  });

  // Socket authentication middleware
  io.use((socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error: Missing token'));
      }

      const decoded = jwt.verify(token, getJwtSecret()) as SocketUserPayload;
      socket.data.user = {
        id: decoded.id || decoded.userId,
        name: decoded.name,
        role: decoded.role,
        department: decoded.department,
      };

      next();
    } catch (err: any) {
      next(new Error(`Authentication error: ${err.message || 'Invalid token'}`));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as SocketUserPayload;
    if (!user) return;

    // Join user-specific private room
    const userRoom = `user:${user.id}`;
    socket.join(userRoom);

    // Join role-specific broadcast room
    const roleRoom = `role:${user.role}`;
    socket.join(roleRoom);

    // Join departmental room if applicable
    if (user.department) {
      const deptRoom = `dept:${user.department.trim().toLowerCase()}`;
      socket.join(deptRoom);
    }

    // Join emergency responders channel for Admins & Security personnel
    if (
      user.role === 'ADMIN' ||
      user.department?.toLowerCase().includes('security') ||
      user.department?.toLowerCase().includes('safety')
    ) {
      socket.join('emergency:responders');
    }

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  console.log('[Socket.IO] Real-time WebSocket server initialized.');
  return io;
};

/**
 * Returns the active Socket.IO server instance
 */
export const getIO = (): SocketIOServer | null => io;

/**
 * Strips PII for anonymous complaints when broadcasting to non-admin rooms
 */
const sanitizeForAnonymous = (complaint: any, isRecipientAdmin: boolean) => {
  if (!complaint.isAnonymous || isRecipientAdmin) {
    return complaint;
  }
  const clean = { ...complaint };
  clean.reportedByName = 'Anonymous Reporter';
  clean.reportedBy = undefined;
  clean.reporterUserId = undefined;
  return clean;
};

/**
 * Real-time event dispatchers
 */

export const emitComplaintCreated = (complaint: any) => {
  if (!io) return;

  const raw = complaint.toObject ? complaint.toObject() : complaint;

  // 1. Send full record to Administrators
  io.to('role:ADMIN').emit('complaint:created', raw);

  // 2. Send to relevant department (sanitized if anonymous)
  if (raw.assignedDepartment) {
    const deptRoom = `dept:${raw.assignedDepartment.trim().toLowerCase()}`;
    io.to(deptRoom).emit('complaint:created', sanitizeForAnonymous(raw, false));
  }

  // 3. Send to author's private room
  const authorId = raw.reportedBy?._id || raw.reportedBy || raw.reporterUserId;
  if (authorId) {
    io.to(`user:${authorId}`).emit('complaint:created', raw);
  }

  // 4. Send to general role:STAFF if unassigned or general broadcast
  io.to('role:STAFF').emit('complaint:created', sanitizeForAnonymous(raw, false));
};

export const emitComplaintAssigned = (complaint: any) => {
  if (!io) return;
  const raw = complaint.toObject ? complaint.toObject() : complaint;

  io.to('role:ADMIN').emit('complaint:assigned', raw);

  const staffId = raw.assignedStaff?._id || raw.assignedStaff;
  if (staffId) {
    io.to(`user:${staffId}`).emit('complaint:assigned', raw);
  }

  const authorId = raw.reportedBy?._id || raw.reportedBy || raw.reporterUserId;
  if (authorId) {
    io.to(`user:${authorId}`).emit('complaint:assigned', raw);
  }
};

export const emitComplaintStatusChanged = (complaint: any) => {
  if (!io) return;
  const raw = complaint.toObject ? complaint.toObject() : complaint;

  io.to('role:ADMIN').emit('complaint:status_changed', raw);

  if (raw.assignedDepartment) {
    io.to(`dept:${raw.assignedDepartment.trim().toLowerCase()}`).emit('complaint:status_changed', raw);
  }

  const staffId = raw.assignedStaff?._id || raw.assignedStaff;
  if (staffId) {
    io.to(`user:${staffId}`).emit('complaint:status_changed', raw);
  }

  const authorId = raw.reportedBy?._id || raw.reportedBy || raw.reporterUserId;
  if (authorId) {
    io.to(`user:${authorId}`).emit('complaint:status_changed', raw);
  }
};

export const emitEmergencyIncidentCreated = (incident: any) => {
  if (!io) return;
  const raw = incident.toObject ? incident.toObject() : incident;

  io.to('emergency:responders').emit('emergency:created', raw);
  io.to('role:ADMIN').emit('emergency:created', raw);
};

export const emitEmergencyIncidentUpdated = (incident: any, eventType: 'acknowledged' | 'resolved' | 'updated') => {
  if (!io) return;
  const raw = incident.toObject ? incident.toObject() : incident;

  io.to('emergency:responders').emit(`emergency:${eventType}`, raw);
  io.to('role:ADMIN').emit(`emergency:${eventType}`, raw);
};

export const emitMaintenanceTaskCreated = (record: any) => {
  if (!io) return;
  const raw = record.toObject ? record.toObject() : record;

  io.to('role:ADMIN').emit('maintenance:created', raw);
  io.to('role:STAFF').emit('maintenance:created', raw);
};

export const emitMaintenanceTaskUpdated = (record: any) => {
  if (!io) return;
  const raw = record.toObject ? record.toObject() : record;

  io.to('role:ADMIN').emit('maintenance:updated', raw);
  io.to('role:STAFF').emit('maintenance:updated', raw);
};

export const emitAssetStatusChanged = (asset: any) => {
  if (!io) return;
  const raw = asset.toObject ? asset.toObject() : asset;

  io.to('role:ADMIN').emit('asset:status_changed', raw);
  io.to('role:STAFF').emit('asset:status_changed', raw);
};
