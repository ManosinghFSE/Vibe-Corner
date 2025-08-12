import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isInitialized } = useAuth() as any;
  const location = useLocation();

  // Wait for auth hydration to complete
  if (!isInitialized) {
    return <div className="container py-5 text-center">Loading...</div>;
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}; 
