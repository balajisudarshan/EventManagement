import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user on start
  useEffect(() => {
    const savedToken = localStorage.getItem('cems_token');
    const savedUser = localStorage.getItem('cems_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        // Refresh latest profile from backend
        fetchProfile();
      } catch (e) {
        logout();
      }
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.user) {
        setUser(res.user);
        localStorage.setItem('cems_user', JSON.stringify(res.user));
      }
    } catch (err) {
      // If token expired
      if (err.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('cems_token', res.token);
    localStorage.setItem('cems_user', JSON.stringify(res.user));
    return res.user;
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('cems_token', res.token);
    localStorage.setItem('cems_user', JSON.stringify(res.user));
    return res.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('cems_token');
    localStorage.removeItem('cems_user');
    setLoading(false);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('cems_user', JSON.stringify(updatedUser));
  };

  // Role & IEEE helpers
  const isStudent = user?.role === 'STUDENT';
  const isOrganizer = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';
  const isApprover = user?.role === 'APPROVER' || user?.role === 'ADMIN';
  const isAdmin = user?.role === 'ADMIN';

  const isIeeeVerified = Boolean(
    user?.ieeeMembership &&
    user.ieeeMembership.status === 'VERIFIED' &&
    new Date(user.ieeeMembership.expiryDate) > new Date()
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateUser,
        refreshUser: fetchProfile,
        isStudent,
        isOrganizer,
        isApprover,
        isAdmin,
        isIeeeVerified,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

