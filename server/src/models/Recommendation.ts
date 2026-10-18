import { Schema, model, Document, Types } from 'mongoose';

export type RecommendationType =
  | 'CRITICAL_CONDITION'
  | 'OVERDUE_PREVENTIVE'
  | 'RECURRING_ELECTRICAL'
  | 'RECURRING_NETWORK'
  | 'POST_REPAIR_FAILURE'
  | 'WARRANTY_ELIGIBLE'
  | 'ROUTINE_INSPECTION';

export type RecommendationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type RecommendationStatus =
  | 'OPEN'
  | 'REVIEWED'
  | 'TASK_CREATED'
  | 'ADDRESSED'
  | 'DISMISSED';

export interface IRecommendation extends Document {
  recommendationCode: string;
  asset: Types.ObjectId;
  assetCode: string;
  assetName: string;
  recommendationType: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  explanation: string;
  evidence: string[];
  suggestedAction: string;
  relatedComplaints: Types.ObjectId[];
  relatedMaintenanceRecords: Types.ObjectId[];
  assignedDepartment?: string;
  assignedStaff?: Types.ObjectId;
  linkedMaintenanceRecord?: Types.ObjectId;
  status: RecommendationStatus;
  healthScoreAtCreation: number;
  reviewedBy?: Types.ObjectId;
  reviewedByName?: string;
  reviewedAt?: Date;
  resolvedAt?: Date;
  dismissalReason?: string;
  dismissedBy?: Types.ObjectId;
  dismissedByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const recommendationSchema = new Schema<IRecommendation>(
  {
    recommendationCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    asset: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
    },
    assetCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    assetName: {
      type: String,
      required: true,
      trim: true,
    },
    recommendationType: {
      type: String,
      enum: [
        'CRITICAL_CONDITION',
        'OVERDUE_PREVENTIVE',
        'RECURRING_ELECTRICAL',
        'RECURRING_NETWORK',
        'POST_REPAIR_FAILURE',
        'WARRANTY_ELIGIBLE',
        'ROUTINE_INSPECTION',
      ],
      required: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    explanation: {
      type: String,
      required: true,
      trim: true,
    },
    evidence: [{ type: String }],
    suggestedAction: {
      type: String,
      required: true,
      trim: true,
    },
    relatedComplaints: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Complaint',
      },
    ],
    relatedMaintenanceRecords: [
      {
        type: Schema.Types.ObjectId,
        ref: 'MaintenanceRecord',
      },
    ],
    assignedDepartment: {
      type: String,
      trim: true,
    },
    assignedStaff: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    linkedMaintenanceRecord: {
      type: Schema.Types.ObjectId,
      ref: 'MaintenanceRecord',
    },
    status: {
      type: String,
      enum: ['OPEN', 'REVIEWED', 'TASK_CREATED', 'ADDRESSED', 'DISMISSED'],
      default: 'OPEN',
      required: true,
    },
    healthScoreAtCreation: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedByName: {
      type: String,
      trim: true,
    },
    reviewedAt: {
      type: Date,
    },
    resolvedAt: {
      type: Date,
    },
    dismissalReason: {
      type: String,
      trim: true,
    },
    dismissedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    dismissedByName: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for query performance and deduplication
recommendationSchema.index({ asset: 1, recommendationType: 1, status: 1 });
recommendationSchema.index({ status: 1, priority: 1 });
recommendationSchema.index({ assignedDepartment: 1, status: 1 });
recommendationSchema.index({ createdAt: -1 });

export const Recommendation = model<IRecommendation>('Recommendation', recommendationSchema);
