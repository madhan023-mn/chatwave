import React, { useState, useEffect } from 'react';
import { Plus, Camera, Type, X } from 'lucide-react';
import Avatar from '../components/ui/Avatar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

const BG_COLORS = ['#1a1a2e','#16213e','#0f3460','#533483','#e94560','#00a884','#1565c0','#bf360c'];

export default function StatusPage() {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState([]);
  const [viewing, setViewing]   = useState(null);
  const [creating, setCreating] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [selectedBg, setSelectedBg] = useState(BG_COLORS[0]);
  const [loading, setLoading]   = useState(false);

  useEffect(() => { loadStatuses(); }, []);

  const loadStatuses = async () => {
    try {
      const { data } = await api.get('/status');
      setStatuses(data);
    } catch {}
  };

  // Group statuses by user
  const grouped = statuses.reduce((acc, s) => {
    const key = s.user_id;
    if (!acc[key]) acc[key] = { userId: key, userName: s.user_name, userAvatar: s.user_avatar, items: [], hasUnviewed: false };
    acc[key].items.push(s);
    if (!s.viewed_by_me) acc[key].hasUnviewed = true;
    return acc;
  }, {});

  const myStatuses = grouped[user?.id];
  const others = Object.values(grouped).filter(g => g.userId !== user?.id);

  const postTextStatus = async () => {
    if (!textContent.trim()) return;
    setLoading(true);
    try {
      await api.post('/status', { type: 'text', content: textContent, backgroundColor: selectedBg });
      setCreating(false); setTextMode(false); setTextContent('');
      loadStatuses();
    } finally { setLoading(false); }
  };

  const handleFileStatus = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('media', file);
    setLoading(true);
    try {
      await api.post('/status/media', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      loadStatuses();
    } finally { setLoading(false); e.target.value = ''; }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Text mode creator */}
      {textMode && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: selectedBg }}>
          <div className="flex items-center gap-4 p-4">
            <button onClick={() => setTextMode(false)} className="text-white"><X className="w-6 h-6" /></button>
            <div className="flex gap-2 flex-wrap">
              {BG_COLORS.map(c => <button key={c} onClick={() => setSelectedBg(c)} className="w-7 h-7 rounded-full border-2 border-white/30" style={{ background: c }} />)}
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-8">
            <textarea autoFocus value={textContent} onChange={e => setTextContent(e.target.value)}
              placeholder="Type a status…" maxLength={700}
              className="w-full bg-transparent text-white text-2xl font-semibold text-center resize-none focus:outline-none placeholder-white/50 leading-relaxed" rows={4} />
          </div>
          <div className="p-4 flex justify-end">
            <button onClick={postTextStatus} disabled={!textContent.trim() || loading}
              className="w-14 h-14 bg-cw-primary rounded-full flex items-center justify-center disabled:opacity-50">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* My status */}
        <div className="px-4 pt-3 pb-1 text-xs text-cw-text-muted uppercase tracking-wider">My status</div>
        <div className="contact-item">
          <div className="relative cursor-pointer" onClick={() => setCreating(true)}>
            {myStatuses ? (
              <div className="status-ring p-0.5 rounded-full">
                <Avatar src={user?.avatar_url} name={user?.name} size={50} />
              </div>
            ) : (
              <Avatar src={user?.avatar_url} name={user?.name} size={50} />
            )}
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-cw-primary rounded-full flex items-center justify-center border-2 border-cw-panel">
              <Plus className="w-3 h-3 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <p className="font-medium text-white text-sm">{myStatuses ? 'My status' : 'Add to my status'}</p>
            <p className="text-xs text-cw-text-muted">
              {myStatuses ? `${myStatuses.items.length} update${myStatuses.items.length > 1 ? 's' : ''}` : 'Tap to add a status update'}
            </p>
          </div>
          {creating && (
            <div className="flex gap-2">
              <label className="btn-icon cursor-pointer"><Camera className="w-5 h-5" /><input type="file" accept="image/*,video/*" className="hidden" onChange={handleFileStatus} /></label>
              <button className="btn-icon" onClick={() => { setCreating(false); setTextMode(true); }}><Type className="w-5 h-5" /></button>
              <button className="btn-icon" onClick={() => setCreating(false)}><X className="w-5 h-5" /></button>
            </div>
          )}
        </div>

        {/* Recent updates */}
        {others.length > 0 && <div className="px-4 pt-4 pb-1 text-xs text-cw-text-muted uppercase tracking-wider">Recent updates</div>}
        {others.map(group => (
          <button key={group.userId} onClick={() => setViewing(group)}
            className="w-full contact-item text-left">
            <div className={group.hasUnviewed ? 'status-ring p-0.5 rounded-full' : 'p-0.5 rounded-full border-2 border-cw-text-muted'}>
              <Avatar src={group.userAvatar} name={group.userName} size={50} />
            </div>
            <div className="flex-1">
              <p className="font-medium text-white text-sm">{group.userName}</p>
              <p className="text-xs text-cw-text-muted">{format(new Date(group.items[0].created_at), 'HH:mm')}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Status viewer overlay */}
      {viewing && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
            {viewing.items.map((_, i) => (
              <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: '100%', animation: `statusProgress ${4}s linear` }} />
              </div>
            ))}
          </div>
          <div className="absolute top-4 left-0 right-0 z-10 flex items-center gap-3 px-4 pt-6">
            <Avatar src={viewing.userAvatar} name={viewing.userName} size={36} />
            <div>
              <p className="text-white font-medium text-sm">{viewing.userName}</p>
              <p className="text-white/60 text-xs">{format(new Date(viewing.items[0].created_at), 'HH:mm')}</p>
            </div>
            <button className="ml-auto text-white" onClick={() => setViewing(null)}><X className="w-6 h-6" /></button>
          </div>
          <div className="flex-1 flex items-center justify-center" style={{ background: viewing.items[0].background_color || '#000' }}>
            {viewing.items[0].type === 'image' && <img src={viewing.items[0].media_url} alt="" className="max-h-full max-w-full object-contain" />}
            {viewing.items[0].type === 'text' && <p className="text-white text-2xl font-semibold text-center px-8" style={{ color: viewing.items[0].text_color }}>{viewing.items[0].content}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
