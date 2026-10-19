import { Asset, IAsset } from '../models/Asset';
import { MaintenanceRecord, IMaintenanceRecord } from '../models/MaintenanceRecord';
import { Complaint, IComplaint } from '../models/Complaint';
import { Recommendation, IRecommendation, RecommendationType, RecommendationPriority } from '../models/Recommendation';

export interface ScoreFactor {
  factor: string;
  impact: number;
  description: string;
}

export type HealthCategory = 'Healthy' | 'Needs Attention' | 'At Risk' | 'Critical';

export interface AssetHealthAssessment {
  assetId: string;
  assetCode: string;
  assetName: string;
  building: string;
  room: string;
  score: number;
  category: HealthCategory;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  hasLimitedData: boolean;
  factors: ScoreFactor[];
  activeComplaintsCount: number;
  closedComplaintsCount: number;
  overdueTasksCount: number;
  completedTasksCount: number;
  underWarranty: boolean;
  warrantyExpiryDate?: Date;
  status: string;
  condition: string;
  evaluatedAt: Date;
}

export interface HotspotLocation {
  building: string;
  room: string;
  issueType: 'ELECTRICAL' | 'NETWORK' | 'GENERAL';
  incidentCount: number;
  activeCount: number;
  resolvedCount: number;
  lastIncidentDate?: Date;
  sampleTitles: string[];
}

export interface RecurringIssueIntelligence {
  analysisWindowDays: number;
  highestComplaintAssets: {
    assetId: string;
    assetCode: string;
    assetName: string;
    building: string;
    room: string;
    complaintCountInWindow: number;
    activeCount: number;
  }[];
  electricalHotspots: HotspotLocation[];
  networkHotspots: HotspotLocation[];
  frequentRepairAssets: {
    assetId: string;
    assetCode: string;
    assetName: string;
    maintenanceCount: number;
    lastMaintenanceDate?: Date;
    condition: string;
  }[];
  repeatedInRepairAssets: {
    assetId: string;
    assetCode: string;
    assetName: string;
    status: string;
    complaintCount: number;
  }[];
}

/**
 * Deterministic and explainable Asset Health Score Calculation (0 to 100)
 */
