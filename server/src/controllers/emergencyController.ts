import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { EmergencyIncident, EmergencySeverity, EmergencyStatus } from '../models/EmergencyIncident';
import { NotificationRecipient } from '../models/NotificationRecipient';
import { Location } from '../models/Location';
import { getSmsProvider } from '../services/twilioSmsService';
import {
  emitEmergencyIncidentCreated,
  emitEmergencyIncidentUpdated,
} from '../services/socketService';
import { maskPhoneNumber } from '../services/emergencyNotificationService';

interface AuthRequest extends Request {
  user?: {
    id?: string;
    userId?: string;
    name?: string;
    role?: string;
    department?: string;
  };
}

/**
 * Generates human-readable incident code: EMG-YYYY-XXXX
 */
const generateIncidentCode = (): string => {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `EMG-${year}-${rand}`;
};

/**
 * POST /api/v1/emergencies
 * Create a new emergency incident, immediately trigger Twilio SMS, and broadcast to real-time socket
 */
export const createEmergencyIncident = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title,
      description,
      category,
      severity,
      locationId,
      buildingName,
      roomNumber,
      isAnonymous,
      reporterPhone,
    } = req.body;

    if (!title || !description || (!locationId && !buildingName)) {
      res.status(400).json({
        success: false,
        message: 'Title, description, and location are required for emergency reporting.',
      });
      return;
    }

    // Resolve Location
    let locDoc = null;
    if (locationId && Types.ObjectId.isValid(locationId)) {
      locDoc = await Location.findById(locationId);
    } else if (buildingName) {
      locDoc = await Location.findOne({ buildingName, ...(roomNumber ? { roomNumber } : {}) });
    }

    if (!locDoc) {
      locDoc = await Location.create({
        code: `LOC-EMG-${Math.floor(1000 + Math.random() * 9000)}`,
        name: buildingName || 'Campus General Premises',
        locationType: 'OTHER',
        structureType: 'STANDALONE',
        fullPath: buildingName || 'Campus Premises',
        buildingName,
        roomNumber,
      });
    }

    const incidentCode = generateIncidentCode();
    const isAnon = Boolean(isAnonymous);
    const resolvedSeverity: EmergencySeverity = (severity as EmergencySeverity) || 'HIGH';
    const user = req.user;

    const reportedByName = isAnon
      ? 'Anonymous Campus Member'
      : user?.name || 'Campus Student / Staff';

    const locationDisplay = locDoc.fullPath || `${locDoc.buildingName || ''} ${locDoc.roomNumber || ''}`.trim() || locDoc.name;

    // 1. Create Incident Document in MongoDB
    const incident = await EmergencyIncident.create({
      incidentCode,
      title: title.trim(),
      description: description.trim(),
      category: category || 'EMERGENCY_SAFETY',
      severity: resolvedSeverity,
      location: locDoc._id,
      locationName: locDoc.name,
      locationPath: locationDisplay,
      reportedBy: isAnon ? undefined : user?.id || user?.userId,
      reportedByName,
      reporterPhone: isAnon ? undefined : reporterPhone,
      isAnonymous: isAnon,
      assignedTeam:
        category === 'WOMEN_SAFETY'
          ? 'Women Safety Cell & Security Taskforce'
          : 'Campus Rapid Emergency Response Desk',
      status: 'REPORTED',
      smsDispatches: [],
      timeline: [
        {
          status: 'REPORTED',
          action: 'Emergency incident reported by campus member',
          performedBy: isAnon ? undefined : (user?.id as any) || (user?.userId as any),
          performedByName: reportedByName,
          timestamp: new Date(),
          notes: isAnon ? 'Identity protected under Anonymous SOS shield' : 'Incident filed directly',
        },
      ],
    });

    // 2. Query configured emergency recipients
    const recipientQuery: any = { isActive: true, notifyOnEmergency: true };
    if (category) {
      recipientQuery.$or = [
        { alertCategories: 'ALL_EMERGENCIES' },
        { alertCategories: category },
      ];
    }
    const recipients = await NotificationRecipient.find(recipientQuery);

    // Fallback numbers if no database recipients configured yet
    const fallbackNumbers = (process.env.EMERGENCY_ALERT_NUMBERS || '99529112177,6382373918')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const smsProvider = getSmsProvider();
    const smsMessage = 
