import { Schema, model, Document } from 'mongoose';

export type UserRole = 'STUDENT' | 'FACULTY' | 'STAFF' | 'ADMIN';

export interface IUser extends Document {
  name: string;
  identifier: string; // Register Number (Students) or Faculty ID (Faculty) or Staff/Admin ID
  registerNumber?: string;
  facultyId?: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  department?: string;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    identifier: { type: String, required: true, unique: true, uppercase: true, trim: true },
    registerNumber: { type: String, uppercase: true, trim: true },
    facultyId: { type: String, uppercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['STUDENT', 'FACULTY', 'STAFF', 'ADMIN'],
      required: true,
      default: 'STUDENT',
    },
    department: { type: String, trim: true },
    phone: { type: String, trim: true },
    avatarUrl: { type: String },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);
