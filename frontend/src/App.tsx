import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/LoginPage';
import ClockPage from './pages/ClockPage';
import PublicAgingPage from './pages/PublicAgingPage';
import PublicSohPage from './pages/PublicSohPage';
import PublicClockPage from './pages/PublicClockPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/clock" element={<ProtectedRoute><ClockPage /></ProtectedRoute>} />
      <Route path="/public/aging-stock" element={<PublicAgingPage />} />
      <Route path="/public/soh" element={<PublicSohPage />} />
      <Route path="/public/clock" element={<PublicClockPage />} />
      <Route path="/*" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#6366f1',
          borderRadius: 8,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          colorBgContainer: '#1a1f3a',
          colorBgElevated: '#1e2340',
          colorBorder: 'rgba(255,255,255,0.08)',
          colorText: 'rgba(255,255,255,0.85)',
          colorTextSecondary: 'rgba(255,255,255,0.5)',
        },
        components: {
          Table: {
            headerBg: '#0d1117',
            headerColor: 'rgba(255,255,255,0.7)',
            rowHoverBg: 'rgba(99, 102, 241, 0.08)',
            borderColor: 'rgba(255,255,255,0.06)',
          },
          Menu: {
            darkItemBg: 'transparent',
            darkItemSelectedBg: 'rgba(99, 102, 241, 0.15)',
            darkItemSelectedColor: '#818cf8',
          },
          Card: {
            colorBgContainer: '#1a1f3a',
            colorBorderSecondary: 'rgba(255,255,255,0.06)',
          },
          Modal: {
            contentBg: '#1e2340',
            headerBg: '#1e2340',
          },
        },
      }}
    >
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
}
