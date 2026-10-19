import { Schema, model, Document, Types } from 'mongoose';

export type EmergencySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM';
export type EmergencyStatus = 'REPORTED' | 'ACKNOWLEDGED' | 'DISPATCHED' | 'RESOLVED' | 'FALSE_ALARM';

export interface ISMSDispatchRecord {
  recipientPhone: string;
  recipientName: string;
  providerMessageId: string;
  status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'UNDELIVERED' | 'FAILED' | 'SIMULATED_DEV' | 'UNAVAILABLE_NO_GATEWAY';
  dispatchedAt: Date;
  deliveredAt?: Date;
  errorMessage?: string;
}

export interface IIncidentTimeline {
  status: EmergencyStatus;
  action: string;
  performedBy?: Types.ObjectId;
  performedByName: string;
  timestamp: Date;
  notes?: string;
}

export interface IEmergencyIncident extends Document {
  incidentCode: string;
  title: string;
  description: string;
  category: string;
  severity: EmergencySeverity;
  location: Types.ObjectId;
  locationName: string;
  locationPath?: string;
  reportedBy?: Types.ObjectId;
  reportedByName: string;
  reporterPhone?: string;
  isAnonymous: boolean;
  assignedTeam?: string;
  status: EmergencyStatus;
  acknowledgedBy?: Types.ObjectId;
  acknowledgedByName?: string;
  acknowledgedAt?: Date;
  resolvedBy?: Types.ObjectId;
  resolvedByName?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
  smsDispatches: ISMSDispatchRecord[];
  timeline: IIncidentTimeline[];
  linkedComplaintId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const emergencyIncidentSchema = new Schema<IEmergencyIncident>(
  {
    incidentCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      trim: true,
      default: 'EMERGENCY_SAFETY',
    },
    severity: {
      type: String,
      enum: ['CRITICAL', 'HIGH', 'MEDIUM'],
      default: 'HIGH',
    },
    location: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
    },
    locationName: { type: String, required: true, trim: true },
    locationPath: { type: String, trim: true },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reportedByName: { type: String, default: 'Campus Member' },
    reporterPhone: { type: String, trim: true },
    isAnonymous: { type: Boolean, default: false },
    assignedTeam: {
      type: String,
      default: 'Security & Rapid Response Desk',
    },
    status: {
      type: String,
      enum: ['REPORTED', 'ACKNOWLEDGED', 'DISPATCHED', 'RESOLVED', 'FALSE_ALARM'],
      default: 'REPORTED',
    },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    acknowledgedByName: { type: String },
    acknowledgedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedByName: { type: String },
    resolvedAt: { type: Date },
    resolutionNotes: { type: String, trim: true },
    smsDispatches: [
      {
        recipientPhone: { type: String, required: true },
        recipientName: { type: String, required: true },
        providerMessageId: { type: String, required: true },
        status: {
          type: String,
          enum: [
            'QUEUED',
            'SENT',
            'DELIVERED',
            'UNDELIVERED',
            'FAILED',
            'SIMULATED_DEV',
            'UNAVAILABLE_NO_GATEWAY',
          ],
          default: 'SENT',
        },
        dispatchedAt: { type: Date, default: Date.now },
        deliveredAt: { type: Date },
        errorMessage: { type: String },
      },
    ],
    timeline: [
      {
        status: { type: String, required: true },
        action: { type: String, required: true },
        performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        performedByName: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        notes: { type: String },
      },
    ],
    linkedComplaintId: {
      type: Schema.Types.ObjectId,
      ref: 'Complaint',
      default: null,
    },
  },
  { timestamps: true }
);

emergencyIncidentSchema.index({ incidentCode: 1 }, { unique: true });
emergencyIncidentSchema.index({ status: 1, severity: 1, createdAt: -1 });
emergencyIncidentSchema.index({ location: 1 });

export const EmergencyIncident = model<IEmergencyIncident>(
  'EmergencyIncident',
  emergencyIncidentSchema
);
