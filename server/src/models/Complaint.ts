import { Schema, model, Document, Types } from 'mongoose';

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

export interface ITimelineEvent {
  status: ComplaintStatus;
  updatedBy?: Types.ObjectId;
  updatedByName?: string;
  timestamp: Date;
  remarks?: string;
}

export interface IFeedback {
  rating: number;
  comment?: string;
  submittedAt: Date;
}

export interface IComplaint extends Document {
  ticketId: string;
  complaintId?: string;
  title: string;
  description: string;
  category: Types.ObjectId;
  categoryName?: string;
  subcategory?: string;
  location: Types.ObjectId;
  locationPath?: string;
  locationDetails?: {
    buildingName: string;
    floor: string;
    roomNumber: string;
  };
  incidentTimestamp?: Date;
  reportedBy: Types.ObjectId;
  reporterUserId?: Types.ObjectId;
  reportedByName?: string;
  isAnonymous?: boolean;
  reporterRole?: string;
  voiceTranscription?: string;
  imageUrls?: string[];
  upvotes: Types.ObjectId[];
  isDuplicate?: boolean;
  parentComplaintId?: Types.ObjectId;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  assignedDepartment?: string;
  assignedStaff?: Types.ObjectId;
  assignedStaffName?: string;
  beforeImages: string[];
  afterImages: string[];
  resolutionNotes?: string;
  reopenReason?: string;
  asset?: Types.ObjectId;
  assetCode?: string;
  assetName?: string;
  feedback?: IFeedback;
  slaDueDate?: Date;
  isEscalated: boolean;
  isEmergency?: boolean;
  emergencyAlertSent?: boolean;
  emergencyRecipients?: string[];
  emergencySentAt?: Date;
  timeline: ITimelineEvent[];
  createdAt: Date;
  updatedAt: Date;
}

const complaintSchema = new Schema<IComplaint>(
  {
    ticketId: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    categoryName: { type: String },
    subcategory: { type: String, trim: true },
    location: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    locationPath: { type: String, trim: true },
    incidentTimestamp: { type: Date, default: Date.now },
    locationDetails: {
      buildingName: String,
      floor: String,
      roomNumber: String,
    },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reporterUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    reportedByName: { type: String },
    isAnonymous: { type: Boolean, default: false },
    reporterRole: { type: String, enum: ['STUDENT', 'FACULTY', 'STAFF', 'ADMIN'] },
    voiceTranscription: { type: String },
    upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isDuplicate: { type: Boolean, default: false },
    parentComplaintId: { type: Schema.Types.ObjectId, ref: 'Complaint' },
    reopenReason: { type: String },
    status: {
      type: String,
      enum: ['Reported', 'Assigned', 'Accepted', 'In Progress', 'Resolved', 'Verified', 'Closed', 'Escalated'],
      default: 'Reported',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    assignedDepartment: { type: String },
    assignedStaff: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedStaffName: { type: String },
    beforeImages: [{ type: String }],
    afterImages: [{ type: String }],
    resolutionNotes: { type: String },
    asset: { type: Schema.Types.ObjectId, ref: 'Asset' },
    assetCode: { type: String, trim: true },
    assetName: { type: String, trim: true },
    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      submittedAt: Date,
    },
    slaDueDate: { type: Date },
    isEscalated: { type: Boolean, default: false },
    isEmergency: { type: Boolean, default: false },
    emergencyAlertSent: { type: Boolean, default: false },
    emergencyRecipients: [{ type: String }],
    emergencySentAt: { type: Date },
    timeline: [
      {
        status: { type: String, required: true },
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        updatedByName: { type: String },
        timestamp: { type: Date, default: Date.now },
        remarks: String,
      },
    ],
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for complaintId alias
complaintSchema.virtual('complaintId').get(function () {
  return this.ticketId;
});

// Virtual for imageUrls combining before and after images
complaintSchema.virtual('imageUrls').get(function () {
  return [...(this.beforeImages || []), ...(this.afterImages || [])];
});

// Pre-save hook to ensure reporterUserId is always set to reportedBy
complaintSchema.pre('save', function (next) {
  if (!this.reporterUserId && this.reportedBy) {
    this.reporterUserId = this.reportedBy;
  }
  next();
});

// Indexes for high-performance dashboard queries
complaintSchema.index({ status: 1, priority: 1 });
complaintSchema.index({ location: 1, category: 1, status: 1 });
complaintSchema.index({ reportedBy: 1 });
complaintSchema.index({ reporterUserId: 1 });
complaintSchema.index({ isAnonymous: 1 });
complaintSchema.index({ assignedStaff: 1 });
complaintSchema.index({ asset: 1 });
complaintSchema.index({ isEscalated: 1, slaDueDate: 1 });

export const Complaint = model<IComplaint>('Complaint', complaintSchema);
