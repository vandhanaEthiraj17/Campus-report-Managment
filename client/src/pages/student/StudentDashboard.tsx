import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import type { IComplaint } from '../../types/index';
import { ComplaintCard } from '../../components/complaints/ComplaintCard';
import { NewComplaintModal } from '../../components/complaints/NewComplaintModal';
import { ComplaintDetailModal } from '../../components/complaints/ComplaintDetailModal';
import { useAuth } from '../../context/AuthContext';
import { Plus, Search, Filter, AlertCircle, Clock, CheckCircle2, ShieldCheck } from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<IComplaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  const fetchComplaints = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/complaints', {
        params: {
          search: searchTerm || undefined,
          status: selectedStatus || undefined,
        },
      });
      setComplaints(res.data.complaints || []);
    } catch (err) {
      console.error('Failed to fetch complaints', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchComplaints();
  };

  const handleUpvote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.post(`/complaints/${id}/upvote`);
      fetchComplaints();
    } catch (err) {
      console.error('Failed to upvote', err);
    }
  };

  // Metrics
  const totalReported = complaints.length;
  const inProgressCount = complaints.filter((c) => ['Reported', 'Assigned', 'Accepted', 'In Progress'].includes(c.status)).length;
  const pendingVerifyCount = complaints.filter((c) => c.status === 'Resolved').length;
  const closedCount = complaints.filter((c) => c.status === 'Closed').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-card rounded-2xl p-6 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 h-64 w-64 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800 font-outfit">Welcome back, {user?.name}</h1>
            <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold">
              {user?.role} Portal
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Centralized campus maintenance portal. Track, upvote, or report issues directly to department staff.
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="z-10 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-xl shadow-blue-500/20 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Report New Campus Issue
        </button>
      </div>

      {/* Quick Stat Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border border-slate-200 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total My Issues</p>
            <p className="text-xl font-bold text-slate-800 font-outfit">{totalReported}</p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-slate-200 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Repairs</p>
            <p className="text-xl font-bold text-slate-800 font-outfit">{inProgressCount}</p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-slate-200 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Verification</p>
            <p className="text-xl font-bold text-teal-600 font-outfit">{pendingVerifyCount}</p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-slate-200 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Closed & Verified</p>
            <p className="text-xl font-bold text-emerald-650 font-outfit">{closedCount}</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card rounded-xl p-4 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tickets by ID, room (e.g. Room 101), or issue title..."
            className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-xs"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="h-4 w-4 text-slate-400 hidden sm:block" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="glass-input rounded-xl px-3 py-2.5 text-xs w-full md:w-48"
          >
            <option value="" className="bg-white text-slate-800">All Statuses</option>
            <option value="Reported" className="bg-white text-slate-800">Reported</option>
            <option value="Assigned" className="bg-white text-slate-800">Assigned</option>
            <option value="In Progress" className="bg-white text-slate-800">In Progress</option>
            <option value="Resolved" className="bg-white text-slate-800">Resolved (Needs Verification)</option>
            <option value="Closed" className="bg-white text-slate-800">Closed</option>
          </select>
        </div>
      </div>

      {/* Complaints Cards Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-400 text-sm">Loading campus complaints...</div>
      ) : complaints.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-slate-200 space-y-3">
          <AlertCircle className="mx-auto h-12 w-12 text-slate-350" />
          <h3 className="text-base font-semibold text-slate-800">No Complaints Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You haven't reported or upvoted any complaints yet, or no issues match the current filter.
          </p>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 inline-block cursor-pointer"
          >
            Report an Issue
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {complaints.map((comp) => (
            <ComplaintCard
              key={comp._id}
              complaint={comp}
              onSelect={(c) => setSelectedComplaintId(c._id)}
              onUpvote={handleUpvote}
            />
          ))}
        </div>
      )}

      {/* New Complaint Wizard Modal */}
      <NewComplaintModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={fetchComplaints}
      />

      {/* Complaint Detail & Verification Modal */}
      <ComplaintDetailModal
        complaintId={selectedComplaintId}
        onClose={() => setSelectedComplaintId(null)}
        onUpdate={fetchComplaints}
      />
    </div>
  );
};
