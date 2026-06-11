import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import Avatar from '../ui/Avatar';
import api from '../../services/api';

export default function NewChatModal({ onSelect, onClose }) {
  const [query, setQuery]   = useState('');
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) { setUsers([]); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
        setUsers(data);
      } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-sm bg-cw-panel rounded-2xl overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-cw-border">
          <h3 className="font-semibold text-white">New Chat</h3>
          <button onClick={onClose} className="btn-icon"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cw-text-muted" />
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, email or phone"
              className="w-full bg-cw-search rounded-lg pl-9 pr-4 py-2.5 text-sm text-cw-text placeholder-cw-text-muted focus:outline-none" />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {loading && <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-cw-primary border-t-transparent rounded-full animate-spin" /></div>}
          {!loading && query.length >= 2 && users.length === 0 && (
            <p className="text-center text-cw-text-muted text-sm py-8">No users found</p>
          )}
          {users.map(u => (
            <button key={u.id} onClick={() => onSelect(u.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
              <Avatar src={u.avatar_url} name={u.name} size={44} />
              <div>
                <p className="font-medium text-white text-sm">{u.name}</p>
                <p className="text-xs text-cw-text-muted">{u.email || u.phone}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
