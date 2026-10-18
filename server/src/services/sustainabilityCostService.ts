import { Asset, IAsset } from '../models/Asset';
import { MaintenanceRecord, IMaintenanceRecord } from '../models/MaintenanceRecord';
import { Complaint, IComplaint } from '../models/Complaint';
import { calculateAssetHealth } from './maintenanceIntelligenceService';

export interface CostAnalyticsFilters {
  startDate?: Date;
  endDate?: Date;
  building?: string;
  category?: string;
  department?: string;
  maintenanceType?: string;
}

export interface MaintenanceCostAnalytics {
  totalRecordedExpenditure: number;
  periodExpenditure: number;
  completedTasksCount: number;
  averageCostPerTask: number;
  expenditureBreakdown: {
    labour: number;
    parts: number;
    other: number;
  };
  costByMaintenanceType: {
    PREVENTIVE: number;
    CORRECTIVE: number;
    EMERGENCY: number;
    INSPECTION: number;
  };
  costByBuilding: {
    building: string;
    totalCost: number;
    taskCount: number;
  }[];
  costByCategory: {
    category: string;
    totalCost: number;
    taskCount: number;
  }[];
  costByDepartment: {
    department: string;
    totalCost: number;
    taskCount: number;
  }[];
  monthlyExpenditureTrends: {
    month: string;
    label: string;
    totalCost: number;
    taskCount: number;
    preventiveCost: number;
    correctiveCost: number;
  }[];
  topCostAssets: {
    assetId: string;
    assetCode: string;
    assetName: string;
    building: string;
    room: string;
    totalCost: number;
    taskCount: number;
    purchaseCost?: number;
    costRatioPercent?: number;
  }[];
  repeatedRepairedAssets: {
    assetId: string;
    assetCode: string;
    assetName: string;
    building: string;
    room: string;
    repairCount: number;
    totalCost: number;
    condition: string;
  }[];
  missingCostRecordsCount: number;
}

export interface AssetLifecycleSummary {
  assetId: string;
  assetCode: string;
  assetName: string;
  category: string;
  building: string;
  floor: string;
  room: string;
  status: string;
  condition: string;
  purchaseDate?: Date;
  installationDate?: Date;
  warrantyExpiryDate?: Date;
  purchaseCost?: number;
  expectedLifespanYears?: number;
  estimatedAgeYears: number | null;
  ageFormatted: string;
  usefulLifeRemainingYears: number | null;
  totalMaintenanceCost: number;
  totalInterventionsCount: number;
  correctiveRepairsCount: number;
  preventiveActivitiesCount: number;
  complaintCount: number;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  healthScore: number;
  healthCategory: string;
  costToPurchaseRatioPercent: number | null;
  underWarranty: boolean;
}

export interface LifecycleAssessmentItem {
  assetId: string;
  assetCode: string;
  assetName: string;
  building: string;
  room: string;
  condition: string;
  healthScore: number;
  healthCategory: string;
  purchaseCost: number | null;
  totalMaintenanceCost: number;
  costRatioPercent: number | null;
  ageYears: number | null;
  expectedLifespanYears: number | null;
  flag:
    | 'HIGH_MAINTENANCE_BURDEN'
    | 'END_OF_LIFE_EXCEEDED'
    | 'RECURRING_CORRECTIVE_BURDEN'
    | 'WARRANTY_ELIGIBLE_SAVINGS'
    | 'NORMAL_LIFECYCLE';
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  reason: string;
  evidence: string[];
  missingDataNotes: string[];
  recommendedAction: string;
}

export interface SustainabilityMetrics {
  preventiveCompletionRate: number;
  preventiveToCorrectiveRatio: number;
  proactiveMaintenancePercentage: number;
  repeatedRepairFrequencyRate: number;
  maintenanceBacklogByBuilding: {
    building: string;
    overdueTasksCount: number;
  }[];
  workloadByDepartment: {
    department: string;
    completedTasksCount: number;
    pendingTasksCount: number;
    overdueTasksCount: number;
    totalCost: number;
  }[];
  warrantySavingsOpportunities: {
    count: number;
    assetsUnderWarrantyNeedingRepair: string[];
  };
  resourceEfficiencyNotes: string;
}

