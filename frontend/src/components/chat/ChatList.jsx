import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter, Archive } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import NewChatModal from './NewChatModal';

const formatTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'dd/MM/yy');
};

const getLastMsgPreview = (chat) => {
  if (!chat.last_msg_type) return 'Tap to chat';
  if (chat.last_msg_type === 'text') return chat.last_msg_content || '';
  if (chat.last_msg_type === 'image') return '📷 Photo';
  if (chat.last_msg_type === 'video') return '🎥 Video';
  if (chat.last_msg_type === 'voice_note') return '🎤 Voice note';
  if (chat.last_msg_type === 'audio') return '🎵 Audio';
  if (chat.last_msg_type === 'document') return '📄 Document';
  if (chat.last_msg_type === 'location') return '📍 Location';
  return chat.last_msg_content || '';
};

export default function ChatList() {
  const navigate = useNavigate();
  const { chats, setChats, loadChats } = useChat();
  const { user } = useAuth();
  const { onlineUsers } = useSocket() || {};
  const [search, setSearch]     = useState('');
  const [showNew, setShowNew]   = useState(false);
  const [loading, setLoading]   = useState(false);

  useEffect(() => { loadChats(); }, []);

  const filtered = chats.filter(c => {
    const name = c.other_user_name || c.group_name || '';
    return name.toLowerCase().includes(search.toLowerCase()) ||
      (c.last_msg_content || '').toLowerCase().includes(search.toLowerCase());
  });

  const pinned   = filtered.filter(c => c.is_pinned);
  const unpinned = filtered.filter(c => !c.is_pinned);

  const openChat = (chatId) => {
    navigate(`/chat/${chatId}`);
  };

  const handleNewChat = async (userId) => {
    setShowNew(false);
    try {
      const { data } = await api.post('/chats/direct', { userId });
      navigate(`/chat/${data.chatId}`);
      loadChats();
    } catch (e) {}
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cw-text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search or start new chat"
            className="w-full bg-cw-search rounded-lg pl-9 pr-4 py-2 text-sm text-cw-text placeholder-cw-text-muted focus:outline-none"
          />
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 px-3 pb-2">
        {['All', 'Unread', 'Groups'].map(f => (
          <button key={f} className="px-3 py-1 rounded-full text-xs bg-cw-panel-light text-cw-text-muted hover:text-cw-text transition-colors">{f}</button>
        ))}
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {loading && <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-cw-primary border-t-transparent rounded-full animate-spin" /></div>}

        {filtered.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-cw-text-muted">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-sm">No chats yet</p>
            <button onClick={() => setShowNew(true)} className="mt-4 text-cw-primary text-sm font-medium">Start a new chat</button>
          </div>
        )}

        {pinned.length > 0 && (
          <div className="px-4 py-1.5 text-xs text-cw-text-muted uppercase tracking-wider">Pinned</div>
        )}
        {[...pinned, ...unpinned].map(chat => {
          const name   = chat.other_user_name || chat.group_name || 'Unknown';
          const avatar = chat.other_user_avatar || chat.group_avatar;
          const isOnline = chat.other_user_id && onlineUsers?.has(chat.other_user_id);
          const preview = getLastMsgPreview(chat);
          const hasUnread = (chat.unread_count || 0) > 0;

          return (
            <button
              key={chat.id}
              onClick={() => openChat(chat.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <Avatar src={avatar} name={name} size={50} />
                {isOnline && (
                  <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-cw-primary rounded-full border-2 border-cw-panel" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`font-medium text-sm truncate ${hasUnread ? 'text-white' : 'text-cw-text'}`}>{name}</span>
                  <span className={`text-xs flex-shrink-0 ml-2 ${hasUnread ? 'text-cw-primary' : 'text-cw-text-muted'}`}>
                    {formatTime(chat.last_message_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className={`text-xs truncate ${hasUnread ? 'text-cw-text' : 'text-cw-text-muted'}`}>{preview}</p>
                  {hasUnread && (
                    <span className="ml-2 min-w-[20px] h-5 bg-cw-primary rounded-full flex items-center justify-center text-xs text-white font-bold px-1 flex-shrink-0">
                      {chat.unread_count > 99 ? '99+' : chat.unread_count}
                    </span>
                  )}
                  {chat.is_pinned && !hasUnread && <span className="text-cw-text-muted text-xs ml-1">📌</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowNew(true)}
        className="absolute bottom-4 right-4 w-14 h-14 bg-cw-primary hover:bg-cw-primary-dark text-white rounded-full flex items-center justify-center shadow-xl transition-all active:scale-90"
        style={{ boxShadow: '0 4px 20px rgba(0,168,132,0.4)' }}
      >
        <Plus className="w-6 h-6" />
      </button>

      {showNew && <NewChatModal onSelect={handleNewChat} onClose={() => setShowNew(false)} />}
    </div>
  );
}
