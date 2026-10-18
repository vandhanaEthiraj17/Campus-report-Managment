import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../../components/common/BrandLogo';
import {
  User,
  GraduationCap,
  Lock,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ShieldAlert,
  Wrench,
  Shield,
  Sparkles,
} from 'lucide-react';
import type { UserRole } from '../../types';

export const LoginPage: React.FC = () => {
  const { login, verifyIdentity, register } = useAuth();

  // Tab State: 'signin' | 'register'
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin');

  // Selected Role: Supports STUDENT, FACULTY, STAFF, ADMIN for signin; STUDENT and FACULTY for registration
  const [selectedRole, setSelectedRole] = useState<UserRole>('STUDENT');

  // Input states
  const [identifier, setIdentifier] = useState('6176AC21UCS143');
  const [password, setPassword] = useState('password123');
  const [dob, setDob] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Identity Verification Step State: 'verify' | 'createPassword'
  const [verificationStep, setVerificationStep] = useState<'verify' | 'createPassword'>('verify');
  const [verifiedMember, setVerifiedMember] = useState<{
    name: string;
    department: string;
    identifier: string;
    role: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleTabChange = (tab: 'signin' | 'register') => {
    setActiveTab(tab);
    setErrorMsg('');
    setSuccessMsg('');
    setVerificationStep('verify');
    setVerifiedMember(null);
    if (tab === 'register') {
      setIdentifier('');
      setPassword('');
      setConfirmPassword('');
      if (selectedRole === 'STAFF' || selectedRole === 'ADMIN') {
        setSelectedRole('STUDENT');
      }
    } else {
      // Prefill valid credentials for the selected role
      if (selectedRole === 'STUDENT') {
        setIdentifier('6176AC21UCS143');
        setPassword('password123');
      } else if (selectedRole === 'FACULTY') {
        setIdentifier('FAC-CSE-001');
        setPassword('password123');
      } else if (selectedRole === 'STAFF') {
        setIdentifier('STAFF-ELEC-001');
        setPassword('password123');
      } else if (selectedRole === 'ADMIN') {
        setIdentifier('ADMIN-001');
        setPassword('password123');
      }
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMsg('');
    setSuccessMsg('');
    if (activeTab === 'signin') {
      if (role === 'STUDENT') {
        setIdentifier('6176AC21UCS143');
        setPassword('password123');
      } else if (role === 'FACULTY') {
        setIdentifier('FAC-CSE-001');
        setPassword('password123');
      } else if (role === 'STAFF') {
        setIdentifier('STAFF-ELEC-001');
        setPassword('password123');
      } else if (role === 'ADMIN') {
        setIdentifier('ADMIN-001');
        setPassword('password123');
      }
    }
  };

  const handleQuickLogin = async (id: string, pass: string, role: UserRole) => {
    setIdentifier(id);
    setPassword(pass);
    setSelectedRole(role);
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await login(id, pass, role);
    } catch (err: any) {
      console.error('Quick login error:', err);
      setErrorMsg(
        err.response?.data?.message ||
        (err.message?.includes('Network')
          ? 'Cannot connect to backend server. Please verify the backend is running.'
          : `Failed to sign in as ${role}`)
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Sign In submit handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!identifier.trim()) {
      setErrorMsg(
        selectedRole === 'STUDENT'
          ? 'Please enter your Register Number or College Email.'
          : selectedRole === 'FACULTY'
          ? 'Please enter your Faculty ID or College Email.'
          : selectedRole === 'STAFF'
          ? 'Please enter your Staff ID or Email.'
          : 'Please enter your Admin ID or Email.'
      );
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(identifier.trim(), password, selectedRole);
    } catch (err: any) {
      console.error('Sign in error:', err);
      setErrorMsg(
        err.response?.data?.message ||
        (err.message?.includes('Network')
          ? 'Cannot connect to server. Please verify backend service.'
          : 'Invalid ID, Register Number, or password. Please try again.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Registration Step 1: Verify Identity
  const handleVerifyIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!identifier.trim()) {
      setErrorMsg(
        selectedRole === 'STUDENT'
          ? 'Please enter your Register Number.'
          : 'Please enter your Faculty ID.'
      );
      return;
    }

    if (!dob) {
      setErrorMsg('Please select or enter your Date of Birth.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await verifyIdentity(identifier.trim(), dob, selectedRole);
      if (res.success) {
        setVerifiedMember({
          name: res.name,
          department: res.department,
          identifier: res.identifier,
          role: res.role,
        });
        setVerificationStep('createPassword');
        setSuccessMsg('Identity Verified Successfully ✓');
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message || 'Your details were not found in the approved campus records.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Registration Step 2: Create Password
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!password) {
      setErrorMsg('Please enter a password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        identifier: identifier.trim(),
        dob,
        password,
        confirmPassword,
        role: selectedRole,
      });
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getIdentifierLabel = () => {
    switch (selectedRole) {
      case 'STUDENT':
        return activeTab === 'signin' ? 'Register Number or College Email' : 'Register Number';
      case 'FACULTY':
        return activeTab === 'signin' ? 'Faculty ID or College Email' : 'Faculty ID';
      case 'STAFF':
        return 'Technician Staff ID or Email';
      case 'ADMIN':
        return 'Admin ID or Email';
      default:
        return 'Register Number or Email';
    }
  };

  const getIdentifierPlaceholder = () => {
    switch (selectedRole) {
      case 'STUDENT':
        return activeTab === 'signin'
          ? 'e.g. 6176AC21UCS143 or vandhana@adhiyamaan.ac.in'
          : 'e.g. 6176AC21UCS143';
      case 'FACULTY':
        return 'e.g. FAC-CSE-001 or faculty@campus.edu';
      case 'STAFF':
        return 'e.g. STAFF-ELEC-001 or elec.staff@campus.edu';
      case 'ADMIN':
        return 'e.g. ADMIN-001 or admin@campus.edu';
      default:
        return 'Enter your identifier';
    }
  };

  const [currentBg, setCurrentBg] = useState<string>('/campus_background.png');

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 selection:bg-blue-500 selection:text-white">
      {/* Background Image Overlay with Smooth Fade */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 pointer-events-none"
        style={{
          backgroundImage: `url('${currentBg}')`,
          filter: 'blur(2px)',
          transform: 'scale(1.02)',
        }}
      />
      <div className="fixed inset-0 z-0 bg-slate-900/35 backdrop-blur-xs pointer-events-none" />

      {/* Campus Wallpaper Selector Pills (Floating at bottom-right) */}
      <div className="fixed bottom-4 right-4 z-20 hidden sm:flex items-center gap-2 bg-black/50 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 text-white shadow-xl">
        <span className="text-[10px] font-bold px-2 uppercase tracking-wider text-slate-300">
          Campus View:
        </span>
        <button
          type="button"
          onClick={() => setCurrentBg('/campus_main.png')}
          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
            currentBg === '/campus_main.png' || currentBg === '/campus_background.png'
              ? 'bg-blue-600 text-white shadow-md'
              : 'hover:bg-white/10 text-slate-300'
          }`}
        >
          Main Building
        </button>
        <button
          type="button"
          onClick={() => setCurrentBg('/campus_academic_block.png')}
          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
            currentBg === '/campus_academic_block.png'
              ? 'bg-blue-600 text-white shadow-md'
              : 'hover:bg-white/10 text-slate-300'
          }`}
        >
          Academic Block
        </button>
        <button
          type="button"
          onClick={() => setCurrentBg('/campus_computer_lab.png')}
          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
            currentBg === '/campus_computer_lab.png'
              ? 'bg-blue-600 text-white shadow-md'
              : 'hover:bg-white/10 text-slate-300'
          }`}
        >
          Computer Labs
        </button>
      </div>

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 p-6 sm:p-8 transition-all my-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <BrandLogo size="lg" className="mb-3" />
          <div className="inline-block px-2.5 py-0.5 mb-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-black uppercase tracking-wider">
            Adhiyamaan College of Engineering
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">SmartCampus</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Issue Reporting & Maintenance Management Platform
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Create Account */}
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/80 mb-5">
          <button
            type="button"
            onClick={() => handleTabChange('signin')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'signin'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('register')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'register'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Role Selector */}
        {verificationStep !== 'createPassword' && (
          <div className="mb-5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              USER TYPE
            </label>
            {activeTab === 'signin' ? (
              <>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleRoleSelect('STUDENT')}
                    className={`py-2 px-1 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      selectedRole === 'STUDENT'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <GraduationCap className="h-4 w-4 text-blue-600" />
                    <span>Student</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleSelect('FACULTY')}
                    className={`py-2 px-1 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      selectedRole === 'FACULTY'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <User className="h-4 w-4 text-indigo-600" />
                    <span>Faculty</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleSelect('STAFF')}
                    className={`py-2 px-1 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      selectedRole === 'STAFF'
                        ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Wrench className="h-4 w-4 text-amber-600" />
                    <span>Staff</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleSelect('ADMIN')}
                    className={`py-2 px-1 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      selectedRole === 'ADMIN'
                        ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Shield className="h-4 w-4 text-rose-600" />
                    <span>Admin</span>
                  </button>
                </div>

                {/* Instant One-Click Role Launch Action */}
                <button
                  type="button"
                  onClick={() => {
                    const id =
                      selectedRole === 'FACULTY'
                        ? 'FAC-CSE-001'
                        : selectedRole === 'STAFF'
                        ? 'STAFF-ELEC-001'
                        : selectedRole === 'ADMIN'
                        ? 'ADMIN-001'
                        : '6176AC21UCS143';
                    handleQuickLogin(id, 'password123', selectedRole);
                  }}
                  disabled={isLoading}
                  className="w-full mt-2.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>
                    {isLoading
                      ? 'Launching...'
                      : `Instant Launch ${
                          selectedRole === 'STUDENT'
                            ? 'Student'
                            : selectedRole === 'FACULTY'
                            ? 'Faculty'
                            : selectedRole === 'STAFF'
                            ? 'Technician Staff'
                            : 'Campus Admin'
                        } View →`}
                  </span>
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleRoleSelect('STUDENT')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    selectedRole === 'STUDENT'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <GraduationCap className="h-4 w-4 text-blue-600" />
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSelect('FACULTY')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    selectedRole === 'FACULTY'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <User className="h-4 w-4 text-indigo-600" />
                  Faculty
                </button>
              </div>
            )}
          </div>
        )}

        {/* Alert Notifications */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
            <ShieldAlert className="h-4 w-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* SIGN IN TAB */}
        {activeTab === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                {getIdentifierLabel()}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={getIdentifierPlaceholder()}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs font-medium bg-slate-50/50 border border-slate-200 focus:border-blue-500 focus:bg-white transition-all outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full glass-input rounded-xl pl-10 pr-3.5 py-2.5 text-xs bg-slate-50/50 border border-slate-200 focus:border-blue-500 focus:bg-white transition-all outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 disabled:opacity-60 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
            >
              {isLoading ? 'Signing In...' : 'Sign In to Campus Portal'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        {/* CREATE ACCOUNT TAB */}
        {activeTab === 'register' && (
          <>
            {/* STEP 1: IDENTITY VERIFICATION */}
            {verificationStep === 'verify' && (
              <form onSubmit={handleVerifyIdentity} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    {selectedRole === 'STUDENT' ? 'Register Number' : 'Faculty ID'}
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={
                      selectedRole === 'STUDENT'
                        ? 'e.g. 6176AC21UCS143 or 6176AC21UCS170'
                        : 'e.g. FAC-CSE-001'
                    }
                    className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs uppercase font-medium bg-slate-50/50 border border-slate-200 focus:border-blue-500 focus:bg-white transition-all outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full glass-input rounded-xl pl-10 pr-3.5 py-2.5 text-xs bg-slate-50/50 border border-slate-200 focus:border-blue-500 focus:bg-white transition-all outline-none"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 disabled:opacity-60 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
                >
                  {isLoading ? 'Verifying Identity...' : 'Verify My Identity'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}

            {/* STEP 2: CREATE PASSWORD (AFTER IDENTITY VERIFIED) */}
            {verificationStep === 'createPassword' && verifiedMember && (
              <form onSubmit={handleCreateAccount} className="space-y-4">
                {/* Verified Identity Card */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Verified Campus Member
                  </div>
                  <p className="font-bold text-slate-800 text-sm">{verifiedMember.name}</p>
                  <p className="text-slate-600">
                    ID: <span className="font-mono font-semibold">{verifiedMember.identifier}</span>{' '}
                    | Dept: <span className="font-semibold">{verifiedMember.department}</span>
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Create Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full glass-input rounded-xl pl-10 pr-3.5 py-2.5 text-xs bg-slate-50/50 border border-slate-200 focus:border-blue-500 focus:bg-white transition-all outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full glass-input rounded-xl pl-10 pr-3.5 py-2.5 text-xs bg-slate-50/50 border border-slate-200 focus:border-blue-500 focus:bg-white transition-all outline-none"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 disabled:opacity-60 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
          </>
        )}

        {/* Quick Test Demo Credentials Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Quick Test Credentials
            </span>
            <span className="text-[10px] text-blue-600 font-bold">1-Click Direct Launch</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-left">
            <button
              type="button"
              onClick={() => handleQuickLogin('vandhana@adhiyamaan.ac.in', 'password123', 'STUDENT')}
              className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200/70 hover:border-blue-300 transition-all text-left cursor-pointer"
            >
              <div className="font-bold text-slate-700 text-xs flex items-center justify-between">
                <span>🎓 Vandhana</span>
                <span className="text-[9px] text-blue-600 bg-blue-100/60 px-1 rounded font-bold">Go →</span>
              </div>
              <div className="text-slate-400 font-mono text-[10px] truncate">
                vandhana@adhiyamaan.ac.in
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('6176AC21UCS143', 'password123', 'STUDENT')}
              className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200/70 hover:border-blue-300 transition-all text-left cursor-pointer"
            >
              <div className="font-bold text-slate-700 text-xs flex items-center justify-between">
                <span>🎓 Student</span>
                <span className="text-[9px] text-blue-600 bg-blue-100/60 px-1 rounded font-bold">Go →</span>
              </div>
              <div className="text-slate-400 font-mono text-[10px] truncate">6176AC21UCS143</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('FAC-CSE-001', 'password123', 'FACULTY')}
              className="p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200/70 hover:border-indigo-300 transition-all text-left cursor-pointer"
            >
              <div className="font-bold text-slate-700 text-xs flex items-center justify-between">
                <span>👨‍🏫 Faculty</span>
                <span className="text-[9px] text-indigo-600 bg-indigo-100/60 px-1 rounded font-bold">Go →</span>
              </div>
              <div className="text-slate-400 font-mono text-[10px] truncate">FAC-CSE-001</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('STAFF-ELEC-001', 'password123', 'STAFF')}
              className="p-2 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200/70 hover:border-amber-300 transition-all text-left cursor-pointer"
            >
              <div className="font-bold text-slate-700 text-xs flex items-center justify-between">
                <span>🛠️ Technician Staff</span>
                <span className="text-[9px] text-amber-600 bg-amber-100/60 px-1 rounded font-bold">Go →</span>
              </div>
              <div className="text-slate-400 font-mono text-[10px] truncate">STAFF-ELEC-001</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('ADMIN-001', 'password123', 'ADMIN')}
              className="col-span-2 p-2 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200/70 hover:border-rose-300 transition-all text-left cursor-pointer"
            >
              <div className="font-bold text-slate-700 text-xs flex items-center justify-between">
                <span>🛡️ Super Campus Admin</span>
                <span className="text-[9px] text-rose-600 bg-rose-100/60 px-1.5 py-0.5 rounded font-bold">Launch Admin Center →</span>
              </div>
              <div className="text-slate-400 font-mono text-[10px] truncate">ADMIN-001</div>
            </button>
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-2.5 font-medium">
            Password for all demo accounts:{' '}
            <span className="font-mono font-bold text-slate-600">password123</span>
          </p>
        </div>
      </div>
    </div>
  );
};
