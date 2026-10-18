import { Response } from 'express';
import { MaintenanceRecord, MaintenanceStatus } from '../models/MaintenanceRecord';
import { Asset } from '../models/Asset';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { AuthRequest } from '../middlewares/authMiddleware';

/**
 * Schedule preventive or corrective maintenance (Admin only)
 */
export const scheduleMaintenance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      assetId,
      assetCode,
      maintenanceType,
      scheduledDate,
      assignedStaffId,
      workDescription,
      notes,
      labourCost,
      partsCost,
      otherExpenses,
      cost,
      relatedComplaintId,
    } = req.body;

    if ((!assetId && !assetCode) || !scheduledDate || !workDescription) {
      res.status(400).json({
        message: 'Asset reference, scheduledDate, and workDescription are required.',
      });
      return;
    }

    // Validate non-negative cost figures
    if (
      (labourCost !== undefined && Number(labourCost) < 0) ||
      (partsCost !== undefined && Number(partsCost) < 0) ||
      (otherExpenses !== undefined && Number(otherExpenses) < 0) ||
      (cost !== undefined && Number(cost) < 0)
    ) {
      res.status(400).json({ message: 'Cost values must be non-negative monetary figures.' });
      return;
    }

    const calculatedLabour = Math.max(0, Number(labourCost) || 0);
    const calculatedParts = Math.max(0, Number(partsCost) || 0);
    const calculatedOther = Math.max(0, Number(otherExpenses) || 0);
    const totalCost = (labourCost !== undefined || partsCost !== undefined || otherExpenses !== undefined)
      ? calculatedLabour + calculatedParts + calculatedOther
      : Math.max(0, Number(cost) || 0);

    const asset = assetId 
      ? await Asset.findById(assetId) 
      : await Asset.findOne({ assetCode: assetCode.toString().trim().toUpperCase() });

    if (!asset) {
      res.status(404).json({ message: 'Target asset for maintenance does not exist.' });
      return;
    }

    let staffDoc: any = null;
    if (assignedStaffId) {
      staffDoc = await User.findById(assignedStaffId);
      if (!staffDoc) {
        res.status(400).json({ message: 'Assigned staff member not found.' });
        return;
      }
    }

    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const recordId = `MNT-${year}-${rand}`;

    const schedDate = new Date(scheduledDate);
    const now = new Date();
    const initialStatus: MaintenanceStatus = schedDate < now ? 'OVERDUE' : 'SCHEDULED';

    const newRecord = await MaintenanceRecord.create({
      recordId,
      asset: asset._id,
      assetCode: asset.assetCode,
      assetName: asset.assetName,
      maintenanceType: maintenanceType || 'PREVENTIVE',
      scheduledDate: schedDate,
      assignedStaff: staffDoc ? staffDoc._id : undefined,
      assignedStaffName: staffDoc ? staffDoc.name : undefined,
      assignedDepartment: staffDoc ? staffDoc.department : (asset.assignedDepartment || 'General Maintenance'),
      workDescription: workDescription.trim(),
      notes: notes ? notes.trim() : undefined,
      labourCost: calculatedLabour,
      partsCost: calculatedParts,
      otherExpenses: calculatedOther,
      cost: totalCost,
      relatedComplaint: relatedComplaintId || undefined,
      beforeImages: [],
      afterImages: [],
      status: initialStatus,
      reminderSent: false,
      createdBy: req.user?.userId,
      updatedBy: req.user?.userId,
    });

    // Update asset nextMaintenanceDate if this scheduled date is sooner
    if (!asset.nextMaintenanceDate || schedDate < asset.nextMaintenanceDate) {
      asset.nextMaintenanceDate = schedDate;
    }
    if (staffDoc) {
      asset.assignedStaff = staffDoc._id;
    }
    await asset.save();

    // Audit log
    if (req.user) {
      await AuditLog.create({
        action: 'MAINTENANCE_SCHEDULED',
        performedBy: req.user.userId,
        performedByName: req.user.name,
        targetUser: staffDoc?._id,
        targetUserName: staffDoc?.name,
        details: {
          recordId: newRecord.recordId,
          assetCode: asset.assetCode,
          scheduledDate: schedDate,
          maintenanceType: newRecord.maintenanceType,
        },
      });
    }

    res.status(201).json({
      message: 'Maintenance scheduled successfully.',
      record: newRecord,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error scheduling maintenance.' });
  }
};

