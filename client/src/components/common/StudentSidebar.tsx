import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Building2, 
  LayoutDashboard, 
  PlusCircle, 
  ClipboardList, 
  Bell, 
  User, 
  LogOut, 
  X,
  ChevronRight
} from 'lucide-react';

export type StudentNavView = 'overview' | 'my-complaints' | 'notifications' | 'profile';

interface StudentSidebarProps {
  currentView: StudentNavView;
  onSelectView: (view: StudentNavView) => void;
  onOpenReportModal: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  notificationCount?: number;
}

export const StudentSidebar: React.FC<StudentSidebarProps> = ({
  currentView,
  onSelectView,
  onOpenReportModal,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  notificationCount = 3,
}) => {
  const { logout } = useAuth();

  const handleNavClick = (view: StudentNavView) => {
    onSelectView(view);
    setIsMobileMenuOpen(false);
  };

  const handleReportClick = () => {
    onOpenReportModal();
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          data-testid="sidebar-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="student-sidebar"
        data-testid="sidebar-container"
        data-menu-open={isMobileMenuOpen ? 'true' : 'false'}
        className={`sidebar-container fixed top-0 bottom-0 left-0 w-64 bg-white border-r border-slate-200/90 z-50 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isMobileMenuOpen ? 'menu-open translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header & Logo */}
        <div className="flex flex-col">
          <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
            <div data-testid="sidebar-logo" className="flex items-center gap-2.5">
              <div className="h-8.5 w-8.5 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-outfit font-bold text-lg text-slate-900 tracking-tight">
                  smartcampus
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Issue Portal</span>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              type="button"
              data-testid="sidebar-close-button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 md:hidden cursor-pointer transition-colors"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Section Label: STUDENT SPACE */}
          <div className="px-5 pt-5 pb-2">
            <span
              data-testid="sidebar-section-label"
              className="text-[11px] font-bold text-slate-400 tracking-wider uppercase block"
            >
              STUDENT SPACE
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="px-3 space-y-1">
            {/* 1. Overview */}
            <button
              type="button"
              data-testid="nav-overview"
              onClick={() => handleNavClick('overview')}
              className={`w-full relative flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                currentView === 'overview'
                  ? 'bg-sky-50 text-blue-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {currentView === 'overview' && (
                <span
                  data-testid="active-indicator"
                  className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-blue-600 rounded-r-full"
                />
              )}
              <div className="flex items-center gap-3">
                <LayoutDashboard
                  className={`h-[18px] w-[18px] ${
                    currentView === 'overview' ? 'text-blue-600' : 'text-slate-400'
                  }`}
                />
                <span>Overview</span>
              </div>
              {currentView === 'overview' && (
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              )}
            </button>

            {/* 2. Report Issue */}
            <button
              type="button"
              data-testid="nav-report-issue"
              onClick={handleReportClick}
              className="w-full relative flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all duration-150 cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <PlusCircle className="h-[18px] w-[18px] text-blue-600 group-hover:scale-105 transition-transform" />
                <span>Report Issue</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-400 transition-colors" />
            </button>

            {/* 3. My Complaints */}
            <button
              type="button"
              data-testid="nav-my-complaints"
              onClick={() => handleNavClick('my-complaints')}
              className={`w-full relative flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                currentView === 'my-complaints'
                  ? 'bg-sky-50 text-blue-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {currentView === 'my-complaints' && (
                <span
                  data-testid="active-indicator"
                  className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-blue-600 rounded-r-full"
                />
              )}
              <div className="flex items-center gap-3">
                <ClipboardList
                  className={`h-[18px] w-[18px] ${
                    currentView === 'my-complaints' ? 'text-blue-600' : 'text-slate-400'
                  }`}
                />
                <span>My Complaints</span>
              </div>
              {currentView === 'my-complaints' && (
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              )}
            </button>

            {/* 4. Notifications */}
            <button
              type="button"
              data-testid="nav-notifications"
              onClick={() => handleNavClick('notifications')}
              className={`w-full relative flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                currentView === 'notifications'
                  ? 'bg-sky-50 text-blue-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {currentView === 'notifications' && (
                <span
                  data-testid="active-indicator"
                  className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-blue-600 rounded-r-full"
                />
              )}
              <div className="flex items-center gap-3">
                <Bell
                  className={`h-[18px] w-[18px] ${
                    currentView === 'notifications' ? 'text-blue-600' : 'text-slate-400'
                  }`}
                />
                <span>Notifications</span>
              </div>
              <span
                data-testid="nav-notifications-badge"
                className="bg-sky-100 text-sky-800 text-[11px] font-bold px-2 py-0.5 rounded-full border border-sky-200"
              >
                {notificationCount}
              </span>
            </button>
          </nav>
        </div>

        {/* Bottom Section: Profile & Sign Out */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          {/* My Profile Link */}
          <button
            type="button"
            data-testid="nav-profile"
            onClick={() => handleNavClick('profile')}
            className={`w-full relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
              currentView === 'profile'
                ? 'bg-sky-50 text-blue-700'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            {currentView === 'profile' && (
              <span
                data-testid="active-indicator"
                className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-blue-600 rounded-r-full"
              />
            )}
            <User
              className={`h-[18px] w-[18px] ${
                currentView === 'profile' ? 'text-blue-600' : 'text-slate-400'
              }`}
            />
            <span>My Profile</span>
          </button>

          {/* Student Profile Card */}
          <div
            data-testid="student-profile-card"
            className="p-3 bg-slate-50/90 rounded-lg border border-slate-200/70 flex items-center gap-3"
          >
            <div
              data-testid="avatar-initials"
              className="h-9 w-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs"
            >
              AS
            </div>
            <div className="flex-1 min-w-0">
              <p
                data-testid="student-name"
                className="text-xs font-bold text-slate-800 truncate leading-tight"
              >
                Alex Smith
              </p>
              <p
                data-testid="student-course"
                className="text-[10px] text-slate-500 font-medium truncate"
              >
                Computer Science
              </p>
            </div>
          </div>

          {/* Sign Out Action */}
          <button
            type="button"
            data-testid="nav-signout"
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4 text-rose-500" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
