import React from 'react';
import { ArrowLeft, Phone, Video, Search, MoreVertical } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { useSocket } from '../../context/SocketContext';
import { formatDistanceToNow } from 'date-fns';

export default function ChatHeader({ chatInfo, onBack, onCall, onSearchToggle }) {
  const { onlineUsers } = useSocket() || {};
  if (!chatInfo) return (
    <div className="panel-header border-b border-cw-border h-[60px]">
      <button onClick={onBack} className="btn-icon"><ArrowLeft className="w-5 h-5" /></button>
    </div>
  );

  const name     = chatInfo.other_user_name || chatInfo.group_name || 'Chat';
  const avatar   = chatInfo.other_user_avatar || chatInfo.group_avatar;
  const isOnline = chatInfo.other_user_id && onlineUsers?.has(chatInfo.other_user_id);
  const lastSeen = chatInfo.other_user_last_seen;

  const statusText = chatInfo.type === 'group'
    ? `${chatInfo.group_member_count || ''} members`
    : isOnline
      ? 'online'
      : lastSeen
        ? `last seen ${formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}`
        : '';

  return (
    <div className="panel-header border-b border-cw-border">
      {/* Back */}
      <button onClick={onBack} className="btn-icon md:hidden"><ArrowLeft className="w-5 h-5" /></button>

      {/* Avatar + info */}
      <button className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-90 transition-opacity">
        <div className="relative flex-shrink-0">
          <Avatar src={avatar} name={name} size={40} />
          {isOnline && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-cw-primary rounded-full border-2 border-cw-panel" />}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-white text-sm truncate">{name}</p>
          <p className={`text-xs truncate ${isOnline ? 'text-cw-primary' : 'text-cw-text-muted'}`}>{statusText}</p>
        </div>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button onClick={() => onCall?.('video')} className="btn-icon"><Video className="w-5 h-5" /></button>
        <button onClick={() => onCall?.('voice')} className="btn-icon"><Phone className="w-5 h-5" /></button>
        <button onClick={onSearchToggle} className="btn-icon"><Search className="w-5 h-5" /></button>
        <button className="btn-icon"><MoreVertical className="w-5 h-5" /></button>
      </div>
    </div>
  );
}
