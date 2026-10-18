import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import {
  getMaintenanceCostAnalytics,
  getAssetLifecycleSummary,
  getLifecycleRepairVsReplacementAssessments,
  getSustainabilityMetrics,
} from '../services/sustainabilityCostService';
import {
  generateExpenditureReportCsv,
  generateLifecycleReportCsv,
  generateComplianceReportCsv,
  generateRepairVsReplacementCsv,
} from '../services/csvExportService';

/**
 * Get overall sustainability & resource efficiency metrics
 */
export const getSustainabilityOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const metrics = await getSustainabilityMetrics();
    res.status(200).json(metrics);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching sustainability metrics.' });
  }
};

/**
 * Get maintenance cost analytics and breakdowns (Admin only)
 */
export const getCostAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, building, category, department, maintenanceType } = req.query;

    const filters: any = {};
    if (startDate) filters.startDate = new Date(String(startDate));
    if (endDate) filters.endDate = new Date(String(endDate));
    if (building) filters.building = String(building);
    if (category) filters.category = String(category);
    if (department) filters.department = String(department);
    if (maintenanceType) filters.maintenanceType = String(maintenanceType);

    const analytics = await getMaintenanceCostAnalytics(filters);
    res.status(200).json(analytics);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error calculating maintenance cost analytics.' });
  }
};

/**
 * Get equipment repair vs replacement assessments (Admin only)
 */
export const getLifecycleAssessments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await getLifecycleRepairVsReplacementAssessments();
    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error assessing equipment repair vs replacement.' });
  }
};

/**
 * Get single asset lifecycle history and remaining useful life
 */
export const getAssetLifecycle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const summary = await getAssetLifecycleSummary(id);
    res.status(200).json(summary);
  } catch (error: any) {
    res.status(error.message === 'Asset not found' ? 404 : 500).json({
      message: error.message || 'Error retrieving asset lifecycle summary.',
    });
  }
};

/**
 * Export secure CSV reports with formula injection protection (Admin only)
 */
export const exportReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reportType } = req.params;
    const nowStr = new Date().toISOString().split('T')[0];

    let csvContent = '';
    let fileName = `smartcampus_report_${nowStr}.csv`;

    switch (reportType) {
      case 'expenditure':
        csvContent = await generateExpenditureReportCsv(req.query);
        fileName = `smartcampus_maintenance_expenditure_${nowStr}.csv`;
        break;
      case 'lifecycle':
        csvContent = await generateLifecycleReportCsv();
        fileName = `smartcampus_asset_lifecycle_${nowStr}.csv`;
        break;
      case 'compliance':
        csvContent = await generateComplianceReportCsv();
        fileName = `smartcampus_preventive_compliance_${nowStr}.csv`;
        break;
      case 'repair-vs-replace':
        csvContent = await generateRepairVsReplacementCsv();
        fileName = `smartcampus_repair_vs_replace_${nowStr}.csv`;
        break;
      default:
        res.status(400).json({
          message: 'Invalid report type. Allowed: expenditure, lifecycle, compliance, repair-vs-replace.',
        });
        return;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.status(200).send(csvContent);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error generating CSV report export.' });
  }
};
