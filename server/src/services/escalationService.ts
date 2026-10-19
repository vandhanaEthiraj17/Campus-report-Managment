import { Complaint } from '../models/Complaint';

let isEscalationRunning = false;

export const checkAndEscalateComplaints = async (): Promise<{ escalatedCount: number }> => {
  if (isEscalationRunning) {
    return { escalatedCount: 0 };
  }

  isEscalationRunning = true;
  try {
    const now = new Date();
    
    // Find active complaints where SLA has expired and not already escalated
    const overdueComplaints = await Complaint.find({
      status: { $in: ['Reported', 'Assigned', 'Accepted', 'In Progress'] },
      isEscalated: false,
      slaDueDate: { $lt: now },
    });

    let count = 0;
    for (const complaint of overdueComplaints) {
      complaint.isEscalated = true;
      complaint.priority = 'Urgent';
      complaint.timeline.push({
        status: 'Escalated',
        updatedByName: 'System Auto-Escalation',
        timestamp: new Date(),
        remarks: 'SLA target date breached. Ticket escalated to Urgent priority for immediate management review.',
      });

      // If high risk or emergency, notify HOD & Coordinators via SMS
      if (!complaint.emergencyAlertSent) {
        try {
          const { dispatchEmergencyAlert } = await import('./emergencyNotificationService');
          const alertResult = await dispatchEmergencyAlert(complaint);
          complaint.isEmergency = true;
          complaint.emergencyAlertSent = true;
          complaint.emergencyRecipients = alertResult.recipients;
          complaint.emergencySentAt = new Date();
          complaint.timeline.push({
            status: 'Escalated',
            updatedByName: 'Emergency Mobile SMS Gateway',
            timestamp: new Date(),
            remarks: `🚨 SLA BREACH EMERGENCY SMS: Alert dispatched to HOD & Coordinators (${alertResult.recipients.join(', ')})`,
          });
        } catch (smsErr) {
          console.error('Failed to dispatch escalation SMS:', smsErr);
        }
      }

      await complaint.save();
      count++;
    }

    if (count > 0) {
      console.log(`[Escalation Worker] Escalated ${count} overdue complaint(s).`);
    }

    return { escalatedCount: count };
  } catch (error) {
    console.error('[Escalation Worker Error]:', error);
    return { escalatedCount: 0 };
  } finally {
    isEscalationRunning = false;
  }
};
