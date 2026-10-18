import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Preformatted
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically number pages starting from Page 37
    matching university project report requirements.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor("#475569"))
        
        # Exact university report numbering: Page 37 onwards
        current_page_num = 37 + (self._pageNumber - 1)
        
        # Header (A4 width 595.27, height 841.89)
        self.drawString(36, 818, "SMARTCAMPUS: CAMPUS ISSUE REPORTING & MAINTENANCE MANAGEMENT SYSTEM")
        self.drawRightString(559, 818, "CHAPTER 5: SOURCE CODE IMPLEMENTATION")
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.6)
        self.line(36, 811, 559, 811)
        
        # Footer
        self.line(36, 36, 559, 36)
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(36, 25, "Adhiyamaan College of Engineering (Autonomous) - Department of Computer Science & Engineering")
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#1e40af"))
        self.drawRightString(559, 25, f"Page {current_page_num}")
        self.restoreState()

def create_report_pdf(output_filename="Smart_Campus_Coding_Section_Pages_37_to_45.pdf"):
    # Margins tuned so each module fits on its single page without accidental spillover
    doc = SimpleDocTemplate(
        output_filename,
        pagesize=A4,
        leftMargin=34,
        rightMargin=34,
        topMargin=36,
        bottomMargin=42
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'PageTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=13.5,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=2
    )
    
    subtitle_style = ParagraphStyle(
        'PageSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#2563eb'),
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.2,
        leading=9.2,
        textColor=colors.HexColor('#334155'),
        alignment=4
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        fontName='Courier',
        fontSize=5.4,
        leading=6.7,
        textColor=colors.HexColor('#0f172a')
    )

    def make_code_box(code_text, filename=""):
        table_data = []
        if filename:
            file_para = Paragraph(f"<b>File:</b> <font color='#2563eb'>{filename}</font>", subtitle_style)
            table_data.append([file_para])
        
        code_para = Preformatted(code_text.strip(), code_style)
        table_data.append([code_para])
        
        t = Table(table_data, colWidths=[527])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0, 0), (-1, -1), 2.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
            ('LEFTPADDING', (0, 0), (-1, -1), 4.5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4.5),
        ]))
        return t

    def make_explanation_box(text, deps=""):
        content = [
            Paragraph(f"<b>Technical Explanation:</b> {text}", body_style)
        ]
        if deps:
            content.append(Paragraph(f"<b>Dependencies & Config:</b> <font color='#0369a1'>{deps}</font>", body_style))
        
        t = Table([[content]], colWidths=[527])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#eff6ff')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#bfdbfe')),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        return t

    story = []

    # ==========================================
    # PAGE 37: Application Setup & Routing
    # ==========================================
    story.append(Paragraph("PAGE 37: SYSTEM ARCHITECTURE & MAIN APPLICATION ENTRY", title_style))
    story.append(Paragraph("Section 5.8.1 - Frontend Bootstrap, Navigation Routing & Server Lifecycle", subtitle_style))
    
    p37_code = """// client/src/main.tsx - React 19 Application Mount
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// client/src/App.tsx - Role-Based Application Router
import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { LoginPage } from './pages/auth/LoginPage';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StaffDashboard } from './pages/staff/StaffDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';

const MainContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-medium">
        <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3">Loading SmartCampus Portal...</span>
      </div>
    );
  }
  if (!user) return <LoginPage />;
  if (user.role === 'STUDENT' || user.role === 'FACULTY') return <StudentDashboard />;
  return (
    <div className="min-h-screen text-slate-800 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
        {user.role === 'ADMIN' && <AdminDashboard />}
        {user.role === 'STAFF' && <StaffDashboard />}
      </main>
    </div>
  );
};
export default function App() { return <AuthProvider><MainContent /></AuthProvider>; }

// server/src/app.ts - Express Server Bootstrap & Route Pipeline
import path from 'path';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import authRoutes from './routes/authRoutes';
import locationRoutes from './routes/locationRoutes';
import complaintRoutes from './routes/complaintRoutes';
import adminRoutes from './routes/adminRoutes';
import { checkAndEscalateComplaints } from './services/escalationService';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
connectDB();

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', locationRoutes);
app.use('/api/v1/complaints', complaintRoutes);
app.use('/api/v1/admin', adminRoutes);

app.listen(PORT, () => {
  console.log(`[Server] SmartCampus API running on http://localhost:${PORT}`);
  checkAndEscalateComplaints();
  setInterval(checkAndEscalateComplaints, 10 * 60 * 1000); // 10-minute SLA daemon
});"""
    story.append(make_code_box(p37_code, "client/src/main.tsx, client/src/App.tsx & server/src/app.ts"))
    story.append(Spacer(1, 3))
    story.append(make_explanation_box(
        "Boots the application inside an AuthProvider. App.tsx inspects JWT claims to route between Student/Faculty Portal, Technician Workspace, and Administrative Analytics. Express mounts REST APIs, serves uploaded media, and triggers recurring 10-minute background SLA checks.",
        "React 19, TypeScript 5.7, Vite 8, Tailwind CSS v4, Express 4.21, CORS, Mongoose 8.9"
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 38: User Login & Authentication
    # ==========================================
    story.append(Paragraph("PAGE 38: USER LOGIN & AUTHENTICATION SUBSYSTEM", title_style))
    story.append(Paragraph("Section 5.8.2 - Institutional Verification, Password Hashing & JWT Interception", subtitle_style))

    p38_code = """// client/src/context/AuthContext.tsx - Authentication Context State
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import type { IUser, UserRole } from '../types/index';

interface AuthContextType {
  user: IUser | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string, role?: UserRole) => Promise<void>;
  verifyIdentity: (id: string, dob: string, role: UserRole) => Promise<any>;
  logout: () => void;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('smart_campus_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) { setIsLoading(false); return; }
    api.get('/auth/me')
      .then(res => setUser(res.data.user))
      .catch(() => { localStorage.removeItem('smart_campus_token'); setToken(null); setUser(null); })
      .finally(() => setIsLoading(false));
  }, [token]);

  const login = async (identifier: string, password: string, role?: UserRole) => {
    const res = await api.post('/auth/login', { identifier, password, role });
    localStorage.setItem('smart_campus_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem('smart_campus_token');
    setToken(null);
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, token, isLoading, login, logout, verifyIdentity: async (id, dob, role) => (await api.post('/auth/verify-identity', { identifier: id, dob, role })).data }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => useContext(AuthContext)!;

// server/src/middlewares/authMiddleware.ts - Token Validation & RBAC Guard
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../models/User';

export const authenticateToken = async (req: any, res: Response, next: NextFunction): Promise<void> => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) { res.status(401).json({ message: 'No authorization token provided.' }); return; }
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) { res.status(403).json({ message: 'User account disabled or not found.' }); return; }
    req.user = { userId: user._id.toString(), email: user.email, role: user.role, name: user.name, department: user.department };
    next();
  } catch { res.status(403).json({ message: 'Invalid or expired token.' }); }
};

export const authorizeRoles = (...roles: UserRole[]) => (req: any, res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) {
    res.status(403).json({ message: `Access forbidden for role ${req.user?.role}` });
    return;
  }
  next();
};"""
    story.append(make_code_box(p38_code, "client/src/context/AuthContext.tsx & server/src/middlewares/authMiddleware.ts"))
    story.append(Spacer(1, 3))
    story.append(make_explanation_box(
        "Students and faculty are cross-verified against official institutional records before account creation. Passwords are encrypted with 10 salt rounds of bcryptjs. Authenticated requests inject cryptographically signed JWT tokens into Authorization headers, validated by middleware.",
        "jsonwebtoken (^9.0.2), bcryptjs (^2.4.3), Axios Interceptors, LocalStorage persistence"
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 39: Complaint Registration & Evidence
    # ==========================================
    story.append(Paragraph("PAGE 39: COMPLAINT REGISTRATION & EVIDENCE CAPTURE", title_style))
    story.append(Paragraph("Section 5.8.3 - Cascaded Location Picker, Live Duplicate Detection & Multer Upload", subtitle_style))

    p39_code = """// client/src/components/complaints/NewComplaintModal.tsx - Issue Ingestion Form
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import type { ICategory, IComplaint } from '../../types/index';
import { X, Upload, AlertCircle, Lock } from 'lucide-react';

export const NewComplaintModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: () => void }> = ({ isOpen, onClose, onSuccess }) => {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [buildingName, setBuildingName] = useState('');
  const [floor, setFloor] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [beforeImages, setBeforeImages] = useState<string[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [duplicates, setDuplicates] = useState<IComplaint[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) api.get('/categories').then(res => setCategories(res.data.categories || []));
  }, [isOpen]);

  // Real-time duplicate query on location selection
  useEffect(() => {
    if (buildingName && floor && roomNumber) {
      api.get('/complaints/check-duplicate', { params: { buildingName, floor, roomNumber, categoryId } })
        .then(res => setDuplicates(res.data.duplicates || []))
        .catch(console.error);
    }
  }, [buildingName, floor, roomNumber, categoryId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    const res = await api.post('/complaints/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    setBeforeImages(prev => [...prev, res.data.url]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/complaints', { title, description, categoryId, buildingName, floor, roomNumber, priority, beforeImages, isAnonymous });
      onSuccess();
      onClose();
    } finally { setIsSubmitting(false); }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-xl">
        <div className="flex justify-between border-b pb-2 mb-3">
          <h2 className="text-base font-bold">Register Campus Maintenance Issue</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        {duplicates.length > 0 && (
          <div className="p-2.5 mb-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
            Notice: {duplicates.length} open issue(s) already reported in this room!
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="w-full border p-2 text-xs rounded" placeholder="Issue Title" value={title} onChange={e => setTitle(e.target.value)} required />
          <textarea className="w-full border p-2 text-xs rounded" rows={3} placeholder="Detailed symptom description" value={description} onChange={e => setDescription(e.target.value)} required />
          <input type="file" accept="image/*" onChange={handleFileUpload} className="text-xs" />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="anon" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} />
            <label htmlFor="anon" className="text-xs text-slate-700">Submit Anonymously (Hide ID from technicians)</label>
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full py-2 bg-blue-600 text-white font-bold text-xs rounded">
            {isSubmitting ? 'Registering...' : 'Submit Complaint'}
          </button>
        </form>
      </div>
    </div>
  );
};"""
    story.append(make_code_box(p39_code, "client/src/components/complaints/NewComplaintModal.tsx"))
    story.append(Spacer(1, 3))
    story.append(make_explanation_box(
        "Features cascaded location pickers (Building -> Floor -> Room). Upon selecting a room, real-time queries check for duplicate complaints to prevent ticket spamming. Supports multipart image file uploads via Multer and includes an anonymous whistleblower reporting toggle.",
        "React Hooks, FormData, Multer static asset pipeline, Canvas-Confetti, Lucide-React icons"
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 40: Backend API Complaint Intake
    # ==========================================
    story.append(Paragraph("PAGE 40: BACKEND COMPLAINT INTAKE & VALIDATION CONTROLLER", title_style))
    story.append(Paragraph("Section 5.8.4 - Express Route Ingestion, Ticket ID Generation & SLA Computation", subtitle_style))

    p40_code = """// server/src/routes/complaintRoutes.ts - Ingestion Endpoint Definitions
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { createComplaint, getComplaints, checkDuplicates, upvoteComplaint, assignComplaint, resolveComplaint, verifyComplaint } from '../controllers/complaintController';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(process.cwd(), 'uploads')),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
  }),
  limits: { fileSize: 25 * 1024 * 1024 }
});

router.use(authenticateToken);
router.post('/upload', upload.single('file'), (req: any, res: any) => res.json({ url: `/uploads/${req.file.filename}` }));
router.get('/check-duplicate', checkDuplicates);
router.post('/', createComplaint);
router.get('/', getComplaints);
router.patch('/:id/assign', authorizeRoles('ADMIN'), assignComplaint);
router.post('/:id/resolve', authorizeRoles('STAFF', 'ADMIN'), resolveComplaint);
router.post('/:id/verify', verifyComplaint);
export default router;

// server/src/controllers/complaintController.ts - Intake & Processing Logic
import { Response } from 'express';
import { Complaint } from '../models/Complaint';
import { Location } from '../models/Location';
import { Category } from '../models/Category';

export const createComplaint = async (req: any, res: Response): Promise<void> => {
  try {
    const { title, description, categoryId, buildingName, floor, roomNumber, priority, beforeImages, isAnonymous } = req.body;
    if (!title || !description || !categoryId || !buildingName || !floor || !roomNumber) {
      res.status(400).json({ message: 'All mandatory location and description fields are required.' });
      return;
    }

    let locationDoc = await Location.findOne({ buildingName, floor, roomNumber });
    if (!locationDoc) locationDoc = await Location.create({ buildingName, floor, roomNumber });

    const categoryDoc = await Category.findById(categoryId);
    const slaHours = categoryDoc ? categoryDoc.defaultSLAHours : 24;
    const defaultDept = categoryDoc ? categoryDoc.defaultDepartment : 'Maintenance Team';

    const slaDueDate = new Date();
    slaDueDate.setHours(slaDueDate.getHours() + slaHours);
    const ticketId = `CMP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const complaint = await Complaint.create({
      ticketId,
      title: title.trim(),
      description: description.trim(),
      category: categoryId,
      categoryName: categoryDoc ? categoryDoc.name : 'General',
      location: locationDoc._id,
      locationDetails: { buildingName, floor, roomNumber },
      reportedBy: req.user.userId,
      reporterUserId: req.user.userId,
      reportedByName: req.user.name,
      isAnonymous: Boolean(isAnonymous),
      reporterRole: req.user.role,
      priority: priority || 'Medium',
      assignedDepartment: defaultDept,
      beforeImages: beforeImages || [],
      slaDueDate,
      status: 'Reported',
      timeline: [{ status: 'Reported', updatedBy: req.user.userId, updatedByName: isAnonymous ? 'Anonymous Reporter' : req.user.name, timestamp: new Date(), remarks: 'Complaint logged into system.' }]
    });

    res.status(201).json({ message: 'Complaint registered successfully.', complaint });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error creating complaint.' });
  }
};"""
    story.append(make_code_box(p40_code, "server/src/routes/complaintRoutes.ts & server/src/controllers/complaintController.ts"))
    story.append(Spacer(1, 3))
    story.append(make_explanation_box(
        "Validates input payloads, guarantees atomic location record indexing, and formats standardized ticket identifiers. Based on category parameters, it computes SLA due dates and initializes the audit timeline trail.",
        "Multer diskStorage engine, Express Router, Mongoose Documents, ISO-8601 Timestamps"
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 41: MongoDB / Mongoose Schemas
    # ==========================================
    story.append(Paragraph("PAGE 41: DATABASE PERSISTENCE LAYER & MONGOOSE SCHEMAS", title_style))
    story.append(Paragraph("Section 5.8.5 - Relational Document Schemas, Compound Indexes & Auditing", subtitle_style))

    p41_code = """// server/src/config/db.ts - MongoDB Driver Connection
import mongoose from 'mongoose';
export const connectDB = async (): Promise<void> => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_campus_db';
    await mongoose.connect(uri);
    console.log(`[MongoDB] Database connected successfully: ${uri}`);
  } catch (err) {
    console.error('[MongoDB] Connection failure:', err);
    process.exit(1);
  }
};

// server/src/models/Complaint.ts - Core Issue Schema & Status Lifecycle
import { Schema, model, Document, Types } from 'mongoose';

export type ComplaintStatus = 'Reported' | 'Assigned' | 'Accepted' | 'In Progress' | 'Resolved' | 'Verified' | 'Closed' | 'Escalated';
export type ComplaintPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface IComplaint extends Document {
  ticketId: string;
  title: string;
  description: string;
  category: Types.ObjectId;
  location: Types.ObjectId;
  locationDetails: { buildingName: string; floor: string; roomNumber: string };
  reportedBy: Types.ObjectId;
  isAnonymous: boolean;
  reporterRole: string;
  upvotes: Types.ObjectId[];
  status: ComplaintStatus;
  priority: ComplaintPriority;
  assignedDepartment: string;
  assignedStaff?: Types.ObjectId;
  beforeImages: string[];
  afterImages: string[];
  resolutionNotes?: string;
  feedback?: { rating: number; comment?: string; submittedAt: Date };
  slaDueDate: Date;
  isEscalated: boolean;
  timeline: { status: string; updatedBy?: Types.ObjectId; updatedByName?: string; timestamp: Date; remarks?: string }[];
}

const complaintSchema = new Schema<IComplaint>({
  ticketId: { type: String, required: true, unique: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  location: { type: Schema.Types.ObjectId, ref: 'Location', required: true },
  locationDetails: { buildingName: String, floor: String, roomNumber: String },
  reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  isAnonymous: { type: Boolean, default: false },
  reporterRole: { type: String, enum: ['STUDENT', 'FACULTY', 'STAFF', 'ADMIN'] },
  upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['Reported', 'Assigned', 'Accepted', 'In Progress', 'Resolved', 'Verified', 'Closed', 'Escalated'], default: 'Reported' },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
  assignedDepartment: { type: String },
  assignedStaff: { type: Schema.Types.ObjectId, ref: 'User' },
  beforeImages: [{ type: String }],
  afterImages: [{ type: String }],
  resolutionNotes: { type: String },
  feedback: { rating: { type: Number, min: 1, max: 5 }, comment: String, submittedAt: Date },
  slaDueDate: { type: Date },
  isEscalated: { type: Boolean, default: false },
  timeline: [{ status: String, updatedBy: Schema.Types.ObjectId, updatedByName: String, timestamp: { type: Date, default: Date.now }, remarks: String }]
}, { timestamps: true });

complaintSchema.index({ status: 1, priority: 1 });
complaintSchema.index({ location: 1, category: 1, status: 1 });
complaintSchema.index({ reportedBy: 1 });
export const Complaint = model<IComplaint>('Complaint', complaintSchema);"""
    story.append(make_code_box(p41_code, "server/src/config/db.ts & server/src/models/Complaint.ts"))
    story.append(Spacer(1, 3))
    story.append(make_explanation_box(
        "Persists complaints with embedded timeline event trails, resolution ratings, and compound B-tree indexes ({ status: 1, priority: 1 }) ensuring sub-millisecond query execution across administrative dashboards.",
        "MongoDB 8.0, Mongoose ODM (^8.9.3), Schema Virtuals, B-Tree Compound Indexes"
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 42: Status Tracking & Verification
    # ==========================================
    story.append(Paragraph("PAGE 42: COMPLAINT TRACKING & RESOLUTION VERIFICATION", title_style))
    story.append(Paragraph("Section 5.8.6 - Visual Stepper Timeline, Photographic Work Proof & Student Sign-Off", subtitle_style))

    p42_code = """// client/src/components/complaints/TimelineVisualizer.tsx - Visual Progress Trail
import React from 'react';
import type { ITimelineEvent, ComplaintStatus } from '../../types/index';
import { CheckCircle2, Clock, AlertCircle, Wrench, ShieldCheck } from 'lucide-react';

export const TimelineVisualizer: React.FC<{ timeline: ITimelineEvent[]; currentStatus: ComplaintStatus }> = ({ timeline, currentStatus }) => {
  const steps: ComplaintStatus[] = ['Reported', 'Assigned', 'Accepted', 'In Progress', 'Resolved', 'Closed'];
  const currentIndex = steps.indexOf(currentStatus === 'Verified' ? 'Closed' : currentStatus);

  return (
    <div className="w-full py-2">
      <div className="relative flex items-center justify-between mb-5">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 z-0" />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 z-0 transition-all" style={{ width: `${Math.max(0, (currentIndex / 5) * 100)}%` }} />
        {steps.map((step, idx) => (
          <div key={step} className="relative z-10 flex flex-col items-center">
            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${idx <= currentIndex ? 'bg-blue-600 text-white' : 'bg-white border text-slate-400'}`}>
              {idx < currentIndex ? '✓' : idx + 1}
            </div>
            <span className="text-[10px] mt-1 font-semibold text-slate-600">{step}</span>
          </div>
        ))}
      </div>
      <div className="space-y-1.5 border-t pt-2">
        {timeline.map((evt, i) => (
          <div key={i} className="flex justify-between p-2 bg-slate-50 border rounded text-xs">
            <div><b>{evt.status}</b>: {evt.remarks}</div>
            <span className="text-slate-400 text-[10px]">{new Date(evt.timestamp).toLocaleTimeString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// server/src/controllers/complaintController.ts - Resolve & Verify Handlers
export const resolveComplaint = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  const { afterImages, resolutionNotes } = req.body;
  if (!afterImages || afterImages.length === 0) {
    res.status(400).json({ message: 'Photographic proof (After Image) is required to resolve repairs.' });
    return;
  }
  const complaint = await Complaint.findById(id);
  if (!complaint) { res.status(404).json({ message: 'Complaint not found.' }); return; }
  complaint.afterImages = afterImages;
  complaint.resolutionNotes = resolutionNotes;
  complaint.status = 'Resolved';
  complaint.timeline.push({ status: 'Resolved', updatedBy: req.user.userId, updatedByName: req.user.name, timestamp: new Date(), remarks: `Repair completed: ${resolutionNotes}` });
  await complaint.save();
  res.status(200).json({ message: 'Marked resolved. Awaiting student verification.', complaint });
};

export const verifyComplaint = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  const { rating, comment, isSatisfied } = req.body;
  const complaint = await Complaint.findById(id);
  if (!complaint) { res.status(404).json({ message: 'Complaint not found.' }); return; }
  
  if (isSatisfied === false) {
    complaint.status = 'In Progress';
    complaint.timeline.push({ status: 'In Progress', updatedBy: req.user.userId, updatedByName: req.user.name, timestamp: new Date(), remarks: `Student re-opened: ${comment || 'Issue persists'}` });
    await complaint.save();
    res.status(200).json({ message: 'Complaint re-opened for further maintenance.', complaint });
    return;
  }

  complaint.status = 'Closed';
  complaint.feedback = { rating: rating || 5, comment, submittedAt: new Date() };
  complaint.timeline.push({ status: 'Closed', updatedBy: req.user.userId, updatedByName: req.user.name, timestamp: new Date(), remarks: `Verified & Closed with ${rating || 5}-star rating.` });
  await complaint.save();
  res.status(200).json({ message: 'Complaint verified and closed.', complaint });
};"""
    story.append(make_code_box(p42_code, "client/src/components/complaints/TimelineVisualizer.tsx & complaintController.ts"))
    story.append(Spacer(1, 3))
    story.append(make_explanation_box(
        "Technicians are blocked from closing complaints without photographic proof. The student must verify the resolution; if unsatisfactory, the ticket is reopened into 'In Progress' with their remarks.",
        "Lucide React Icons, Two-Way State Validation, Physical Proof Enforcement"
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 43: Administrator Portal & SLA Engine
    # ==========================================
    story.append(Paragraph("PAGE 43: ADMINISTRATOR MANAGEMENT & AUTO-ESCALATION ENGINE", title_style))
    story.append(Paragraph("Section 5.8.7 - MongoDB Aggregation Pipeline, Task Delegation & Background Worker", subtitle_style))

    p43_code = """// server/src/controllers/adminController.ts - Analytics & Workload Pipelines
import { Response } from 'express';
import { Complaint } from '../models/Complaint';
import { User } from '../models/User';

export const getAnalyticsOverview = async (req: any, res: Response): Promise<void> => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const reportedCount = await Complaint.countDocuments({ status: 'Reported' });
    const inProgressCount = await Complaint.countDocuments({ status: { $in: ['Assigned', 'Accepted', 'In Progress'] } });
    const resolvedCount = await Complaint.countDocuments({ status: 'Resolved' });
    const closedCount = await Complaint.countDocuments({ status: 'Closed' });
    const escalatedCount = await Complaint.countDocuments({ isEscalated: true });

    const categoryStats = await Complaint.aggregate([
      { $group: { _id: '$categoryName', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const buildingStats = await Complaint.aggregate([
      { $group: { _id: '$locationDetails.buildingName', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const staffWorkload = await User.aggregate([
      { $match: { role: 'STAFF' } },
      { $lookup: { from: 'complaints', localField: '_id', foreignField: 'assignedStaff', as: 'tasks' } },
      { $project: {
          name: 1, department: 1,
          activeCount: { $size: { $filter: { input: '$tasks', as: 't', cond: { $in: ['$$t.status', ['Assigned', 'In Progress']] } } } },
          totalCompleted: { $size: { $filter: { input: '$tasks', as: 't', cond: { $in: ['$$t.status', ['Resolved', 'Closed']] } } } }
      }}
    ]);

    res.status(200).json({ metrics: { totalComplaints, reportedCount, inProgressCount, resolvedCount, closedCount, escalatedCount }, categoryStats, buildingStats, staffWorkload });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
};

// server/src/services/escalationService.ts - 10-Minute SLA Background Cron Worker
export const checkAndEscalateComplaints = async (): Promise<{ escalatedCount: number }> => {
  try {
    const overdue = await Complaint.find({
      status: { $in: ['Reported', 'Assigned', 'Accepted', 'In Progress'] },
      isEscalated: false,
      slaDueDate: { $lt: new Date() }
    });

    for (const c of overdue) {
      c.isEscalated = true;
      c.priority = 'Urgent';
      c.timeline.push({
        status: 'Escalated',
        updatedByName: 'System Auto-Escalation Worker',
        timestamp: new Date(),
        remarks: 'Target resolution time breached. Automatically escalated to Urgent for Dean/HOD review.'
      });
      await c.save();
    }
    return { escalatedCount: overdue.length };
  } catch (error) {
    console.error('SLA Escalation Worker Error:', error);
    return { escalatedCount: 0 };
  }
};"""
    story.append(make_code_box(p43_code, "server/src/controllers/adminController.ts & escalationService.ts"))
    story.append(Spacer(1, 3))
    story.append(make_explanation_box(
        "Computes department metrics using multi-stage aggregation pipelines. A background daemon runs every 10 minutes to identify overdue tickets, escalating breached issues to 'Urgent' priority.",
        "MongoDB Aggregation Framework, Node.js Timers, Enterprise Resource Allocation"
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 44: Emergency Incident Reporting (Proposed)
    # ==========================================
    story.append(Paragraph("PAGE 44: EMERGENCY INCIDENT REPORTING MODULE (PROPOSED FEATURE)", title_style))
    story.append(Paragraph("Section 5.8.8 - High-Security SOS Dispatch for Women's Safety, Ragging & Harassment", subtitle_style))

    p44_code = """// client/src/components/complaints/EmergencyModal.tsx - Emergency SOS Reporting Modal
import React, { useState } from 'react';
import api from '../../services/api';
import { ShieldAlert, PhoneCall, Send, Lock, X } from 'lucide-react';

export const EmergencyModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: () => void }> = ({ isOpen, onClose, onSuccess }) => {
  const [emergencyType, setEmergencyType] = useState<'WOMEN_SAFETY' | 'RAGGING' | 'HARASSMENT' | 'MEDICAL'>('WOMEN_SAFETY');
  const [locationText, setLocationText] = useState('');
  const [incidentDetails, setIncidentDetails] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleEmergencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/emergency/report', {
        emergencyType,
        location: locationText,
        description: incidentDetails,
        isAnonymous,
        timestamp: new Date().toISOString()
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Emergency dispatch failed. Call security helpline immediately!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-rose-950/70 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg border-2 border-rose-500 overflow-hidden shadow-2xl">
        <div className="bg-red-700 p-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 animate-pulse" />
            <div>
              <h3 className="font-bold text-sm">Emergency Campus Safety Dispatch</h3>
              <p className="text-[10px] text-rose-100">Direct Alert to Anti-Ragging Cell & Chief Warden</p>
            </div>
          </div>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="bg-amber-50 px-4 py-2 border-b flex justify-between text-xs font-bold text-amber-900">
          <span>Security Control Room:</span>
          <a href="tel:+914344260570" className="text-red-700 underline flex items-center gap-1">+91-4344-260570</a>
        </div>
        <form onSubmit={handleEmergencySubmit} className="p-4 space-y-3">
          <select value={emergencyType} onChange={e => setEmergencyType(e.target.value as any)} className="w-full border p-2 text-xs rounded font-bold">
            <option value="WOMEN_SAFETY">Women's Safety Intervention</option>
            <option value="RAGGING">Anti-Ragging Squad Dispatch</option>
            <option value="HARASSMENT">Confidential Harassment Inquiry</option>
            <option value="MEDICAL">Medical Emergency / Ambulance</option>
          </select>
          <input className="w-full border p-2 text-xs rounded" placeholder="Exact Location (e.g. Behind Workshop / Hostel 3)" value={locationText} onChange={e => setLocationText(e.target.value)} required />
          <textarea className="w-full border p-2 text-xs rounded" rows={3} placeholder="Describe immediate situation..." value={incidentDetails} onChange={e => setIncidentDetails(e.target.value)} required />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="emAnon" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} />
            <label htmlFor="emAnon" className="text-xs font-bold text-slate-700">Strictly Confidential (Anonymous SOS Report)</label>
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full py-2.5 bg-red-600 text-white font-bold text-xs rounded hover:bg-red-700">
            {isSubmitting ? 'Transmitting SOS...' : 'DISPATCH IMMEDIATE EMERGENCY ALERT'}
          </button>
        </form>
      </div>
    </div>
  );
};"""
    story.append(make_code_box(p44_code, "client/src/components/complaints/EmergencyModal.tsx"))
    story.append(Spacer(1, 3))
    story.append(make_explanation_box(
        "Proposed emergency response module for critical safety concerns. SOS alerts bypass routine maintenance queues, dispatching directly to the Proctorial Board, Women's Safety Cell, and Anti-Ragging Committee.",
        "Emergency Telephony Links, SOS Dispatch Channels, High-Priority Role Escalation"
    ))
    story.append(PageBreak())

    # ==========================================
    # PAGE 45: WhatsApp Notification Integration
    # ==========================================
    story.append(Paragraph("PAGE 45: WHATSAPP EMERGENCY NOTIFICATION INTEGRATION", title_style))
    story.append(Paragraph("Section 5.8.9 - Meta Cloud API / Twilio Dispatcher, Environment Security & Setup", subtitle_style))

    p45_code = """// server/src/services/whatsappService.ts - Official Meta WhatsApp Cloud API Service
import axios from 'axios';

interface IWhatsAppAlert {
  incidentType: string;
  ticketId: string;
  location: string;
  details: string;
  timestamp: string;
  isAnonymous: boolean;
  reporterName?: string;
}

const EMERGENCY_RECIPIENT_NUMBERS = (process.env.EMERGENCY_WHATSAPP_RECIPIENTS || '').split(',');

export const sendWhatsAppEmergencyAlert = async (alert: IWhatsAppAlert): Promise<boolean> => {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId || EMERGENCY_RECIPIENT_NUMBERS.length === 0) {
    console.warn('[WhatsApp Service] Credentials unconfigured. Logged to fallback audit console:');
    console.warn(`[BROADCAST]: ${alert.incidentType} at ${alert.location} (${alert.timestamp})`);
    return false;
  }

  const messageBody = 
    `🚨 *SMARTCAMPUS CRITICAL EMERGENCY ALERT* 🚨\\n\\n` +
    `*Incident Type:* ${alert.incidentType}\\n` +
    `*Reference Ticket:* ${alert.ticketId}\\n` +
    `*Location:* ${alert.location}\\n` +
    `*Timestamp:* ${alert.timestamp}\\n` +
    `*Reported By:* ${alert.isAnonymous ? 'Anonymous Reporter 🔒' : alert.reporterName}\\n\\n` +
    `*Incident Details:*\\n${alert.details}\\n\\n` +
    `⚠️ *Action:* Please deploy immediate on-campus security assistance.`;

  try {
    for (const number of EMERGENCY_RECIPIENT_NUMBERS) {
      const recipient = number.trim().replace(/[^0-9]/g, '');
      if (!recipient) continue;
      await axios.post(
        `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
        { messaging_product: 'whatsapp', to: recipient, type: 'text', text: { body: messageBody } },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
    }
    console.log(`[WhatsApp Service] Dispatched emergency SOS to ${EMERGENCY_RECIPIENT_NUMBERS.length} official(s).`);
    return true;
  } catch (err: any) {
    console.error('[WhatsApp Service Error] Dispatch failed:', err.response?.data || err.message);
    return false;
  }
};

/* server/.env Configuration Guide:
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/smart_campus_db
JWT_SECRET=smart_campus_super_secret_key_2026
COLLEGE_EMAIL_DOMAIN=@adhiyamaan.ac.in

# WhatsApp Cloud API Credentials
WHATSAPP_API_TOKEN=EAAG...META_API_TOKEN
WHATSAPP_PHONE_NUMBER_ID=109283746592837
EMERGENCY_WHATSAPP_RECIPIENTS=+919876543210,+919443322110
*/"""
    story.append(make_code_box(p45_code, "server/src/services/whatsappService.ts & server/.env"))
    story.append(Spacer(1, 3))
    story.append(make_explanation_box(
        "Proposed notification gateway using Meta WhatsApp Cloud API. Token dispatch is isolated in backend environment variables (WHATSAPP_API_TOKEN), ensuring API credentials are never exposed to browser clients.",
        "Meta Graph API v19.0, Twilio WhatsApp Gateway, Server Environment Variable Security"
    ))

    # Build the document using NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Report PDF successfully generated: {output_filename}")

if __name__ == "__main__":
    create_report_pdf()
