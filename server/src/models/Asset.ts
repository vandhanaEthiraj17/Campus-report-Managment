import { Schema, model, Document, Types } from 'mongoose';

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

export type AssetStatus = 
  | 'ACTIVE'
  | 'IN_REPAIR'
  | 'UNDER_MAINTENANCE'
  | 'DECOMMISSIONED';

export type AssetCondition = 
  | 'EXCELLENT'
  | 'GOOD'
  | 'FAIR'
  | 'POOR'
  | 'CRITICAL';

export interface IAsset extends Document {
  assetCode: string;
  assetName: string;
  assetType: AssetType;
  category: string;
  description?: string;
  building: string;
  floor: string;
  room: string;
  location?: Types.ObjectId;
  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;
  installationDate?: Date;
  warrantyExpiryDate?: Date;
  purchaseDate?: Date;
  purchaseCost?: number;
  expectedLifespanYears?: number;
  totalMaintenanceCost: number;
  status: AssetStatus;
  condition: AssetCondition;
  maintenanceFrequencyDays: number;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  assignedDepartment?: string;
  assignedStaff?: Types.ObjectId;
  complaintCount: number;
  lastReminderSentAt?: Date;
  createdBy?: Types.ObjectId | string;
  updatedBy?: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const assetSchema = new Schema<IAsset>(
  {
    assetCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    assetName: {
      type: String,
      required: true,
      trim: true,
    },
    assetType: {
      type: String,
      enum: [
        'PROJECTOR',
        'AIR_CONDITIONER',
        'LAB_EQUIPMENT',
        'ELECTRICAL_PANEL',
        'WATER_PURIFIER',
        'FURNITURE',
        'NETWORK_ROUTER',
        'GENERATOR',
        'OTHER',
      ],
      default: 'OTHER',
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    building: {
      type: String,
      required: true,
      trim: true,
    },
    floor: {
      type: String,
      required: true,
      trim: true,
    },
    room: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
    },
    manufacturer: {
      type: String,
      trim: true,
    },
    modelNumber: {
      type: String,
      trim: true,
    },
    serialNumber: {
      type: String,
      trim: true,
    },
    installationDate: {
      type: Date,
    },
    warrantyExpiryDate: {
      type: Date,
    },
    purchaseDate: {
      type: Date,
    },
    purchaseCost: {
      type: Number,
      min: 0,
    },
    expectedLifespanYears: {
      type: Number,
      min: 1,
    },
    totalMaintenanceCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'IN_REPAIR', 'UNDER_MAINTENANCE', 'DECOMMISSIONED'],
      default: 'ACTIVE',
    },
    condition: {
      type: String,
      enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL'],
      default: 'GOOD',
    },
    maintenanceFrequencyDays: {
      type: Number,
      default: 90,
      min: 1,
    },
    lastMaintenanceDate: {
      type: Date,
    },
    nextMaintenanceDate: {
      type: Date,
    },
    assignedDepartment: {
      type: String,
      trim: true,
    },
    assignedStaff: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    complaintCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastReminderSentAt: {
      type: Date,
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

// Indexes for high-performance dashboard queries and filtering
assetSchema.index({ building: 1, floor: 1, room: 1 });
assetSchema.index({ status: 1, condition: 1 });
assetSchema.index({ nextMaintenanceDate: 1 });
assetSchema.index({ category: 1 });
assetSchema.index({ complaintCount: -1 });

export const Asset = model<IAsset>('Asset', assetSchema);
