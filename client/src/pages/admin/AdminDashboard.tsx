import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import type { IComplaint, IAnalyticsOverview } from '../../types/index';
import { ComplaintCard } from '../../components/complaints/ComplaintCard';
import { ComplaintDetailModal } from '../../components/complaints/ComplaintDetailModal';
import { Users, User, AlertCircle, Clock, CheckCircle2, AlertTriangle, TrendingUp, Wrench, Download, Plus, Search, FileText, Check, X, ShieldAlert, Shield, Mail, KeyRound, Phone, Briefcase } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'complaints' | 'users' | 'audit'>('complaints');

  // Original Admin Dashboard state
  const [analytics, setAnalytics] = useState<IAnalyticsOverview | null>(null);
  const [complaints, setComplaints] = useState<IComplaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [filterDept, setFilterDept] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  // User Directory & Creation state
  const [users, setUsers] = useState<any[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'FACULTY' | 'STAFF'>('FACULTY');
  const [newUserDept, setNewUserDept] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [searchAudit, setSearchAudit] = useState('');

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

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.users || []);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/audit-logs');
      setAuditLogs(res.data.logs || []);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'complaints') {
      fetchAdminData();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, filterDept, filterPriority]);

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}`, { isActive: !currentStatus });
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update user status.');
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      await api.patch(`/admin/users/${userId}`, { role: newRole });
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update user role.');
    }
  };

  const handleUpdateUserDept = async (userId: string, newDept: string) => {
    try {
      await api.patch(`/admin/users/${userId}`, { department: newDept });
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update user department.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/users', {
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
        department: newUserDept,
        phone: newUserPhone,
      });
      alert(res.data.message || 'User created successfully.');
      setShowCreateModal(false);
      
      // Reset form fields
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('FACULTY');
      setNewUserDept('');
      setNewUserPhone('');
      
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create user.');
    }
  };

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

  // Filtered Users list
  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(searchUser.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchUser.toLowerCase());
    const matchesRole = selectedRoleFilter ? u.role === selectedRoleFilter : true;
    return matchesSearch && matchesRole;
  });

  // Filtered Audit Logs list
  const filteredAuditLogs = auditLogs.filter((log) => {
    return log.action.toLowerCase().includes(searchAudit.toLowerCase()) ||
           log.performedByName.toLowerCase().includes(searchAudit.toLowerCase()) ||
           (log.targetUserName && log.targetUserName.toLowerCase().includes(searchAudit.toLowerCase()));
  });

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
            Real-time analytics, SLA monitoring, user directories, audit logs, and privileged account provisioning.
          </p>
        </div>

        {activeTab === 'complaints' && (
          <button
            onClick={exportCSV}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-blue-600 font-bold text-xs border border-slate-200 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Export Maintenance CSV Report
          </button>
        )}

        {activeTab === 'users' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Provision Faculty / Staff
          </button>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold uppercase tracking-wider px-1">
        <button
          onClick={() => setActiveTab('complaints')}
          className={`pb-3 transition-colors cursor-pointer border-b-2 font-outfit ${
            activeTab === 'complaints'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Complaints & Dispatch
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 transition-colors cursor-pointer border-b-2 font-outfit ${
            activeTab === 'users'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          User Directory & Security
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 transition-colors cursor-pointer border-b-2 font-outfit ${
            activeTab === 'audit'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Access & Audit Logs
        </button>
      </div>

      {/* Tab Contents: 1. Complaints & Dispatch */}
      {activeTab === 'complaints' && (
        <>
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

          {/* Master Complaints Grid */}
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
        </>
      )}

      {/* Tab Contents: 2. User Directory & Security */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-800 font-outfit">User & Security Directory</h2>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  placeholder="Search users or email..."
                  className="w-full glass-input rounded-xl pl-9 pr-3.5 py-2 text-xs"
                />
              </div>

              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="glass-input rounded-xl px-3 py-2 text-xs w-full sm:w-40"
              >
                <option value="" className="bg-white text-slate-800">All Roles</option>
                <option value="STUDENT" className="bg-white text-slate-800">Student</option>
                <option value="FACULTY" className="bg-white text-slate-800">Faculty</option>
                <option value="STAFF" className="bg-white text-slate-800">Staff / Tech</option>
                <option value="ADMIN" className="bg-white text-slate-800">Admin</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-slate-400">Loading user directory...</div>
          ) : (
            <div className="glass-card rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="p-4">User Details</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Department</th>
                      <th className="p-4">Email verified</th>
                      <th className="p-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                          No users found matching parameters.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
                                alt={user.name}
                                className="h-9 w-9 rounded-full bg-slate-150 border border-slate-200"
                              />
                              <div>
                                <p className="font-bold text-slate-800">{user.name}</p>
                                <p className="text-[11px] text-slate-400 font-semibold">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <select
                              value={user.role}
                              onChange={(e) => handleUpdateUserRole(user._id, e.target.value)}
                              disabled={user.role === 'ADMIN'}
                              className="glass-input rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase cursor-pointer disabled:opacity-50"
                            >
                              <option value="STUDENT">Student</option>
                              <option value="FACULTY">Faculty</option>
                              <option value="STAFF">Technician</option>
                              <option value="ADMIN" disabled>Admin</option>
                            </select>
                          </td>
                          <td className="p-4">
                            <input
                              type="text"
                              value={user.department || ''}
                              onChange={(e) => handleUpdateUserDept(user._id, e.target.value)}
                              onBlur={(e) => handleUpdateUserDept(user._id, e.target.value)}
                              placeholder="Not Assigned"
                              className="glass-input rounded-lg px-2 py-1 text-[11px] w-36 font-semibold"
                            />
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                              user.isEmailVerified 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {user.isEmailVerified ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                              {user.isEmailVerified ? 'Verified' : 'Pending'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleToggleUserStatus(user._id, user.isActive)}
                              disabled={user.role === 'ADMIN'}
                              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] border cursor-pointer transition-all disabled:opacity-40 ${
                                user.isActive
                                  ? 'bg-emerald-50 border-emerald-250 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-rose-50 border-rose-250 text-rose-700 hover:bg-rose-100'
                              }`}
                            >
                              {user.isActive ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Contents: 3. Access & Audit Logs */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-800 font-outfit">Security & Access Audit Trail</h2>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchAudit}
                onChange={(e) => setSearchAudit(e.target.value)}
                placeholder="Search by action, performer, or target..."
                className="w-full glass-input rounded-xl pl-9 pr-3.5 py-2 text-xs"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-slate-400">Loading security logs...</div>
          ) : (
            <div className="glass-card rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="p-4">Action</th>
                      <th className="p-4">Performed By</th>
                      <th className="p-4">Target User</th>
                      <th className="p-4">Log Details</th>
                      <th className="p-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAuditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                          No audit logs recorded yet.
                        </td>
                      </tr>
                    ) : (
                      filteredAuditLogs.map((log) => (
                        <tr key={log._id} className="hover:bg-slate-50/50 transition-colors font-semibold">
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                              log.action === 'ROLE_CHANGE' 
                                ? 'bg-amber-50 text-amber-700 border-amber-250' 
                                : log.action === 'USER_CREATION' 
                                ? 'bg-blue-50 text-blue-700 border-blue-250' 
                                : log.action.includes('DEACTIVATION') 
                                ? 'bg-rose-50 text-rose-700 border-rose-250' 
                                : 'bg-emerald-50 text-emerald-700 border-emerald-250'
                            }`}>
                              <FileText className="h-3 w-3" />
                              {log.action}
                            </span>
                          </td>
                          <td className="p-4 text-slate-700 font-bold">
                            {log.performedByName}
                          </td>
                          <td className="p-4 text-slate-800">
                            {log.targetUserName || 'N/A'}
                          </td>
                          <td className="p-4 text-slate-500 font-mono text-[10px]">
                            {log.details ? JSON.stringify(log.details) : '{}'}
                          </td>
                          <td className="p-4 text-slate-400 text-right text-[11px]">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin Dispatch Modal */}
      <ComplaintDetailModal
        complaintId={selectedComplaintId}
        onClose={() => setSelectedComplaintId(null)}
        onUpdate={fetchAdminData}
      />

      {/* Privileged Account Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-850 font-outfit flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-indigo-650" />
                Provision Privileged Account
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Prof. Albert Einstein"
                    className="w-full glass-input rounded-xl pl-9 pr-3.5 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Official College Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="einstein@adhiyamaan.ac.in"
                    className="w-full glass-input rounded-xl pl-9 pr-3.5 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Temporary Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full glass-input rounded-xl pl-9 pr-3.5 py-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Select Role</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <select
                      value={newUserRole}
                      onChange={(e: any) => setNewUserRole(e.target.value)}
                      className="w-full glass-input rounded-xl pl-9 pr-3.5 py-2 text-xs cursor-pointer"
                    >
                      <option value="FACULTY">Faculty</option>
                      <option value="STAFF">Technician</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Assign Department</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={newUserDept}
                      onChange={(e) => setNewUserDept(e.target.value)}
                      placeholder="Physics Dept"
                      className="w-full glass-input rounded-xl pl-9 pr-3.5 py-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      value={newUserPhone}
                      onChange={(e) => setNewUserPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full glass-input rounded-xl pl-9 pr-3.5 py-2 text-xs"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all cursor-pointer mt-2"
              >
                Provision Account & Issue Activation Request
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
