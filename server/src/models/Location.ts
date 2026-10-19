import { Schema, model, Document, Types } from 'mongoose';

export type CampusLocationType =
  | 'SECURITY_CHECKPOINT'
  | 'MAIN_GATE_SECURITY'
  | 'ACADEMIC_BLOCK'
  | 'LABORATORY'
  | 'OFFICE'
  | 'FACULTY_ADMIN_OFFICE'
  | 'HOSTEL'
  | 'HOSTEL_RESIDENTIAL'
  | 'CANTEEN'
  | 'CANTEEN_CAFETERIA'
  | 'LIBRARY_AUDITORIUM'
  | 'PARKING'
  | 'TRANSPORT'
  | 'TRANSPORT_BUS'
  | 'ROAD_PATHWAY'
  | 'SPORTS_GROUND'
  | 'SANITATION'
  | 'TOILET_WATER'
  | 'OUTDOOR_AREA'
  | 'GARDEN_OUTDOOR'
  | 'UTILITY_ROOM'
  | 'UTILITY_ELECTRICAL'
  | 'OTHER'
  | 'OTHER_FACILITY';

export type LocationStructureType =
  | 'ROOM_BASED'
  | 'SEGMENT_BASED'
  | 'VEHICLE_BASED'
  | 'ZONE_BASED'
  | 'STANDALONE';

export interface ILocation extends Document {
  code: string;
  name: string;
  locationType: CampusLocationType;
  structureType: LocationStructureType;
  parentLocation?: Types.ObjectId;
  fullPath: string;
  description?: string;
  zone?: string;
  isActive: boolean;
  // Backward compatibility fields
  buildingName?: string;
  floor?: string;
  roomNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

const locationSchema = new Schema<ILocation>(
  {
    code: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
      default: function (this: any) {
        const slug = (this.name || this.buildingName || 'LOC')
          .replace(/[^A-Za-z0-9]/g, '')
          .slice(0, 6)
          .toUpperCase();
        return `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
      },
    },
    name: {
      type: String,
      trim: true,
      default: function (this: any) {
        if (this.buildingName && this.roomNumber) {
          return `${this.buildingName} - ${this.roomNumber}`;
        }
        return this.buildingName || 'Campus Location';
      },
    },
    locationType: {
      type: String,
      enum: [
        'SECURITY_CHECKPOINT',
        'MAIN_GATE_SECURITY',
        'ACADEMIC_BLOCK',
        'LABORATORY',
        'OFFICE',
        'FACULTY_ADMIN_OFFICE',
        'HOSTEL',
        'HOSTEL_RESIDENTIAL',
        'CANTEEN',
        'CANTEEN_CAFETERIA',
        'LIBRARY_AUDITORIUM',
        'PARKING',
        'TRANSPORT',
        'TRANSPORT_BUS',
        'ROAD_PATHWAY',
        'SPORTS_GROUND',
        'SANITATION',
        'TOILET_WATER',
        'OUTDOOR_AREA',
        'GARDEN_OUTDOOR',
        'UTILITY_ROOM',
        'UTILITY_ELECTRICAL',
        'OTHER',
        'OTHER_FACILITY',
      ],
      default: 'ACADEMIC_BLOCK',
    },
    structureType: {
      type: String,
      enum: ['ROOM_BASED', 'SEGMENT_BASED', 'VEHICLE_BASED', 'ZONE_BASED', 'STANDALONE'],
      default: 'ROOM_BASED',
    },
    parentLocation: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
      default: null,
    },
    fullPath: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    zone: {
      type: String,
      trim: true,
      default: 'Main Campus',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Backward compatibility fields
    buildingName: {
      type: String,
      trim: true,
    },
    floor: {
      type: String,
      trim: true,
    },
    roomNumber: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Indexes
locationSchema.index({ locationType: 1, isActive: 1 });
locationSchema.index({ parentLocation: 1 });
locationSchema.index(
  { buildingName: 1, floor: 1, roomNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      buildingName: { $exists: true, $type: 'string', $gt: '' },
      floor: { $exists: true, $type: 'string', $gt: '' },
      roomNumber: { $exists: true, $type: 'string', $gt: '' },
    },
  }
);

// Pre-save hook to ensure fullPath and code are always populated
locationSchema.pre('save', function (next) {
  if (!this.fullPath) {
    if (this.buildingName && this.floor && this.roomNumber) {
      this.fullPath = `${this.buildingName} > ${this.floor} > ${this.roomNumber}`;
    } else {
      this.fullPath = this.name;
    }
  }

  if (!this.code) {
    const slug = (this.name || this.buildingName || 'LOC')
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 6)
      .toUpperCase();
    this.code = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  next();
});

export const Location = model<ILocation>('Location', locationSchema);
