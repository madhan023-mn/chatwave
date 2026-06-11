import React, { useState, useEffect } from 'react';
import { Users, MessageSquare, Phone, BarChart2, Flag, AlertTriangle, ArrowLeft, TrendingUp, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-cw-panel rounded-xl p-4 border border-cw-border">
    <div className="flex items-center justify-between mb-3">
      <span className="text-cw-text-muted text-xs uppercase tracking-wide">{label}</span>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center`} style={{ background: `${color}20` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
    </div>
    <p className="text-2xl font-bold text-white">{value?.toLocaleString() ?? '—'}</p>
  </div>
);

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats]   = useState(null);
  const [users, setUsers]   = useState([]);
  const [reports, setReports] = useState([]);
  const [section, setSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/home'); return; }
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/users?limit=20'),
      api.get('/admin/reports'),
    ]).then(([s, u, r]) => {
      setStats(s.data);
      setUsers(u.data.users);
      setReports(r.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleBan = async (userId, banned) => {
    await api.patch(`/admin/users/${userId}/ban`, { banned });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: banned ? 'banned' : 'user' } : u));
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-cw-bg"><div className="w-10 h-10 border-2 border-cw-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="h-screen bg-cw-bg flex flex-col overflow-hidden">
      {/* Header */}
      <div className="panel-header border-b border-cw-border">
        <button onClick={() => navigate('/home')} className="btn-icon"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-white font-semibold flex-1">Admin Dashboard</h1>
        <div className="flex gap-2">
          {[['overview','📊'],['users','👥'],['reports','🚩']].map(([s, icon]) => (
            <button key={s} onClick={() => setSection(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${section === s ? 'bg-cw-primary text-white' : 'text-cw-text-muted hover:text-cw-text'}`}>
              {icon} {s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Overview */}
        {section === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Users}          label="Total Users"    value={stats?.totalUsers}    color="#00a884" />
              <StatCard icon={Activity}       label="Online Now"     value={stats?.onlineUsers}   color="#25d366" />
              <StatCard icon={MessageSquare}  label="Messages Today" value={stats?.messagesDay}   color="#34b7f1" />
              <StatCard icon={Phone}          label="Calls Today"    value={stats?.callsDay}      color="#bf59cf" />
              <StatCard icon={Users}          label="Total Groups"   value={stats?.totalGroups}   color="#ff9800" />
              <StatCard icon={Flag}           label="Pending Reports"value={stats?.pendingReports} color="#f44336" />
            </div>
            <div className="bg-cw-panel rounded-xl p-4 border border-cw-border">
              <h3 className="text-white font-medium mb-2">System Status</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cw-primary animate-pulse" />
                <span className="text-cw-text-muted text-sm">All systems operational</span>
              </div>
            </div>
          </div>
        )}

        {/* Users */}
        {section === 'users' && (
          <div className="space-y-3">
            <input value={search} onChange={e => {
              setSearch(e.target.value);
              api.get(`/admin/users?q=${e.target.value}`).then(r => setUsers(r.data.users));
            }} placeholder="Search users…"
              className="w-full bg-cw-search rounded-lg px-4 py-2.5 text-sm text-cw-text placeholder-cw-text-muted focus:outline-none" />
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-3 bg-cw-panel rounded-xl p-3 border border-cw-border">
                <div className="w-10 h-10 rounded-full bg-cw-panel-light flex items-center justify-center text-white font-semibold">{u.name[0]}</div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{u.name}</p>
                  <p className="text-cw-text-muted text-xs">{u.email || u.phone}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${u.role === 'admin' ? 'bg-cw-primary/20 text-cw-primary' : u.role === 'banned' ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-cw-text-muted'}`}>{u.role}</span>
                    {u.is_online && <span className="text-xs text-cw-primary">● Online</span>}
                  </div>
                </div>
                {u.role !== 'admin' && (
                  <button onClick={() => handleBan(u.id, u.role !== 'banned')}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${u.role === 'banned' ? 'bg-cw-primary/20 text-cw-primary' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}`}>
                    {u.role === 'banned' ? 'Unban' : 'Ban'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Reports */}
        {section === 'reports' && (
          <div className="space-y-3">
            {reports.length === 0 && <p className="text-center text-cw-text-muted py-12">No pending reports</p>}
            {reports.map(r => (
              <div key={r.id} className="bg-cw-panel rounded-xl p-4 border border-cw-border">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">🚩 {r.reason}</p>
                    <p className="text-cw-text-muted text-xs mt-0.5">{r.reporter_name} → {r.reported_name}</p>
                    {r.description && <p className="text-cw-text text-xs mt-2 bg-cw-panel-light rounded p-2">{r.description}</p>}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${r.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>{r.status}</span>
                </div>
                {r.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => api.patch(`/admin/reports/${r.id}`, { status: 'resolved' })}
                      className="text-xs bg-cw-primary/20 text-cw-primary px-3 py-1.5 rounded-lg">Resolve</button>
                    <button onClick={() => api.patch(`/admin/reports/${r.id}`, { status: 'dismissed' })}
                      className="text-xs bg-white/10 text-cw-text-muted px-3 py-1.5 rounded-lg">Dismiss</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
