import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

// --- Axios Configuration ---
// Ensure cookies are sent with every request
axios.defaults.withCredentials = true;
// -------------------------

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true); // Start loading until auth check is done

  // Function to check authentication status with the backend
  const checkAuthStatus = useCallback(async () => {
    setLoading(true);
    try {
      // Explicitly add withCredentials here for this specific call
      const response = await axios.get(`${API_URL}/auth/me`, {
        withCredentials: true, 
      }); 
      
      if (response.data && response.data.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
         // Optionally store user data in localStorage again if needed elsewhere (but context is better)
         // localStorage.setItem('userData', JSON.stringify(response.data.user));
      } else {
        // Valid request but no user data? Treat as unauthenticated
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem('token'); // Clear potentially invalid token
        localStorage.removeItem('userData');
      }
    } catch (error) {
      // 401 Unauthorized or other errors mean not authenticated
      console.log('Auth check failed:', error.response ? error.response.data.message : error.message);
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem('token'); // Clear potentially invalid token
      localStorage.removeItem('userData');
    } finally {
      setLoading(false);
    }
  }, []);

  // Check auth status when the provider mounts
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Login function (updates context after successful backend login)
  const login = (userData, token) => {
    setUser(userData);
    setIsAuthenticated(true);
    // Still store token if backend sends it and frontend needs it for other reasons?
    // Otherwise, just rely on the session cookie established by the backend.
    if (token) {
      localStorage.setItem('token', token);
    }
    localStorage.setItem('userData', JSON.stringify(userData)); // Keep for potential initial load speedup?
  };

  // Logout function (updates context and calls backend)
  const logout = async () => {
    try {
        // Credentials (cookie) will be sent automatically
        await axios.post(`${API_URL}/auth/logout`);
    } catch (error) {
        console.error("Logout API call failed:", error);
    } finally {
        // Always clear client state regardless of API call success
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
    }
    // Optionally redirect to login page here or in the component calling logout
  };

  // Demo Login function
  const demoLogin = () => {
    const demoUser = {
      _id: 'demo-id-123',
      name: 'Demo User',
      email: 'demo@finmate.app',
      isDemo: true
    };
    setUser(demoUser);
    setIsAuthenticated(true);
    localStorage.setItem('userData', JSON.stringify(demoUser));
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout, checkAuthStatus, demoLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 