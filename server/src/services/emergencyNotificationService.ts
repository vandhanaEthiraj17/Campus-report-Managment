import { Department } from '../models/Department';
import { User } from '../models/User';
import { getSmsProvider, normalizePhoneNumber } from './twilioSmsService';

export interface ISMSDispatchLog {
  id: string;
  ticketId: string;
  recipientPhone: string;
  recipientRole: string;
  status: 'DELIVERED' | 'SENT' | 'QUEUED' | 'FAILED' | 'SIMULATED_DEV' | 'UNAVAILABLE_NO_GATEWAY';
  carrierMessageId: string;
  messageText: string;
  sentAt: Date;
  notes?: string;
}

// In-memory store for recent emergency dispatch logs for administrative audit
const emergencyDispatchHistory: ISMSDispatchLog[] = [];

/**
 * Helper to mask sensitive telephone numbers in application logs
 */
export const maskPhoneNumber = (phone: string): string => {
  const clean = phone.replace(/[^\d+]/g, '');
  if (clean.length <= 6) return '****';
  const prefix = clean.slice(0, 5);
  const suffix = clean.slice(-3);
  return `${prefix}****${suffix}`;
};

/**
 * Returns configured emergency alert contact numbers
 * Ensures both designated numbers (+919952912177 and +916382373918) are always included
 */
export const getEmergencyContactNumbers = async (): Promise<{ phone: string; label: string }[]> => {
  const envNumbers = (process.env.EMERGENCY_SMS_RECIPIENTS || process.env.EMERGENCY_ALERT_NUMBERS || '+919952912177,+916382373918')
    .split(',')
    .map((num) => num.trim())
    .filter(Boolean);

  const contacts: { phone: string; label: string }[] = [];

  // Always ensure both designated numbers are present
  const defaultDesignated = ['+919952912177', '+916382373918'];
  for (const des of defaultDesignated) {
    const norm = normalizePhoneNumber(des);
    if (norm && !contacts.some((c) => c.phone === norm)) {
      contacts.push({
        phone: norm,
        label: norm.endsWith('2177') ? 'HOD / Women Safety Coordinator' : 'Campus Safety Coordinator / Staff',
      });
    }
  }

  // Any other configured env numbers
  for (const num of envNumbers) {
    const norm = normalizePhoneNumber(num);
    if (norm && !contacts.some((c) => c.phone === norm)) {
      contacts.push({ phone: norm, label: 'Designated Emergency Coordinator' });
    }
  }

  return contacts;
};

/**
 * Evaluates whether a complaint is classified as High Risk or Women Safety Emergency
 * Distinguishes between:
 * 1. Ordinary maintenance complaints (broken lights, fans, desks, plumbing) -> false
 * 2. Urgent safety hazards (fire, electric shock, structural collapse, hazards) -> true
 * 3. Explicit emergency / SOS incidents (Women Safety & SOS, assault, harassment) -> true
 */
export const isHighRiskOrWomenSafety = (data: {
  title?: string;
  description?: string;
  categoryName?: string;
  priority?: string;
}): boolean => {
  const cat = (data.categoryName || '').toLowerCase();
  const text = `${data.title || ''} ${data.description || ''} ${cat}`.toLowerCase();
  const priority = (data.priority || '').toLowerCase();

  // 1. Explicit SOS / Women Safety category triggers
  if (cat.includes('women') || cat.includes('sos')) {
    return true;
  }

  const womenSafetyPattern = /\b(women|woman|girl|female|harass|harassment|eve.?teasing|stalk|stalking|molest|molestation|assault|ragging|threat|unsafe)\b/i;
  if (womenSafetyPattern.test(text) && (priority === 'urgent' || priority === 'high')) {
    return true;
  }

  // 2. Urgent safety hazards
  const isHazardCategory = cat.includes('hazard') || cat.includes('emergency') || cat.includes('safety incident');
  if (isHazardCategory && priority === 'urgent') {
    return true;
  }

  // 3. Catastrophic physical danger keywords with urgent priority
  const criticalDangerPattern = /\b(fire|explosion|smoke|short.?circuit|electric.?shock|gas.?leak|collapse|electrocution)\b/i;
  if (criticalDangerPattern.test(text) && priority === 'urgent') {
    return true;
  }

  // Ordinary maintenance complaints do not trigger emergency SMS
  return false;
};

/**
 * Dispatches an SMS alert with transparent carrier gateway verification and privacy masking
 */
export const sendSMSAlert = async (
  recipientPhone: string,
  recipientLabel: string,
  message: string,
  ticketId: string
): Promise<ISMSDispatchLog> => {
  const normalizedPhone = normalizePhoneNumber(recipientPhone);
  const maskedPhone = maskPhoneNumber(normalizedPhone);
  const smsProvider = getSmsProvider();

  // Dispatch via configured SMS provider (Twilio in production, MockSmsProvider in tests, Dev Simulator in dev)
  const dispatchResult = await smsProvider.sendSms(normalizedPhone, message, ticketId);

  const logEntry: ISMSDispatchLog = {
    id: dispatchResult.messageId,
    ticketId,
    recipientPhone: maskedPhone,
    recipientRole: recipientLabel,
    status: dispatchResult.status as any,
    carrierMessageId: dispatchResult.carrierMessageId || dispatchResult.messageId,
    messageText: message,
    sentAt: dispatchResult.timestamp || new Date(),
    notes: dispatchResult.notes || dispatchResult.error,
  };

  emergencyDispatchHistory.unshift(logEntry);
  if (emergencyDispatchHistory.length > 100) {
    emergencyDispatchHistory.pop();
  }

  return logEntry;
};

/**
 * Dispatches emergency SMS alerts to HOD, Coordinators, and Staff for high risk complaints
 */
export const dispatchEmergencyAlert = async (
  complaint: any,
  categoryName?: string
): Promise<{
  triggered: boolean;
  recipients: string[];
  alertMessage: string;
  logs: ISMSDispatchLog[];
}> => {
  const catName = categoryName || complaint.categoryName || 'Emergency / Women Safety';
  const locationStr = complaint.locationDetails
    ? `${complaint.locationDetails.buildingName}, ${complaint.locationDetails.floor}, ${complaint.locationDetails.roomNumber}`
    : (complaint.locationPath || 'Campus Premises');

  const formattedTime = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // Standard concise emergency SMS template per requirement 3.C
  const alertMessage = 
`SMARTCAMPUS EMERGENCY ALERT
Incident: ${complaint.ticketId}
Type: ${catName}
Location: ${locationStr}
Time: ${formattedTime}
Please check the authorized SmartCampus emergency dashboard and respond according to campus emergency procedures.`;

  const contacts = await getEmergencyContactNumbers();
  const logs: ISMSDispatchLog[] = [];
  const recipients: string[] = [];

  for (const contact of contacts) {
    try {
      const log = await sendSMSAlert(contact.phone, contact.label, alertMessage, complaint.ticketId);
      logs.push(log);
      recipients.push(contact.phone);
    } catch (sendErr) {
      console.error(`Failed to dispatch SMS to ${contact.phone}:`, sendErr);
    }
  }

  return {
    triggered: true,
    recipients,
    alertMessage,
    logs,
  };
};

/**
 * Retrieves audit history of all emergency SMS dispatches
 */
export const getEmergencyDispatchLogs = (): ISMSDispatchLog[] => {
  return [...emergencyDispatchHistory];
};
