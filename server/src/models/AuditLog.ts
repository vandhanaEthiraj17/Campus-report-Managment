import { Schema, model, Document } from 'mongoose';

export interface IAuditLog extends Document {
  action: string;
  performedBy: Schema.Types.ObjectId;
  performedByName: string;
  targetUser?: Schema.Types.ObjectId;
  targetUserName?: string;
  details: Record<string, any>;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    performedByName: { type: String, required: true },
    targetUser: { type: Schema.Types.ObjectId, ref: 'User' },
    targetUserName: { type: String },
    details: { type: Schema.Types.Map, of: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now },
  }
);

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