/**
 * Get maintenance tasks (Admin sees all; Staff sees assigned tasks and department tasks)
 */
export const getMaintenanceTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    const { status, assetId, isOverdue } = req.query;
    const query: any = {};

    // Role-based restrictions
    if (req.user.role === 'STAFF') {
      const staffUser = await User.findById(req.user.userId);
      const staffDept = staffUser?.department;
      
      const staffOrConditions: any[] = [{ assignedStaff: req.user.userId }];
      if (staffDept) {
        staffOrConditions.push({ assignedDepartment: staffDept });
      }
      query.$or = staffOrConditions;
    } else if (req.user.role !== 'ADMIN') {
      res.status(403).json({ message: 'Access denied. Maintenance tasks are only available to staff and administrators.' });
      return;
    }

    if (assetId) {
      query.asset = assetId;
    }

    if (status) {
      query.status = status;
    }

    if (isOverdue === 'true') {
      query.status = { $in: ['SCHEDULED', 'OVERDUE'] };
      query.scheduledDate = { $lt: new Date() };
    }

    const records = await MaintenanceRecord.find(query)
      .populate('asset', 'assetCode assetName assetType building floor room condition status')
      .populate('assignedStaff', 'name email phone department')
      .sort({ scheduledDate: 1 });

    res.status(200).json({ records, count: records.length });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error retrieving maintenance records.' });
  }
};

/**
 * Start maintenance (Staff or Admin)
 */
export const startMaintenance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const record = await MaintenanceRecord.findById(id);

    if (!record) {
      res.status(404).json({ message: 'Maintenance record not found.' });
      return;
    }

    if (req.user?.role === 'STAFF' && record.assignedStaff && record.assignedStaff.toString() !== req.user.userId) {
      const staffUser = await User.findById(req.user.userId);
      if (staffUser?.department !== record.assignedDepartment) {
        res.status(403).json({ message: 'Unauthorized to start maintenance assigned to another staff member or department.' });
        return;
      }
    }

    record.status = 'IN_PROGRESS';
    record.updatedBy = req.user?.userId;
    await record.save();

    // Mark asset as UNDER_MAINTENANCE
    await Asset.findByIdAndUpdate(record.asset, {
      status: 'UNDER_MAINTENANCE',
      updatedBy: req.user?.userId,
    });

    if (req.user) {
      await AuditLog.create({
        action: 'MAINTENANCE_STARTED',
        performedBy: req.user.userId,
        performedByName: req.user.name,
        details: { recordId: record.recordId, assetCode: record.assetCode },
      });
    }

    res.status(200).json({ message: 'Maintenance marked as in progress.', record });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error starting maintenance.' });
  }
};

/**
 * Record completed maintenance with work description, condition, evidence, and update asset dates
 */
