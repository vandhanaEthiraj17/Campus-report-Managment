import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { Asset } from '../models/Asset';
import { Complaint } from '../models/Complaint';
import { MaintenanceRecord } from '../models/MaintenanceRecord';
import { Recommendation } from '../models/Recommendation';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { sanitizeComplaint } from './complaintController';
import {
  calculateAssetHealth,
  analyzeRecurringIssues,
  runFullIntelligenceEvaluation,
  getIntelligenceMetrics,
} from '../services/maintenanceIntelligenceService';

/**
 * Get high-level overview metrics for the Maintenance Intelligence Dashboard
 */
export const getIntelligenceOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const metrics = await getIntelligenceMetrics();
    res.status(200).json(metrics);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching intelligence overview metrics.' });
  }
};

/**
 * Get explainable asset health assessments across registered campus equipment
 */
export const getAssetHealthList = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { building, category, search, minScore, maxScore } = req.query;

    const query: any = { status: { $ne: 'DECOMMISSIONED' } };
    if (building) query.building = { $regex: String(building).trim(), $options: 'i' };
    if (search) {
      const s = String(search).trim();
      query.$or = [
        { assetCode: { $regex: s, $options: 'i' } },
        { assetName: { $regex: s, $options: 'i' } },
        { room: { $regex: s, $options: 'i' } },
      ];
    }

    const assets = await Asset.find(query).sort({ complaintCount: -1 });
    const assessments: any[] = [];

    for (const asset of assets) {
      const complaints = await Complaint.find({ asset: asset._id });
      const records = await MaintenanceRecord.find({ asset: asset._id });
      const assessment = calculateAssetHealth(asset, complaints, records);

      let include = true;
      if (category && assessment.category !== category) include = false;
      if (minScore !== undefined && assessment.score < Number(minScore)) include = false;
      if (maxScore !== undefined && assessment.score > Number(maxScore)) include = false;

      if (include) {
        assessments.push(assessment);
      }
    }

    // Sort by lowest health score first (highest risk first)
    assessments.sort((a, b) => a.score - b.score);

    res.status(200).json({
      count: assessments.length,
      assessments,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching asset health assessments.' });
  }
};

/**
 * Get single asset health assessment with full factor explanations
 */
export const getAssetHealthById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const asset = await Asset.findById(id);
    if (!asset) {
      res.status(404).json({ message: 'Asset not found.' });
      return;
    }

    const complaints = await Complaint.find({ asset: asset._id }).sort({ createdAt: -1 });
    const records = await MaintenanceRecord.find({ asset: asset._id }).sort({ scheduledDate: -1 });

    const assessment = calculateAssetHealth(asset, complaints, records);

    // Sanitize complaints to protect student reporter anonymity
    const sanitizedComplaints = complaints.map((c) => sanitizeComplaint(c, req.user));

    res.status(200).json({
      asset,
      assessment,
      complaints: sanitizedComplaints,
      maintenanceRecords: records,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error retrieving asset health.' });
  }
};

/**
 * Get recurring issue patterns & location hotspots with configurable analysis window
 */
export const getRecurringIssues = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const days = Number(req.query.days) || 60;
    const recurringData = await analyzeRecurringIssues(days);
    res.status(200).json(recurringData);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error computing recurring issue intelligence.' });
  }
};

/**
 * Get maintenance recommendations with role-based scoping (Admin sees all; Staff sees department)
 */
export const getRecommendations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    const { status, priority, recommendationType, department, assetId } = req.query;
    const query: any = {};

    // Role-based scoping
    if (req.user.role === 'STAFF') {
      const staffUser = await User.findById(req.user.userId);
      const staffDept = staffUser?.department;

      const staffOr: any[] = [{ assignedStaff: req.user.userId }];
      if (staffDept) {
        staffOr.push({ assignedDepartment: staffDept });
      }
      query.$or = staffOr;
    } else if (req.user.role !== 'ADMIN') {
      res.status(403).json({ message: 'Access denied. Maintenance intelligence is restricted to staff and administrators.' });
      return;
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (recommendationType) query.recommendationType = recommendationType;
    if (department) query.assignedDepartment = department;
    if (assetId) query.asset = assetId;

    const recommendations = await Recommendation.find(query)
      .populate('asset', 'assetCode assetName building floor room condition status')
      .populate('linkedMaintenanceRecord', 'recordId scheduledDate status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: recommendations.length,
      recommendations,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error listing maintenance recommendations.' });
  }
};

/**
 * Get single recommendation detail with sanitized complaint history
 */
export const getRecommendationById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rec = await Recommendation.findById(id)
      .populate('asset')
      .populate('relatedComplaints')
      .populate('relatedMaintenanceRecords')
      .populate('linkedMaintenanceRecord');

    if (!rec) {
      res.status(404).json({ message: 'Recommendation not found.' });
      return;
    }

    // Role check for staff
    if (req.user?.role === 'STAFF') {
      const staffUser = await User.findById(req.user.userId);
      if (
        rec.assignedStaff &&
        rec.assignedStaff.toString() !== req.user.userId &&
        rec.assignedDepartment !== staffUser?.department
      ) {
        res.status(403).json({ message: 'Unauthorized to view recommendations outside your department.' });
        return;
      }
    }

    const recObj = rec.toObject();
    if (Array.isArray(recObj.relatedComplaints)) {
      recObj.relatedComplaints = recObj.relatedComplaints.map((c: any) =>
        sanitizeComplaint(c, req.user)
      );
    }

    res.status(200).json({ recommendation: recObj });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching recommendation details.' });
  }
};

