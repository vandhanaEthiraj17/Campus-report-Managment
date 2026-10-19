import { Schema, model, Document, Types } from 'mongoose';

export type MaintenanceType = 'PREVENTIVE' | 'CORRECTIVE' | 'INSPECTION' | 'EMERGENCY';

export type MaintenanceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';

export interface IMaintenanceRecord extends Document {
  recordId: string;
  asset: Types.ObjectId;
  assetCode: string;
  assetName: string;
  maintenanceType: MaintenanceType;
  scheduledDate: Date;
  completedDate?: Date;
  assignedStaff?: Types.ObjectId;
  assignedStaffName?: string;
  assignedDepartment?: string;
  workDescription: string;
  partsReplaced?: string;
  labourCost: number;
  partsCost: number;
  otherExpenses: number;
  cost: number;
  relatedComplaint?: Types.ObjectId;
  conditionAfter?: string;
  beforeImages: string[];
  afterImages: string[];
  status: MaintenanceStatus;
  notes?: string;
  reminderSent: boolean;
  createdBy?: Types.ObjectId | string;
  updatedBy?: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const maintenanceRecordSchema = new Schema<IMaintenanceRecord>(
  {
    recordId: {
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
    maintenanceType: {
      type: String,
      enum: ['PREVENTIVE', 'CORRECTIVE', 'INSPECTION', 'EMERGENCY'],
      default: 'PREVENTIVE',
      required: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    completedDate: {
      type: Date,
    },
    assignedStaff: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedStaffName: {
      type: String,
      trim: true,
    },
    assignedDepartment: {
      type: String,
      trim: true,
    },
    workDescription: {
      type: String,
      required: true,
      trim: true,
    },
    partsReplaced: {
      type: String,
      trim: true,
    },
    labourCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    partsCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    otherExpenses: {
      type: Number,
      default: 0,
      min: 0,
    },
    cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    relatedComplaint: {
      type: Schema.Types.ObjectId,
      ref: 'Complaint',
    },
    conditionAfter: {
      type: String,
      enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL'],
    },
    beforeImages: [{ type: String }],
    afterImages: [{ type: String }],
    status: {
      type: String,
      enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE'],
      default: 'SCHEDULED',
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// High-speed query indexes
maintenanceRecordSchema.index({ asset: 1, status: 1 });
maintenanceRecordSchema.index({ scheduledDate: 1, status: 1 });
maintenanceRecordSchema.index({ assignedStaff: 1 });
maintenanceRecordSchema.index({ assignedDepartment: 1 });

export const MaintenanceRecord = model<IMaintenanceRecord>('MaintenanceRecord', maintenanceRecordSchema);
