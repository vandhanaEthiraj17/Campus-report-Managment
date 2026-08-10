import { Schema, model, Document } from 'mongoose';

export interface IDepartment extends Document {
  name: string;
  code: string;
  headName: string;
  contactPhone: string;
}

const departmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true },
    headName: { type: String, required: true },
    contactPhone: { type: String, required: true },
  },
  { timestamps: true }
);

export const Department = model<IDepartment>('Department', departmentSchema);
