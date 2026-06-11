import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Lazy load pages
const Splash       = lazy(() => import('./pages/Splash'));
const Auth         = lazy(() => import('./pages/Auth'));
const Home         = lazy(() => import('./pages/Home'));
const ChatPage     = lazy(() => import('./pages/ChatPage'));
const CallScreen   = lazy(() => import('./components/calls/CallScreen'));
const AdminPage    = lazy(() => import('./pages/AdminPage'));

const Loader = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-cw-bg">
    <div className="flex flex-col items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-cw-primary flex items-center justify-center animate-pulse">
        <svg viewBox="0 0 24 24" className="w-9 h-9 fill-white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.533 5.845L.051 23.197a.75.75 0 00.918.919l5.352-1.482A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.878 0-3.638-.503-5.156-1.383l-.37-.221-3.826 1.059 1.061-3.826-.222-.371A9.952 9.952 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
        </svg>
      </div>
      <p className="text-cw-text-muted text-sm animate-pulse">ChatWave</p>
    </div>
  </div>
);

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  return user ? children : <Navigate to="/" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  return user ? <Navigate to="/home" replace /> : children;
};

export default function App() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/"      element={<PublicRoute><Splash /></PublicRoute>} />
        <Route path="/auth"  element={<PublicRoute><Auth /></PublicRoute>} />
        <Route path="/home"  element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/chat/:chatId" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
        <Route path="/call/:callId" element={<PrivateRoute><CallScreen /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
        <Route path="*"      element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
