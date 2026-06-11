import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import api from '../services/api';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const { on, off, emit } = useSocket() || {};
  const [chats, setChats]           = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages]     = useState({});
  const [typing, setTyping]         = useState({});
  const typingTimeouts              = useRef({});

  // Load chat list
  const loadChats = useCallback(async () => {
    try {
      const { data } = await api.get('/chats');
      setChats(data);
    } catch (e) {}
  }, []);

  useEffect(() => { if (user) loadChats(); }, [user, loadChats]);

  // Load messages for a chat
  const loadMessages = useCallback(async (chatId, before) => {
    const { data } = await api.get(`/messages/${chatId}`, { params: { before, limit: 50 } });
    setMessages(prev => ({
      ...prev,
      [chatId]: before ? [...data, ...(prev[chatId] || [])] : data,
    }));
    return data;
  }, []);

  // Send message
  const sendMessage = useCallback(async (chatId, payload) => {
    const { data } = await api.post(`/messages/${chatId}`, payload);
    setMessages(prev => ({ ...prev, [chatId]: [...(prev[chatId] || []), data] }));
    setChats(prev => prev.map(c => c.id === chatId
      ? { ...c, last_msg_content: payload.content, last_message_at: data.created_at }
      : c
    ).sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at)));
    return data;
  }, []);

  // Send typing
  const sendTyping = useCallback((chatId, isTyping) => {
    emit?.(isTyping ? 'typing_start' : 'typing_stop', { chatId });
  }, [emit]);

  // Real-time: incoming message
  useEffect(() => {
    if (!on) return;
    const cleanup = on('new_message', (msg) => {
      setMessages(prev => {
        const existing = prev[msg.chat_id] || [];
        if (existing.find(m => m.id === msg.id)) return prev;
        return { ...prev, [msg.chat_id]: [...existing, msg] };
      });
      setChats(prev => {
        const updated = prev.map(c => c.id === msg.chat_id
          ? { ...c, last_msg_content: msg.content, last_msg_type: msg.type, last_message_at: msg.created_at, unread_count: msg.sender_id !== user?.id ? (c.unread_count || 0) + 1 : c.unread_count }
          : c
        );
        return updated.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
      });
    });
    return cleanup;
  }, [on, user]);

  // Real-time: typing
  useEffect(() => {
    if (!on) return;
    const cleanup = on('typing', ({ userId, userName, chatId, typing: isTyping }) => {
      if (userId === user?.id) return;
      setTyping(prev => ({ ...prev, [chatId]: isTyping ? { userId, userName } : null }));
      if (isTyping) {
        clearTimeout(typingTimeouts.current[chatId]);
        typingTimeouts.current[chatId] = setTimeout(() => {
          setTyping(prev => ({ ...prev, [chatId]: null }));
        }, 3000);
      }
    });
    return cleanup;
  }, [on, user]);

  // Real-time: reactions
  useEffect(() => {
    if (!on) return;
    const cleanup = on('message_reaction', ({ messageId, reactions }) => {
      setMessages(prev => {
        const updated = {};
        for (const [cid, msgs] of Object.entries(prev)) {
          updated[cid] = msgs.map(m => m.id === messageId ? { ...m, reactions } : m);
        }
        return updated;
      });
    });
    return cleanup;
  }, [on]);

  // Delete message
  useEffect(() => {
    if (!on) return;
    const cleanup = on('message_deleted', ({ messageId, forEveryone }) => {
      if (!forEveryone) return;
      setMessages(prev => {
        const updated = {};
        for (const [cid, msgs] of Object.entries(prev)) {
          updated[cid] = msgs.map(m => m.id === messageId ? { ...m, is_deleted_for_everyone: true, content: null } : m);
        }
        return updated;
      });
    });
    return cleanup;
  }, [on]);

  return (
    <ChatContext.Provider value={{
      chats, setChats, activeChat, setActiveChat,
      messages, setMessages, loadChats, loadMessages,
      sendMessage, sendTyping, typing,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
