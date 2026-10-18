import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, ChevronDown, GraduationCap, User, Wrench, Shield, CheckCircle2 } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import type { UserRole } from '../../types/index';

export const Navbar: React.FC = () => {
  const { user, logout, quickSwitchRole } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const roleColors: Record<UserRole, string> = {
    STUDENT: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    FACULTY: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    ADMIN: 'bg-rose-50 text-rose-600 border-rose-200',
    STAFF: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  const handleRoleSwitch = async (role: UserRole) => {
    setShowRoleMenu(false);
    await quickSwitchRole(role);
  };

  return (
    <header className="sticky top-0 z-40 glass-nav border-b border-slate-200 px-4 lg:px-8 py-3">
      <div className="mx-auto max-w-7xl flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <BrandLogo size="md" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-800 tracking-tight font-outfit">SmartCampus</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Issue Reporting & Maintenance Management Platform</p>
          </div>
        </div>

        {/* Right Section */}
        {user ? (
          <div className="flex items-center gap-4">
            {/* Interactive User Role Switcher Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                  roleColors[user.role]
                } hover:brightness-95 shadow-xs`}
                title="Click to switch view between Student, Faculty, Staff, or Admin"
              >
                <span className="h-2 w-2 rounded-full bg-current animate-pulse"></span>
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

            {/* User Profile Pill */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <img
                src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
                alt={user.name}
                className="h-9 w-9 rounded-full bg-slate-100 border border-blue-500/20"
              />
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-800 leading-tight">{user.name}</p>
                <p className="text-[11px] text-slate-500 font-medium">
                  {user.identifier || user.department || user.email}
                </p>
              </div>

              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
};
