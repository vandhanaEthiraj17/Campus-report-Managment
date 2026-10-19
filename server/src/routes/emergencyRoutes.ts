import { Router } from 'express';
import {
  createEmergencyIncident,
  getEmergencyIncidents,
  getEmergencyIncidentById,
  acknowledgeEmergencyIncident,
  assignEmergencyTeam,
  resolveEmergencyIncident,
  handleTwilioStatusCallback,
  getRecipients,
  createRecipient,
  updateRecipient,
  deleteRecipient,
} from '../controllers/emergencyController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();

// Twilio webhook status callback (public endpoint authenticated via Twilio Signature)
router.post('/notifications/twilio-callback', handleTwilioStatusCallback);

// Emergency Incident Reporting & Response
router.post('/emergencies', authenticateToken, createEmergencyIncident);
router.get('/emergencies', authenticateToken, getEmergencyIncidents);
router.get('/emergencies/:id', authenticateToken, getEmergencyIncidentById);
router.patch('/emergencies/:id/acknowledge', authenticateToken, authorizeRoles('ADMIN', 'STAFF'), acknowledgeEmergencyIncident);
router.patch('/emergencies/:id/assign', authenticateToken, authorizeRoles('ADMIN'), assignEmergencyTeam);
router.patch('/emergencies/:id/resolve', authenticateToken, authorizeRoles('ADMIN', 'STAFF'), resolveEmergencyIncident);

// Notification Recipient Management (Admin only)
router.get('/notifications/recipients', authenticateToken, authorizeRoles('ADMIN'), getRecipients);
router.post('/notifications/recipients', authenticateToken, authorizeRoles('ADMIN'), createRecipient);
router.patch('/notifications/recipients/:id', authenticateToken, authorizeRoles('ADMIN'), updateRecipient);
router.delete('/notifications/recipients/:id', authenticateToken, authorizeRoles('ADMIN'), deleteRecipient);

export default router;
