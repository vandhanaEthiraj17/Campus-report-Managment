import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import type { IComplaint, IRecommendation } from '../../types/index';
import { ComplaintCard } from '../../components/complaints/ComplaintCard';
import { ComplaintDetailModal } from '../../components/complaints/ComplaintDetailModal';
import { useAuth } from '../../context/AuthContext';
import { connectSocket } from '../../services/socket';
import { Wrench, CheckCircle2, Layers, UserCheck, Brain, Check, X, Info } from 'lucide-react';

export const StaffDashboard: React.FC = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<IComplaint[]>([]);
  const [recommendations, setRecommendations] = useState<IRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'assigned' | 'in_progress' | 'resolved' | 'all' | 'recommendations'>('assigned');

  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'named' | 'anonymous'>('all');

  const [dismissTargetRec, setDismissTargetRec] = useState<IRecommendation | null>(null);
  const [dismissReason, setDismissReason] = useState('');
  const [showDismissModal, setShowDismissModal] = useState(false);

  const fetchStaffTasks = async () => {
    setIsLoading(true);
    try {
      const [compRes, recRes] = await Promise.all([
        api.get('/complaints', {
          params: {
            type: filterType !== 'all' ? filterType : undefined,
          },
        }),
        api.get('/intelligence/recommendations'),
      ]);
      setComplaints(compRes.data.complaints || []);
      setRecommendations(recRes.data.recommendations || []);
    } catch (err) {
      console.error('Failed to fetch staff tasks and recommendations', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffTasks();
  }, [filterType]);

  // Real-time task dispatch updates via Socket.IO
  useEffect(() => {
    const socket = connectSocket();

    const handleTaskUpdate = () => {
      fetchStaffTasks();
    };

    socket.on('complaint:assigned', handleTaskUpdate);
    socket.on('complaint:status_changed', handleTaskUpdate);
    socket.on('complaint:created', handleTaskUpdate);

    return () => {
      socket.off('complaint:assigned', handleTaskUpdate);
      socket.off('complaint:status_changed', handleTaskUpdate);
      socket.off('complaint:created', handleTaskUpdate);
    };
  }, [filterType]);

  const assignedList = complaints.filter((c) => c.status === 'Assigned' || c.status === 'Reported');
  const inProgressList = complaints.filter((c) => c.status === 'Accepted' || c.status === 'In Progress');
  const resolvedList = complaints.filter((c) => c.status === 'Resolved');

  const getActiveList = () => {
    switch (activeTab) {
      case 'assigned':
        return assignedList;
      case 'in_progress':
        return inProgressList;
      case 'resolved':
        return resolvedList;
      default:
        return complaints;
    }
  };

  const activeComplaints = getActiveList();

  const handleReviewRec = async (recId: string) => {
    try {
      await api.patch(`/intelligence/recommendations/${recId}/review`);
      fetchStaffTasks();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to review recommendation.');
    }
  };

  const handleAddressRec = async (recId: string) => {
    try {
      await api.patch(`/intelligence/recommendations/${recId}/address`);
      fetchStaffTasks();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to mark recommendation as addressed.');
    }
  };

  const handleDismissSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dismissTargetRec) return;
    if (!dismissReason.trim()) {
      alert('Please provide a mandatory explanation for dismissing this recommendation.');
      return;
    }
    try {
      await api.post(`/intelligence/recommendations/${dismissTargetRec._id}/dismiss`, {
        reason: dismissReason,
      });
      setShowDismissModal(false);
      setDismissTargetRec(null);
      fetchStaffTasks();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to dismiss recommendation.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-card rounded-2xl p-6 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Adhiyamaan College Campus Operations
            </span>
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full font-semibold">
              Dept: {user?.department || 'Maintenance Staff'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 font-outfit">Technician Work Portal</h1>
          <p className="text-xs text-slate-500 font-medium">
            Accept assigned tasks across campus blocks, record resolution progress, and upload photo proof of completed repairs.
          </p>
        </div>
      </div>

      {/* Campus Work Locations Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-3 border border-slate-200/80 flex items-center gap-3">
          <img
            src="/campus_academic_block.png"
            alt="Academic Block"
            className="h-12 w-16 rounded-lg object-cover shadow-xs"
          />
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-slate-800 truncate">Academic Wing</p>
            <p className="text-[10px] text-slate-500">Rooms 101-304 & Labs</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-3 border border-slate-200/80 flex items-center gap-3">
          <img
            src="/campus_computer_lab.png"
            alt="Computer Lab"
            className="h-12 w-16 rounded-lg object-cover shadow-xs"
          />
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-slate-800 truncate">Computer Labs</p>
            <p className="text-[10px] text-slate-500">IT & AV Multimedia</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-3 border border-slate-200/80 flex items-center gap-3">
          <img
            src="/campus_main.png"
            alt="Main Campus"
            className="h-12 w-16 rounded-lg object-cover shadow-xs"
          />
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-slate-800 truncate">Main Campus Portico</p>
            <p className="text-[10px] text-slate-500">Auditorium & Facilities</p>
          </div>
        </div>
      </div>

      {/* Kanban Tab Bar */}
      <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('assigned')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all min-w-[140px] cursor-pointer ${
            activeTab === 'assigned' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="h-4 w-4 text-purple-300" />
          <span>New Assigned</span>
          <span className="bg-purple-500/20 px-1.5 py-0.2 rounded text-[10px]">{assignedList.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('in_progress')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all min-w-[140px] cursor-pointer ${
            activeTab === 'in_progress' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wrench className="h-4 w-4 text-amber-300" />
          <span>In Progress</span>
          <span className="bg-amber-500/20 px-1.5 py-0.2 rounded text-[10px]">{inProgressList.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('resolved')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all min-w-[140px] cursor-pointer ${
            activeTab === 'resolved' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 text-teal-300" />
          <span>Pending Verification</span>
          <span className="bg-teal-500/20 px-1.5 py-0.2 rounded text-[10px]">{resolvedList.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all min-w-[140px] cursor-pointer ${
            activeTab === 'all' ? 'bg-slate-300 text-slate-850 shadow-md font-extrabold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>All Tasks</span>
          <span className="bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded text-[10px]">{complaints.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('recommendations')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all min-w-[170px] cursor-pointer ${
            activeTab === 'recommendations' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Brain className="h-4 w-4 text-indigo-200" />
          <span>Dept Recommendations</span>
          <span className="bg-indigo-500/30 px-1.5 py-0.2 rounded text-[10px] font-extrabold">{recommendations.length}</span>
        </button>
      </div>

      {activeTab !== 'recommendations' && (
        <>
          {/* Complaint Type Filter Indicator */}
          <div className="glass-card rounded-xl p-3 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Complaint Type:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterType === 'all'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('named')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterType === 'named'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Named
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('anonymous')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    filterType === 'anonymous'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                      : 'text-slate-500 hover:text-amber-800'
                  }`}
                >
                  <span>🔒</span> Anonymous
                </button>
              </div>
            </div>

            {filterType === 'anonymous' && (
              <div className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-semibold flex items-center gap-1.5">
                <span>🔒</span>
                <span>Anonymous Complaints: Reporter personal identifiers are protected.</span>
              </div>
            )}
          </div>

          {/* Task Grid */}
          {isLoading ? (
            <div className="py-12 text-center text-slate-400">Loading technician work list...</div>
          ) : activeComplaints.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center border border-slate-200 text-slate-500 font-medium">
              No tasks found under this queue. Great job!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeComplaints.map((comp) => (
                <ComplaintCard
                  key={comp._id}
                  complaint={comp}
                  onSelect={(c) => setSelectedComplaintId(c._id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Recommendations Tab Body */}
      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-800 font-outfit">
                Maintenance Intelligence Actions for {user?.department || 'Your Department'}
              </h3>
              <p className="text-xs text-slate-500">
                Actionable maintenance recommendations generated by data-driven recurring fault analytics.
              </p>
            </div>
          </div>

          {recommendations.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center text-slate-400">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <h4 className="font-bold text-slate-700 text-sm">No open recommendations for your department</h4>
              <p className="text-xs text-slate-500">All equipment in your scope is operating normally.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <div key={rec._id} className="glass-card rounded-2xl p-5 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                        {rec.recommendationCode}
                      </span>
                      <span className="font-bold text-slate-800 text-xs">
                        {rec.assetName} ({rec.assetCode})
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                      {rec.priority}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700">{rec.explanation}</p>

                  <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200 text-xs text-indigo-950 flex items-start gap-2">
                    <Info className="h-4 w-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-[10px] uppercase font-bold text-indigo-900">Recommended Action:</strong>
                      <span>{rec.suggestedAction}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2 text-xs">
                    <span className="text-[11px] text-slate-400">Status: <strong>{rec.status}</strong></span>
                    <div className="flex items-center gap-2">
                      {rec.status === 'OPEN' && (
                        <button
                          type="button"
                          onClick={() => handleReviewRec(rec._id)}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs cursor-pointer"
                        >
                          Mark Reviewed
                        </button>
                      )}
                      {rec.status !== 'ADDRESSED' && rec.status !== 'DISMISSED' && (
                        <button
                          type="button"
                          onClick={() => handleAddressRec(rec._id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="h-3 w-3" />
                          Mark Addressed
                        </button>
                      )}
                      {rec.status !== 'DISMISSED' && (
                        <button
                          type="button"
                          onClick={() => {
                            setDismissTargetRec(rec);
                            setDismissReason('');
                            setShowDismissModal(true);
                          }}
                          className="px-2.5 py-1.5 text-slate-400 hover:text-rose-600 text-xs font-semibold cursor-pointer"
                        >
                          Dismiss...
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dismissal Reason Modal for Staff */}
      {showDismissModal && dismissTargetRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="glass-card rounded-2xl border border-slate-200 w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-800">Dismiss Recommendation</h3>
              <button onClick={() => setShowDismissModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleDismissSubmit} className="space-y-3 text-xs">
              <p className="text-slate-600">
                Please state the reason why this recommendation is being dismissed:
              </p>
              <textarea
                rows={3}
                required
                placeholder="Reason for dismissal..."
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                className="w-full glass-input rounded-xl p-2.5"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDismissModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold"
                >
                  Confirm Dismissal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail & Action Modal */}
      <ComplaintDetailModal
        complaintId={selectedComplaintId}
        onClose={() => setSelectedComplaintId(null)}
        onUpdate={fetchStaffTasks}
      />
    </div>
  );
};
