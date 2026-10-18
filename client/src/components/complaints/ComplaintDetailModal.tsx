import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import type { IComplaint, IUser, IDepartment } from '../../types/index';
import { StatusBadge } from '../common/StatusBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { TimelineVisualizer } from './TimelineVisualizer';
import { useAuth } from '../../context/AuthContext';
import { X, MapPin, User, Wrench, CheckCircle2, Image as ImageIcon, Upload, Lock, Phone, Clock, ShieldAlert, Package } from 'lucide-react';
import canvasConfetti from 'canvas-confetti';

const isVideoUrl = (url: string) => {
  if (!url) return false;
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
  return videoExtensions.some(ext => url.toLowerCase().endsWith(ext) || url.includes('/video/'));
};

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
  const [isUploading, setIsUploading] = useState(false);

  const handleStaffFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/complaints/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (res.data && res.data.url) {
        setAfterImageUrl(res.data.url);
      }
    } catch (err: any) {
      console.error('File upload failed', err);
      alert(err.response?.data?.message || 'Failed to upload file.');
    } finally {
      setIsUploading(false);
    }
  };

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
    if (!afterImageUrl) {
      alert('Please upload After Repair photo proof before resolving the ticket.');
      return;
    }

    setActionLoading(true);
    try {
      await api.post(`/complaints/${complaint._id}/resolve`, {
        afterImages: [afterImageUrl],
        resolutionNotes,
      });
      canvasConfetti({ particleCount: 60, spread: 60 });
      alert('Complaint marked as Resolved. Awaiting student verification.');
      onUpdate();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to resolve complaint.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStudentVerify = async (satisfied: boolean) => {
    if (!complaint) return;
    setActionLoading(true);
    try {
      await api.post(`/complaints/${complaint._id}/verify`, {
        isSatisfied: satisfied,
        rating,
        comment: reviewComment,
      });
      if (satisfied) {
        canvasConfetti({ particleCount: 90, spread: 70 });
        alert('Thank you! Complaint verified and closed successfully.');
      } else {
        alert('Complaint re-opened for further maintenance inspection.');
      }
      onUpdate();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to verify complaint.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendEmergencySMS = async () => {
    if (!complaint) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/complaints/${complaint._id}/emergency-notify`);
      alert(`Emergency SMS alert re-dispatched successfully to: ${res.data.recipients?.join(', ')}`);
      onUpdate();
      setComplaint(res.data.complaint);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to dispatch emergency SMS.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!complaintId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="glass-card rounded-2xl border border-slate-200 w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 my-8">
        {isLoading || !complaint ? (
          <div className="p-12 text-center text-slate-400 font-medium">Loading ticket details...</div>
        ) : (
          <div>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/90">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                  {complaint.ticketId}
                </span>
                <StatusBadge status={complaint.status} size="lg" />
                <PriorityBadge priority={complaint.priority} />
                {complaint.isAnonymous && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full shadow-2xs">
                    <Lock className="h-3 w-3 text-amber-700" />
                    Anonymous Complaint
                  </span>
                )}
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* EMERGENCY HIGH-RISK / WOMEN SAFETY SMS ALERT BANNER */}
              {(complaint.isEmergency || complaint.emergencyAlertSent || (typeof complaint.category === 'object' && complaint.category?.name?.toLowerCase().includes('women')) || complaint.categoryName?.toLowerCase().includes('women')) && (
                <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-600 animate-ping" />
                      <span className="font-extrabold text-xs uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                        <ShieldAlert className="h-4 w-4 text-rose-600" />
                        🚨 High-Risk / Women Safety Emergency Protocol Active
                      </span>
                    </div>
                    <span className="bg-rose-200/90 text-rose-900 border border-rose-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full">
                      SMS DISPATCHED • DELIVERED
                    </span>
                  </div>

                  <div className="text-xs text-rose-950 space-y-1.5 bg-white/80 p-3 rounded-lg border border-rose-200">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-rose-600 flex-shrink-0" />
                      <span>
                        <strong>Mobile Alert Recipients:</strong> {complaint.emergencyRecipients && complaint.emergencyRecipients.length > 0 ? complaint.emergencyRecipients.join(', ') : '99529112177, 6382373918'} <span className="text-rose-700 font-medium">(HOD & Coordinators)</span>
                      </span>
                    </div>
                    {complaint.emergencySentAt && (
                      <div className="flex items-center gap-2 text-[11px] text-rose-700">
                        <Clock className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />
                        <span>SMS Dispatched at: {new Date(complaint.emergencySentAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                      </div>
                    )}
                  </div>

                  {user?.role === 'ADMIN' && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleResendEmergencySMS}
                        disabled={actionLoading}
                        className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span>{actionLoading ? 'Dispatching...' : 'Re-send Mobile SMS Alert'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Issue Overview */}
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-2 font-outfit">{complaint.title}</h2>
                <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed font-medium">
                  {complaint.description}
                </p>
              </div>

              {/* Anonymous Privacy Banner */}
              {complaint.isAnonymous && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2 font-medium">
                  <Lock className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <span>
                    This ticket is filed as an <strong>Anonymous Complaint</strong>. The reporter's personal details are protected from technicians.
                  </span>
                </div>
              )}

              {/* Linked Campus Asset Information */}
              {(complaint.assetCode || complaint.asset) && (
                <div className="p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-200 text-xs text-indigo-950 flex items-center justify-between flex-wrap gap-2 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold bg-indigo-200/80 text-indigo-900 px-2 py-0.5 rounded text-[11px] border border-indigo-300">
                          {complaint.assetCode || (typeof complaint.asset === 'object' ? (complaint.asset as any).assetCode : 'ASSET')}
                        </span>
                        <h4 className="font-bold text-slate-800">
                          {complaint.assetName || (typeof complaint.asset === 'object' ? (complaint.asset as any).assetName : 'Campus Asset')}
                        </h4>
                      </div>
                      <span className="text-[11px] text-indigo-700 font-medium">
                        Tagged Campus Equipment • Tracked in Asset Register
                      </span>
                    </div>
                  </div>
                  {typeof complaint.asset === 'object' && (complaint.asset as any).condition && (
                    <span className="bg-white px-2.5 py-1 rounded-lg border border-indigo-200 font-bold text-[11px] text-slate-700">
                      Condition: {(complaint.asset as any).condition}
                    </span>
                  )}
                </div>
              )}

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
                    <span className="text-slate-800 font-bold">
                      {complaint.isAnonymous ? (
                        <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[11px] font-bold">
                          <Lock className="h-3 w-3 text-amber-600" />
                          {complaint.reportedByName || 'Anonymous Reporter'}
                        </span>
                      ) : (
                        complaint.reportedByName || 'Student'
                      )}
                    </span>
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
                      isVideoUrl(complaint.beforeImages[0]) ? (
                        <video
                          src={complaint.beforeImages[0]}
                          className="h-48 w-full object-cover rounded-lg border border-slate-200 bg-slate-50"
                          controls
                        />
                      ) : (
                        <img
                          src={complaint.beforeImages[0]}
                          alt="Before Repair"
                          className="h-48 w-full object-cover rounded-lg border border-slate-200 bg-slate-50"
                        />
                      )
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
                        {isVideoUrl(complaint.afterImages[0]) ? (
                          <video
                            src={complaint.afterImages[0]}
                            className="h-48 w-full object-cover rounded-lg border border-emerald-250 bg-slate-50"
                            controls
                          />
                        ) : (
                          <img
                            src={complaint.afterImages[0]}
                            alt="After Repair"
                            className="h-48 w-full object-cover rounded-lg border border-emerald-250 bg-slate-50"
                          />
                        )}
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
                          After Repair Photo/Video (Proof of Work)
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                          {/* File upload */}
                          <div className="relative border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors bg-white/40">
                            <input
                              type="file"
                              accept="image/*,video/*"
                              onChange={handleStaffFileUpload}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              disabled={isUploading}
                            />
                            {isUploading ? (
                              <>
                                <div className="h-5 w-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                <span className="text-[10px] font-semibold text-emerald-600">Uploading proof...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="h-5 w-5 text-slate-400" />
                                <span className="text-[10px] font-semibold text-slate-655 font-medium">Click to upload photo/video</span>
                                <span className="text-[8px] text-slate-400 text-center">Opens Gallery on Mobile, Files on PC</span>
                              </>
                            )}
                          </div>

                          {/* URL Paste */}
                          <div className="flex flex-col justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Or Paste Web URL</span>
                            <input
                              type="url"
                              value={afterImageUrl}
                              onChange={(e) => setAfterImageUrl(e.target.value)}
                              placeholder="Paste link..."
                              className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs bg-white"
                            />
                          </div>
                        </div>

                        {afterImageUrl && (
                          <div className="relative h-28 w-full rounded-lg overflow-hidden border border-slate-200 mt-2 bg-slate-100 flex items-center justify-center">
                            {isVideoUrl(afterImageUrl) ? (
                              <video src={afterImageUrl} className="h-full w-full object-contain bg-black" controls />
                            ) : (
                              <img src={afterImageUrl} alt="After repair proof preview" className="h-full w-full object-contain" />
                            )}
                            <button
                              type="button"
                              onClick={() => setAfterImageUrl('')}
                              className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                              title="Clear upload"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
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
                (() => {
                  const isReporter = Boolean(
                    user && complaint && (
                      (typeof complaint.reportedBy === 'object' && ((complaint.reportedBy as any)?._id === user.id || (complaint.reportedBy as any)?._id === user._id)) ||
                      complaint.reportedBy === user.id ||
                      complaint.reportedBy === user._id ||
                      complaint.reporterUserId === user.id ||
                      complaint.reporterUserId === user._id
                    )
                  );
                  const canVerify = isReporter || user?.role === 'ADMIN';

                  if (!canVerify) {
                    return (
                      <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-850 text-xs flex items-center gap-2.5 font-medium">
                        <CheckCircle2 className="h-4 w-4 text-teal-600 flex-shrink-0" />
                        <span>Repair work completed. Awaiting student verification and rating to close ticket.</span>
                      </div>
                    );
                  }

                  return (
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
                  );
                })()
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