`🚨 [CAMPUS EMERGENCY ALERT: ${incident.incidentCode}]
SEVERITY: ${incident.severity}
CATEGORY: ${incident.category}
LOCATION: ${incident.locationPath}
ISSUE: ${incident.title}
REPORTER: ${reportedByName}
TIME: ${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}

Respond immediately via Emergency Portal: http://localhost:3000`;

    // 3. Dispatch SMS alerts to recipients
    const dispatchedPhones = new Set<string>();

    for (const rec of recipients) {
      if (dispatchedPhones.has(rec.phone)) continue;
      dispatchedPhones.add(rec.phone);

      const dispatchResult = await smsProvider.sendSms(rec.phone, smsMessage, incident.incidentCode);
      incident.smsDispatches.push({
        recipientPhone: maskPhoneNumber(rec.phone),
        recipientName: rec.name,
        providerMessageId: dispatchResult.messageId,
        status: dispatchResult.status,
        dispatchedAt: new Date(),
        errorMessage: dispatchResult.error,
      });
    }

    // Add fallback numbers if needed
    for (const num of fallbackNumbers) {
      if (dispatchedPhones.has(num)) continue;
      dispatchedPhones.add(num);

      const dispatchResult = await smsProvider.sendSms(num, smsMessage, incident.incidentCode);
      incident.smsDispatches.push({
        recipientPhone: maskPhoneNumber(num),
        recipientName: 'Designated Safety Coordinator',
        providerMessageId: dispatchResult.messageId,
        status: dispatchResult.status,
        dispatchedAt: new Date(),
        errorMessage: dispatchResult.error,
      });
    }

    await incident.save();

    // 4. Emit real-time Socket.IO event to all connected administrators & security teams
    emitEmergencyIncidentCreated(incident);

    res.status(201).json({
      success: true,
      message: 'Emergency incident reported and alerts dispatched.',
      incident,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to report emergency incident.' });
  }
};

/**
 * GET /api/v1/emergencies
 * Paginated list of emergencies with filters
 */
export const getEmergencyIncidents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, severity, category, search, page = '1', limit = '20' } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (category) query.category = category;
    if (search) {
      const reg = new RegExp(String(search), 'i');
      query.$or = [{ title: reg }, { description: reg }, { incidentCode: reg }, { locationName: reg }];
    }

    const pageNum = Math.max(1, parseInt(String(page), 10));
    const limitNum = Math.max(1, parseInt(String(limit), 10));
    const skip = (pageNum - 1) * limitNum;

    const [incidents, total] = await Promise.all([
      EmergencyIncident.find(query)
        .populate('location', 'name code locationType fullPath')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      EmergencyIncident.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      incidents,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to retrieve emergencies.' });
  }
};

/**
 * GET /api/v1/emergencies/:id
 */
export const getEmergencyIncidentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid emergency ID format' });
      return;
    }

    const incident = await EmergencyIncident.findById(id).populate('location');
    if (!incident) {
      res.status(404).json({ success: false, message: 'Emergency incident not found' });
      return;
    }

    res.status(200).json({ success: true, incident });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to get emergency incident.' });
  }
};

/**
 * PATCH /api/v1/emergencies/:id/acknowledge
 * Acknowledge incident by security or administrator
 */
export const acknowledgeEmergencyIncident = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid incident ID format' });
      return;
    }

    const incident = await EmergencyIncident.findById(id);
    if (!incident) {
      res.status(404).json({ success: false, message: 'Incident not found' });
      return;
    }

    const user = req.user;
    incident.status = 'ACKNOWLEDGED';
    incident.acknowledgedBy = user?.id ? new Types.ObjectId(user.id) : undefined;
    incident.acknowledgedByName = user?.name || 'Emergency Responder';
    incident.acknowledgedAt = new Date();

    incident.timeline.push({
      status: 'ACKNOWLEDGED',
      action: 'Incident officially acknowledged by response team',
      performedBy: user?.id ? new Types.ObjectId(user.id) : undefined,
      performedByName: user?.name || 'Emergency Responder',
      timestamp: new Date(),
      notes: req.body.notes || 'Immediate dispatch in progress',
    });

    await incident.save();
    emitEmergencyIncidentUpdated(incident, 'acknowledged');

    res.status(200).json({ success: true, message: 'Incident acknowledged.', incident });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to acknowledge incident.' });
  }
};

/**
 * PATCH /api/v1/emergencies/:id/assign
 * Assign response team and update status to DISPATCHED
 */
export const assignEmergencyTeam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { assignedTeam, notes } = req.body;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid incident ID format' });
      return;
    }

    const incident = await EmergencyIncident.findById(id);
    if (!incident) {
      res.status(404).json({ success: false, message: 'Incident not found' });
      return;
    }

    incident.assignedTeam = assignedTeam || incident.assignedTeam;
    incident.status = 'DISPATCHED';

    const user = req.user;
    incident.timeline.push({
      status: 'DISPATCHED',
      action: `Assigned response team: ${incident.assignedTeam}`,
      performedBy: user?.id ? new Types.ObjectId(user.id) : undefined,
      performedByName: user?.name || 'Administrator',
      timestamp: new Date(),
      notes,
    });

    await incident.save();
    emitEmergencyIncidentUpdated(incident, 'updated');

    res.status(200).json({ success: true, message: 'Response team dispatched.', incident });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to assign response team.' });
  }
};

/**
 * PATCH /api/v1/emergencies/:id/resolve
 * Resolve emergency incident with resolution notes
 */