/**
 * Helper to calculate asset age in years from actual purchaseDate or installationDate
 */
export const calculateAssetAgeYears = (asset: IAsset): number | null => {
  const baseDate = asset.purchaseDate || asset.installationDate;
  if (!baseDate) return null;
  const now = new Date();
  const diffMs = now.getTime() - new Date(baseDate).getTime();
  if (diffMs < 0) return 0;
  const years = diffMs / (365.25 * 24 * 60 * 60 * 1000);
  return Number(years.toFixed(1));
};

/**
 * Comprehensive Database-Driven Maintenance Cost Analytics
 */
export const getMaintenanceCostAnalytics = async (
  filters: CostAnalyticsFilters = {}
): Promise<MaintenanceCostAnalytics> => {
  const now = new Date();

  // Base match filter for completed records (strictly excludes CANCELLED)
  const matchFilter: any = {
    status: 'COMPLETED',
  };

  if (filters.startDate || filters.endDate) {
    matchFilter.completedDate = {};
    if (filters.startDate) matchFilter.completedDate.$gte = new Date(filters.startDate);
    if (filters.endDate) matchFilter.completedDate.$lte = new Date(filters.endDate);
  }

  if (filters.maintenanceType) {
    matchFilter.maintenanceType = filters.maintenanceType;
  }

  if (filters.department) {
    matchFilter.assignedDepartment = { $regex: filters.department.trim(), $options: 'i' };
  }

  // 1. Overall Completed Records
  const completedRecords = await MaintenanceRecord.find(matchFilter)
    .populate('asset', 'assetCode assetName category building floor room purchaseCost totalMaintenanceCost')
    .lean();

  let totalRecordedExpenditure = 0;
  let totalLabour = 0;
  let totalParts = 0;
  let totalOther = 0;
  let missingCostCount = 0;

  const costByType: Record<string, number> = {
    PREVENTIVE: 0,
    CORRECTIVE: 0,
    EMERGENCY: 0,
    INSPECTION: 0,
  };

  const buildingCostMap = new Map<string, { totalCost: number; count: number }>();
  const categoryCostMap = new Map<string, { totalCost: number; count: number }>();
  const departmentCostMap = new Map<string, { totalCost: number; count: number }>();

  for (const record of completedRecords) {
    const cost = Math.max(0, Number(record.cost) || 0);
    totalRecordedExpenditure += cost;

    const labour = Math.max(0, Number(record.labourCost) || 0);
    const parts = Math.max(0, Number(record.partsCost) || 0);
    const other = Math.max(0, Number(record.otherExpenses) || 0);

    totalLabour += labour;
    totalParts += parts;
    totalOther += other;

    if (cost === 0 && labour === 0 && parts === 0 && other === 0) {
      missingCostCount++;
    }

    // Cost by Maintenance Type
    const mType = record.maintenanceType || 'PREVENTIVE';
    costByType[mType] = (costByType[mType] || 0) + cost;

    // Cost by Department
    const dept = record.assignedDepartment || 'General Maintenance';
    const deptEntry = departmentCostMap.get(dept) || { totalCost: 0, count: 0 };
    deptEntry.totalCost += cost;
    deptEntry.count += 1;
    departmentCostMap.set(dept, deptEntry);

    // Asset building and category
    const ast: any = record.asset;
    if (ast) {
      // Filter by building if requested
      if (filters.building && !new RegExp(filters.building.trim(), 'i').test(ast.building)) {
        continue;
      }
      // Filter by category if requested
      if (filters.category && !new RegExp(filters.category.trim(), 'i').test(ast.category)) {
        continue;
      }

      const bldg = ast.building || 'Campus Central';
      const bEntry = buildingCostMap.get(bldg) || { totalCost: 0, count: 0 };
      bEntry.totalCost += cost;
      bEntry.count += 1;
      buildingCostMap.set(bldg, bEntry);

      const cat = ast.category || 'General';
      const cEntry = categoryCostMap.get(cat) || { totalCost: 0, count: 0 };
      cEntry.totalCost += cost;
      cEntry.count += 1;
      categoryCostMap.set(cat, cEntry);
    }
  }

  // Monthly trends for the past 6 months
  const monthlyTrends: {
    month: string;
    label: string;
    totalCost: number;
    taskCount: number;
    preventiveCost: number;
    correctiveCost: number;
  }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextD = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    let mTotal = 0;
    let mCount = 0;
    let mPrev = 0;
    let mCorr = 0;

    for (const r of completedRecords) {
      const cDate = r.completedDate ? new Date(r.completedDate) : new Date(r.createdAt);
      if (cDate >= d && cDate < nextD) {
        const c = Math.max(0, Number(r.cost) || 0);
        mTotal += c;
        mCount++;
        if (r.maintenanceType === 'PREVENTIVE') mPrev += c;
        if (r.maintenanceType === 'CORRECTIVE' || r.maintenanceType === 'EMERGENCY') mCorr += c;
      }
    }

    monthlyTrends.push({
      month: monthKey,
      label,
      totalCost: mTotal,
      taskCount: mCount,
      preventiveCost: mPrev,
      correctiveCost: mCorr,
    });
  }

  // Top Cost Assets
  const activeAssets = await Asset.find({ status: { $ne: 'DECOMMISSIONED' } })
    .select('assetCode assetName building room purchaseCost totalMaintenanceCost')
    .lean();

  const assetCostAgg: any[] = [];
  for (const a of activeAssets) {
    const mRecords = await MaintenanceRecord.find({ asset: a._id, status: 'COMPLETED' }).lean();
    if (mRecords.length > 0) {
      const totalCost = mRecords.reduce((acc, cur) => acc + (Math.max(0, Number(cur.cost)) || 0), 0);
      const purchaseCost = a.purchaseCost ? Number(a.purchaseCost) : undefined;
      const costRatioPercent = purchaseCost && purchaseCost > 0
        ? Number(((totalCost / purchaseCost) * 100).toFixed(1))
        : undefined;

      assetCostAgg.push({
        assetId: a._id.toString(),
        assetCode: a.assetCode,
        assetName: a.assetName,
        building: a.building,
        room: a.room,
        totalCost,
        taskCount: mRecords.length,
        purchaseCost,
        costRatioPercent,
      });
    }
  }

  assetCostAgg.sort((a, b) => b.totalCost - a.totalCost);

  // Repeatedly Repaired Assets (>= 2 corrective/emergency tasks)
  const repeatedRepairedAssets: any[] = [];
  for (const a of activeAssets) {
    const repairs = await MaintenanceRecord.find({
      asset: a._id,
      maintenanceType: { $in: ['CORRECTIVE', 'EMERGENCY'] },
      status: { $ne: 'CANCELLED' },
    }).lean();

    if (repairs.length >= 2) {
      const totalCost = repairs.reduce((acc, cur) => acc + (Math.max(0, Number(cur.cost)) || 0), 0);
      repeatedRepairedAssets.push({
        assetId: a._id.toString(),
        assetCode: a.assetCode,
        assetName: a.assetName,
        building: a.building,
        room: a.room,
        repairCount: repairs.length,
        totalCost,
        condition: (a as any).condition || 'GOOD',
      });
    }
  }
  repeatedRepairedAssets.sort((a, b) => b.repairCount - a.repairCount);

  const completedTasksCount = completedRecords.length;
  const averageCostPerTask = completedTasksCount > 0
    ? Number((totalRecordedExpenditure / completedTasksCount).toFixed(2))
    : 0;

  return {
    totalRecordedExpenditure,
    periodExpenditure: totalRecordedExpenditure,
    completedTasksCount,
    averageCostPerTask,
    expenditureBreakdown: {
      labour: totalLabour,
      parts: totalParts,
      other: totalOther,
    },
    costByMaintenanceType: {
      PREVENTIVE: costByType.PREVENTIVE || 0,
      CORRECTIVE: costByType.CORRECTIVE || 0,
      EMERGENCY: costByType.EMERGENCY || 0,
      INSPECTION: costByType.INSPECTION || 0,
    },
    costByBuilding: Array.from(buildingCostMap.entries()).map(([building, val]) => ({
      building,
      totalCost: val.totalCost,
      taskCount: val.count,
    })).sort((a, b) => b.totalCost - a.totalCost),
    costByCategory: Array.from(categoryCostMap.entries()).map(([category, val]) => ({
      category,
      totalCost: val.totalCost,
      taskCount: val.count,
    })).sort((a, b) => b.totalCost - a.totalCost),
    costByDepartment: Array.from(departmentCostMap.entries()).map(([department, val]) => ({
      department,
      totalCost: val.totalCost,
      taskCount: val.count,
    })).sort((a, b) => b.totalCost - a.totalCost),
    monthlyExpenditureTrends: monthlyTrends,
    topCostAssets: assetCostAgg.slice(0, 10),
    repeatedRepairedAssets: repeatedRepairedAssets.slice(0, 10),
    missingCostRecordsCount: missingCostCount,
  };
};

