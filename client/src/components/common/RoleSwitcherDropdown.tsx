import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ChevronDown, GraduationCap, User, Wrench, Shield, CheckCircle2 } from 'lucide-react';
import type { UserRole } from '../../types/index';

export const RoleSwitcherDropdown: React.FC = () => {
  const { user, quickSwitchRole } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  if (!user || !import.meta.env.DEV) return null;

  const roleColors: Record<UserRole, string> = {
    STUDENT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    FACULTY: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    ADMIN: 'bg-rose-50 text-rose-700 border-rose-200',
    STAFF: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  const handleRoleSwitch = async (role: UserRole) => {
    setShowRoleMenu(false);
    await quickSwitchRole(role);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowRoleMenu(!showRoleMenu)}
        className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
          roleColors[user.role]
        } hover:brightness-95 shadow-xs`}
        title="Click to switch view between Student, Faculty, Staff, or Admin"
      >
        <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
        <span>Role: {user.role}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>

      {showRoleMenu && (
        <div className="absolute right-0 mt-2 w-60 glass-card bg-white/95 rounded-2xl border border-slate-200 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Switch Active Portal View
          </div>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => handleRoleSwitch('STUDENT')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                user.role === 'STUDENT'
                  ? 'bg-blue-50 text-blue-600 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-emerald-500" /> Student View
              </span>
              {user.role === 'STUDENT' && <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />}
            </button>

            <button
              type="button"
              onClick={() => handleRoleSwitch('FACULTY')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                user.role === 'FACULTY'
                  ? 'bg-blue-50 text-blue-600 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-500" /> Faculty View
              </span>
              {user.role === 'FACULTY' && <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />}
            </button>

            <button
              type="button"
              onClick={() => handleRoleSwitch('STAFF')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                user.role === 'STAFF'
                  ? 'bg-blue-50 text-blue-600 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-amber-500" /> Technician Staff View
              </span>
              {user.role === 'STAFF' && <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />}
            </button>

            <button
              type="button"
              onClick={() => handleRoleSwitch('ADMIN')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                user.role === 'ADMIN'
                  ? 'bg-blue-50 text-blue-600 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-rose-500" /> Admin Command Center
              </span>
              {user.role === 'ADMIN' && <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
