import { Schema, model, Document } from 'mongoose';

export type AlertCategoryType =
  | 'ALL_EMERGENCIES'
  | 'WOMEN_SAFETY'
  | 'FIRE_HAZARD'
  | 'ELECTRICAL_HAZARD'
  | 'MEDICAL_EMERGENCY'
  | 'CAMPUS_SECURITY'
  | 'TRANSPORT'
  | 'HOSTEL'
  | 'INFRASTRUCTURE';

export interface INotificationRecipient extends Document {
  name: string;
  roleTitle: string;
  phone: string;
  email?: string;
  department: string;
  alertCategories: AlertCategoryType[];
  notifyOnRoutineComplaints: boolean;
  notifyOnEmergency: boolean;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationRecipientSchema = new Schema<INotificationRecipient>(
  {
    name: { type: String, required: true, trim: true },
    roleTitle: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: { type: String, trim: true },
    department: { type: String, required: true, trim: true },
    alertCategories: [
      {
        type: String,
        enum: [
          'ALL_EMERGENCIES',
          'WOMEN_SAFETY',
          'FIRE_HAZARD',
          'ELECTRICAL_HAZARD',
          'MEDICAL_EMERGENCY',
          'CAMPUS_SECURITY',
          'TRANSPORT',
          'HOSTEL',
          'INFRASTRUCTURE',
        ],
        default: 'ALL_EMERGENCIES',
      },
    ],
    notifyOnRoutineComplaints: { type: Boolean, default: false },
    notifyOnEmergency: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

notificationRecipientSchema.index({ phone: 1, department: 1 });
notificationRecipientSchema.index({ isActive: 1, alertCategories: 1 });

export const NotificationRecipient = model<INotificationRecipient>(
  'NotificationRecipient',
  notificationRecipientSchema
);
