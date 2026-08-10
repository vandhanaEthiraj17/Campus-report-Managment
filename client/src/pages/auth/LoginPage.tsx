import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Building2, Shield, User, GraduationCap, Wrench, Lock, Mail, ArrowRight } from 'lucide-react';
import type { UserRole } from '../../types/index';

export const LoginPage: React.FC = () => {
  const { login, registerUser, quickSwitchRole } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);

  // Form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [department, setDepartment] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      if (isRegistering) {
        await registerUser({ name, email, password, role, department });
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Authentication failed. Check details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoPreset = async (targetRole: UserRole) => {
    setIsLoading(true);
    try {
      await quickSwitchRole(targetRole);
    } catch (err: any) {
      setErrorMsg('Failed to login as demo user.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cover bg-center flex flex-col justify-center items-center p-4 relative overflow-hidden" style={{ backgroundImage: "linear-gradient(rgba(241, 245, 249, 0.8), rgba(241, 245, 249, 0.8)), url('/campus_background.png')" }}>
      {/* Dynamic Background Glow Effects */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md glass-card rounded-2xl border border-slate-200 p-8 shadow-xl relative z-10 my-6">
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-xl shadow-blue-500/25 mb-3">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight font-outfit">SmartCampus</h1>
          <p className="text-xs text-slate-500 mt-1">Issue Reporting & Maintenance Management Platform</p>
        </div>

        {/* ONE-CLICK DEMO LOGIN ACCOUNTS */}
        <div className="mb-6 p-4 rounded-xl bg-slate-100/80 border border-slate-200/60 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span>🚀 1-Click Demo Login</span>
            <span className="text-blue-600">Click to enter as</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoPreset('STUDENT')}
              className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-xs flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
            >
              <GraduationCap className="h-4 w-4" /> Student
            </button>

            <button
              type="button"
              onClick={() => handleDemoPreset('FACULTY')}
              className="p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
            >
              <User className="h-4 w-4" /> Faculty
            </button>

            <button
              type="button"
              onClick={() => handleDemoPreset('STAFF')}
              className="p-2 rounded-lg bg-amber-55/60 border border-amber-200 text-amber-800 hover:bg-amber-100/80 text-xs flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
            >
              <Wrench className="h-4 w-4" /> Technician Staff
            </button>

            <button
              type="button"
              onClick={() => handleDemoPreset('ADMIN')}
              className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
            >
              <Shield className="h-4 w-4" /> Admin
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 mb-6">
          <button
            type="button"
            onClick={() => setIsRegistering(false)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              !isRegistering ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsRegistering(true)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isRegistering ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Create Account
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs text-center font-medium">
            {errorMsg}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          {isRegistering && (
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Johnson"
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs"
                required
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Campus Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@campus.edu"
                className="w-full glass-input rounded-xl pl-9 pr-3.5 py-2.5 text-xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full glass-input rounded-xl pl-9 pr-3.5 py-2.5 text-xs"
                required
              />
            </div>
          </div>

          {isRegistering && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e: any) => setRole(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2.5 text-xs"
                >
                  <option value="STUDENT" className="bg-white text-slate-800">Student</option>
                  <option value="FACULTY" className="bg-white text-slate-800">Faculty</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Computer Science"
                  className="w-full glass-input rounded-xl px-3 py-2.5 text-xs"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer"
          >
            {isLoading ? 'Authenticating...' : isRegistering ? 'Register Account' : 'Sign In to Campus Portal'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
