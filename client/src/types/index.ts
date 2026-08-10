export type UserRole = 'STUDENT' | 'FACULTY' | 'STAFF' | 'ADMIN';

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

export interface IUser {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface ILocation {
  _id: string;
  buildingName: string;
  floor: string;
  roomNumber: string;
}

export interface ICategory {
  _id: string;
  name: string;
  description?: string;
  icon: string;
  defaultDepartment: string;
  defaultSLAHours: number;
}

export interface IDepartment {
  _id: string;
  name: string;
  code: string;
  headName: string;
  contactPhone: string;
}

export interface ITimelineEvent {
  status: ComplaintStatus;
  updatedBy?: IUser | string;
  updatedByName?: string;
  timestamp: string;
  remarks?: string;
}

export interface IFeedback {
  rating: number;
  comment?: string;
  submittedAt: string;
}

export interface IComplaint {
  _id: string;
  ticketId: string;
  title: string;
  description: string;
  category: ICategory | string;
  categoryName?: string;
  location: ILocation | string;
  locationDetails: {
    buildingName: string;
    floor: string;
    roomNumber: string;
  };
  reportedBy: IUser | string;
  reportedByName?: string;
  upvotes: string[];
  status: ComplaintStatus;
  priority: ComplaintPriority;
  assignedDepartment?: string;
  assignedStaff?: IUser | string;
  assignedStaffName?: string;
  beforeImages: string[];
  afterImages: string[];
  resolutionNotes?: string;
  feedback?: IFeedback;
  slaDueDate?: string;
  isEscalated: boolean;
  timeline: ITimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface IAnalyticsOverview {
  metrics: {
    totalComplaints: number;
    reportedCount: number;
    inProgressCount: number;
    resolvedCount: number;
    closedCount: number;
    escalatedCount: number;
  };
  categoryStats: { _id: string; count: number }[];
  buildingStats: { _id: string; count: number }[];
  priorityStats: { _id: string; count: number }[];
  staffWorkload: {
    _id: string;
    name: string;
    email: string;
    department: string;
    activeCount: number;
    totalCompleted: number;
  }[];
}
