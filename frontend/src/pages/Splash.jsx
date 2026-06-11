import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Splash() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setProgress(p => Math.min(p + 4, 100)), 60);
    const timer = setTimeout(() => {
      navigate(user ? '/home' : '/auth');
    }, 2000);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [navigate, user]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-cw-bg">
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-cw-primary flex items-center justify-center shadow-2xl" style={{ boxShadow: '0 0 60px rgba(0,168,132,0.4)' }}>
            <svg viewBox="0 0 24 24" className="w-14 h-14 fill-white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.533 5.845L.051 23.197a.75.75 0 00.918.919l5.352-1.482A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.878 0-3.638-.503-5.156-1.383l-.37-.221-3.826 1.059 1.061-3.826-.222-.371A9.952 9.952 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            </svg>
          </div>
          <div className="absolute -inset-2 rounded-full border-2 border-cw-primary/30 animate-ping" />
        </div>

        {/* Brand */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white tracking-tight">ChatWave</h1>
          <p className="text-cw-text-muted text-sm mt-1">Connect. Talk. Share.</p>
        </div>

        {/* Progress bar */}
        <div className="w-48 h-0.5 bg-white/10 rounded-full overflow-hidden mt-4">
          <div className="h-full bg-cw-primary rounded-full transition-all duration-75" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 text-center">
        <p className="text-cw-text-muted text-xs">from</p>
        <p className="text-cw-text text-sm font-medium mt-1">ChatWave Inc.</p>
      </div>
    </div>
  );
}
