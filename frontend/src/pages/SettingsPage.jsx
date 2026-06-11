import React, { useState } from 'react';
import { ArrowLeft, Moon, Sun, Bell, Lock, Database, User, Shield, Trash2, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Avatar from '../components/ui/Avatar';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function SettingsPage({ onBack }) {
  const { user, logout, updateProfile } = useAuth();
  const { theme, toggleTheme, fontSize, setFontSize } = useTheme();
  const [section, setSection] = useState('main');
  const [profile, setProfile] = useState({ name: user?.name || '', about: user?.about || '' });
  const [saving, setSaving]   = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile(profile);
      toast.success('Profile updated');
      setSection('main');
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const row = (icon, label, value, onClick) => (
    <button onClick={onClick} className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/5 transition-colors text-left">
      <div className="w-8 h-8 rounded-full bg-cw-panel-light flex items-center justify-center flex-shrink-0 text-cw-primary">{icon}</div>
      <div className="flex-1">
        <p className="text-white text-sm">{label}</p>
        {value && <p className="text-cw-text-muted text-xs mt-0.5">{value}</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-cw-text-muted" />
    </button>
  );

  if (section === 'profile') return (
    <div className="flex flex-col h-full bg-cw-bg">
      <div className="panel-header border-b border-cw-border">
        <button onClick={() => setSection('main')} className="btn-icon"><ArrowLeft className="w-5 h-5" /></button>
        <h2 className="text-white font-semibold">Edit Profile</h2>
        <button onClick={saveProfile} disabled={saving} className="text-cw-primary text-sm font-semibold ml-auto disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex justify-center">
          <label className="cursor-pointer relative">
            <Avatar src={user?.avatar_url} name={user?.name} size={90} />
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <span className="text-white text-xs">📷 Change</span>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={async e => {
              const f = e.target.files?.[0]; if (!f) return;
              const fd = new FormData(); fd.append('avatar', f);
              try { await api.put('/users/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); toast.success('Avatar updated'); } catch {}
            }} />
          </label>
        </div>
        {[['Name', 'name', 'Your name'], ['About', 'about', 'About']].map(([label, key, placeholder]) => (
          <div key={key}>
            <label className="block text-cw-primary text-xs font-semibold mb-1 uppercase tracking-wide">{label}</label>
            <input value={profile[key]} onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
              placeholder={placeholder}
              className="w-full border-b border-cw-border bg-transparent text-white py-2 focus:outline-none focus:border-cw-primary text-sm" />
          </div>
        ))}
        <div>
          <label className="block text-cw-text-muted text-xs mb-1 uppercase tracking-wide">Phone</label>
          <p className="text-white text-sm">{user?.phone || 'Not set'}</p>
        </div>
        <div>
          <label className="block text-cw-text-muted text-xs mb-1 uppercase tracking-wide">Email</label>
          <p className="text-white text-sm">{user?.email || 'Not set'}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-cw-bg overflow-y-auto">
      {onBack && (
        <div className="panel-header border-b border-cw-border">
          <button onClick={onBack} className="btn-icon"><ArrowLeft className="w-5 h-5" /></button>
          <h2 className="text-white font-semibold">Settings</h2>
        </div>
      )}

      {!onBack && <div className="px-4 py-4 text-xl font-bold text-white">Settings</div>}

      {/* Profile card */}
      <button onClick={() => setSection('profile')} className="flex items-center gap-4 px-4 py-4 hover:bg-white/5 transition-colors text-left">
        <Avatar src={user?.avatar_url} name={user?.name} size={60} />
        <div className="flex-1">
          <p className="font-semibold text-white">{user?.name}</p>
          <p className="text-cw-text-muted text-sm">{user?.about}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-cw-text-muted" />
      </button>

      <div className="h-px bg-cw-border mx-4" />

      {/* Settings groups */}
      <div className="mt-2">
        {row(<Bell className="w-4 h-4" />, 'Notifications', 'Message alerts & sounds')}
        {row(<Lock className="w-4 h-4" />, 'Privacy', 'Last seen, status, blocked')}
        {row(
          theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />,
          'Appearance',
          `${theme === 'dark' ? 'Dark' : 'Light'} mode · ${fontSize} font`,
          () => toggleTheme()
        )}
        {row(<Database className="w-4 h-4" />, 'Storage & Data', 'Network usage, auto-download')}
        {row(<Shield className="w-4 h-4" />, 'Two-Step Verification', user?.two_fa_enabled ? 'Enabled' : 'Disabled')}
      </div>

      <div className="h-px bg-cw-border mx-4 my-2" />

      {/* Font size */}
      <div className="px-4 py-3">
        <p className="text-cw-text-muted text-xs mb-2 uppercase tracking-wide">Font Size</p>
        <div className="flex gap-2">
          {['small', 'medium', 'large'].map(s => (
            <button key={s} onClick={() => setFontSize(s)}
              className={`px-3 py-1.5 rounded-full text-xs capitalize transition-colors ${fontSize === s ? 'bg-cw-primary text-white' : 'bg-cw-panel-light text-cw-text-muted'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-cw-border mx-4 my-2" />

      <button onClick={logout} className="flex items-center gap-4 px-4 py-4 text-red-400 hover:bg-red-400/10 transition-colors w-full text-left">
        <LogOut className="w-5 h-5" />
        <span className="text-sm font-medium">Log out</span>
      </button>

      <div className="p-6 text-center">
        <p className="text-cw-text-muted text-xs">ChatWave v1.0.0</p>
        <p className="text-cw-text-muted text-xs mt-1">© 2026 ChatWave Inc.</p>
      </div>
    </div>
  );
}