export const calculateAssetHealth = (
  asset: IAsset,
  complaints: IComplaint[],
  maintenanceRecords: IMaintenanceRecord[],
  options: { analysisDays?: number } = {}
): AssetHealthAssessment => {
  const analysisDays = options.analysisDays || 60;
  const now = new Date();
  const windowStart = new Date(now.getTime() - analysisDays * 24 * 60 * 60 * 1000);

  let score = 100;
  const factors: ScoreFactor[] = [];

  // Filter complaints within analysis window
  const windowComplaints = complaints.filter(
    (c) => new Date(c.createdAt) >= windowStart
  );

  const activeComplaints = windowComplaints.filter(
    (c) => !['Closed', 'Verified', 'Resolved'].includes(c.status)
  );

  const closedComplaints = complaints.filter(
    (c) => ['Closed', 'Verified', 'Resolved'].includes(c.status)
  );

  const overdueRecords = maintenanceRecords.filter(
    (m) => (m.status === 'OVERDUE' || (m.status === 'SCHEDULED' && new Date(m.scheduledDate) < now))
  );

  const completedRecords = maintenanceRecords.filter(
    (m) => m.status === 'COMPLETED'
  );

  // 1. Physical Condition Factor
  if (asset.condition === 'CRITICAL') {
    score -= 35;
    factors.push({
      factor: 'Critical Physical Condition',
      impact: -35,
      description: 'Asset is designated in CRITICAL physical condition requiring immediate intervention.',
    });
  } else if (asset.condition === 'POOR') {
    score -= 20;
    factors.push({
      factor: 'Poor Physical Condition',
      impact: -20,
      description: 'Asset condition is graded POOR, showing structural wear or degraded reliability.',
    });
  } else if (asset.condition === 'FAIR') {
    score -= 10;
    factors.push({
      factor: 'Fair Physical Condition',
      impact: -10,
      description: 'Asset condition is FAIR with minor operational degradation noted.',
    });
  }

  // 2. Operational Status Factor
  if (asset.status === 'IN_REPAIR') {
    score -= 15;
    factors.push({
      factor: 'Operational Status In Repair',
      impact: -15,
      description: 'Asset is currently non-operational and undergoing repair.',
    });
  } else if (asset.status === 'UNDER_MAINTENANCE') {
    score -= 5;
    factors.push({
      factor: 'Under Scheduled Maintenance',
      impact: -5,
      description: 'Asset is temporarily offline for preventive maintenance.',
    });
  } else if (asset.status === 'DECOMMISSIONED') {
    score = 0;
    factors.push({
      factor: 'Asset Decommissioned',
      impact: -100,
      description: 'Asset is decommissioned from active service.',
    });
  }

  // 3. Active Unresolved Complaints Severity Factor
  let urgentCount = 0;
  let highCount = 0;
  let mediumLowCount = 0;

  for (const c of activeComplaints) {
    if (c.priority === 'Urgent') urgentCount++;
    else if (c.priority === 'High') highCount++;
    else mediumLowCount++;
  }

  if (urgentCount > 0) {
    const penalty = Math.min(30, urgentCount * 15);
    score -= penalty;
    factors.push({
      factor: 'Active Urgent Complaints',
      impact: -penalty,
      description: `${urgentCount} urgent priority complaint(s) currently open and unresolved.`,
    });
  }

  if (highCount > 0) {
    const penalty = Math.min(20, highCount * 10);
    score -= penalty;
    factors.push({
      factor: 'Active High Priority Complaints',
      impact: -penalty,
      description: `${highCount} high priority complaint(s) currently active.`,
    });
  }

  if (mediumLowCount > 0) {
    const penalty = Math.min(15, mediumLowCount * 5);
    score -= penalty;
    factors.push({
      factor: 'Active Standard Complaints',
      impact: -penalty,
      description: `${mediumLowCount} standard active issue ticket(s) currently pending resolution.`,
    });
  }

  // 4. Repeated Incidents Factor
  if (asset.complaintCount >= 2 || windowComplaints.length >= 2) {
    score -= 10;
    factors.push({
      factor: 'Repeated Complaint Frequency',
      impact: -10,
      description: `Asset has accumulated multiple complaints (${asset.complaintCount} total, ${windowComplaints.length} in window), indicating recurring faults.`,
    });
  }

  // 5. Overdue Maintenance Factor
  if (overdueRecords.length > 0) {
    const penalty = Math.min(30, overdueRecords.length * 15);
    score -= penalty;
    factors.push({
      factor: 'Overdue Maintenance Tasks',
      impact: -penalty,
      description: `${overdueRecords.length} scheduled maintenance task(s) have passed their due date without completion.`,
    });
  } else if (asset.nextMaintenanceDate && new Date(asset.nextMaintenanceDate) < now) {
    score -= 10;
    factors.push({
      factor: 'Preventive Maintenance Cycle Overdue',
      impact: -10,
      description: `Asset next preventive maintenance date (${new Date(asset.nextMaintenanceDate).toLocaleDateString()}) has elapsed.`,
    });
  }

  // 6. Frequent Corrective Repairs in Window
  const recentCorrective = maintenanceRecords.filter(
    (m) =>
      ['CORRECTIVE', 'EMERGENCY'].includes(m.maintenanceType) &&
      new Date(m.createdAt) >= windowStart
  );
  if (recentCorrective.length >= 2) {
    score -= 10;
    factors.push({
      factor: 'Repeated Corrective Interventions',
      impact: -10,
      description: `${recentCorrective.length} corrective repairs required in the last ${analysisDays} days, showing component fragility.`,
    });
  }

  // 7. Preventive Hygiene Positive Offset
  const recentCompletedPreventive = maintenanceRecords.filter(
    (m) =>
      m.maintenanceType === 'PREVENTIVE' &&
      m.status === 'COMPLETED' &&
      m.completedDate &&
      new Date(m.completedDate) >= new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  );

  if (recentCompletedPreventive.length > 0 && (asset.condition === 'EXCELLENT' || asset.condition === 'GOOD')) {
    score += 5;
    factors.push({
      factor: 'Recent Preventive Servicing Completed',
      impact: +5,
      description: 'Asset completed routine preventive maintenance with healthy verification.',
    });
  }

  // Strict boundary clamping [0, 100]
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Categorization
  let category: HealthCategory = 'Healthy';
  if (score < 40) {
    category = 'Critical';
  } else if (score < 60) {
    category = 'At Risk';
  } else if (score < 80) {
    category = 'Needs Attention';
  }

  // Historical data sufficiency check
  const totalHistoryCount = complaints.length + maintenanceRecords.length;
  const hasLimitedData = totalHistoryCount === 0;
  let confidence: 'LOW' | 'MEDIUM' | 'HIGH' = 'HIGH';

  if (hasLimitedData) {
    confidence = 'LOW';
    factors.push({
      factor: 'Limited Historical Telemetry',
      impact: 0,
      description: 'Baseline score based primarily on physical condition. No incident or maintenance records logged yet.',
    });
  } else if (totalHistoryCount < 3) {
    confidence = 'MEDIUM';
  }

  const underWarranty = Boolean(asset.warrantyExpiryDate && new Date(asset.warrantyExpiryDate) > now);

  return {
    assetId: asset._id.toString(),
    assetCode: asset.assetCode,
    assetName: asset.assetName,
    building: asset.building,
    room: asset.room,
    score,
    category,
    confidence,
    hasLimitedData,
    factors,
    activeComplaintsCount: activeComplaints.length,
    closedComplaintsCount: closedComplaints.length,
    overdueTasksCount: overdueRecords.length,
    completedTasksCount: completedRecords.length,
    underWarranty,
    warrantyExpiryDate: asset.warrantyExpiryDate,
    status: asset.status,
    condition: asset.condition,
    evaluatedAt: now,
  };
};

