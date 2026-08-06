import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import NewCase from './pages/NewCase';
import ClarifyingChat from './pages/ClarifyingChat';
import CaseReport from './pages/CaseReport';
import ProfilePage from './pages/ProfilePage';
import FraudVerifyPage from './pages/FraudVerifyPage';
import FloatingChatbot from './components/FloatingChatbot';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<div className="min-h-screen bg-[#FAFAFC] text-slate-800 flex items-center justify-center font-bold text-sm">Loading SumScale...</div>}>
          <Routes>
            {/* Introduction / Purpose Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected OmniAid Application Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/new-case" element={<NewCase />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/fraud-verify" element={<FraudVerifyPage />} />
              <Route path="/case/:id/clarify" element={<ClarifyingChat />} />
              <Route path="/case/:id" element={<CaseReport />} />
            </Route>

            {/* Default Catch-all redirect to Landing Page */}
            <Route path="*" element={<LandingPage />} />
          </Routes>
          <FloatingChatbot />
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