/**
 * Detailed Lifecycle Summary for a Single Asset
 */
export const getAssetLifecycleSummary = async (assetId: string): Promise<AssetLifecycleSummary> => {
  const asset = await Asset.findById(assetId);
  if (!asset) {
    throw new Error('Asset not found');
  }

  const [complaints, maintenanceRecords] = await Promise.all([
    Complaint.find({ asset: asset._id }).lean(),
    MaintenanceRecord.find({ asset: asset._id }).sort({ scheduledDate: -1 }).lean(),
  ]);

  const completedRecords = maintenanceRecords.filter((m) => m.status === 'COMPLETED');
  const totalMaintenanceCost = completedRecords.reduce(
    (acc, cur) => acc + (Math.max(0, Number(cur.cost)) || 0),
    0
  );

  const correctiveRepairsCount = maintenanceRecords.filter(
    (m) => ['CORRECTIVE', 'EMERGENCY'].includes(m.maintenanceType) && m.status !== 'CANCELLED'
  ).length;

  const preventiveActivitiesCount = maintenanceRecords.filter(
    (m) => m.maintenanceType === 'PREVENTIVE' && m.status === 'COMPLETED'
  ).length;

  const estimatedAgeYears = calculateAssetAgeYears(asset);
  const ageFormatted = estimatedAgeYears !== null ? `${estimatedAgeYears} years` : 'Data unavailable';

  let usefulLifeRemainingYears: number | null = null;
  if (asset.expectedLifespanYears && estimatedAgeYears !== null) {
    usefulLifeRemainingYears = Math.max(0, Number((asset.expectedLifespanYears - estimatedAgeYears).toFixed(1)));
  }

  let costToPurchaseRatioPercent: number | null = null;
  if (asset.purchaseCost && asset.purchaseCost > 0) {
    costToPurchaseRatioPercent = Number(((totalMaintenanceCost / asset.purchaseCost) * 100).toFixed(1));
  }

  const healthAssessment = calculateAssetHealth(
    asset,
    complaints as any,
    maintenanceRecords as any
  );

  const underWarranty = Boolean(
    asset.warrantyExpiryDate && new Date(asset.warrantyExpiryDate) > new Date()
  );

  return {
    assetId: asset._id.toString(),
    assetCode: asset.assetCode,
    assetName: asset.assetName,
    category: asset.category,
    building: asset.building,
    floor: asset.floor,
    room: asset.room,
    status: asset.status,
    condition: asset.condition,
    purchaseDate: asset.purchaseDate,
    installationDate: asset.installationDate,
    warrantyExpiryDate: asset.warrantyExpiryDate,
    purchaseCost: asset.purchaseCost,
    expectedLifespanYears: asset.expectedLifespanYears,
    estimatedAgeYears,
    ageFormatted,
    usefulLifeRemainingYears,
    totalMaintenanceCost,
    totalInterventionsCount: maintenanceRecords.length,
    correctiveRepairsCount,
    preventiveActivitiesCount,
    complaintCount: complaints.length,
    lastMaintenanceDate: asset.lastMaintenanceDate,
    nextMaintenanceDate: asset.nextMaintenanceDate,
    healthScore: healthAssessment.score,
    healthCategory: healthAssessment.category,
    costToPurchaseRatioPercent,
    underWarranty,
  };
};