/**
 * Analyze real database complaints to identify recurring issue patterns and location hotspots
 */
export const analyzeRecurringIssues = async (
  analysisDays = 60
): Promise<RecurringIssueIntelligence> => {
  const now = new Date();
  const windowStart = new Date(now.getTime() - analysisDays * 24 * 60 * 60 * 1000);

  // 1. Assets with highest complaint frequency
  const assetsWithComplaints = await Asset.find({
    status: { $ne: 'DECOMMISSIONED' },
  }).lean();

  const highestComplaintAssets: any[] = [];
  for (const ast of assetsWithComplaints) {
    const compCount = await Complaint.countDocuments({
      asset: ast._id,
      createdAt: { $gte: windowStart },
    });
    const activeCount = await Complaint.countDocuments({
      asset: ast._id,
      createdAt: { $gte: windowStart },
      status: { $nin: ['Closed', 'Verified', 'Resolved'] },
    });

    if (compCount > 0) {
      highestComplaintAssets.push({
        assetId: ast._id.toString(),
        assetCode: ast.assetCode,
        assetName: ast.assetName,
        building: ast.building,
        room: ast.room,
        complaintCountInWindow: compCount,
        activeCount,
      });
    }
  }

  highestComplaintAssets.sort((a, b) => b.complaintCountInWindow - a.complaintCountInWindow);

  // 2. Electrical Hotspots (by building and room)
  const electricalComplaints = await Complaint.find({
    createdAt: { $gte: windowStart },
    $or: [
      { categoryName: { $regex: /electrical|light|fan|power/i } },
      { assignedDepartment: { $regex: /electrical/i } },
      { title: { $regex: /shock|fuse|voltage|wire|spark/i } },
    ],
  }).lean();

  const electricalMap = new Map<string, { building: string; room: string; total: number; active: number; resolved: number; titles: string[]; lastDate?: Date }>();
  for (const c of electricalComplaints) {
    const b = c.locationDetails?.buildingName || 'Campus';
    const r = c.locationDetails?.roomNumber || 'General';
    const key = `${b}:::${r}`;
    const curr = electricalMap.get(key) || { building: b, room: r, total: 0, active: 0, resolved: 0, titles: [] };
    curr.total++;
    if (['Closed', 'Verified', 'Resolved'].includes(c.status)) {
      curr.resolved++;
    } else {
      curr.active++;
    }
    if (curr.titles.length < 3) curr.titles.push(c.title);
    if (!curr.lastDate || new Date(c.createdAt) > curr.lastDate) {
      curr.lastDate = new Date(c.createdAt);
    }
    electricalMap.set(key, curr);
  }

  const electricalHotspots: HotspotLocation[] = Array.from(electricalMap.values())
    .map((item) => ({
      building: item.building,
      room: item.room,
      issueType: 'ELECTRICAL' as const,
      incidentCount: item.total,
      activeCount: item.active,
      resolvedCount: item.resolved,
      lastIncidentDate: item.lastDate,
      sampleTitles: item.titles,
    }))
    .sort((a, b) => b.incidentCount - a.incidentCount);

  // 3. Network Hotspots
  const networkComplaints = await Complaint.find({
    createdAt: { $gte: windowStart },
    $or: [
      { categoryName: { $regex: /wifi|network|internet|lan/i } },
      { assignedDepartment: { $regex: /it & multimedia/i } },
      { title: { $regex: /wifi|router|offline|disconnect/i } },
    ],
  }).lean();

  const networkMap = new Map<string, { building: string; room: string; total: number; active: number; resolved: number; titles: string[]; lastDate?: Date }>();
  for (const c of networkComplaints) {
    const b = c.locationDetails?.buildingName || 'Campus';
    const r = c.locationDetails?.roomNumber || 'General';
    const key = `${b}:::${r}`;
    const curr = networkMap.get(key) || { building: b, room: r, total: 0, active: 0, resolved: 0, titles: [] };
    curr.total++;
    if (['Closed', 'Verified', 'Resolved'].includes(c.status)) {
      curr.resolved++;
    } else {
      curr.active++;
    }
    if (curr.titles.length < 3) curr.titles.push(c.title);
    if (!curr.lastDate || new Date(c.createdAt) > curr.lastDate) {
      curr.lastDate = new Date(c.createdAt);
    }
    networkMap.set(key, curr);
  }

  const networkHotspots: HotspotLocation[] = Array.from(networkMap.values())
    .map((item) => ({
      building: item.building,
      room: item.room,
      issueType: 'NETWORK' as const,
      incidentCount: item.total,
      activeCount: item.active,
      resolvedCount: item.resolved,
      lastIncidentDate: item.lastDate,
      sampleTitles: item.titles,
    }))
    .sort((a, b) => b.incidentCount - a.incidentCount);

  // 4. Assets frequently repaired within short intervals
  const frequentRepairAssets: any[] = [];
  for (const ast of assetsWithComplaints) {
    const mCount = await MaintenanceRecord.countDocuments({
      asset: ast._id,
      createdAt: { $gte: windowStart },
    });
    if (mCount >= 2) {
      frequentRepairAssets.push({
        assetId: ast._id.toString(),
        assetCode: ast.assetCode,
        assetName: ast.assetName,
        maintenanceCount: mCount,
        lastMaintenanceDate: ast.lastMaintenanceDate,
        condition: ast.condition,
      });
    }
  }

  // 5. Assets in repair
  const inRepairAssets = await Asset.find({
    status: 'IN_REPAIR',
  })
    .select('assetCode assetName status complaintCount')
    .lean();

  const repeatedInRepairAssets = inRepairAssets.map((ast) => ({
    assetId: ast._id.toString(),
    assetCode: ast.assetCode,
    assetName: ast.assetName,
    status: ast.status,
    complaintCount: ast.complaintCount,
  }));

  return {
    analysisWindowDays: analysisDays,
    highestComplaintAssets: highestComplaintAssets.slice(0, 10),
    electricalHotspots: electricalHotspots.slice(0, 8),
    networkHotspots: networkHotspots.slice(0, 8),
    frequentRepairAssets,
    repeatedInRepairAssets,
  };
};

