import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import type { IUser, UserRole } from '../types/index';

interface AuthContextType {
  user: IUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  registerUser: (data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    department?: string;
    phone?: string;
  }) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  logout: () => void;
  quickSwitchRole: (targetRole: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('smart_campus_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
      } catch (err) {
        console.error('Failed to load user session', err);
        localStorage.removeItem('smart_campus_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token: authToken, user: userData } = res.data;
      localStorage.setItem('smart_campus_token', authToken);
      setToken(authToken);
      setUser(userData);
    } finally {
      setIsLoading(false);
    }
  };

  const registerUser = async (data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    department?: string;
    phone?: string;
  }) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/register', data);
      const { token: authToken, user: userData } = res.data;
      localStorage.setItem('smart_campus_token', authToken);
      setToken(authToken);
      setUser(userData);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (email: string, otp: string) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/register-verify-otp', { email, otp });
      const { token: authToken, user: userData } = res.data;
      localStorage.setItem('smart_campus_token', authToken);
      setToken(authToken);
      setUser(userData);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('smart_campus_token');
    setToken(null);
    setUser(null);
  };

  // Quick switch role utility for effortless demoing during evaluation
  const quickSwitchRole = async (targetRole: UserRole) => {
    const roleEmails: Record<UserRole, string> = {
      STUDENT: 'student@campus.edu',
      FACULTY: 'faculty@campus.edu',
      ADMIN: 'admin@campus.edu',
      STAFF: 'elec.staff@campus.edu',
    };
    await login(roleEmails[targetRole], 'password123');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        registerUser,
        logout,
        quickSwitchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
