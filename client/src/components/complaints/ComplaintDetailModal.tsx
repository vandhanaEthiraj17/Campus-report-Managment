import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import type { IComplaint, IUser, IDepartment } from '../../types/index';
import { StatusBadge } from '../common/StatusBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { TimelineVisualizer } from './TimelineVisualizer';
import { useAuth } from '../../context/AuthContext';
import { X, MapPin, User, Wrench, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import canvasConfetti from 'canvas-confetti';

interface ComplaintDetailModalProps {
  complaintId: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

export const ComplaintDetailModal: React.FC<ComplaintDetailModalProps> = ({ complaintId, onClose, onUpdate }) => {
  const { user } = useAuth();
  const [complaint, setComplaint] = useState<IComplaint | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Admin Assign State
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [staffUsers, setStaffUsers] = useState<IUser[]>([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');

  // Staff Resolve State
  const [afterImageUrl, setAfterImageUrl] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Student Verify State
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!complaintId) return;

    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/complaints/${complaintId}`);
        setComplaint(res.data.complaint);
        setSelectedDept(res.data.complaint.assignedDepartment || '');

        if (user?.role === 'ADMIN') {
          const [deptRes, userRes] = await Promise.all([
            api.get('/departments'),
            api.get('/admin/users', { params: { role: 'STAFF' } }),
          ]);
          setDepartments(deptRes.data.departments || []);
          setStaffUsers(userRes.data.users || []);
        }
      } catch (err) {
        console.error('Failed to load complaint details', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [complaintId, user?.role]);

  const handleAdminAssign = async () => {
    if (!complaint) return;
    setActionLoading(true);
    try {
      await api.patch(`/complaints/${complaint._id}/assign`, {
        department: selectedDept,
        staffId: selectedStaffId || undefined,
      });
      alert('Technician and Department assigned successfully.');
      onUpdate();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to assign.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStaffAccept = async () => {
    if (!complaint) return;
    setActionLoading(true);
    try {
      await api.patch(`/complaints/${complaint._id}/status`, {
        status: 'Accepted',
        remarks: 'Technician accepted assignment',
      });
      onUpdate();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to accept task.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStaffStartWork = async () => {
    if (!complaint) return;
    setActionLoading(true);
    try {
      await api.patch(`/complaints/${complaint._id}/status`, {
        status: 'In Progress',
        remarks: 'Repair work commenced on site',
      });
      onUpdate();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start work.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStaffResolve = async () => {
    if (!complaint) return;
    const finalAfterUrl = afterImageUrl.trim() || 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=600&q=80';

    setActionLoading(true);
    try {
      await api.post(`/complaints/${complaint._id}/resolve`, {
        afterImages: [finalAfterUrl],
        resolutionNotes: resolutionNotes || 'Work completed successfully by technician.',
      });
      alert('Repair completed and proof submitted! Awaiting student verification.');
      onUpdate();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to resolve.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStudentVerify = async (isSatisfied: boolean) => {
    if (!complaint) return;
    setActionLoading(true);
    try {
      await api.post(`/complaints/${complaint._id}/verify`, {
        rating,
        comment: reviewComment,
        isSatisfied,
      });
      if (isSatisfied) {
        canvasConfetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      }
      onUpdate();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to verify.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!complaintId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="glass-card rounded-2xl border border-slate-200 w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 my-8">
        {isLoading || !complaint ? (
          <div className="p-12 text-center text-slate-400 font-medium">Loading ticket details...</div>
        ) : (
          <div>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/90">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                  {complaint.ticketId}
                </span>
                <StatusBadge status={complaint.status} size="lg" />
                <PriorityBadge priority={complaint.priority} />
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Issue Overview */}
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-2 font-outfit">{complaint.title}</h2>
                <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed font-medium">
                  {complaint.description}
                </p>
              </div>

              {/* Location & Metadata Pill Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-100/40 border border-slate-200/80 text-xs shadow-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-rose-500" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Location</span>
                    <span className="text-slate-800 font-bold">
                      {complaint.locationDetails?.buildingName} • {complaint.locationDetails?.roomNumber}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-indigo-500" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Reported By</span>
                    <span className="text-slate-800 font-bold">{complaint.reportedByName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-amber-600" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Staff</span>
                    <span className="text-slate-800 font-bold">
                      {complaint.assignedStaffName || complaint.assignedDepartment || 'Unassigned'}
                    </span>
                  </div>
                </div>
              </div>

              {/* SIDE-BY-SIDE PROOF OF WORK COMPARISON */}
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-blue-600" /> Before vs After Repair Visual Proof
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Before Image */}
                  <div className="glass-card rounded-xl p-3 border border-slate-200">
                    <span className="text-xs font-bold text-rose-600 block mb-2">📸 Reported Before Repair</span>
                    {complaint.beforeImages && complaint.beforeImages.length > 0 ? (
                      <img
                        src={complaint.beforeImages[0]}
                        alt="Before Repair"
                        className="h-48 w-full object-cover rounded-lg border border-slate-200 bg-slate-50"
                      />
                    ) : (
                      <div className="h-48 w-full rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-xs text-slate-400 italic font-medium">
                        No Before Image Provided
                      </div>
                    )}
                  </div>

                  {/* After Image */}
                  <div className="glass-card rounded-xl p-3 border border-slate-200">
                    <span className="text-xs font-bold text-emerald-600 block mb-2">✅ After Repair Proof</span>
                    {complaint.afterImages && complaint.afterImages.length > 0 ? (
                      <div>
                        <img
                          src={complaint.afterImages[0]}
                          alt="After Repair"
                          className="h-48 w-full object-cover rounded-lg border border-emerald-250 bg-slate-50"
                        />
                        {complaint.resolutionNotes && (
                          <p className="text-[11px] text-emerald-700 mt-2 bg-emerald-50 p-2 rounded border border-emerald-200 font-semibold">
                            Notes: {complaint.resolutionNotes}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="h-48 w-full rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-xs text-slate-400 italic font-medium">
                        Pending technician repair photo upload...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* TIMELINE VISUALIZER */}
              <div className="border-t border-slate-200 pt-4">
                <TimelineVisualizer timeline={complaint.timeline || []} currentStatus={complaint.status} />
              </div>

              {/* ROLE BASED ACTION PANELS */}

              {/* ADMIN ACTION PANEL */}
              {user?.role === 'ADMIN' && (
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-3">
                  <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider">Admin Dispatch Controls</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] text-slate-500 font-bold block mb-1">Department</span>
                      <select
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                        className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                      >
                        <option value="" className="bg-white text-slate-800">Select Department...</option>
                        {departments.map((d) => (
                          <option key={d._id} value={d.name} className="bg-white text-slate-800">{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-500 font-bold block mb-1">Assign Technician</span>
                      <select
                        value={selectedStaffId}
                        onChange={(e) => setSelectedStaffId(e.target.value)}
                        className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                      >
                        <option value="" className="bg-white text-slate-800">Select Technician...</option>
                        {staffUsers.map((s) => (
                          <option key={s.id || s._id} value={s.id || s._id} className="bg-white text-slate-800">
                            {s.name} ({s.department || 'General'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleAdminAssign}
                    disabled={actionLoading}
                    className="w-full py-2.5 bg-purple-650 hover:bg-purple-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                  >
                    Assign Department & Staff
                  </button>
                </div>
              )}

              {/* STAFF ACTION PANEL */}
              {(user?.role === 'STAFF' || user?.role === 'ADMIN') && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Technician Work Terminal</h4>

                  {complaint.status === 'Assigned' && (
                    <button
                      onClick={handleStaffAccept}
                      disabled={actionLoading}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-450 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer"
                    >
                      Accept Assignment
                    </button>
                  )}

                  {complaint.status === 'Accepted' && (
                    <button
                      onClick={handleStaffStartWork}
                      disabled={actionLoading}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                    >
                      Commence Work (Set In Progress)
                    </button>
                  )}

                  {complaint.status === 'In Progress' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] text-slate-600 font-bold block mb-1">
                          After Repair Image URL (Proof of Work)
                        </label>
                        <input
                          type="url"
                          value={afterImageUrl}
                          onChange={(e) => setAfterImageUrl(e.target.value)}
                          placeholder="Paste resolved repair image link..."
                          className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-600 font-bold block mb-1">Technician Resolution Notes</label>
                        <input
                          type="text"
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          placeholder="e.g. Replaced capacitor, tested for 15 minutes."
                          className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                        />
                      </div>

                      <button
                        onClick={handleStaffResolve}
                        disabled={actionLoading}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                      >
                        Submit Proof & Mark Resolved
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* STUDENT VERIFICATION & FEEDBACK PANEL */}
              {complaint.status === 'Resolved' && (
                <div className="p-5 rounded-xl bg-teal-50 border border-teal-200 space-y-4">
                  <div className="flex items-center gap-2 text-teal-700 font-bold text-xs uppercase">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Student Verification & Service Rating</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    The maintenance staff marked this issue as resolved. Please review the after-repair photo above and rate the service to close the ticket!
                  </p>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 font-bold">Rating:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`p-1 text-lg transition-transform cursor-pointer ${
                          rating >= star ? 'text-amber-500 scale-110' : 'text-slate-300'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Feedback remarks (optional)..."
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                  />

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleStudentVerify(true)}
                      disabled={actionLoading}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                    >
                      Verify & Close Ticket
                    </button>
                    <button
                      onClick={() => handleStudentVerify(false)}
                      disabled={actionLoading}
                      className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Reopen (Not Fixed)
                    </button>
                  </div>
                </div>
              )}

              {/* RATING DISPLAY IF CLOSED */}
              {complaint.feedback && complaint.status === 'Closed' && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-emerald-700 font-bold block mb-0.5">Verified & Closed</span>
                    <span className="text-slate-500 italic font-semibold">"{complaint.feedback.comment}"</span>
                  </div>
                  <div className="text-amber-500 font-bold text-base">
                    {'★'.repeat(complaint.feedback.rating)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