/**
 * Explainable Equipment Repair vs Replacement Assessment Engine
 */
export const getLifecycleRepairVsReplacementAssessments = async (): Promise<{
  flaggedAssets: LifecycleAssessmentItem[];
  missingDataAssets: {
    assetId: string;
    assetCode: string;
    assetName: string;
    missingFields: string[];
  }[];
  summary: {
    totalEvaluated: number;
    highMaintenanceBurdenCount: number;
    endOfLifeExceededCount: number;
    recurringCorrectiveCount: number;
    warrantyOpportunitiesCount: number;
  };
}> => {
  const assets = await Asset.find({ status: { $ne: 'DECOMMISSIONED' } }).lean();
  const flaggedAssets: LifecycleAssessmentItem[] = [];
  const missingDataAssets: any[] = [];

  let highMaintenanceBurdenCount = 0;
  let endOfLifeExceededCount = 0;
  let recurringCorrectiveCount = 0;
  let warrantyOpportunitiesCount = 0;

  const now = new Date();

  for (const assetDoc of assets) {
    const asset = assetDoc as any;
    const [complaints, maintenanceRecords] = await Promise.all([
      Complaint.find({ asset: asset._id }).lean(),
      MaintenanceRecord.find({ asset: asset._id }).lean(),
    ]);

    const completed = maintenanceRecords.filter((m) => m.status === 'COMPLETED');
    const totalMaintenanceCost = completed.reduce(
      (acc, cur) => acc + (Math.max(0, Number(cur.cost)) || 0),
      0
    );

    const correctiveRepairs = maintenanceRecords.filter(
      (m) => ['CORRECTIVE', 'EMERGENCY'].includes(m.maintenanceType) && m.status !== 'CANCELLED'
    );

    const ageYears = calculateAssetAgeYears(asset);
    const purchaseCost = asset.purchaseCost ? Number(asset.purchaseCost) : null;
    const expectedLifespanYears = asset.expectedLifespanYears ? Number(asset.expectedLifespanYears) : null;
    const costRatioPercent = purchaseCost && purchaseCost > 0
      ? Number(((totalMaintenanceCost / purchaseCost) * 100).toFixed(1))
      : null;

    const health = calculateAssetHealth(asset, complaints as any, maintenanceRecords as any);

    // Track missing data
    const missingFields: string[] = [];
    if (!asset.purchaseCost) missingFields.push('Purchase Price');
    if (!asset.purchaseDate && !asset.installationDate) missingFields.push('Purchase/Installation Date');
    if (!asset.expectedLifespanYears) missingFields.push('Expected Useful Lifespan');
    if (!asset.warrantyExpiryDate) missingFields.push('Warranty Expiry Date');

    if (missingFields.length > 0) {
      missingDataAssets.push({
        assetId: asset._id.toString(),
        assetCode: asset.assetCode,
        assetName: asset.assetName,
        missingFields,
      });
    }

    const underWarranty = Boolean(asset.warrantyExpiryDate && new Date(asset.warrantyExpiryDate) > now);
    const hasOpenRepairs = asset.status === 'IN_REPAIR' || correctiveRepairs.length > 0;

    const missingDataNotes: string[] = [];
    if (!purchaseCost) {
      missingDataNotes.push('Original purchase price not recorded; financial replacement threshold cannot be calculated.');
    }
    if (ageYears === null) {
      missingDataNotes.push('Acquisition date missing; operational equipment age unavailable.');
    }

    // Evaluation Rule 1: High Cost-to-Purchase Ratio (>= 50% of acquisition cost)
    if (purchaseCost && purchaseCost > 0 && costRatioPercent !== null && costRatioPercent >= 50) {
      highMaintenanceBurdenCount++;
      flaggedAssets.push({
        assetId: asset._id.toString(),
        assetCode: asset.assetCode,
        assetName: asset.assetName,
        building: asset.building,
        room: asset.room,
        condition: asset.condition,
        healthScore: health.score,
        healthCategory: health.category,
        purchaseCost,
        totalMaintenanceCost,
        costRatioPercent,
        ageYears,
        expectedLifespanYears,
        flag: 'HIGH_MAINTENANCE_BURDEN',
        urgency: costRatioPercent >= 75 ? 'CRITICAL' : 'HIGH',
        title: `Conduct Replacement Feasibility Review: High Maintenance Burden (${costRatioPercent}% of Purchase Cost)`,
        reason: `Cumulative recorded maintenance expenditure ($${totalMaintenanceCost.toLocaleString()}) has reached ${costRatioPercent}% of original purchase cost ($${purchaseCost.toLocaleString()}). Continuing corrective repair risks exceeding total replacement cost.`,
        evidence: [
          `Original Purchase Price: $${purchaseCost.toLocaleString()}`,
          `Total Recorded Maintenance: $${totalMaintenanceCost.toLocaleString()}`,
          `Cost Burden Ratio: ${costRatioPercent}%`,
          `Completed Interventions: ${completed.length}`,
          `Current Condition: ${asset.condition}`,
        ],
        missingDataNotes,
        recommendedAction: `Conduct an administrative review to compare replacement quote against projected 12-month maintenance expenses before authorizing additional corrective budget.`,
      });
      continue;
    }

    // Evaluation Rule 2: End-of-Life Exceeded with Degradation
    if (
      expectedLifespanYears !== null &&
      ageYears !== null &&
      ageYears >= expectedLifespanYears &&
      (asset.condition === 'POOR' || asset.condition === 'CRITICAL')
    ) {
      endOfLifeExceededCount++;
      flaggedAssets.push({
        assetId: asset._id.toString(),
        assetCode: asset.assetCode,
        assetName: asset.assetName,
        building: asset.building,
        room: asset.room,
        condition: asset.condition,
        healthScore: health.score,
        healthCategory: health.category,
        purchaseCost,
        totalMaintenanceCost,
        costRatioPercent,
        ageYears,
        expectedLifespanYears,
        flag: 'END_OF_LIFE_EXCEEDED',
        urgency: asset.condition === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        title: `Retire / Replace Equipment: Operational Lifespan Exceeded (${ageYears}/${expectedLifespanYears} Years)`,
        reason: `Equipment age (${ageYears} yrs) has exceeded manufacturer expected operational lifespan (${expectedLifespanYears} yrs) while physical condition has degraded to ${asset.condition}.`,
        evidence: [
          `Operating Age: ${ageYears} years`,
          `Expected Lifespan: ${expectedLifespanYears} years`,
          `Physical Condition: ${asset.condition}`,
          `Asset Health Score: ${health.score}/100`,
        ],
        missingDataNotes,
        recommendedAction: `Schedule asset decommissioning and allocate capital budget for modern, energy-efficient replacement.`,
      });
      continue;
    }

    // Evaluation Rule 3: Chronic Corrective Repair Burden (Without Purchase Price)
    if (correctiveRepairs.length >= 3 && (asset.condition === 'POOR' || asset.condition === 'CRITICAL')) {
      recurringCorrectiveCount++;
      flaggedAssets.push({
        assetId: asset._id.toString(),
        assetCode: asset.assetCode,
        assetName: asset.assetName,
        building: asset.building,
        room: asset.room,
        condition: asset.condition,
        healthScore: health.score,
        healthCategory: health.category,
        purchaseCost,
        totalMaintenanceCost,
        costRatioPercent,
        ageYears,
        expectedLifespanYears,
        flag: 'RECURRING_CORRECTIVE_BURDEN',
        urgency: 'MEDIUM',
        title: `Chronic Breakdown Diagnostic Required (${correctiveRepairs.length} Corrective Repairs)`,
        reason: `Asset exhibits repeated corrective repairs (${correctiveRepairs.length} recorded) alongside ${asset.condition} condition. Financial comparison cannot be calculated due to missing purchase cost.`,
        evidence: [
          `Total Corrective Repairs: ${correctiveRepairs.length}`,
          `Total Recorded Repair Cost: $${totalMaintenanceCost.toLocaleString()}`,
          `Current Condition: ${asset.condition}`,
          `Complaints Logged: ${complaints.length}`,
        ],
        missingDataNotes,
        recommendedAction: `Inspect assembly root cause and enter original acquisition cost to enable financial replacement viability analysis.`,
      });
      continue;
    }

    // Evaluation Rule 4: Active Warranty Savings Opportunities
    if (underWarranty && hasOpenRepairs) {
      warrantyOpportunitiesCount++;
      flaggedAssets.push({
        assetId: asset._id.toString(),
        assetCode: asset.assetCode,
        assetName: asset.assetName,
        building: asset.building,
        room: asset.room,
        condition: asset.condition,
        healthScore: health.score,
        healthCategory: health.category,
        purchaseCost,
        totalMaintenanceCost,
        costRatioPercent,
        ageYears,
        expectedLifespanYears,
        flag: 'WARRANTY_ELIGIBLE_SAVINGS',
        urgency: 'MEDIUM',
        title: `Avoidable Expenditure: Active Warranty Coverage Available`,
        reason: `Asset currently requires maintenance or has repair history, but remains under active manufacturer warranty until ${new Date(asset.warrantyExpiryDate).toLocaleDateString()}.`,
        evidence: [
          `Warranty Expiry: ${new Date(asset.warrantyExpiryDate).toLocaleDateString()}`,
          `Manufacturer: ${asset.manufacturer || 'OEM'}`,
          `Model Number: ${asset.modelNumber || 'Standard'}`,
        ],
        missingDataNotes,
        recommendedAction: `Submit warranty claim to manufacturer to recover repair expenses before spending departmental maintenance budget.`,
      });
    }
  }

  return {
    flaggedAssets,
    missingDataAssets,
    summary: {
      totalEvaluated: assets.length,
      highMaintenanceBurdenCount,
      endOfLifeExceededCount,
      recurringCorrectiveCount,
      warrantyOpportunitiesCount,
    },
  };
};

