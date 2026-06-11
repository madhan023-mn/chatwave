import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useVirtuo } from 'react-virtuoso';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import api from '../../services/api';

const DateSeparator = ({ date }) => {
  const d = new Date(date);
  let label;
  if (isToday(d)) label = 'Today';
  else if (isYesterday(d)) label = 'Yesterday';
  else label = format(d, 'MMMM d, yyyy');

  return (
    <div className="flex items-center justify-center my-4">
      <span className="bg-cw-panel text-cw-text-muted text-xs px-3 py-1 rounded-full">{label}</span>
    </div>
  );
};

export default function ChatWindow({ chatId, messages, chatInfo }) {
  const { user }    = useAuth();
  const { typing }  = useChat();
  const { emit }    = useSocket() || {};
  const bottomRef   = useRef(null);
  const [contextMsg, setContextMsg] = useState(null);
  const [replyTo, setReplyTo]       = useState(null);

  const isTyping = typing[chatId];

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Mark messages as read
  useEffect(() => {
    if (!messages.length || !chatId) return;
    const unreadIds = messages
      .filter(m => m.sender_id !== user?.id && m.my_status !== 'read')
      .map(m => m.id);
    if (unreadIds.length > 0) {
      emit?.('messages_read', { chatId, messageIds: unreadIds });
    }
  }, [messages, chatId, user, emit]);

  // Group messages by date
  const grouped = [];
  let lastDate = null;
  for (const msg of messages) {
    const msgDate = new Date(msg.created_at);
    if (!lastDate || !isSameDay(msgDate, lastDate)) {
      grouped.push({ type: 'date', date: msg.created_at, id: `date-${msg.created_at}` });
      lastDate = msgDate;
    }
    grouped.push({ type: 'message', msg, id: msg.id });
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-2" id="chat-messages">
      {/* Load more */}
      {messages.length >= 50 && (
        <div className="flex justify-center py-2">
          <button
            onClick={() => {}} 
            className="text-cw-primary text-xs bg-cw-panel px-4 py-1.5 rounded-full hover:bg-cw-panel-light transition-colors"
          >
            Load earlier messages
          </button>
        </div>
      )}

      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="bg-cw-panel rounded-xl p-6 max-w-xs">
            <div className="text-3xl mb-2">🔒</div>
            <p className="text-cw-text text-sm font-medium">Messages are end-to-end encrypted</p>
            <p className="text-cw-text-muted text-xs mt-1">No one outside this chat can read them.</p>
          </div>
        </div>
      )}

      {grouped.map(item =>
        item.type === 'date'
          ? <DateSeparator key={item.id} date={item.date} />
          : (
            <MessageBubble
              key={item.id}
              message={item.msg}
              isOwn={item.msg.sender_id === user?.id}
              onReply={() => setReplyTo(item.msg)}
              chatInfo={chatInfo}
            />
          )
      )}

      {/* Typing indicator */}
      {isTyping && (
        <div className="flex items-center gap-2 mt-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-cw-panel-light flex-shrink-0" />
          <TypingIndicator name={isTyping.userName} />
        </div>
      )}

      <div ref={bottomRef} className="h-4" />
    </div>
  );
}
