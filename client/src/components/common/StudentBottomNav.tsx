import React from 'react';
import { LayoutDashboard, PlusCircle, ClipboardList, User } from 'lucide-react';
import type { StudentNavView } from './StudentSidebar';

interface StudentBottomNavProps {
  currentView: StudentNavView;
  onSelectView: (view: StudentNavView) => void;
  onOpenReportModal: () => void;
}

export const StudentBottomNav: React.FC<StudentBottomNavProps> = ({
  currentView,
  onSelectView,
  onOpenReportModal,
}) => {
  return (
    <nav
      data-testid="mobile-bottom-nav"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-3 py-1.5 flex items-center justify-around shadow-lg"
    >
      {/* 1. Overview */}
      <button
        type="button"
        data-testid="mobile-nav-overview"
        onClick={() => onSelectView('overview')}
        className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
          currentView === 'overview' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <LayoutDashboard className="h-5 w-5 mb-0.5" />
        <span>Overview</span>
      </button>

      {/* 2. Report Issue */}
      <button
        type="button"
        data-testid="mobile-nav-report-issue"
        onClick={onOpenReportModal}
        className="flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
      >
        <div className="h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30 mb-0.5">
          <PlusCircle className="h-4.5 w-4.5" />
        </div>
        <span>Report Issue</span>
      </button>

      {/* 3. My Complaints */}
      <button
        type="button"
        data-testid="mobile-nav-my-complaints"
        onClick={() => onSelectView('my-complaints')}
        className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
          currentView === 'my-complaints' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <ClipboardList className="h-5 w-5 mb-0.5" />
        <span>My Complaints</span>
      </button>

      {/* 4. Profile */}
      <button
        type="button"
        data-testid="mobile-nav-profile"
        onClick={() => onSelectView('profile')}
        className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
          currentView === 'profile' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <User className="h-5 w-5 mb-0.5" />
        <span>Profile</span>
      </button>
    </nav>
  );
};
