import React, { createContext, useState, useContext, useEffect } from 'react';
import AuthService from '../services/AuthService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const currentUser = AuthService.getCurrentSessionUser();
        if (currentUser && currentUser.id) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = (userData) => {
    if (userData && userData.id) {
      // Ensure the user data has the correct role mapping
      const userWithRoles = {
        ...userData,
        // Map roles if needed (e.g., if backend returns different role names)
        role: userData.role || 'staff'
      };
      setUser(userWithRoles);
    } else {
      console.error('Invalid user data:', userData);
    }
  };

  const logout = async () => {
    await AuthService.logout();
    setUser(null);
  };

  const isAdmin = () => {
    return user?.role === 'admin' || user?.role === 'administrator';
  };

  const isCashier = () => {
    return user?.role === 'cashier' || user?.role === 'staff';
  };

  const isManager = () => {
    return user?.role === 'manager';
  };

  const getUserDisplayName = () => {
    if (!user) return '';
    return user.fullName || user.email || '';
  };

  const getUserRole = () => {
    if (!user) return '';
    return user.role || '';
  };

  const hasPermission = (requiredRoles) => {
    if (!user) return false;
    if (!requiredRoles || requiredRoles.length === 0) return true;
    return requiredRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAdmin,
      isCashier,
      isManager,
      getUserDisplayName,
      getUserRole,
      hasPermission,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
};