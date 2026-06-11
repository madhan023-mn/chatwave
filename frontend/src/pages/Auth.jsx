import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const WaLogo = () => (
  <svg viewBox="0 0 24 24" className="w-10 h-10 fill-white">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.533 5.845L.051 23.197a.75.75 0 00.918.919l5.352-1.482A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.878 0-3.638-.503-5.156-1.383l-.37-.221-3.826 1.059 1.061-3.826-.222-.371A9.952 9.952 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
  </svg>
);

export default function Auth() {
  const navigate = useNavigate();
  const { login, register, sendOtp, verifyOtp } = useAuth();
  const [mode, setMode]         = useState('welcome'); // welcome | email | register | phone | otp
  const [loading, setLoading]   = useState(false);
  const [form, setForm]         = useState({ name:'', email:'', password:'', phone:'', otp:'' });
  const [otpSent, setOtpSent]   = useState(false);
  const [devOtp, setDevOtp]     = useState('');

  const update = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/home');
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/home');
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await sendOtp(form.phone);
      if (res.otp) setDevOtp(res.otp); // dev mode
      setOtpSent(true);
      toast.success('OTP sent!');
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyOtp(form.phone, form.otp, form.name);
      navigate('/home');
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const inputCls = "w-full bg-cw-search border border-cw-border rounded-lg px-4 py-3 text-cw-text placeholder-cw-text-muted text-sm focus:border-cw-primary focus:outline-none transition-colors";
  const labelCls = "block text-cw-text-muted text-xs mb-1.5 font-medium uppercase tracking-wide";

  return (
    <div className="min-h-screen bg-cw-bg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-cw-primary rounded-full flex items-center justify-center mx-auto mb-4"
               style={{ boxShadow: '0 0 40px rgba(0,168,132,0.3)' }}>
            <WaLogo />
          </div>
          <h1 className="text-2xl font-bold text-white">ChatWave</h1>
          <p className="text-cw-text-muted text-sm mt-1">Connect with anyone, anywhere</p>
        </div>

        {/* ── WELCOME ── */}
        {mode === 'welcome' && (
          <div className="space-y-3">
            <button onClick={() => setMode('phone')} className="w-full flex items-center justify-center gap-3 bg-cw-primary hover:bg-cw-primary-dark text-white font-semibold py-3.5 rounded-xl transition-all active:scale-95">
              <span>📱</span> Continue with Phone
            </button>
            <button onClick={() => setMode('email')} className="w-full flex items-center justify-center gap-3 bg-cw-panel hover:bg-cw-panel-light text-cw-text font-semibold py-3.5 rounded-xl transition-all active:scale-95 border border-cw-border">
              <span>✉️</span> Continue with Email
            </button>
            <div className="relative my-4">
              <div className="h-px bg-cw-border" />
              <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-cw-bg px-3 text-cw-text-muted text-xs">New user?</span>
            </div>
            <button onClick={() => setMode('register')} className="w-full border border-cw-border text-cw-text-muted hover:text-cw-text py-3 rounded-xl text-sm transition-colors">
              Create an account
            </button>
          </div>
        )}

        {/* ── EMAIL LOGIN ── */}
        {mode === 'email' && (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div><label className={labelCls}>Email</label><input type="email" placeholder="you@email.com" value={form.email} onChange={update('email')} required className={inputCls} /></div>
            <div><label className={labelCls}>Password</label><input type="password" placeholder="••••••••" value={form.password} onChange={update('password')} required className={inputCls} /></div>
            <button type="submit" disabled={loading} className="w-full bg-cw-primary hover:bg-cw-primary-dark disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all active:scale-95">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
            <button type="button" onClick={() => setMode('welcome')} className="w-full text-cw-text-muted text-sm hover:text-cw-text transition-colors">← Back</button>
          </form>
        )}

        {/* ── REGISTER ── */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div><label className={labelCls}>Full Name</label><input placeholder="John Doe" value={form.name} onChange={update('name')} required className={inputCls} /></div>
            <div><label className={labelCls}>Email</label><input type="email" placeholder="you@email.com" value={form.email} onChange={update('email')} required className={inputCls} /></div>
            <div><label className={labelCls}>Password</label><input type="password" placeholder="Min 6 characters" value={form.password} onChange={update('password')} minLength={6} required className={inputCls} /></div>
            <button type="submit" disabled={loading} className="w-full bg-cw-primary hover:bg-cw-primary-dark disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all active:scale-95">
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
            <button type="button" onClick={() => setMode('welcome')} className="w-full text-cw-text-muted text-sm hover:text-cw-text transition-colors">← Back</button>
          </form>
        )}

        {/* ── PHONE ── */}
        {mode === 'phone' && !otpSent && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div><label className={labelCls}>Your Name</label><input placeholder="John Doe" value={form.name} onChange={update('name')} className={inputCls} /></div>
            <div>
              <label className={labelCls}>Phone Number</label>
              <input type="tel" placeholder="+1 234 567 8900" value={form.phone} onChange={update('phone')} required className={inputCls} />
              <p className="text-cw-text-muted text-xs mt-1">Include country code (+1, +91…)</p>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-cw-primary hover:bg-cw-primary-dark disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all active:scale-95">
              {loading ? 'Sending OTP…' : 'Send OTP'}
            </button>
            <button type="button" onClick={() => setMode('welcome')} className="w-full text-cw-text-muted text-sm hover:text-cw-text transition-colors">← Back</button>
          </form>
        )}

        {/* ── OTP VERIFY ── */}
        {mode === 'phone' && otpSent && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center mb-2">
              <p className="text-cw-text-muted text-sm">OTP sent to</p>
              <p className="text-white font-semibold">{form.phone}</p>
              {devOtp && <p className="text-cw-primary text-xs mt-1">Dev OTP: <strong>{devOtp}</strong></p>}
            </div>
            <div>
              <label className={labelCls}>Enter 6-digit OTP</label>
              <input type="text" inputMode="numeric" maxLength={6} placeholder="000000"
                value={form.otp} onChange={update('otp')} required
                className={`${inputCls} text-center text-xl tracking-widest font-mono`} />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-cw-primary hover:bg-cw-primary-dark disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all active:scale-95">
              {loading ? 'Verifying…' : 'Verify OTP'}
            </button>
            <button type="button" onClick={() => setOtpSent(false)} className="w-full text-cw-text-muted text-sm hover:text-cw-text transition-colors">Resend OTP</button>
          </form>
        )}

        <p className="text-center text-cw-text-muted text-xs mt-8">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
