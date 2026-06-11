import React, { useState, useEffect } from 'react';
import { Plus, Users, ChevronRight } from 'lucide-react';
import Avatar from '../components/ui/Avatar';
import api from '../services/api';

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  useEffect(() => {
    api.get('/communities').then(r => setCommunities(r.data)).catch(() => {});
  }, []);

  const createCommunity = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/communities', form);
      setCommunities(p => [data, ...p]);
      setCreating(false); setForm({ name: '', description: '' });
    } catch {}
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header action */}
      <div className="px-4 py-3 border-b border-cw-border flex items-center justify-between">
        <p className="text-xs text-cw-text-muted">Communities bring groups together</p>
        <button onClick={() => setCreating(true)} className="btn-icon"><Plus className="w-5 h-5" /></button>
      </div>

      {creating && (
        <form onSubmit={createCommunity} className="p-4 border-b border-cw-border space-y-3">
          <input placeholder="Community name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required
            className="w-full bg-cw-search rounded-lg px-4 py-2 text-sm text-cw-text placeholder-cw-text-muted focus:outline-none" />
          <input placeholder="Description (optional)" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            className="w-full bg-cw-search rounded-lg px-4 py-2 text-sm text-cw-text placeholder-cw-text-muted focus:outline-none" />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-sm py-2 px-4">Create</button>
            <button type="button" onClick={() => setCreating(false)} className="text-cw-text-muted text-sm py-2 px-4">Cancel</button>
          </div>
        </form>
      )}

      {communities.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-cw-text-muted">
          <Users className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">No communities yet</p>
          <button onClick={() => setCreating(true)} className="mt-3 text-cw-primary text-sm">Create a community</button>
        </div>
      )}

      {communities.map(c => (
        <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer">
          <Avatar src={c.avatar_url} name={c.name} size={50} />
          <div className="flex-1">
            <p className="font-medium text-white text-sm">{c.name}</p>
            <p className="text-xs text-cw-text-muted truncate">{c.description || 'No description'}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-cw-text-muted" />
        </div>
      ))}
    </div>
  );
}