export const completeMaintenance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      workDescription,
      partsReplaced,
      labourCost,
      partsCost,
      otherExpenses,
      cost,
      relatedComplaintId,
      conditionAfter,
      beforeImages,
      afterImages,
      notes,
    } = req.body;

    const record = await MaintenanceRecord.findById(id);
    if (!record) {
      res.status(404).json({ message: 'Maintenance record not found.' });
      return;
    }

    // Role check: Admin or assigned Staff
    if (req.user?.role === 'STAFF' && record.assignedStaff && record.assignedStaff.toString() !== req.user.userId) {
      const staffUser = await User.findById(req.user.userId);
      if (staffUser?.department !== record.assignedDepartment) {
        res.status(403).json({ message: 'Unauthorized to complete maintenance tasks assigned to another technician.' });
        return;
      }
    }

    // Validate non-negative cost figures
    if (
      (labourCost !== undefined && Number(labourCost) < 0) ||
      (partsCost !== undefined && Number(partsCost) < 0) ||
      (otherExpenses !== undefined && Number(otherExpenses) < 0) ||
      (cost !== undefined && Number(cost) < 0)
    ) {
      res.status(400).json({ message: 'Cost values must be non-negative monetary figures.' });
      return;
    }

    const now = new Date();
    record.status = 'COMPLETED';
    record.completedDate = now;
    if (workDescription) record.workDescription = workDescription.trim();
    if (partsReplaced !== undefined) record.partsReplaced = partsReplaced.trim();

    // Cost calculations computed securely on backend
    if (labourCost !== undefined || partsCost !== undefined || otherExpenses !== undefined) {
      record.labourCost = Math.max(0, Number(labourCost) || 0);
      record.partsCost = Math.max(0, Number(partsCost) || 0);
      record.otherExpenses = Math.max(0, Number(otherExpenses) || 0);
      record.cost = record.labourCost + record.partsCost + record.otherExpenses;
    } else if (cost !== undefined) {
      record.cost = Math.max(0, Number(cost) || 0);
    }

    if (relatedComplaintId) {
      record.relatedComplaint = relatedComplaintId;
    }

    if (conditionAfter) record.conditionAfter = conditionAfter;
    if (beforeImages && Array.isArray(beforeImages)) record.beforeImages = beforeImages;
    if (afterImages && Array.isArray(afterImages)) record.afterImages = afterImages;
    if (notes !== undefined) record.notes = notes.trim();
    record.updatedBy = req.user?.userId;
    await record.save();

    // Update the Asset's lifecycle dates, condition, and totalMaintenanceCost
    const asset = await Asset.findById(record.asset);
    if (asset) {
      asset.lastMaintenanceDate = now;
      const freq = asset.maintenanceFrequencyDays || 90;
      asset.nextMaintenanceDate = new Date(now.getTime() + freq * 24 * 60 * 60 * 1000);
      
      if (conditionAfter) {
        asset.condition = conditionAfter as any;
      } else if (asset.condition === 'POOR' || asset.condition === 'CRITICAL') {
        asset.condition = 'GOOD';
      }

      // Return status to ACTIVE
      asset.status = 'ACTIVE';

      // Idempotent aggregate calculation of totalMaintenanceCost across all completed records
      const costAgg = await MaintenanceRecord.aggregate([
        { $match: { asset: asset._id, status: 'COMPLETED' } },
        { $group: { _id: null, total: { $sum: '$cost' } } }
      ]);
      asset.totalMaintenanceCost = costAgg[0]?.total || 0;

      asset.updatedBy = req.user?.userId;
      await asset.save();
    }

    // Audit log
    if (req.user) {
      await AuditLog.create({
        action: 'MAINTENANCE_COMPLETED',
        performedBy: req.user.userId,
        performedByName: req.user.name,
        details: {
          recordId: record.recordId,
          assetCode: record.assetCode,
          conditionAfter: record.conditionAfter,
          cost: record.cost,
        },
      });
    }

    res.status(200).json({
      message: 'Maintenance completed and asset records successfully updated.',
      record,
      asset,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error recording maintenance completion.' });
  }
};

/**
 * Cancel maintenance task (Admin only)
 */
export const cancelMaintenance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const record = await MaintenanceRecord.findById(id);

    if (!record) {
      res.status(404).json({ message: 'Maintenance record not found.' });
      return;
    }

    record.status = 'CANCELLED';
    record.updatedBy = req.user?.userId;
    await record.save();

    // Reset asset status to ACTIVE if it was UNDER_MAINTENANCE
    const asset = await Asset.findById(record.asset);
    if (asset && asset.status === 'UNDER_MAINTENANCE') {
      asset.status = 'ACTIVE';
      asset.updatedBy = req.user?.userId;
      await asset.save();
    }

    if (req.user) {
      await AuditLog.create({
        action: 'MAINTENANCE_CANCELLED',
        performedBy: req.user.userId,
        performedByName: req.user.name,
        details: { recordId: record.recordId, assetCode: record.assetCode },
      });
    }

    res.status(200).json({ message: 'Maintenance cancelled.', record });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error cancelling maintenance.' });
  }
};