/**
 * Generate explainable, rule-based maintenance recommendations for a specific asset
 */
export const evaluateAssetRecommendations = async (
  asset: IAsset,
  complaints: IComplaint[],
  maintenanceRecords: IMaintenanceRecord[],
  assessment: AssetHealthAssessment
): Promise<IRecommendation[]> => {
  const generated: IRecommendation[] = [];
  const now = new Date();

  // Helper for stable deduplication
  const ensureUniqueRecommendation = async (
    ruleType: RecommendationType,
    priority: RecommendationPriority,
    title: string,
    explanation: string,
    suggestedAction: string,
    evidence: string[],
    relatedCompIds: any[],
    relatedMaintIds: any[]
  ) => {
    // Check if an open/active recommendation already exists for this asset & ruleType
    const existing = await Recommendation.findOne({
      asset: asset._id,
      recommendationType: ruleType,
      status: { $in: ['OPEN', 'REVIEWED', 'TASK_CREATED'] },
    });

    if (existing) {
      // Avoid duplicate creation; update existing evidence & score
      existing.evidence = evidence;
      existing.healthScoreAtCreation = assessment.score;
      await existing.save();
      return existing;
    }

    const year = now.getFullYear();
    const rand = `${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`;
    const recommendationCode = `REC-${year}-${rand}`;

    const newRec = await Recommendation.create({
      recommendationCode,
      asset: asset._id,
      assetCode: asset.assetCode,
      assetName: asset.assetName,
      recommendationType: ruleType,
      priority,
      title,
      explanation,
      suggestedAction,
      evidence,
      relatedComplaints: relatedCompIds,
      relatedMaintenanceRecords: relatedMaintIds,
      assignedDepartment: asset.assignedDepartment || 'General Maintenance',
      assignedStaff: asset.assignedStaff,
      status: 'OPEN',
      healthScoreAtCreation: assessment.score,
    });

    return newRec;
  };

  // Rule 1: CRITICAL_CONDITION
  if (asset.condition === 'CRITICAL') {
    const rec = await ensureUniqueRecommendation(
      'CRITICAL_CONDITION',
      'URGENT',
      `Immediate Overhaul Inspection Required: ${asset.assetName}`,
      `Asset condition is graded CRITICAL with a calculated Health Score of ${assessment.score}/100. Physical integrity or core component reliability is compromised.`,
      `Arrange an immediate diagnostic inspection by senior technicians and take asset offline if electrical/physical hazard exists.`,
      [
        `Asset condition: CRITICAL`,
        `Asset Health Score: ${assessment.score}/100`,
        `Current operational status: ${asset.status}`,
      ],
      complaints.slice(0, 3).map((c) => c._id),
      maintenanceRecords.slice(0, 2).map((m) => m._id)
    );
    if (rec) generated.push(rec);
  }

  // Rule 2: OVERDUE_PREVENTIVE
  const hasOverdueRecord = maintenanceRecords.some(
    (m) => m.status === 'OVERDUE' || (m.status === 'SCHEDULED' && new Date(m.scheduledDate) < now)
  );
  const isCalendarOverdue = asset.nextMaintenanceDate && new Date(asset.nextMaintenanceDate) < now;

  if (hasOverdueRecord || isCalendarOverdue) {
    const overdueMaintIds = maintenanceRecords
      .filter((m) => m.status === 'OVERDUE' || (m.status === 'SCHEDULED' && new Date(m.scheduledDate) < now))
      .map((m) => m._id);

    const rec = await ensureUniqueRecommendation(
      'OVERDUE_PREVENTIVE',
      'HIGH',
      `Schedule Overdue Preventive Maintenance: ${asset.assetCode}`,
      `Configured preventive maintenance frequency (${asset.maintenanceFrequencyDays} days) has been breached. Delayed servicing risks sudden equipment failure.`,
      `Schedule and assign the overdue preventive maintenance task immediately to restore servicing interval compliance.`,
      [
        `Target maintenance date: ${asset.nextMaintenanceDate ? new Date(asset.nextMaintenanceDate).toLocaleDateString() : 'Unspecified'}`,
        `Maintenance frequency interval: Every ${asset.maintenanceFrequencyDays || 90} days`,
        `Overdue maintenance tasks logged: ${overdueMaintIds.length}`,
      ],
      [],
      overdueMaintIds
    );
    if (rec) generated.push(rec);
  }

  // Rule 3: RECURRING_ELECTRICAL
  const electricalTickets = complaints.filter(
    (c) =>
      /electrical|power|voltage|fuse|spark|fan|light/i.test(`${c.categoryName} ${c.title}`) ||
      c.assignedDepartment?.toLowerCase().includes('electrical')
  );

  if (electricalTickets.length >= 2) {
    const rec = await ensureUniqueRecommendation(
      'RECURRING_ELECTRICAL',
      'HIGH',
      `Electrical Circuit & Component Diagnostic: ${asset.assetCode}`,
      `Asset has accumulated ${electricalTickets.length} electrical issue complaints in ${asset.building}, ${asset.room}. Repeated symptoms indicate internal power supply instability or external surge damage.`,
      `Inspect internal wiring, power capacitor health, ground earthing resistance, and room electrical panel breaker.`,
      [
        `Cumulative electrical issue tickets: ${electricalTickets.length}`,
        `Location: ${asset.building} - ${asset.floor} - ${asset.room}`,
        `Recent ticket references: ${electricalTickets.slice(0, 3).map((t) => t.ticketId).join(', ')}`,
      ],
      electricalTickets.map((c) => c._id),
      []
    );
    if (rec) generated.push(rec);
  }

  // Rule 4: RECURRING_NETWORK
  const networkTickets = complaints.filter(
    (c) =>
      /wifi|network|router|connectivity|lan|switch/i.test(`${c.categoryName} ${c.title}`) ||
      c.assignedDepartment?.toLowerCase().includes('it')
  );

  if (networkTickets.length >= 2 && (asset.assetType === 'NETWORK_ROUTER' || /network|it/i.test(asset.category))) {
    const rec = await ensureUniqueRecommendation(
      'RECURRING_NETWORK',
      'MEDIUM',
      `Network Backbone & Port Stability Diagnostic: ${asset.assetCode}`,
      `Asset has experienced ${networkTickets.length} recurring network disruption complaints. Connectivity dropping intermittently under load suggests port CRC errors or firmware deadlock.`,
      `Inspect physical patch cable terminations, verify PoE wattage allocation, check uplink port error counters, and update device firmware.`,
      [
        `Network failure complaints recorded: ${networkTickets.length}`,
        `Installed Location: ${asset.building} • ${asset.room}`,
        `Recent tickets: ${networkTickets.slice(0, 3).map((t) => t.ticketId).join(', ')}`,
      ],
      networkTickets.map((c) => c._id),
      []
    );
    if (rec) generated.push(rec);
  }

  // Rule 5: POST_REPAIR_FAILURE (Failure shortly after repair)
  const recentCompletedMaint = maintenanceRecords.filter(
    (m) => m.status === 'COMPLETED' && m.completedDate && new Date(m.completedDate) >= new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000)
  );

  for (const m of recentCompletedMaint) {
    if (!m.completedDate) continue;
    const postRepairComplaints = complaints.filter(
      (c) =>
        new Date(c.createdAt) > new Date(m.completedDate!) &&
        new Date(c.createdAt).getTime() - new Date(m.completedDate!).getTime() <= 14 * 24 * 60 * 60 * 1000
    );

    if (postRepairComplaints.length > 0) {
      const rec = await ensureUniqueRecommendation(
        'POST_REPAIR_FAILURE',
        'HIGH',
        `Conduct Root-Cause Diagnostic (Failure Shortly After Repair): ${asset.assetCode}`,
        `A new complaint (${postRepairComplaints[0].ticketId}) was raised within 14 days of maintenance completion (${m.recordId}). Repeating standard corrective repair without investigating root failure mechanism is ineffective.`,
        `Conduct a root-cause inspection of the primary sub-assembly instead of repeating symptomatic part replacement.`,
        [
          `Maintenance record: ${m.recordId} completed on ${new Date(m.completedDate).toLocaleDateString()}`,
          `Subsequent complaint: ${postRepairComplaints[0].ticketId} filed on ${new Date(postRepairComplaints[0].createdAt).toLocaleDateString()}`,
          `Work previously done: ${m.workDescription}`,
        ],
        postRepairComplaints.map((c) => c._id),
        [m._id]
      );
      if (rec) generated.push(rec);
      break;
    }
  }

  // Rule 6: WARRANTY_ELIGIBLE
  const underWarranty = Boolean(asset.warrantyExpiryDate && new Date(asset.warrantyExpiryDate) > now);
  const hasOpenIssueOrRepair = complaints.some((c) => !['Closed', 'Verified', 'Resolved'].includes(c.status)) || asset.status === 'IN_REPAIR';

  if (underWarranty && hasOpenIssueOrRepair) {
    const rec = await ensureUniqueRecommendation(
      'WARRANTY_ELIGIBLE',
      'MEDIUM',
      `Check Active Manufacturer Warranty Eligibility: ${asset.assetCode}`,
      `Asset currently requires repair or has active complaints, but remains under official manufacturer warranty until ${new Date(asset.warrantyExpiryDate!).toLocaleDateString()}.`,
      `Verify warranty claim coverage with supplier ${asset.manufacturer || 'OEM'} before authorizing institutional departmental maintenance budget.`,
      [
        `Warranty valid until: ${new Date(asset.warrantyExpiryDate!).toLocaleDateString()}`,
        `Manufacturer / Brand: ${asset.manufacturer || 'OEM'}`,
        `Model Number: ${asset.modelNumber || 'Standard'}`,
        `Serial Number: ${asset.serialNumber || 'N/A'}`,
      ],
      complaints.slice(0, 2).map((c) => c._id),
      []
    );
    if (rec) generated.push(rec);
  }

  // Rule 7: ROUTINE_INSPECTION
  if (
    assessment.hasLimitedData &&
    asset.status === 'ACTIVE' &&
    (!asset.lastMaintenanceDate || new Date(asset.lastMaintenanceDate) < new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000))
  ) {
    const rec = await ensureUniqueRecommendation(
      'ROUTINE_INSPECTION',
      'LOW',
      `Establish Routine Inspection Baseline: ${asset.assetCode}`,
      `Asset currently has no incident or maintenance history. Establishing an initial inspection baseline ensures preventive logging accuracy.`,
      `Perform routine physical and functional checklist inspection during the next departmental walkthrough.`,
      [
        `Zero incident history on record`,
        `Baseline operational status: ${asset.status}`,
        `Assigned location: ${asset.building} • ${asset.room}`,
      ],
      [],
      []
    );
    if (rec) generated.push(rec);
  }

  return generated;
};

