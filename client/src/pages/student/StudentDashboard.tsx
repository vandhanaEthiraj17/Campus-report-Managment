import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import type { IComplaint } from '../../types/index';
import { ComplaintCard } from '../../components/complaints/ComplaintCard';
import { NewComplaintModal } from '../../components/complaints/NewComplaintModal';
import { ComplaintDetailModal } from '../../components/complaints/ComplaintDetailModal';
import { StudentSidebar, type StudentNavView } from '../../components/common/StudentSidebar';
import { StudentBottomNav } from '../../components/common/StudentBottomNav';
import { RoleSwitcherDropdown } from '../../components/common/RoleSwitcherDropdown';
import { useAuth } from '../../context/AuthContext';
import { 
  Plus, Search, Filter, AlertCircle, Clock, CheckCircle2, ShieldCheck, 
  Menu, Building2, Bell, Check, LogOut
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [complaints, setComplaints] = useState<IComplaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Navigation & Mobile Drawer State
  const [currentNavView, setCurrentNavView] = useState<StudentNavView>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'named' | 'anonymous'>('all');

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
          type: selectedType !== 'all' ? selectedType : undefined,
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
  }, [selectedStatus, selectedType]);

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

  // Filter complaints for "My Complaints" view
  const myComplaints = complaints.filter((c) => {
    if (!user) return false;
    const authorId = user.id || (user as any)._id || (user as any).userId;
    const reportedById = (c.reportedBy as any)?._id || c.reportedBy;
    const reporterUserId = (c.reporterUserId as any)?._id || c.reporterUserId;
    return (
      (authorId && reportedById && String(reportedById) === String(authorId)) ||
      (authorId && reporterUserId && String(reporterUserId) === String(authorId)) ||
      (c.reportedByName && user.name && c.reportedByName.toLowerCase().includes(user.name.toLowerCase()))
    );
  });

  // Mock Notifications for Student Portal
  const studentNotifications = [
    {
      id: 'notif-1',
      ticketId: 'CMP-2026-3558',
      title: 'Technician Assigned to Fan Issue',
      time: '25 mins ago',
      desc: 'Electrical Maintenance staff has been dispatched to Room 101.',
      status: 'Assigned',
      unread: true,
    },
    {
      id: 'notif-2',
      ticketId: 'CMP-2026-7900',
      title: 'Work In Progress: Corridor Lighting',
      time: '1 hour ago',
      desc: 'Repair work commenced on site for 2nd Floor Corridor Ceiling Fan.',
      status: 'In Progress',
      unread: true,
    },
    {
      id: 'notif-3',
      ticketId: 'CMP-2026-7269',
      title: 'Washroom Repair Verified & Closed',
      time: 'Yesterday',
      desc: 'The plumbing repair in Washroom East Wing has been inspected and verified.',
      status: 'Closed',
      unread: false,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row relative overflow-x-hidden">
      {/* 1. Left Sidebar Navigation (Desktop Fixed + Mobile Overlay) */}
      <StudentSidebar
        currentView={currentNavView}
        onSelectView={setCurrentNavView}
        onOpenReportModal={() => setIsNewModalOpen(true)}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        notificationCount={3}
      />

      {/* 2. Main Content Area */}
      <div className={`main-area flex-1 md:pl-64 flex flex-col min-h-screen w-full overflow-x-hidden pb-20 md:pb-8 ${isMobileMenuOpen ? 'menu-open' : ''}`}>
        {/* Mobile Header Bar */}
        <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="mobile-menu-button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              aria-label="Open sidebar menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Building2 className="h-4 w-4" />
              </div>
              <span className="font-outfit font-bold text-base text-slate-900 tracking-tight">
                smartcampus
              </span>
            </div>
          </div>
          <RoleSwitcherDropdown />
        </header>

        {/* Desktop Top Strip with Role Switcher & Identity */}
        <header className="hidden md:flex items-center justify-between px-6 lg:px-8 py-3.5 bg-white/70 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
              Adhiyamaan College of Engineering
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">
              Student Space Portal
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsNewModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Report Issue</span>
            </button>
            <RoleSwitcherDropdown />
          </div>
        </header>

        {/* Dynamic View Body */}
        <main className="p-4 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* ========================================================== */}
          {/* VIEW A: OVERVIEW (Default Dashboard)                        */}
          {/* ========================================================== */}
          {currentNavView === 'overview' && (
            <div className="space-y-6 animate-in fade-in-50 duration-150">
              {/* Top Banner with College Identity */}
              <div className="glass-card rounded-2xl p-6 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 h-64 w-64 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

                <div className="space-y-1.5 z-10">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Adhiyamaan College of Engineering
                    </span>
                    {user?.role === 'FACULTY' ? (
                      <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                        👨‍🏫 Faculty & Academic Portal ({user?.department || 'CSE Department'})
                      </span>
                    ) : (
                      <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold">
                        🎓 Student Portal
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-slate-800 font-outfit">
                    {user?.role === 'FACULTY' ? `Welcome Prof. ${user?.name}` : `Welcome back, ${user?.name || 'Alex Smith'}`}
                  </h1>
                  <p className="text-xs text-slate-500 font-medium max-w-2xl">
                    {user?.role === 'FACULTY'
                      ? 'Academic Faculty Portal. Direct campus issue reporting, priority departmental maintenance escalation, and classroom infrastructure tracking.'
                      : 'Centralized campus maintenance portal. Monitor facility operations across Main Building, Academic Wings, and Computing Labs.'}
                  </p>
                </div>

                <button
                  onClick={() => setIsNewModalOpen(true)}
                  className="z-10 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-xl shadow-blue-500/20 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  Report New Campus Issue
                </button>
              </div>

              {/* Campus Facility & Infrastructure Visual Cards */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Campus Infrastructure & Facilities Monitored
                  </h2>
                  <span className="text-[11px] text-blue-600 font-semibold">Live Status Active</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: Central Computer Center */}
                  <div className="glass-card rounded-2xl overflow-hidden border border-slate-200/80 group hover:shadow-xl transition-all duration-300">
                    <div className="h-36 w-full relative overflow-hidden">
                      <img
                        src="/campus_computer_lab.png"
                        alt="Central Computer Center"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                      <div className="absolute top-2.5 right-2.5 bg-emerald-500/90 text-white font-bold text-[10px] px-2 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                        Operational
                      </div>
                      <div className="absolute bottom-2.5 left-3 right-3 text-white">
                        <p className="font-bold text-sm tracking-tight">Computer Labs & IT Center</p>
                        <p className="text-[11px] text-slate-300">Lab 1, Lab 2 & Multimedia Systems</p>
                      </div>
                    </div>
                    <div className="p-3.5 flex items-center justify-between text-xs bg-white/60">
                      <span className="text-slate-600 font-medium">IT & AV Support</span>
                      <button
                        type="button"
                        onClick={() => setIsNewModalOpen(true)}
                        className="text-blue-600 hover:text-blue-700 font-bold text-[11px] cursor-pointer"
                      >
                        Report Lab Issue →
                      </button>
                    </div>
                  </div>

                  {/* Card 2: Academic & Department Wing */}
                  <div className="glass-card rounded-2xl overflow-hidden border border-slate-200/80 group hover:shadow-xl transition-all duration-300">
                    <div className="h-36 w-full relative overflow-hidden">
                      <img
                        src="/campus_academic_block.png"
                        alt="Academic & Department Block"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                      <div className="absolute top-2.5 right-2.5 bg-blue-500/90 text-white font-bold text-[10px] px-2 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        Active Classrooms
                      </div>
                      <div className="absolute bottom-2.5 left-3 right-3 text-white">
                        <p className="font-bold text-sm tracking-tight">Academic & Lecture Halls</p>
                        <p className="text-[11px] text-slate-300">Engineering Blocks & Workshop Area</p>
                      </div>
                    </div>
                    <div className="p-3.5 flex items-center justify-between text-xs bg-white/60">
                      <span className="text-slate-600 font-medium">Civil & Electrical Unit</span>
                      <button
                        type="button"
                        onClick={() => setIsNewModalOpen(true)}
                        className="text-blue-600 hover:text-blue-700 font-bold text-[11px] cursor-pointer"
                      >
                        Report Block Issue →
                      </button>
                    </div>
                  </div>

                  {/* Card 3: Main Administrative Portico */}
                  <div className="glass-card rounded-2xl overflow-hidden border border-slate-200/80 group hover:shadow-xl transition-all duration-300">
                    <div className="h-36 w-full relative overflow-hidden">
                      <img
                        src="/campus_main.png"
                        alt="Main Campus Building"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                      <div className="absolute top-2.5 right-2.5 bg-indigo-500/90 text-white font-bold text-[10px] px-2 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        Administration
                      </div>
                      <div className="absolute bottom-2.5 left-3 right-3 text-white">
                        <p className="font-bold text-sm tracking-tight">Main Campus & Portico</p>
                        <p className="text-[11px] text-slate-300">Auditorium, Library & Seminar Halls</p>
                      </div>
                    </div>
                    <div className="p-3.5 flex items-center justify-between text-xs bg-white/60">
                      <span className="text-slate-600 font-medium">Sanitation & Estate Team</span>
                      <button
                        type="button"
                        onClick={() => setIsNewModalOpen(true)}
                        className="text-blue-600 hover:text-blue-700 font-bold text-[11px] cursor-pointer"
                      >
                        Report Campus Issue →
                      </button>
                    </div>
                  </div>
                </div>
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

              {/* Search & Filter Controls */}
              <div className="glass-card rounded-xl p-4 border border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
                <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search tickets by ID, room (e.g. Room 101), or issue title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="glass-input w-full pl-9 pr-4 py-2.5 rounded-xl text-xs"
                  />
                </form>

                <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
                  {/* Named vs Anonymous Filter */}
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs w-full sm:w-auto justify-center">
                    <button
                      type="button"
                      onClick={() => setSelectedType('all')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                        selectedType === 'all'
                          ? 'bg-white text-blue-600 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedType('named')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                        selectedType === 'named'
                          ? 'bg-white text-blue-600 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Named
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedType('anonymous')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                        selectedType === 'anonymous'
                          ? 'bg-white text-amber-800 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span>🔒 Anonymous</span>
                    </button>
                  </div>

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
            </div>
          )}

          {/* ========================================================== */}
          {/* VIEW B: MY COMPLAINTS                                      */}
          {/* ========================================================== */}
          {currentNavView === 'my-complaints' && (
            <div className="space-y-5 animate-in fade-in-50 duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <h1 className="text-xl font-bold text-slate-800 font-outfit">My Submitted Complaints</h1>
                  <p className="text-xs text-slate-500">Track and follow tickets you reported on campus</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span>Report New Issue</span>
                </button>
              </div>

              {myComplaints.length === 0 ? (
                <div className="glass-card rounded-2xl p-12 text-center border border-slate-200 space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-sky-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-800">No Personal Tickets Yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    You have not submitted any complaints yet. When you report campus maintenance issues, they will appear here.
                  </p>
                  <button
                    onClick={() => setIsNewModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 inline-block cursor-pointer"
                  >
                    Report First Issue
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {myComplaints.map((comp) => (
                    <ComplaintCard
                      key={comp._id}
                      complaint={comp}
                      onSelect={(c) => setSelectedComplaintId(c._id)}
                      onUpvote={handleUpvote}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================== */}
          {/* VIEW C: NOTIFICATIONS                                      */}
          {/* ========================================================== */}
          {currentNavView === 'notifications' && (
            <div className="space-y-5 animate-in fade-in-50 duration-150">
              <div className="border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-800 font-outfit">Notifications</h1>
                  <span className="bg-sky-100 text-sky-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-sky-200">
                    3 New
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Real-time status alerts for your reported campus tickets</p>
              </div>

              <div className="space-y-3 max-w-3xl">
                {studentNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`glass-card rounded-2xl p-4 border transition-all hover:shadow-md cursor-pointer flex items-start justify-between gap-4 ${
                      notif.unread ? 'border-sky-200 bg-sky-50/40' : 'border-slate-200'
                    }`}
                    onClick={() => {
                      const match = complaints.find((c) => c.ticketId === notif.ticketId);
                      if (match) setSelectedComplaintId(match._id);
                    }}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shrink-0 mt-0.5">
                        <Bell className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-200">
                            {notif.ticketId}
                          </span>
                          <span className="font-bold text-xs text-slate-800">{notif.title}</span>
                          {notif.unread && (
                            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{notif.desc}</p>
                        <span className="text-[10px] text-slate-400 font-medium block">{notif.time}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline shrink-0 hidden sm:block"
                    >
                      View Ticket →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* VIEW D: MY PROFILE                                         */}
          {/* ========================================================== */}
          {currentNavView === 'profile' && (
            <div className="space-y-5 animate-in fade-in-50 duration-150 max-w-3xl">
              <div className="border-b border-slate-200 pb-4">
                <h1 className="text-xl font-bold text-slate-800 font-outfit">Student Identity & Profile</h1>
                <p className="text-xs text-slate-500">Verified academic credentials and campus identification</p>
              </div>

              <div className="glass-card rounded-2xl p-6 border border-slate-200 space-y-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-bold text-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                    AS
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-slate-900 font-outfit">
                        {user?.name || 'Alex Smith'}
                      </h2>
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="h-3 w-3 text-emerald-600" />
                        Official Campus Student
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      Course: <strong>Computer Science & Engineering</strong>
                    </p>
                    <p className="text-xs text-slate-500">
                      College: Adhiyamaan College of Engineering (Autonomous)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Register Number</span>
                    <span className="font-mono font-bold text-slate-800">
                      {user?.registerNumber || user?.identifier || '6176AC21UCS143'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Official Email</span>
                    <span className="font-medium text-slate-800 truncate block">
                      {user?.email || 'alex.smith@campus.edu'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Department</span>
                    <span className="font-semibold text-slate-800">
                      {user?.department || 'CSE'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Total Issues Reported</span>
                    <span className="font-bold text-blue-600">
                      {myComplaints.length} tickets
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentNavView('my-complaints');
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    View My Reported Issues
                  </button>
                  <button
                    type="button"
                    onClick={logout}
                    className="px-4 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 3. Mobile Bottom Navigation Bar (Hidden on Desktop) */}
      <StudentBottomNav
        currentView={currentNavView}
        onSelectView={setCurrentNavView}
        onOpenReportModal={() => setIsNewModalOpen(true)}
      />

      {/* New Complaint Modal */}
      <NewComplaintModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={fetchComplaints}
      />

      {/* Complaint Detail Modal */}
      <ComplaintDetailModal
        complaintId={selectedComplaintId}
        onClose={() => setSelectedComplaintId(null)}
        onUpdate={fetchComplaints}
      />
    </div>
  );
};
