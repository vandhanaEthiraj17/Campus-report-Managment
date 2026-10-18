import { Asset } from '../models/Asset';
import { MaintenanceRecord } from '../models/MaintenanceRecord';
import { getMaintenanceCostAnalytics, getLifecycleRepairVsReplacementAssessments } from './sustainabilityCostService';

/**
 * Sanitizes cell values to completely prevent CSV Formula Injection (CWE-1236).
 * Any cell value starting with '=', '+', '-', '@', '\t', or '\r' is prefixed with an apostrophe.
 */
export const sanitizeCsvCell = (val: any): string => {
  if (val === null || val === undefined) return '""';
  let rawStr = String(val);

  // CSV Injection guard (check raw string first so leading \t or \r are caught)
  if (/^[=+\-@\t\r]/.test(rawStr) || /^[=+\-@]/.test(rawStr.trim())) {
    rawStr = `'${rawStr.trim()}`;
  } else {
    rawStr = rawStr.trim();
  }

  // Escape existing double quotes and enclose in quotes
  rawStr = rawStr.replace(/"/g, '""');
  return `"${rawStr}"`;
};

export const formatCsvRow = (cells: any[]): string => {
  return cells.map(sanitizeCsvCell).join(',');
};

/**
 * Generate CSV for Maintenance Expenditure Report
 */
export const generateExpenditureReportCsv = async (filters: any = {}): Promise<string> => {
  const query: any = { status: { $ne: 'CANCELLED' } };
  if (filters.startDate || filters.endDate) {
    query.completedDate = {};
    if (filters.startDate) query.completedDate.$gte = new Date(filters.startDate);
    if (filters.endDate) query.completedDate.$lte = new Date(filters.endDate);
  }
  if (filters.maintenanceType) query.maintenanceType = filters.maintenanceType;
  if (filters.department) query.assignedDepartment = { $regex: filters.department.trim(), $options: 'i' };

  const records = await MaintenanceRecord.find(query)
    .populate('asset', 'assetCode assetName building floor room category')
    .sort({ completedDate: -1, scheduledDate: -1 })
    .lean();

  const headers = [
    'Record Code',
    'Date',
    'Asset Code',
    'Asset Name',
    'Category',
    'Building',
    'Room',
    'Maintenance Type',
    'Department',
    'Technician',
    'Labour Cost ($)',
    'Parts Cost ($)',
    'Other Expenses ($)',
    'Total Cost ($)',
    'Status',
    'Work Description',
  ];

  const rows = [formatCsvRow(headers)];

  for (const r of records) {
    const ast: any = r.asset;
    const dateStr = r.completedDate
      ? new Date(r.completedDate).toISOString().split('T')[0]
      : (r.scheduledDate ? new Date(r.scheduledDate).toISOString().split('T')[0] : '');

    rows.push(
      formatCsvRow([
        r.recordId,
        dateStr,
        r.assetCode,
        r.assetName,
        ast ? ast.category : 'General',
        ast ? ast.building : 'Campus',
        ast ? ast.room : 'General',
        r.maintenanceType,
        r.assignedDepartment || 'General Maintenance',
        r.assignedStaffName || 'Unassigned',
        (r.labourCost || 0).toFixed(2),
        (r.partsCost || 0).toFixed(2),
        (r.otherExpenses || 0).toFixed(2),
        (r.cost || 0).toFixed(2),
        r.status,
        r.workDescription || '',
      ])
    );
  }

  return rows.join('\r\n');
};

/**
 * Generate CSV for Asset Lifecycle & Equipment Cost Report
 */
export const generateLifecycleReportCsv = async (): Promise<string> => {
  const assets = await Asset.find({ status: { $ne: 'DECOMMISSIONED' } })
    .sort({ totalMaintenanceCost: -1 })
    .lean();

  const headers = [
    'Asset Code',
    'Asset Name',
    'Type',
    'Category',
    'Building',
    'Floor',
    'Room',
    'Status',
    'Physical Condition',
    'Purchase Date',
    'Installation Date',
    'Age (Years)',
    'Expected Lifespan (Years)',
    'Remaining Life (Years)',
    'Warranty Expiry',
    'Purchase Cost ($)',
    'Total Maintenance Cost ($)',
    'Cost Ratio (%)',
    'Total Interventions',
  ];

  const rows = [formatCsvRow(headers)];
  const now = new Date();

  for (const a of assets) {
    const baseDate = a.purchaseDate || a.installationDate;
    let ageStr = 'Data unavailable';
    let remStr = 'Data unavailable';

    if (baseDate) {
      const diffMs = now.getTime() - new Date(baseDate).getTime();
      const yrs = Math.max(0, diffMs / (365.25 * 24 * 60 * 60 * 1000));
      ageStr = yrs.toFixed(1);

      if (a.expectedLifespanYears) {
        remStr = Math.max(0, a.expectedLifespanYears - yrs).toFixed(1);
      }
    }

    const pCost = a.purchaseCost !== undefined ? Number(a.purchaseCost) : null;
    const mCost = a.totalMaintenanceCost || 0;
    const ratioStr = pCost && pCost > 0 ? ((mCost / pCost) * 100).toFixed(1) + '%' : 'N/A';

    rows.push(
      formatCsvRow([
        a.assetCode,
        a.assetName,
        a.assetType || 'OTHER',
        a.category,
        a.building,
        a.floor,
        a.room,
        a.status,
        a.condition,
        a.purchaseDate ? new Date(a.purchaseDate).toISOString().split('T')[0] : 'N/A',
        a.installationDate ? new Date(a.installationDate).toISOString().split('T')[0] : 'N/A',
        ageStr,
        a.expectedLifespanYears ? String(a.expectedLifespanYears) : 'N/A',
        remStr,
        a.warrantyExpiryDate ? new Date(a.warrantyExpiryDate).toISOString().split('T')[0] : 'N/A',
        pCost !== null ? pCost.toFixed(2) : 'N/A',
        mCost.toFixed(2),
        ratioStr,
        a.complaintCount || 0,
      ])
    );
  }

  return rows.join('\r\n');
};

/**
 * Generate CSV for Preventive Maintenance Compliance Report
 */
export const generateComplianceReportCsv = async (): Promise<string> => {
  const records = await MaintenanceRecord.find({ status: { $ne: 'CANCELLED' } }).lean();

  const deptMap = new Map<string, { totalPrev: number; completedPrev: number; overduePrev: number; totalCost: number }>();

  const now = new Date();
  for (const r of records) {
    const dept = r.assignedDepartment || 'General Maintenance';
    const entry = deptMap.get(dept) || { totalPrev: 0, completedPrev: 0, overduePrev: 0, totalCost: 0 };

    if (r.maintenanceType === 'PREVENTIVE') {
      entry.totalPrev++;
      if (r.status === 'COMPLETED') {
        entry.completedPrev++;
        entry.totalCost += Math.max(0, Number(r.cost) || 0);
      } else if (r.status === 'OVERDUE' || (r.status === 'SCHEDULED' && new Date(r.scheduledDate) < now)) {
        entry.overduePrev++;
      }
    }

    deptMap.set(dept, entry);
  }

  const headers = [
    'Responsible Department',
    'Total Preventive Tasks',
    'Completed Preventive Tasks',
    'Overdue Tasks',
    'Preventive Compliance Rate (%)',
    'Total Maintenance Cost ($)',
  ];

  const rows = [formatCsvRow(headers)];

  for (const [dept, val] of deptMap.entries()) {
    const rate = val.totalPrev > 0 ? ((val.completedPrev / val.totalPrev) * 100).toFixed(1) + '%' : '100.0%';
    rows.push(
      formatCsvRow([
        dept,
        val.totalPrev,
        val.completedPrev,
        val.overduePrev,
        rate,
        val.totalCost.toFixed(2),
      ])
    );
  }

  return rows.join('\r\n');
};

/**
 * Generate CSV for Equipment Repair vs Replacement Administrative Review
 */
export const generateRepairVsReplacementCsv = async (): Promise<string> => {
  const { flaggedAssets } = await getLifecycleRepairVsReplacementAssessments();

  const headers = [
    'Asset Code',
    'Asset Name',
    'Building',
    'Room',
    'Condition',
    'Health Score',
    'Flag',
    'Urgency',
    'Purchase Cost ($)',
    'Total Maintenance Cost ($)',
    'Cost Ratio (%)',
    'Operating Age (Yrs)',
    'Expected Lifespan (Yrs)',
    'Assessment Title',
    'Evidence & Justification',
    'Missing Data Notes',
    'Recommended Action',
  ];

  const rows = [formatCsvRow(headers)];

  for (const item of flaggedAssets) {
    rows.push(
      formatCsvRow([
        item.assetCode,
        item.assetName,
        item.building,
        item.room,
        item.condition,
        item.healthScore,
        item.flag,
        item.urgency,
        item.purchaseCost !== null ? item.purchaseCost.toFixed(2) : 'Unavailable',
        item.totalMaintenanceCost.toFixed(2),
        item.costRatioPercent !== null ? `${item.costRatioPercent}%` : 'N/A',
        item.ageYears !== null ? String(item.ageYears) : 'Unavailable',
        item.expectedLifespanYears !== null ? String(item.expectedLifespanYears) : 'N/A',
        item.title,
        item.evidence.join('; '),
        item.missingDataNotes.join('; '),
        item.recommendedAction,
      ])
    );
  }

  return rows.join('\r\n');
};
