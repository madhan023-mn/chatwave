import React, { useState, useRef } from 'react';
import { format } from 'date-fns';
import { Check, CheckCheck, Reply, Forward, Trash2, Star, MoreHorizontal, Smile } from 'lucide-react';
import api from '../../services/api';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const statusIcon = (status) => {
  if (status === 'read')      return <CheckCheck className="w-3.5 h-3.5 text-cw-blue" />;
  if (status === 'delivered') return <CheckCheck className="w-3.5 h-3.5 text-cw-text-muted" />;
  return <Check className="w-3.5 h-3.5 text-cw-text-muted" />;
};

function MediaContent({ msg }) {
  if (msg.type === 'image') return (
    <img src={msg.media_url} alt="Image" className="rounded-lg max-w-[250px] max-h-[300px] object-cover cursor-pointer hover:opacity-90 transition-opacity" loading="lazy" />
  );
  if (msg.type === 'video') return (
    <video src={msg.media_url} controls className="rounded-lg max-w-[250px]" />
  );
  if (msg.type === 'voice_note') return (
    <div className="flex items-center gap-3 min-w-[200px]">
      <button className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors">▶</button>
      <div className="flex-1">
        <div className="h-1 bg-white/30 rounded-full">
          <div className="h-full w-0 bg-white rounded-full" />
        </div>
        <span className="text-xs text-white/70 mt-1 block">{msg.duration ? `0:${String(msg.duration).padStart(2,'0')}` : '0:00'}</span>
      </div>
    </div>
  );
  if (msg.type === 'document') return (
    <a href={msg.media_url} target="_blank" rel="noopener noreferrer"
       className="flex items-center gap-3 min-w-[200px] p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
      <div className="w-10 h-10 bg-white/20 rounded flex items-center justify-center text-lg">📄</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{msg.media_name || 'Document'}</p>
        <p className="text-xs text-white/60">{msg.media_size ? `${(msg.media_size/1024/1024).toFixed(1)} MB` : ''}</p>
      </div>
    </a>
  );
  if (msg.type === 'location') return (
    <div className="min-w-[200px]">
      <div className="bg-white/10 rounded-lg p-3 flex items-center gap-2">
        <span className="text-2xl">📍</span>
        <div>
          <p className="text-sm text-white font-medium">{msg.location_name || 'Location'}</p>
          <p className="text-xs text-white/60">{msg.latitude?.toFixed(4)}, {msg.longitude?.toFixed(4)}</p>
        </div>
      </div>
    </div>
  );
  return null;
}

export default function MessageBubble({ message: msg, isOwn, onReply, chatInfo }) {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  if (msg.is_deleted_for_everyone) {
    return (
      <div className={`flex my-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[70%] px-3 py-2 rounded-xl italic text-cw-text-muted text-xs ${isOwn ? 'msg-bubble-out' : 'msg-bubble-in'}`}>
          🚫 This message was deleted
        </div>
      </div>
    );
  }

  const handleReact = async (emoji) => {
    setShowReactions(false);
    await api.put(`/messages/${msg.id}/react`, { emoji });
  };

  return (
    <div
      className={`flex my-0.5 group ${isOwn ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactions(false); }}
    >
      {/* Avatar (group chats) */}
      {!isOwn && chatInfo?.type === 'group' && (
        <div className="w-7 h-7 rounded-full bg-cw-panel-light flex-shrink-0 mr-1 self-end" />
      )}

      <div className="relative max-w-[70%]">
        {/* Hover actions */}
        {showActions && (
          <div className={`absolute ${isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} top-0 flex items-center gap-1 px-2 z-10`}>
            <button onClick={() => setShowReactions(r => !r)} className="btn-icon"><Smile className="w-4 h-4" /></button>
            <button onClick={() => onReply?.(msg)} className="btn-icon"><Reply className="w-4 h-4" /></button>
            <button className="btn-icon"><MoreHorizontal className="w-4 h-4" /></button>
          </div>
        )}

        {/* Reaction picker */}
        {showReactions && (
          <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} -top-12 flex items-center gap-1 bg-cw-panel border border-cw-border rounded-full px-2 py-1.5 shadow-lg z-20`}>
            {REACTIONS.map(e => (
              <button key={e} onClick={() => handleReact(e)} className="text-xl hover:scale-125 transition-transform">{e}</button>
            ))}
          </div>
        )}

        {/* Bubble */}
        <div className={`px-3 py-2 ${isOwn ? 'msg-bubble-out' : 'msg-bubble-in'} rounded-xl`}>
          {/* Group sender name */}
          {!isOwn && chatInfo?.type === 'group' && msg.sender_name && (
            <p className="text-xs font-semibold text-cw-primary mb-1">{msg.sender_name}</p>
          )}

          {/* Reply preview */}
          {msg.reply_to_id && msg.reply_content && (
            <div className="border-l-2 border-cw-primary pl-2 mb-2 opacity-80">
              <p className="text-xs text-cw-primary font-medium">{msg.reply_sender_name || 'Reply'}</p>
              <p className="text-xs text-cw-text-muted truncate">{msg.reply_content}</p>
            </div>
          )}

          {/* Media content */}
          {msg.type !== 'text' && msg.type !== 'poll' && <MediaContent msg={msg} />}

          {/* Text */}
          {(msg.type === 'text' || msg.content) && msg.type !== 'poll' && (
            <p className="text-sm text-cw-text leading-relaxed whitespace-pre-wrap break-words">
              {msg.content}
            </p>
          )}

          {/* Poll */}
          {msg.type === 'poll' && msg.poll_data && (
            <div>
              <p className="text-sm font-semibold text-white mb-2">{msg.poll_data.question}</p>
              {msg.poll_data.options?.map((opt, i) => (
                <div key={i} className="bg-white/10 rounded-lg px-3 py-2 mb-1 text-sm text-white cursor-pointer hover:bg-white/20 transition-colors">
                  {opt.text} <span className="text-xs text-white/60">({opt.votes?.length || 0})</span>
                </div>
              ))}
            </div>
          )}

          {/* Timestamp + status */}
          <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {msg.is_starred && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
            <span className="text-xs text-cw-text-muted">{format(new Date(msg.created_at), 'HH:mm')}</span>
            {isOwn && statusIcon(msg.my_status)}
          </div>
        </div>

        {/* Reactions */}
        {msg.reactions?.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(
              msg.reactions.reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {})
            ).map(([emoji, count]) => (
              <button key={emoji} onClick={() => handleReact(emoji)}
                className="bg-cw-panel border border-cw-border rounded-full px-2 py-0.5 text-xs flex items-center gap-1 hover:bg-cw-panel-light transition-colors">
                {emoji} <span className="text-cw-text-muted">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
