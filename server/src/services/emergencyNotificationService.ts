import { Department } from '../models/Department';
import { User } from '../models/User';

export interface ISMSDispatchLog {
  id: string;
  ticketId: string;
  recipientPhone: string;
  recipientRole: string;
  status: 'DELIVERED' | 'SENT' | 'FAILED';
  carrierMessageId: string;
  messageText: string;
  sentAt: Date;
}

// In-memory store for recent emergency dispatch logs for administrative audit
const emergencyDispatchHistory: ISMSDispatchLog[] = [];

/**
 * Returns configured emergency alert contact numbers
 * Defaults to the requested numbers: 99529112177, 6382373918
 */
export const getEmergencyContactNumbers = async (): Promise<{ phone: string; label: string }[]> => {
  const envNumbers = (process.env.EMERGENCY_ALERT_NUMBERS || '99529112177,6382373918')
    .split(',')
    .map((num) => num.trim())
    .filter(Boolean);

  const contacts: { phone: string; label: string }[] = [];

  // Default designated numbers from requirements
  if (envNumbers.includes('99529112177')) {
    contacts.push({ phone: '99529112177', label: 'HOD / Women Safety Coordinator' });
  }
  if (envNumbers.includes('6382373918')) {
    contacts.push({ phone: '6382373918', label: 'Campus Safety Coordinator / Staff' });
  }

  // Any other configured env numbers
  for (const num of envNumbers) {
    if (!contacts.some((c) => c.phone === num)) {
      contacts.push({ phone: num, label: 'Emergency Response Coordinator' });
    }
  }

  // Also dynamically pull Department head phones for Women Safety / Security if stored in DB
  try {
    const safetyDept = await Department.findOne({
      $or: [
        { code: 'SEC-WSC' },
        { name: /women|safety|security/i },
      ],
    });

    if (safetyDept && safetyDept.contactPhone) {
      const sanitizedPhone = safetyDept.contactPhone.replace(/[^\d]/g, '');
      if (sanitizedPhone && !contacts.some((c) => c.phone.endsWith(sanitizedPhone.slice(-10)))) {
        contacts.push({
          phone: safetyDept.contactPhone,
          label: `${safetyDept.headName} (${safetyDept.name} Head)`,
        });
      }
    }
  } catch (err) {
    // Graceful fallback if database query is not ready
  }

  return contacts;
};

/**
 * Evaluates whether a complaint is classified as High Risk or Women Safety Emergency
 */
export const isHighRiskOrWomenSafety = (data: {
  title?: string;
  description?: string;
  categoryName?: string;
  priority?: string;
}): boolean => {
  const text = `${data.title || ''} ${data.description || ''} ${data.categoryName || ''}`.toLowerCase();
  const priority = (data.priority || '').toLowerCase();

  // 1. Explicit priority triggers
  if (priority === 'urgent' || priority === 'high') {
    return true;
  }

  // 2. Women Safety triggers
  const womenSafetyPattern = /\b(women|woman|girl|female|harass|harassment|eve.?teasing|stalk|stalking|molest|molestation|assault|ragging|threat|crying|unsafe)\b/i;
  if (womenSafetyPattern.test(text)) {
    return true;
  }

  // 3. General Emergency / Danger triggers
  const emergencyPattern = /\b(emergency|fire|danger|spark|smoke|explosion|short.?circuit|gas.?leak|electric.?shock|hazard|sos|immediate.?help)\b/i;
  if (emergencyPattern.test(text)) {
    return true;
  }

  return false;
};

/**
 * Dispatches an SMS to a single recipient with carrier simulation and logging
 */
export const sendSMSAlert = async (
  recipientPhone: string,
  recipientLabel: string,
  message: string,
  ticketId: string
): Promise<ISMSDispatchLog> => {
  const carrierMessageId = `SMS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  
  // Format formatted mobile display
  const displayPhone = recipientPhone.startsWith('+') ? recipientPhone : `+91 ${recipientPhone}`;

  console.log(`\n============================================================`);
  console.log(`🚨 [EMERGENCY SMS DISPATCH GATEWAY]`);
  console.log(`📲 TO: ${displayPhone} (${recipientLabel})`);
  console.log(`🆔 CARRIER MSG ID: ${carrierMessageId}`);
  console.log(`🎫 TICKET REF: ${ticketId}`);
  console.log(`🕒 TIMESTAMP: ${new Date().toISOString()}`);
  console.log(`---------------- MESSAGE BODY ----------------`);
  console.log(message);
  console.log(`============================================================\n`);

  const logEntry: ISMSDispatchLog = {
    id: carrierMessageId,
    ticketId,
    recipientPhone,
    recipientRole: recipientLabel,
    status: 'DELIVERED',
    carrierMessageId,
    messageText: message,
    sentAt: new Date(),
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
    : 'Campus Premises';

  const reporterDisplay = complaint.isAnonymous
    ? 'Anonymous Student (Identity Protected 🔒)'
    : complaint.reportedByName || 'Campus Member';

  const isWomenSafety = /women|girl|harass|assault|stalk/i.test(`${complaint.title} ${complaint.description} ${catName}`);
  const alertHeader = isWomenSafety
    ? '🚨 [WOMEN SAFETY EMERGENCY ALERT]'
    : '🚨 [HIGH-RISK CAMPUS EMERGENCY ALERT]';

  const formattedTime = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const alertMessage = 
`${alertHeader}
TICKET: ${complaint.ticketId}
PRIORITY: ${complaint.priority || 'URGENT'}
CATEGORY: ${catName}
LOCATION: ${locationStr}
ISSUE: ${complaint.title}
REPORTER: ${reporterDisplay}
TIME: ${formattedTime}

ACTION REQUIRED: HOD, Coordinator & Safety Staff please dispatch immediate assistance!
Web Portal: http://localhost:3000`;

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
