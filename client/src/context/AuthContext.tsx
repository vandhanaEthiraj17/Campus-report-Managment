import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import type { IUser, UserRole } from '../types/index';

interface AuthContextType {
  user: IUser | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string, role?: UserRole) => Promise<void>;
  verifyIdentity: (
    identifier: string,
    dob: string,
    role: UserRole
  ) => Promise<{ success: boolean; message: string; name: string; department: string; identifier: string; role: string }>;
  register: (data: {
    identifier: string;
    dob: string;
    password: string;
    confirmPassword: string;
    role: UserRole;
  }) => Promise<void>;
  logout: () => void;
  quickSwitchRole: (role: UserRole) => Promise<void>;
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

  const login = async (identifier: string, password: string, role?: UserRole) => {
    const res = await api.post('/auth/login', { identifier, password, role });
    const { token: authToken, user: userData } = res.data;
    localStorage.setItem('smart_campus_token', authToken);
    setToken(authToken);
    setUser(userData);
  };

  const verifyIdentity = async (identifier: string, dob: string, role: UserRole) => {
    const res = await api.post('/auth/verify-identity', { identifier, dob, role });
    return res.data;
  };

  const register = async (data: {
    identifier: string;
    dob: string;
    password: string;
    confirmPassword: string;
    role: UserRole;
  }) => {
    const res = await api.post('/auth/register', data);
    const { token: authToken, user: userData } = res.data;
    localStorage.setItem('smart_campus_token', authToken);
    setToken(authToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('smart_campus_token');
    setToken(null);
    setUser(null);
  };

  const quickSwitchRole = async (targetRole: UserRole) => {
    let identifier = '6176AC21UCS143';
    if (targetRole === 'FACULTY') identifier = 'FAC-CSE-001';
    else if (targetRole === 'STAFF') identifier = 'STAFF-ELEC-001';
    else if (targetRole === 'ADMIN') identifier = 'ADMIN-001';

    await login(identifier, 'password123', targetRole);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        verifyIdentity,
        register,
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
