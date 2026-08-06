import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  apiLogin,
  apiRegister,
  apiVerifyOTP,
  apiGetMe,
  setAccessToken,
  setUnauthorizedCallback,
} from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const logout = useCallback(() => {
    setAccessToken(null);
    localStorage.removeItem('access_token');
    setUser(null);
    setError(null);
  }, []);

  useEffect(() => {
    // Register 401 callback to auto-logout on token expiration
    setUnauthorizedCallback(() => {
      logout();
    });

    // Check for stored access token on page reload
    const storedToken = localStorage.getItem('access_token');
    if (storedToken) {
      setAccessToken(storedToken);
      apiGetMe()
        .then((res) => {
          setUser(res.data);
          setLoading(false);
        })
        .catch(() => {
          logout();
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [logout]);

  const login = async (emailOrPhone, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiLogin(emailOrPhone, password);
      const { access_token } = res.data;
      
      // Store token in memory & localStorage for seamless reload persistence
      setAccessToken(access_token);
      localStorage.setItem('access_token', access_token);

      // Fetch user profile
      const meRes = await apiGetMe();
      setUser(meRes.data);
      setLoading(false);
      return meRes.data;
    } catch (err) {
      setLoading(false);
      const msg = err.response?.data?.detail || 'Authentication failed. Check credentials.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const register = async (email, password, phoneNumber = null) => {
    setLoading(true);
    setError(null);
    try {
      await apiRegister(email, password, phoneNumber);
      return await login(email, password);
    } catch (err) {
      setLoading(false);
      const msg = err.response?.data?.detail || 'Registration failed.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const loginWithOTP = async (identifier, otpCode, fullName = null) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiVerifyOTP(identifier, otpCode, fullName);
      const { access_token } = res.data;

      setAccessToken(access_token);
      localStorage.setItem('access_token', access_token);

      const meRes = await apiGetMe();
      setUser(meRes.data);
      setLoading(false);
      return meRes.data;
    } catch (err) {
      setLoading(false);
      const msg = err.response?.data?.detail || 'OTP verification failed.';
      setError(msg);
      throw new Error(msg);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        error,
        login,
        register,
        loginWithOTP,
        logout,
        setError,
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
