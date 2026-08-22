import { Schema, model, Document } from 'mongoose';

export interface IOtp extends Document {
  email: string;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  cooldownExpiry: Date;
  pendingUserData?: {
    name: string;
    passwordHash: string;
    role: string;
    department?: string;
    phone?: string;
  };
}

const otpSchema = new Schema<IOtp>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  cooldownExpiry: { type: Date, required: true },
  pendingUserData: {
    type: {
      name: { type: String, required: true },
      passwordHash: { type: String, required: true },
      role: { type: String, required: true },
      department: { type: String },
      phone: { type: String },
    },
    required: false,
  },
});

// Configure TTL (Time-To-Live) index on expiresAt field so MongoDB automatically deletes expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Otp = model<IOtp>('Otp', otpSchema);