export const resolveEmergencyIncident = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { resolutionNotes, isFalseAlarm } = req.body;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid incident ID format' });
      return;
    }

    if (!resolutionNotes || !resolutionNotes.trim()) {
      res.status(400).json({ success: false, message: 'Mandatory resolution notes are required to close an emergency.' });
      return;
    }

    const incident = await EmergencyIncident.findById(id);
    if (!incident) {
      res.status(404).json({ success: false, message: 'Incident not found' });
      return;
    }

    const finalStatus: EmergencyStatus = isFalseAlarm ? 'FALSE_ALARM' : 'RESOLVED';
    const user = req.user;

    incident.status = finalStatus;
    incident.resolutionNotes = resolutionNotes.trim();
    incident.resolvedBy = user?.id ? new Types.ObjectId(user.id) : undefined;
    incident.resolvedByName = user?.name || 'Emergency Chief';
    incident.resolvedAt = new Date();

    incident.timeline.push({
      status: finalStatus,
      action: isFalseAlarm ? 'Emergency closed as False Alarm' : 'Emergency incident successfully resolved on site',
      performedBy: user?.id ? new Types.ObjectId(user.id) : undefined,
      performedByName: user?.name || 'Emergency Chief',
      timestamp: new Date(),
      notes: resolutionNotes.trim(),
    });

    await incident.save();
    emitEmergencyIncidentUpdated(incident, 'resolved');

    res.status(200).json({ success: true, message: 'Incident resolved successfully.', incident });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to resolve emergency incident.' });
  }
};

/**
 * POST /api/v1/notifications/twilio-callback
 * Webhook callback receiver for Twilio SMS delivery status updates with signature verification
 */
export const handleTwilioStatusCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-twilio-signature'] as string;
    const callbackUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const smsProvider = getSmsProvider();

    // Verify Twilio request signature
    const isValid = smsProvider.validateWebhookSignature(signature, callbackUrl, req.body);
    if (!isValid) {
      console.warn('[Twilio Webhook] Rejected callback with invalid signature from IP:', req.ip);
      res.status(403).json({ success: false, message: 'Invalid Twilio webhook signature' });
      return;
    }

    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;

    if (!MessageSid || !MessageStatus) {
      res.status(400).json({ success: false, message: 'Missing MessageSid or MessageStatus' });
      return;
    }

    console.log(`[Twilio Webhook Callback] MessageSid: ${MessageSid} -> Status: ${MessageStatus}`);

    // Map Twilio status to application status
    let mappedStatus: 'DELIVERED' | 'UNDELIVERED' | 'FAILED' | 'SENT' = 'SENT';
    if (MessageStatus === 'delivered') mappedStatus = 'DELIVERED';
    else if (MessageStatus === 'undelivered') mappedStatus = 'UNDELIVERED';
    else if (MessageStatus === 'failed') mappedStatus = 'FAILED';

    // Update dispatch record in EmergencyIncident
    await EmergencyIncident.updateOne(
      { 'smsDispatches.providerMessageId': MessageSid },
      {
        $set: {
          'smsDispatches.$.status': mappedStatus,
          ...(mappedStatus === 'DELIVERED' ? { 'smsDispatches.$.deliveredAt': new Date() } : {}),
          ...(ErrorMessage ? { 'smsDispatches.$.errorMessage': `${ErrorCode || ''}: ${ErrorMessage}` } : {}),
        },
      }
    );

    res.status(200).send('<Response></Response>');
  } catch (error: any) {
    console.error('[Twilio Webhook Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Error processing Twilio callback' });
  }
};

/**
 * Notification Recipient Management APIs
 */

export const getRecipients = async (req: Request, res: Response): Promise<void> => {
  try {
    const recipients = await NotificationRecipient.find().sort({ department: 1, name: 1 });
    res.status(200).json({ success: true, recipients });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch recipients' });
  }
};

export const createRecipient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, roleTitle, phone, email, department, alertCategories, notifyOnRoutineComplaints, notifyOnEmergency } = req.body;

    if (!name || !roleTitle || !phone || !department) {
      res.status(400).json({ success: false, message: 'Name, roleTitle, phone, and department are required.' });
      return;
    }

    const recipient = await NotificationRecipient.create({
      name: name.trim(),
      roleTitle: roleTitle.trim(),
      phone: phone.trim(),
      email: email?.trim(),
      department: department.trim(),
      alertCategories: alertCategories || ['ALL_EMERGENCIES'],
      notifyOnRoutineComplaints: Boolean(notifyOnRoutineComplaints),
      notifyOnEmergency: notifyOnEmergency !== false,
      isActive: true,
    });

    res.status(201).json({ success: true, message: 'Notification recipient added.', recipient });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to create recipient.' });
  }
};

export const updateRecipient = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid recipient ID format' });
      return;
    }

    const recipient = await NotificationRecipient.findByIdAndUpdate(id, req.body, { new: true });
    if (!recipient) {
      res.status(404).json({ success: false, message: 'Recipient not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Recipient updated.', recipient });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update recipient.' });
  }
};

export const deleteRecipient = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid recipient ID format' });
      return;
    }

    await NotificationRecipient.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Recipient deleted.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete recipient.' });
  }
};