/**
 * Trigger full intelligence evaluation (Admin only)
 */
export const refreshIntelligence = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const report = await runFullIntelligenceEvaluation();

    if (req.user) {
      await AuditLog.create({
        action: 'INTELLIGENCE_EVALUATION_TRIGGERED',
        performedBy: req.user.userId,
        performedByName: req.user.name,
        details: {
          totalEvaluated: report.totalEvaluated,
          recommendationsCount: report.recommendationsCount,
        },
      });
    }

    res.status(200).json({
      message: `Intelligence evaluation refreshed: ${report.totalEvaluated} assets analyzed, ${report.recommendationsCount} recommendations active.`,
      report,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error running intelligence evaluation.' });
  }
};

/**
 * Mark recommendation as REVIEWED (Staff or Admin)
 */
export const reviewRecommendation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rec = await Recommendation.findById(id);
    if (!rec) {
      res.status(404).json({ message: 'Recommendation not found.' });
      return;
    }

    rec.status = 'REVIEWED';
    rec.reviewedBy = req.user?.userId;
    rec.reviewedByName = req.user?.name;
    rec.reviewedAt = new Date();
    await rec.save();

    if (req.user) {
      await AuditLog.create({
        action: 'RECOMMENDATION_REVIEWED',
        performedBy: req.user.userId,
        performedByName: req.user.name,
        details: { recommendationCode: rec.recommendationCode, assetCode: rec.assetCode },
      });
    }

    res.status(200).json({ message: 'Recommendation marked as reviewed.', recommendation: rec });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error reviewing recommendation.' });
  }
};

/**
 * Link recommendation to an existing or newly created maintenance task
 */
export const linkTaskToRecommendation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { maintenanceRecordId } = req.body;

    if (!maintenanceRecordId) {
      res.status(400).json({ message: 'maintenanceRecordId is required.' });
      return;
    }

    const rec = await Recommendation.findById(id);
    if (!rec) {
      res.status(404).json({ message: 'Recommendation not found.' });
      return;
    }

    const task = await MaintenanceRecord.findById(maintenanceRecordId);
    if (!task) {
      res.status(404).json({ message: 'Target maintenance task not found.' });
      return;
    }

    rec.linkedMaintenanceRecord = task._id;
    rec.status = 'TASK_CREATED';
    await rec.save();

    if (req.user) {
      await AuditLog.create({
        action: 'RECOMMENDATION_TASK_LINKED',
        performedBy: req.user.userId,
        performedByName: req.user.name,
        details: {
          recommendationCode: rec.recommendationCode,
          recordId: task.recordId,
        },
      });
    }

    res.status(200).json({
      message: `Recommendation linked to maintenance task ${task.recordId}.`,
      recommendation: rec,
      task,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error linking task to recommendation.' });
  }
};

/**
 * Mark recommendation as ADDRESSED (Staff or Admin)
 */
export const addressRecommendation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rec = await Recommendation.findById(id);
    if (!rec) {
      res.status(404).json({ message: 'Recommendation not found.' });
      return;
    }

    rec.status = 'ADDRESSED';
    rec.resolvedAt = new Date();
    await rec.save();

    if (req.user) {
      await AuditLog.create({
        action: 'RECOMMENDATION_ADDRESSED',
        performedBy: req.user.userId,
        performedByName: req.user.name,
        details: { recommendationCode: rec.recommendationCode, assetCode: rec.assetCode },
      });
    }

    res.status(200).json({ message: 'Recommendation marked as addressed.', recommendation: rec });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error updating recommendation status.' });
  }
};

/**
 * Dismiss recommendation with required dismissal reason
 */
export const dismissRecommendation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { dismissalReason } = req.body;

    if (!dismissalReason || !dismissalReason.trim()) {
      res.status(400).json({ message: 'A valid dismissalReason is required to dismiss a maintenance recommendation.' });
      return;
    }

    const rec = await Recommendation.findById(id);
    if (!rec) {
      res.status(404).json({ message: 'Recommendation not found.' });
      return;
    }

    rec.status = 'DISMISSED';
    rec.dismissalReason = dismissalReason.trim();
    rec.dismissedBy = req.user?.userId;
    rec.dismissedByName = req.user?.name;
    rec.resolvedAt = new Date();
    await rec.save();

    if (req.user) {
      await AuditLog.create({
        action: 'RECOMMENDATION_DISMISSED',
        performedBy: req.user.userId,
        performedByName: req.user.name,
        details: {
          recommendationCode: rec.recommendationCode,
          dismissalReason: rec.dismissalReason,
        },
      });
    }

    res.status(200).json({ message: 'Recommendation dismissed.', recommendation: rec });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error dismissing recommendation.' });
  }
};
