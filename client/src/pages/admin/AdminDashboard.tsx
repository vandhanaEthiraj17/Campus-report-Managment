import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import type { IComplaint, IAnalyticsOverview } from '../../types/index';
import { ComplaintCard } from '../../components/complaints/ComplaintCard';
import { ComplaintDetailModal } from '../../components/complaints/ComplaintDetailModal';
import { Users, AlertCircle, Clock, CheckCircle2, AlertTriangle, TrendingUp, Wrench, Download } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<IAnalyticsOverview | null>(null);
  const [complaints, setComplaints] = useState<IComplaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [filterDept, setFilterDept] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const [analyticsRes, complaintsRes] = await Promise.all([
        api.get('/admin/analytics/overview'),
        api.get('/complaints', {
          params: {
            department: filterDept || undefined,
            priority: filterPriority || undefined,
          },
        }),
      ]);
      setAnalytics(analyticsRes.data);
      setComplaints(complaintsRes.data.complaints || []);
    } catch (err) {
      console.error('Failed to load admin analytics', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [filterDept, filterPriority]);

  const exportCSV = () => {
    if (!complaints.length) return;

    const headers = ['Ticket ID', 'Title', 'Category', 'Building', 'Room', 'Priority', 'Status', 'Assigned Dept', 'Reported By', 'Created At'];
    const rows = complaints.map((c) => [
      c.ticketId,
      `"${c.title.replace(/"/g, '""')}"`,
      c.categoryName || '',
      c.locationDetails?.buildingName || '',
      c.locationDetails?.roomNumber || '',
      c.priority,
      c.status,
      c.assignedDepartment || '',
      c.reportedByName || '',
      new Date(c.createdAt).toLocaleDateString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SmartCampus_Maintenance_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const metrics = analytics?.metrics;

  return (
    <div className="space-y-6">
      {/* Top Command Banner */}
      <div className="glass-card rounded-2xl p-6 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800 font-outfit">Admin Command Center</h1>
            <span className="text-xs bg-rose-50 text-rose-750 border border-rose-250 px-2.5 py-0.5 rounded-full font-bold">
              Super Admin View
            </span>
          </div>
          <p className="text-xs text-slate-505 font-semibold">
            Real-time analytics, SLA monitor, staff assignment dispatch, and institution maintenance reports.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-blue-600 font-bold text-xs border border-slate-200 flex items-center gap-2 transition-all cursor-pointer"
        >
          <Download className="h-4 w-4" />
          Export Maintenance CSV Report
        </button>
      </div>

      {/* Metric Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-card rounded-xl p-4 border border-slate-200 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Tickets</span>
            <AlertCircle className="h-4 w-4 text-blue-650" />
          </div>
          <p className="text-2xl font-bold text-slate-800 font-outfit">{metrics?.totalComplaints || 0}</p>
        </div>

        <div className="glass-card rounded-xl p-4 border border-slate-200 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Unassigned / New</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-600 font-outfit">{metrics?.reportedCount || 0}</p>
        </div>

        <div className="glass-card rounded-xl p-4 border border-slate-200 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">In Repair</span>
            <Wrench className="h-4 w-4 text-indigo-650" />
          </div>
          <p className="text-2xl font-bold text-indigo-600 font-outfit">{metrics?.inProgressCount || 0}</p>
        </div>

        <div className="glass-card rounded-xl p-4 border border-slate-200 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Resolved & Closed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 font-outfit">
            {(metrics?.resolvedCount || 0) + (metrics?.closedCount || 0)}
          </p>
        </div>

        <div className="glass-card rounded-xl p-4 border border-slate-200 space-y-1 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">SLA Breached</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-600 font-outfit">{metrics?.escalatedCount || 0}</p>
        </div>
      </div>

      {/* Analytics Grid: Category & Staff Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="glass-card rounded-2xl p-5 border border-slate-200 space-y-3">
          <h3 className="text-xs font-bold text-slate-650 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" /> Top Fault Categories
          </h3>

          <div className="space-y-2.5">
            {analytics?.categoryStats?.map((cat) => (
              <div key={cat._id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-bold text-slate-700">{cat._id}</span>
                <span className="bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded font-mono font-bold">
                  {cat.count} tickets
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Staff Workload */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-5 border border-slate-200 space-y-3">
          <h3 className="text-xs font-bold text-slate-650 uppercase tracking-wider flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-600" /> Technician Workload Audit
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-2 font-bold uppercase tracking-wider text-[10px]">Technician</th>
                  <th className="pb-2 font-bold uppercase tracking-wider text-[10px]">Department</th>
                  <th className="pb-2 font-bold uppercase tracking-wider text-[10px]">Active Tasks</th>
                  <th className="pb-2 font-bold uppercase tracking-wider text-[10px]">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics?.staffWorkload?.map((staff) => (
                  <tr key={staff._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 font-bold text-slate-800">{staff.name}</td>
                    <td className="py-2.5 text-slate-500 font-semibold">{staff.department}</td>
                    <td className="py-2.5">
                      <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-mono font-bold">
                        {staff.activeCount}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-mono font-bold">
                        {staff.totalCompleted}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Master Complaints Grid with Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-800 font-outfit">Master Dispatch Queue ({complaints.length})</h2>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="glass-input rounded-xl px-3 py-2 text-xs w-full sm:w-48"
            >
              <option value="" className="bg-white text-slate-800">All Departments</option>
              <option value="Electrical Maintenance" className="bg-white text-slate-800">Electrical Maintenance</option>
              <option value="Plumbing Unit" className="bg-white text-slate-800">Plumbing Unit</option>
              <option value="IT & Multimedia Support" className="bg-white text-slate-800">IT & Support</option>
              <option value="Civil & Furniture" className="bg-white text-slate-800">Civil & Furniture</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="glass-input rounded-xl px-3 py-2 text-xs w-full sm:w-36"
            >
              <option value="" className="bg-white text-slate-800">All Priorities</option>
              <option value="Urgent" className="bg-white text-slate-800">Urgent</option>
              <option value="High" className="bg-white text-slate-800">High</option>
              <option value="Medium" className="bg-white text-slate-800">Medium</option>
              <option value="Low" className="bg-white text-slate-800">Low</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400">Loading master queue...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {complaints.map((comp) => (
              <ComplaintCard
                key={comp._id}
                complaint={comp}
                onSelect={(c) => setSelectedComplaintId(c._id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Admin Dispatch & Detail Modal */}
      <ComplaintDetailModal
        complaintId={selectedComplaintId}
        onClose={() => setSelectedComplaintId(null)}
        onUpdate={fetchAdminData}
      />
    </div>
  );
};
