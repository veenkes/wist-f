import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '@/services/auth.service';
import { ApiClientError } from '@/lib/api-client';

export type UserRole = 'CEO' | 'Accountant' | 'Teacher' | 'Support' | 'Admin' | 'Manager' | 'Parent';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    // Safety timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 2000);

    // Check for existing session on mount
    const checkSession = async () => {
      try {
        if (authService.isAuthenticated()) {
          // Just load user from localStorage, don't refresh token
          const storedUser = localStorage.getItem('user');
          if (storedUser && mounted) {
            setUser(JSON.parse(storedUser));
          }
        }
      } catch (error) {
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkSession();

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login(email, password);
      
      // Decode JWT token to get user data
      const tokenPayload = JSON.parse(atob(response.access_token.split('.')[1]));
      
      const userData: User = {
        id: tokenPayload.user_id || '1',
        name: email.split('@')[0], // Use email prefix as name for now
        email: email,
        role: tokenPayload.role as UserRole,
      };

      setUser(userData);
      // Store user data in localStorage for persistence
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw new Error(error.message);
      }
      throw error;
    }
  };

  const logout = async () => {
    authService.logout();
    setUser(null);
    localStorage.removeItem('user');
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user && authService.isAuthenticated(),
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};