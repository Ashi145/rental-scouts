import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LandlordProfile } from '../types/index.ts';
import { api } from '../services/api.ts';

interface AuthContextType {
  user: User | null;
  landlordProfile: LandlordProfile | null;
  loading: boolean;
  unreadNotifications: number;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    role: 'TENANT' | 'LANDLORD';
    landlordRole?: 'LANDLORD' | 'LANDLADY' | 'PROPERTY_OWNER' | 'PROPERTY_MANAGER';
    secondaryPhone?: string;
    businessName?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [landlordProfile, setLandlordProfile] = useState<LandlordProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const fetchCurrentUser = async () => {
    try {
      const data = await api.auth.me();
      setUser(data.user);
      setLandlordProfile(data.landlordProfile || null);
      if (data.user) {
        try {
          const notif = await api.notifications.list();
          setUnreadNotifications(notif.unreadCount);
        } catch {
          // ignore
        }
      }
    } catch {
      setUser(null);
      setLandlordProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    await api.auth.login(credentials);
    await fetchCurrentUser();
  };

  const register = async (data: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    role: 'TENANT' | 'LANDLORD';
    landlordRole?: 'LANDLORD' | 'LANDLADY' | 'PROPERTY_OWNER' | 'PROPERTY_MANAGER';
    secondaryPhone?: string;
    businessName?: string;
  }) => {
    await api.auth.register(data);
    await fetchCurrentUser();
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
      setLandlordProfile(null);
      setUnreadNotifications(0);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        landlordProfile,
        loading,
        unreadNotifications,
        login,
        register,
        logout,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
