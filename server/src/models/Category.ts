import { Schema, model, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  description?: string;
  icon: string;
  defaultDepartment: string;
  defaultSLAHours: number;
  subcategories: string[];
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String },
    icon: { type: String, default: 'AlertCircle' },
    defaultDepartment: { type: String, required: true },
    defaultSLAHours: { type: Number, default: 24 },
    subcategories: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

export const Category = model<ICategory>('Category', categorySchema);
