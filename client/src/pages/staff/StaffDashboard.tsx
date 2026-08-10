import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import type { IComplaint } from '../../types/index';
import { ComplaintCard } from '../../components/complaints/ComplaintCard';
import { ComplaintDetailModal } from '../../components/complaints/ComplaintDetailModal';
import { useAuth } from '../../context/AuthContext';
import { Wrench, CheckCircle2, Layers, UserCheck } from 'lucide-react';

export const StaffDashboard: React.FC = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<IComplaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'assigned' | 'in_progress' | 'resolved' | 'all'>('assigned');

  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  const fetchStaffTasks = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/complaints');
      setComplaints(res.data.complaints || []);
    } catch (err) {
      console.error('Failed to fetch staff tasks', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffTasks();
  }, []);

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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-card rounded-2xl p-6 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800 font-outfit">Technician Work Portal</h1>
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
              Dept: {user?.department || 'Maintenance Staff'}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Accept assigned tasks, record resolution progress, and upload photo proof of completed repairs.
          </p>
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

      {/* Detail & Action Modal */}
      <ComplaintDetailModal
        complaintId={selectedComplaintId}
        onClose={() => setSelectedComplaintId(null)}
        onUpdate={fetchStaffTasks}
      />
    </div>
  );
};
