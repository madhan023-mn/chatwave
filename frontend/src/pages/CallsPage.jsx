import React, { useState, useEffect } from 'react';
import { Phone, Video, PhoneCall, PhoneMissed, PhoneIncoming } from 'lucide-react';
import Avatar from '../components/ui/Avatar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format, isToday, isYesterday } from 'date-fns';

const CallIcon = ({ call, isOwn }) => {
  if (call.status === 'missed' && !isOwn) return <PhoneMissed className="w-4 h-4 text-red-400" />;
  if (call.status === 'missed') return <PhoneMissed className="w-4 h-4 text-red-400" />;
  if (isOwn) return <PhoneCall className="w-4 h-4 text-cw-primary" />;
  return <PhoneIncoming className="w-4 h-4 text-cw-primary" />;
};

export default function CallsPage() {
  const { user } = useAuth();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/calls').then(r => setCalls(r.data)).finally(() => setLoading(false));
  }, []);

  const formatTime = (ts) => {
    const d = new Date(ts);
    if (isToday(d)) return format(d, 'HH:mm');
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'dd/MM/yy');
  };

  const formatDuration = (s) => s > 0 ? `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}` : '';

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {loading && <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-cw-primary border-t-transparent rounded-full animate-spin" /></div>}

      {!loading && calls.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-cw-text-muted">
          <Phone className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">No call history</p>
        </div>
      )}

      {calls.map(call => {
        const isOwn = call.caller_id === user?.id;
        const otherName = isOwn ? call.callee_name : call.caller_name;
        const otherAvatar = isOwn ? call.callee_avatar : call.caller_avatar;
        const missed = call.status === 'missed';

        return (
          <div key={call.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
            <Avatar src={otherAvatar} name={otherName} size={50} />
            <div className="flex-1">
              <p className={`font-medium text-sm ${missed ? 'text-red-400' : 'text-white'}`}>{otherName || 'Unknown'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <CallIcon call={call} isOwn={isOwn} />
                <span className="text-xs text-cw-text-muted capitalize">{call.type}</span>
                {call.duration > 0 && <span className="text-xs text-cw-text-muted">· {formatDuration(call.duration)}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-cw-text-muted">{formatTime(call.started_at)}</span>
              <button className="btn-icon">
                {call.type === 'video' ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
