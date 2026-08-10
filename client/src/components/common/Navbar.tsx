import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, User, LogOut, ChevronDown, Wrench, Building2, GraduationCap, CheckCircle2 } from 'lucide-react';
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
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-800 tracking-tight font-outfit">SmartCampus</span>
              <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded font-mono font-semibold">v2.5 Enterprise</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Centralized Maintenance & Issue Management</p>
          </div>
        </div>

        {/* Right Section */}
        {user ? (
          <div className="flex items-center gap-4">
            {/* Live Role Switcher (For Demo Presentation) */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  roleColors[user.role]
                } hover:brightness-105`}
                title="Click to switch role view during demo"
              >
                <span className="h-2 w-2 rounded-full bg-current animate-ping"></span>
                <span>Role: {user.role}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-56 glass-card rounded-xl border border-slate-200 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Demo Role Switcher
                  </div>
                  <div className="space-y-1">
                    <button
                      onClick={() => handleRoleSwitch('STUDENT')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between cursor-pointer ${
                        user.role === 'STUDENT' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-emerald-500" /> Student View</span>
                      {user.role === 'STUDENT' && <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />}
                    </button>

                    <button
                      onClick={() => handleRoleSwitch('FACULTY')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between cursor-pointer ${
                        user.role === 'FACULTY' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2"><User className="h-4 w-4 text-indigo-500" /> Faculty View</span>
                      {user.role === 'FACULTY' && <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />}
                    </button>

                    <button
                      onClick={() => handleRoleSwitch('STAFF')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between cursor-pointer ${
                        user.role === 'STAFF' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2"><Wrench className="h-4 w-4 text-amber-500" /> Maintenance Staff</span>
                      {user.role === 'STAFF' && <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />}
                    </button>

                    <button
                      onClick={() => handleRoleSwitch('ADMIN')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between cursor-pointer ${
                        user.role === 'ADMIN' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2"><Shield className="h-4 w-4 text-rose-500" /> Admin Command Center</span>
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
                <p className="text-[11px] text-slate-500 font-medium">{user.department || user.email}</p>
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
