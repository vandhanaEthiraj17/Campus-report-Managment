export type UserRole = 'STUDENT' | 'FACULTY' | 'STAFF' | 'ADMIN';

export type ComplaintStatus =
  | 'Reported'
  | 'Assigned'
  | 'Accepted'
  | 'In Progress'
  | 'Resolved'
  | 'Verified'
  | 'Closed'
  | 'Escalated';

export type ComplaintPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface IUser {
  id?: string;
  _id?: string;
  name: string;
  identifier?: string;
  registerNumber?: string;
  facultyId?: string;
  email: string;
  role: UserRole;
  department?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface ILocation {
  _id: string;
  buildingName: string;
  floor: string;
  roomNumber: string;
}

export interface ICategory {
  _id: string;
  name: string;
  description?: string;
  icon: string;
  defaultDepartment: string;
  defaultSLAHours: number;
}

export interface IDepartment {
  _id: string;
  name: string;
  code: string;
  headName: string;
  contactPhone: string;
}

export interface ITimelineEvent {
  status: ComplaintStatus;
  updatedBy?: IUser | string;
  updatedByName?: string;
  timestamp: string;
  remarks?: string;
}

export interface IFeedback {
  rating: number;
  comment?: string;
  submittedAt: string;
}

export interface IComplaint {
  _id: string;
  ticketId: string;
  complaintId?: string;
  title: string;
  description: string;
  category: ICategory | string;
  categoryName?: string;
  location: ILocation | string;
  locationDetails: {
    buildingName: string;
    floor: string;
    roomNumber: string;
  };
  reportedBy: IUser | string;
  reporterUserId?: string;
  reportedByName?: string;
  isAnonymous?: boolean;
  reporterRole?: string;
  voiceTranscription?: string;
  imageUrls?: string[];
  upvotes: string[];
  status: ComplaintStatus;
  priority: ComplaintPriority;
  assignedDepartment?: string;
  assignedStaff?: IUser | string;
  assignedStaffName?: string;
  beforeImages: string[];
  afterImages: string[];
  resolutionNotes?: string;
  feedback?: IFeedback;
  slaDueDate?: string;
  isEscalated: boolean;
  isEmergency?: boolean;
  emergencyAlertSent?: boolean;
  emergencyRecipients?: string[];
  emergencySentAt?: string;
  asset?: IAsset | string;
  assetCode?: string;
  assetName?: string;
  timeline: ITimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export type AssetType = 
  | 'PROJECTOR'
  | 'AIR_CONDITIONER'
  | 'LAB_EQUIPMENT'
  | 'ELECTRICAL_PANEL'
  | 'WATER_PURIFIER'
  | 'FURNITURE'
  | 'NETWORK_ROUTER'
  | 'GENERATOR'
  | 'OTHER';

export type AssetStatus = 'ACTIVE' | 'IN_REPAIR' | 'UNDER_MAINTENANCE' | 'DECOMMISSIONED';

export type AssetCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';

export interface IAsset {
  _id: string;
  assetCode: string;
  assetName: string;
  assetType: AssetType;
  category: string;
  description?: string;
  building: string;
  floor: string;
  room: string;
  location?: ILocation | string;
  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;
  installationDate?: string;
  warrantyExpiryDate?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  expectedLifespanYears?: number;
  totalMaintenanceCost?: number;
  status: AssetStatus;
  condition: AssetCondition;
  maintenanceFrequencyDays: number;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  assignedDepartment?: string;
  assignedStaff?: IUser | string;
  complaintCount: number;
  lastReminderSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type MaintenanceType = 'PREVENTIVE' | 'CORRECTIVE' | 'INSPECTION' | 'EMERGENCY';

export type MaintenanceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';

export interface IMaintenanceRecord {
  _id: string;
  recordId: string;
  asset: IAsset | string;
  assetCode: string;
  assetName: string;
  maintenanceType: MaintenanceType;
  scheduledDate: string;
  completedDate?: string;
  assignedStaff?: IUser | string;
  assignedStaffName?: string;
  assignedDepartment?: string;
  workDescription: string;
  partsReplaced?: string;
  labourCost?: number;
  partsCost?: number;
  otherExpenses?: number;
  cost: number;
  relatedComplaint?: any;
  conditionAfter?: string;
  beforeImages: string[];
  afterImages: string[];
  status: MaintenanceStatus;
  notes?: string;
  reminderSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IAssetAnalytics {
  totalAssets: number;
  activeAssets: number;
  maintenanceNeeded: number;
  overdueTasks: number;
  repeatedComplaints: number;
  underWarranty: number;
  expiredWarranty: number;
  totalMaintenanceRecords: number;
  completedMaintenanceRecords: number;
  maintenanceCompletionRate: number;
  categoryDemand: { category: string; totalAssets: number; totalComplaints: number }[];
  buildingDemand: { building: string; assetCount: number; totalComplaints: number; maintenanceDue: number }[];
  conditionBreakdown: { _id: string; count: number }[];
}

export interface IAnalyticsOverview {
  metrics: {
    totalComplaints: number;
    anonymousCount?: number;
    reportedCount: number;
    inProgressCount: number;
    resolvedCount: number;
    closedCount: number;
    escalatedCount: number;
  };
  categoryStats: { _id: string; count: number }[];
  buildingStats: { _id: string; count: number }[];
  priorityStats: { _id: string; count: number }[];
  staffWorkload: {
    _id: string;
    name: string;
    email: string;
    department: string;
    activeCount: number;
    totalCompleted: number;
  }[];
}

export type HealthCategory = 'Healthy' | 'Needs Attention' | 'At Risk' | 'Critical';

export interface IScoreFactor {
  factor: string;
  impact: number;
  description: string;
}

export interface IAssetHealth {
  assetId: string;
  assetCode: string;
  assetName: string;
  building: string;
  room: string;
  score: number;
  category: HealthCategory;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  hasLimitedData: boolean;
  factors: IScoreFactor[];
  activeComplaintsCount: number;
  closedComplaintsCount: number;
  overdueTasksCount: number;
  completedTasksCount: number;
  underWarranty: boolean;
  warrantyExpiryDate?: string;
  status: string;
  condition: string;
  evaluatedAt: string;
}

export type RecommendationType =
  | 'CRITICAL_CONDITION'
  | 'OVERDUE_PREVENTIVE'
  | 'RECURRING_ELECTRICAL'
  | 'RECURRING_NETWORK'
  | 'POST_REPAIR_FAILURE'
  | 'WARRANTY_ELIGIBLE'
  | 'ROUTINE_INSPECTION';

export type RecommendationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type RecommendationStatus = 'OPEN' | 'REVIEWED' | 'TASK_CREATED' | 'ADDRESSED' | 'DISMISSED';

export interface IRecommendation {
  _id: string;
  recommendationCode: string;
  asset: IAsset | string;
  assetCode: string;
  assetName: string;
  recommendationType: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  explanation: string;
  evidence: string[];
  suggestedAction: string;
  relatedComplaints: any[];
  relatedMaintenanceRecords: any[];
  assignedDepartment?: string;
  assignedStaff?: IUser | string;
  linkedMaintenanceRecord?: any;
  status: RecommendationStatus;
  healthScoreAtCreation: number;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  resolvedAt?: string;
  dismissalReason?: string;
  dismissedBy?: string;
  dismissedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IIntelligenceOverview {
  totalAssets: number;
  healthDistribution: {
    healthy: number;
    needsAttention: number;
    atRisk: number;
    critical: number;
  };
  recurringComplaintAssets: number;
  overdueTasks: number;
  recommendationsSummary: {
    total: number;
    open: number;
    reviewed: number;
    taskCreated: number;
    addressed: number;
    dismissed: number;
  };
}

export interface IHotspotLocation {
  building: string;
  room: string;
  issueType: 'ELECTRICAL' | 'NETWORK' | 'GENERAL';
  incidentCount: number;
  activeCount: number;
  resolvedCount: number;
  lastIncidentDate?: string;
  sampleTitles: string[];
}

export interface IRecurringIntelligence {
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
  electricalHotspots: IHotspotLocation[];
  networkHotspots: IHotspotLocation[];
  frequentRepairAssets: {
    assetId: string;
    assetCode: string;
    assetName: string;
    maintenanceCount: number;
    lastMaintenanceDate?: string;
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

export interface IMaintenanceCostAnalytics {
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

export interface IAssetLifecycleSummary {
  assetId: string;
  assetCode: string;
  assetName: string;
  category: string;
  building: string;
  floor: string;
  room: string;
  status: string;
  condition: string;
  purchaseDate?: string;
  installationDate?: string;
  warrantyExpiryDate?: string;
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
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  healthScore: number;
  healthCategory: string;
  costToPurchaseRatioPercent: number | null;
  underWarranty: boolean;
}

export interface ILifecycleAssessmentItem {
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

export interface ISustainabilityMetrics {
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


