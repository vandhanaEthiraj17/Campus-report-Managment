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
  title: string;
  description: string;
  category: Types.ObjectId;
  categoryName?: string;
  location: Types.ObjectId;
  locationDetails?: {
    buildingName: string;
    floor: string;
    roomNumber: string;
  };
  reportedBy: Types.ObjectId;
  reportedByName?: string;
  isAnonymous?: boolean;
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
  feedback?: IFeedback;
  slaDueDate?: Date;
  isEscalated: boolean;
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
    location: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
    locationDetails: {
      buildingName: String,
      floor: String,
      roomNumber: String,
    },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reportedByName: { type: String },
    isAnonymous: { type: Boolean, default: false },
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
    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      submittedAt: Date,
    },
    slaDueDate: { type: Date },
    isEscalated: { type: Boolean, default: false },
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
  { timestamps: true }
);

// Indexes for high-performance dashboard queries
complaintSchema.index({ status: 1, priority: 1 });
complaintSchema.index({ location: 1, category: 1, status: 1 });
complaintSchema.index({ reportedBy: 1 });
complaintSchema.index({ assignedStaff: 1 });

export const Complaint = model<IComplaint>('Complaint', complaintSchema);
