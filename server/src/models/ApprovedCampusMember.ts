import { Schema, model, Document } from 'mongoose';

export interface IApprovedCampusMember extends Document {
  name: string;
  identifier: string; // Trimmed & Uppercase (e.g. 6176AC21UCS143 or FAC-CSE-001)
  identifierType: 'STUDENT' | 'FACULTY';
  registerNumber?: string;
  facultyId?: string;
  department: string;
  batch?: number;
  dob: string; // Normalized YYYY-MM-DD string format
  role: 'STUDENT' | 'FACULTY';
  accountCreated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const approvedCampusMemberSchema = new Schema<IApprovedCampusMember>(
  {
    name: { type: String, required: true, trim: true },
    identifier: { type: String, required: true, unique: true, uppercase: true, trim: true },
    identifierType: { type: String, enum: ['STUDENT', 'FACULTY'], required: true },
    registerNumber: { type: String, uppercase: true, trim: true },
    facultyId: { type: String, uppercase: true, trim: true },
    department: { type: String, required: true, trim: true },
    batch: { type: Number },
    dob: { type: String, required: true, trim: true }, // Format: YYYY-MM-DD
    role: { type: String, enum: ['STUDENT', 'FACULTY'], required: true },
    accountCreated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const ApprovedCampusMember = model<IApprovedCampusMember>(
  'ApprovedCampusMember',
  approvedCampusMemberSchema
);
