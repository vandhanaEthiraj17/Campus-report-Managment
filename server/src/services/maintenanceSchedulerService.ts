import { MaintenanceRecord } from '../models/MaintenanceRecord';
import { Asset } from '../models/Asset';

export interface MaintenanceSchedulerReport {
  overdueTasksUpdated: number;
  upcomingRemindersSent: number;
  autoScheduledTasks: number;
}

let isSchedulerRunning = false;

/**
 * Background worker to process preventive maintenance schedules, identify overdue tasks,
 * and dispatch reminders without duplicate notification spam.
 */
export const checkAndProcessMaintenance = async (): Promise<MaintenanceSchedulerReport> => {
  const report: MaintenanceSchedulerReport = {
    overdueTasksUpdated: 0,
    upcomingRemindersSent: 0,
    autoScheduledTasks: 0,
  };

  if (isSchedulerRunning) {
    return report;
  }

  isSchedulerRunning = true;
  try {
    const now = new Date();

    // 1. Mark scheduled maintenance tasks whose scheduled date has passed as OVERDUE
    const overdueScheduledTasks = await MaintenanceRecord.find({
      status: 'SCHEDULED',
      scheduledDate: { $lt: now },
    });

    for (const record of overdueScheduledTasks) {
      record.status = 'OVERDUE';
      if (!record.reminderSent) {
        record.reminderSent = true;
        report.upcomingRemindersSent++;
      }
      await record.save();
      report.overdueTasksUpdated++;
    }

    // 2. Identify assets that are due for preventive maintenance without an active task
    // Only check assets not decommissioned, nextMaintenanceDate <= now, and no reminder sent in the last 24 hours
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const dueAssets = await Asset.find({
      status: { $in: ['ACTIVE', 'IN_REPAIR'] },
      nextMaintenanceDate: { $lte: now },
      $or: [
        { lastReminderSentAt: { $exists: false } },
        { lastReminderSentAt: null },
        { lastReminderSentAt: { $lt: oneDayAgo } },
      ],
    });

    for (const asset of dueAssets) {
      // Check if an open maintenance task already exists
      const existingTask = await MaintenanceRecord.findOne({
        asset: asset._id,
        status: { $in: ['SCHEDULED', 'IN_PROGRESS', 'OVERDUE'] },
      });

      if (!existingTask) {
        // Auto-create a preventive maintenance task if none exists
        const year = now.getFullYear();
        const rand = Math.floor(1000 + Math.random() * 9000);
        const recordId = `MNT-${year}-${rand}`;

        await MaintenanceRecord.create({
          recordId,
          asset: asset._id,
          assetCode: asset.assetCode,
          assetName: asset.assetName,
          maintenanceType: 'PREVENTIVE',
          scheduledDate: now,
          assignedStaff: asset.assignedStaff || undefined,
          assignedDepartment: asset.assignedDepartment || 'General Maintenance',
          workDescription: `Scheduled routine preventive maintenance for ${asset.assetName} (${asset.assetCode}) based on ${asset.maintenanceFrequencyDays}-day frequency cycle.`,
          status: 'SCHEDULED',
          reminderSent: true,
          notes: 'Auto-queued by Preventive Maintenance Scheduler',
        });

        report.autoScheduledTasks++;
      }

      // Update lastReminderSentAt to prevent duplicate notifications on subsequent runs
      asset.lastReminderSentAt = now;
      await asset.save();
      report.upcomingRemindersSent++;
    }

    if (report.overdueTasksUpdated > 0 || report.autoScheduledTasks > 0) {
      console.log(
        `[Maintenance Scheduler] Processed: ${report.overdueTasksUpdated} overdue tasks updated, ${report.autoScheduledTasks} preventive tasks queued.`
      );
    }

    // 3. Refresh Maintenance Intelligence Recommendations
    try {
      const { runFullIntelligenceEvaluation } = await import('./maintenanceIntelligenceService');
      const intelReport = await runFullIntelligenceEvaluation();
      console.log(`[Maintenance Intelligence] Evaluated ${intelReport.totalEvaluated} assets; ${intelReport.recommendationsCount} recommendations active.`);
    } catch (intelErr) {
      console.error('[Maintenance Intelligence Background Evaluation Error]:', intelErr);
    }

    return report;
  } catch (error) {
    console.error('[Maintenance Scheduler Error]:', error);
    return report;
  } finally {
    isSchedulerRunning = false;
  }
};
