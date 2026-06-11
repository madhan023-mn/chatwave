import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Video, MoreVertical, Search } from 'lucide-react';
import ChatHeader from '../components/chat/ChatHeader';
import ChatWindow from '../components/chat/ChatWindow';
import MessageInput from '../components/chat/MessageInput';
import CallScreen from '../components/calls/CallScreen';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';

export default function ChatPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { messages, loadMessages, sendMessage, sendTyping } = useChat();
  const { emit, on } = useSocket() || {};

  const [chatInfo, setChatInfo]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [sending, setSending]         = useState(false);
  const [callState, setCallState]     = useState(null); // null | 'incoming' | 'outgoing' | 'active'
  const [callType, setCallType]       = useState('voice');
  const [callId, setCallId]           = useState(null);
  const [callPeer, setCallPeer]       = useState(null);
  const [searchOpen, setSearchOpen]   = useState(false);
  const [searchQ, setSearchQ]         = useState('');

  const chatMessages = messages[chatId] || [];

  useEffect(() => {
    if (!chatId) return;
    // Join socket room
    emit?.('join_chat', chatId);

    // Load chat info
    api.get('/chats').then(r => {
      const c = r.data.find(x => x.id === chatId);
      if (c) setChatInfo(c);
    });

    // Load messages
    loadMessages(chatId).finally(() => setLoading(false));

    // Mark as read
    api.post(`/chats/${chatId}/read`).catch(() => {});
  }, [chatId, emit]);

  // Incoming call handler
  useEffect(() => {
    if (!on) return;
    const cleanup = on('incoming_call', ({ callId: cid, callerId, callerName, callerAvatar, type }) => {
      setCallId(cid);
      setCallType(type);
      setCallPeer({ id: callerId, name: callerName, avatar: callerAvatar });
      setCallState('incoming');
    });
    return cleanup;
  }, [on]);

  const handleSend = useCallback(async (payload) => {
    setSending(true);
    try { await sendMessage(chatId, payload); }
    finally { setSending(false); }
  }, [chatId, sendMessage]);

  const handleCall = async (type) => {
    setCallType(type);
    setCallState('outgoing');
    try {
      const { data } = await api.post('/calls', {
        calleeId: chatInfo?.other_user_id,
        type,
        chatId,
      });
      setCallId(data.id);
    } catch (e) {}
  };

  const filteredMessages = searchQ
    ? chatMessages.filter(m => m.content?.toLowerCase().includes(searchQ.toLowerCase()))
    : chatMessages;

  return (
    <div className="h-screen w-screen flex flex-col bg-cw-bg md:relative md:h-full md:w-full">
      {/* Header */}
      <ChatHeader
        chatInfo={chatInfo}
        onBack={() => navigate('/home')}
        onCall={handleCall}
        onSearchToggle={() => setSearchOpen(s => !s)}
      />

      {/* Search bar */}
      {searchOpen && (
        <div className="bg-cw-panel px-4 py-2 border-b border-cw-border">
          <input
            autoFocus
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Search messages…"
            className="w-full bg-cw-search rounded-lg px-4 py-2 text-sm text-cw-text placeholder-cw-text-muted focus:outline-none"
          />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-hidden chat-bg">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-cw-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ChatWindow chatId={chatId} messages={filteredMessages} chatInfo={chatInfo} />
        )}
      </div>

      {/* Input */}
      <MessageInput
        chatId={chatId}
        onSend={handleSend}
        onTyping={(isTyping) => sendTyping(chatId, isTyping)}
        disabled={sending}
      />

      {/* Call overlay */}
      {callState && (
        <CallScreen
          callId={callId}
          callType={callType}
          callState={callState}
          peer={callPeer || { id: chatInfo?.other_user_id, name: chatInfo?.other_user_name, avatar: chatInfo?.other_user_avatar }}
          onEnd={() => setCallState(null)}
        />
      )}
    </div>
  );
}