/**
 * Data-Driven Sustainability & Resource Efficiency Metrics
 */
export const getSustainabilityMetrics = async (): Promise<SustainabilityMetrics> => {
  const [assets, records] = await Promise.all([
    Asset.find({ status: { $ne: 'DECOMMISSIONED' } }).lean(),
    MaintenanceRecord.find({ status: { $ne: 'CANCELLED' } }).lean(),
  ]);

  const completed = records.filter((r) => r.status === 'COMPLETED');
  const completedPreventive = completed.filter((r) => r.maintenanceType === 'PREVENTIVE').length;
  const overduePreventive = records.filter(
    (r) => r.maintenanceType === 'PREVENTIVE' && (r.status === 'OVERDUE' || (r.status === 'SCHEDULED' && new Date(r.scheduledDate) < new Date()))
  ).length;

  const totalPreventiveTasks = completedPreventive + overduePreventive;
  const preventiveCompletionRate = totalPreventiveTasks > 0
    ? Number(((completedPreventive / totalPreventiveTasks) * 100).toFixed(1))
    : 100;

  const correctiveCount = records.filter(
    (r) => ['CORRECTIVE', 'EMERGENCY'].includes(r.maintenanceType) && r.status === 'COMPLETED'
  ).length;

  const preventiveToCorrectiveRatio = correctiveCount > 0
    ? Number((completedPreventive / correctiveCount).toFixed(2))
    : Number((completedPreventive).toFixed(2));

  const proactiveTasks = completed.filter((r) => ['PREVENTIVE', 'INSPECTION'].includes(r.maintenanceType)).length;
  const proactiveMaintenancePercentage = completed.length > 0
    ? Number(((proactiveTasks / completed.length) * 100).toFixed(1))
    : 100;

  // Repeated repair frequency rate (% of assets that have experienced >= 2 repairs)
  let repeatedRepairedAssetCount = 0;
  for (const a of assets) {
    const aRepairs = records.filter(
      (r) => r.asset.toString() === a._id.toString() && ['CORRECTIVE', 'EMERGENCY'].includes(r.maintenanceType)
    );
    if (aRepairs.length >= 2) repeatedRepairedAssetCount++;
  }

  const repeatedRepairFrequencyRate = assets.length > 0
    ? Number(((repeatedRepairedAssetCount / assets.length) * 100).toFixed(1))
    : 0;

  // Backlog by building
  const backlogMap = new Map<string, number>();
  for (const r of records) {
    if (r.status === 'OVERDUE' || (r.status === 'SCHEDULED' && new Date(r.scheduledDate) < new Date())) {
      const ast = assets.find((a) => a._id.toString() === r.asset.toString());
      const bldg = ast ? ast.building : 'Campus Central';
      backlogMap.set(bldg, (backlogMap.get(bldg) || 0) + 1);
    }
  }

  // Workload by Department
  const deptMap = new Map<string, { completed: number; pending: number; overdue: number; totalCost: number }>();
  for (const r of records) {
    const dept = r.assignedDepartment || 'General Maintenance';
    const entry = deptMap.get(dept) || { completed: 0, pending: 0, overdue: 0, totalCost: 0 };
    if (r.status === 'COMPLETED') {
      entry.completed++;
      entry.totalCost += Math.max(0, Number(r.cost) || 0);
    } else if (r.status === 'OVERDUE' || (r.status === 'SCHEDULED' && new Date(r.scheduledDate) < new Date())) {
      entry.overdue++;
      entry.pending++;
    } else {
      entry.pending++;
    }
    deptMap.set(dept, entry);
  }

  // Warranty savings opportunities
  const now = new Date();
  const warrantyAssetsNeedingRepair: string[] = [];
  for (const a of assets) {
    if (a.warrantyExpiryDate && new Date(a.warrantyExpiryDate) > now) {
      if (a.status === 'IN_REPAIR' || a.condition === 'POOR' || a.condition === 'CRITICAL') {
        warrantyAssetsNeedingRepair.push(`${a.assetName} (${a.assetCode})`);
      }
    }
  }

  return {
    preventiveCompletionRate,
    preventiveToCorrectiveRatio,
    proactiveMaintenancePercentage,
    repeatedRepairFrequencyRate,
    maintenanceBacklogByBuilding: Array.from(backlogMap.entries()).map(([building, count]) => ({
      building,
      overdueTasksCount: count,
    })).sort((a, b) => b.overdueTasksCount - a.overdueTasksCount),
    workloadByDepartment: Array.from(deptMap.entries()).map(([department, val]) => ({
      department,
      completedTasksCount: val.completed,
      pendingTasksCount: val.pending,
      overdueTasksCount: val.overdue,
      totalCost: val.totalCost,
    })).sort((a, b) => b.completedTasksCount - a.completedTasksCount),
    warrantySavingsOpportunities: {
      count: warrantyAssetsNeedingRepair.length,
      assetsUnderWarrantyNeedingRepair: warrantyAssetsNeedingRepair,
    },
    resourceEfficiencyNotes:
      'Energy and water IoT smart-meter telemetry is currently offline (no physical sub-meters installed). Sustainability indicators reflect resource efficiency, equipment lifespan optimization, proactive preventive ratios, and warranty savings compliance.',
  };
};