/**
 * Execute full maintenance intelligence evaluation across all registered campus assets
 */
export const runFullIntelligenceEvaluation = async () => {
  const assets = await Asset.find({ status: { $ne: 'DECOMMISSIONED' } });
  const assessments: AssetHealthAssessment[] = [];
  let newRecommendationsCount = 0;

  for (const asset of assets) {
    const complaints = await Complaint.find({ asset: asset._id }).sort({ createdAt: -1 });
    const records = await MaintenanceRecord.find({ asset: asset._id }).sort({ scheduledDate: -1 });

    const assessment = calculateAssetHealth(asset, complaints, records);
    assessments.push(assessment);

    const recommendations = await evaluateAssetRecommendations(asset, complaints, records, assessment);
    newRecommendationsCount += recommendations.length;
  }

  return {
    totalEvaluated: assets.length,
    assessments,
    recommendationsCount: newRecommendationsCount,
    timestamp: new Date(),
  };
};

/**
 * Overall Intelligence Analytics summary
 */
export const getIntelligenceMetrics = async () => {
  const assets = await Asset.find({ status: { $ne: 'DECOMMISSIONED' } });
  let healthy = 0;
  let needsAttention = 0;
  let atRisk = 0;
  let critical = 0;
  let recurringCount = 0;

  const now = new Date();

  for (const asset of assets) {
    const complaints = await Complaint.find({ asset: asset._id });
    const records = await MaintenanceRecord.find({ asset: asset._id });
    const assessment = calculateAssetHealth(asset, complaints, records);

    if (assessment.category === 'Healthy') healthy++;
    else if (assessment.category === 'Needs Attention') needsAttention++;
    else if (assessment.category === 'At Risk') atRisk++;
    else if (assessment.category === 'Critical') critical++;

    if (asset.complaintCount >= 2) recurringCount++;
  }

  const [
    totalRecommendations,
    openRecommendations,
    reviewedRecommendations,
    taskCreatedRecommendations,
    addressedRecommendations,
    dismissedRecommendations,
    overdueTasks,
  ] = await Promise.all([
    Recommendation.countDocuments(),
    Recommendation.countDocuments({ status: 'OPEN' }),
    Recommendation.countDocuments({ status: 'REVIEWED' }),
    Recommendation.countDocuments({ status: 'TASK_CREATED' }),
    Recommendation.countDocuments({ status: 'ADDRESSED' }),
    Recommendation.countDocuments({ status: 'DISMISSED' }),
    MaintenanceRecord.countDocuments({
      status: { $in: ['OVERDUE', 'SCHEDULED'] },
      scheduledDate: { $lt: now },
    }),
  ]);

  return {
    totalAssets: assets.length,
    healthDistribution: {
      healthy,
      needsAttention,
      atRisk,
      critical,
    },
    recurringComplaintAssets: recurringCount,
    overdueTasks,
    recommendationsSummary: {
      total: totalRecommendations,
      open: openRecommendations,
      reviewed: reviewedRecommendations,
      taskCreated: taskCreatedRecommendations,
      addressed: addressedRecommendations,
      dismissed: dismissedRecommendations,
    },
  };
};
