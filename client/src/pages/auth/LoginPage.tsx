import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Building2, Shield, User, GraduationCap, Wrench, Lock, Mail, ArrowRight, Phone, RefreshCw, KeyRound } from 'lucide-react';
import type { UserRole } from '../../types/index';

export const LoginPage: React.FC = () => {
  const { login, verifyOtp, quickSwitchRole } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);

  // Form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');

  // OTP and flow states
  const [otpSent, setOtpSent] = useState(false);
  const [loginRequiresOtp, setLoginRequiresOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [enableDemoLogin, setEnableDemoLogin] = useState(true);
  const [collegeDomain, setCollegeDomain] = useState('@adhiyamaan.ac.in');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Fetch authentication configuration from the backend on load
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get('/auth/config');
        setEnableDemoLogin(res.data.enableDemoLogin);
        setCollegeDomain(res.data.collegeDomain);
      } catch (err) {
        console.error('Failed to load login config', err);
      }
    };
    fetchConfig();
  }, []);

  // Handle resend OTP cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    setIsLoading(true);

    try {
      if (isRegistering) {
        if (password !== confirmPassword) {
          setErrorMsg('Passwords do not match.');
          setIsLoading(false);
          return;
        }

        if (!otpSent) {
          // Step 1: Validate domain and send OTP via backend
          const res = await api.post('/auth/register-send-otp', {
            name,
            email,
            password,
            department,
            phone,
          });
          setOtpSent(true);
          setInfoMsg(res.data.message || 'OTP code sent to your email.');
          setCooldown(60);
        } else {
          // Step 2: Verify OTP code and finish registering student
          await verifyOtp(email, otpCode);
        }
      } else {
        if (loginRequiresOtp) {
          // Verify login OTP code for unverified users
          await verifyOtp(email, otpCode);
        } else {
          // Normal Authentication
          await login(email, password);
        }
      }
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.requiresVerification) {
        setLoginRequiresOtp(true);
        setInfoMsg(data.message || 'OTP code sent to your email.');
        setCooldown(60);
      } else {
        setErrorMsg(data?.message || 'Authentication failed. Check details.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setErrorMsg('');
    setInfoMsg('');
    setIsLoading(true);
    try {
      const endpoint = isRegistering ? '/auth/register-send-otp' : '/auth/login';
      const payload = isRegistering 
        ? { name, email, password, department, phone }
        : { email, password };
      
      const res = await api.post(endpoint, payload);
      setInfoMsg(res.data.message || 'Verification OTP code has been resent.');
      setCooldown(60);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to resend verification code.');
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

  const toggleTab = (register: boolean) => {
    setIsRegistering(register);
    setErrorMsg('');
    setInfoMsg('');
    setOtpSent(false);
    setLoginRequiresOtp(false);
    setOtpCode('');
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

        {/* ONE-CLICK DEMO LOGIN ACCOUNTS (DEV ONLY) */}
        {enableDemoLogin && (
          <div className="mb-6 p-4 rounded-xl bg-slate-100/80 border border-slate-200/60 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <span>🚀 Demo Login (DEV ONLY)</span>
              <span className="text-blue-600 font-mono text-[10px]">Active</span>
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
                className="p-2 rounded-lg bg-amber-50/60 border border-amber-200 text-amber-800 hover:bg-amber-100/80 text-xs flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
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
        )}

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 mb-6">
          <button
            type="button"
            onClick={() => toggleTab(false)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              !isRegistering ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => toggleTab(true)}
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

        {infoMsg && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-600 text-xs text-center font-medium">
            {infoMsg}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          {/* Registration Mode inputs */}
          {isRegistering && !otpSent && (
            <>
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

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Computer Science"
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full glass-input rounded-xl pl-9 pr-3.5 py-2.5 text-xs"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email and Password inputs (hidden during OTP registration stage to prevent modifications) */}
          {(!isRegistering || !otpSent) && (!isRegistering || !loginRequiresOtp) && (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  {isRegistering ? 'Official College Email' : 'Campus Email'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={`student${collegeDomain}`}
                    className="w-full glass-input rounded-xl pl-9 pr-3.5 py-2.5 text-xs"
                    required
                    disabled={otpSent || loginRequiresOtp}
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
                    disabled={otpSent || loginRequiresOtp}
                  />
                </div>
              </div>
            </>
          )}

          {isRegistering && !otpSent && (
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full glass-input rounded-xl pl-9 pr-3.5 py-2.5 text-xs"
                  required
                />
              </div>
            </div>
          )}

          {/* OTP code input field */}
          {((isRegistering && otpSent) || (!isRegistering && loginRequiresOtp)) && (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <KeyRound className="h-4 w-4 text-blue-600 animate-pulse" />
                    Enter 6-Digit OTP Code
                  </label>
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold font-mono">
                    Time Limit: 5 min
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center font-mono font-bold tracking-[0.5em] text-lg bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 outline-none"
                  required
                />
              </div>

              {/* Resend Cooldown Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={cooldown > 0 || isLoading}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-500 disabled:text-slate-400 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                  {cooldown > 0 ? `Resend Code in ${cooldown}s` : 'Resend Code'}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer"
          >
            {isLoading ? (
              'Processing...'
            ) : isRegistering ? (
              otpSent ? 'Verify Email & Create Account' : 'Send OTP Verification Code'
            ) : loginRequiresOtp ? (
              'Verify OTP & Sign In'
            ) : (
              'Sign In to Campus Portal'
            )}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
