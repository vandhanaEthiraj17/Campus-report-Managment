import { Schema, model, Document } from 'mongoose';

export interface ILocation extends Document {
  buildingName: string;
  floor: string;
  roomNumber: string;
  isActive: boolean;
}

const locationSchema = new Schema<ILocation>(
  {
    buildingName: { type: String, required: true, trim: true },
    floor: { type: String, required: true, trim: true },
    roomNumber: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Compound index for quick duplicate room checks
locationSchema.index({ buildingName: 1, floor: 1, roomNumber: 1 }, { unique: true });

export const Location = model<ILocation>('Location', locationSchema);
