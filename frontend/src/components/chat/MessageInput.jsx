import React, { useState, useRef, useCallback } from 'react';
import { Send, Mic, Paperclip, Smile, X, Camera, Image, FileText, MapPin, Phone as PhoneIcon, Gift } from 'lucide-react';
import api from '../../services/api';
import SmartReplies from './SmartReplies';

export default function MessageInput({ chatId, onSend, onTyping, disabled, replyTo, onCancelReply }) {
  const [text, setText]           = useState('');
  const [showAttach, setShowAttach] = useState(false);
  const [showEmoji, setShowEmoji]  = useState(false);
  const [recording, setRecording]  = useState(false);
  const [aiReplies, setAiReplies]  = useState([]);
  const [lastMsg, setLastMsg]      = useState('');
  const fileRef   = useRef(null);
  const mediaRef  = useRef(null);
  const typingRef = useRef(null);

  const handleTextChange = (e) => {
    setText(e.target.value);
    // Typing indicator
    onTyping?.(true);
    clearTimeout(typingRef.current);
    typingRef.current = setTimeout(() => onTyping?.(false), 1500);
  };

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    setText('');
    onTyping?.(false);
    setAiReplies([]);
    await onSend({ type: 'text', content: trimmed, replyToId: replyTo?.id });
    setLastMsg(trimmed);
    // Get AI replies after send (for next message context)
    try {
      const { data } = await api.post(`/messages/${chatId}/ai-reply`, { message: trimmed });
      if (data.suggestions?.length) setAiReplies(data.suggestions);
    } catch {}
  }, [text, disabled, onSend, replyTo, chatId, onTyping]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowAttach(false);
    const form = new FormData();
    form.append('file', file);
    try {
      await api.post(`/messages/${chatId}/media`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    } catch (err) {}
    e.target.value = '';
  };

  const EMOJIS = ['😀','😂','🥰','😎','🤔','😢','😡','🎉','🔥','❤️','👍','🙏','💪','🤣','😍','🤩','😭','😱'];

  return (
    <div className="bg-cw-panel border-t border-cw-border">
      {/* Smart replies */}
      {aiReplies.length > 0 && (
        <SmartReplies suggestions={aiReplies} onSelect={txt => { setText(txt); setAiReplies([]); }} />
      )}

      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-cw-border bg-cw-panel-light">
          <div className="w-0.5 h-8 bg-cw-primary rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-cw-primary font-medium">{replyTo.sender_name || 'You'}</p>
            <p className="text-xs text-cw-text-muted truncate">{replyTo.content || `[${replyTo.type}]`}</p>
          </div>
          <button onClick={onCancelReply} className="text-cw-text-muted hover:text-cw-text"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div className="px-3 py-2 border-b border-cw-border">
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map(e => (
              <button key={e} onClick={() => { setText(t => t + e); }} className="text-xl hover:scale-125 transition-transform">{e}</button>
            ))}
          </div>
        </div>
      )}

      {/* Attachment menu */}
      {showAttach && (
        <div className="px-4 py-3 border-b border-cw-border">
          <div className="grid grid-cols-4 gap-4">
            {[
              { icon: Image, label: 'Photos', color: '#bf59cf', accept: 'image/*' },
              { icon: Camera, label: 'Camera', color: '#0063cb', accept: 'image/*', capture: true },
              { icon: FileText, label: 'Document', color: '#5157ae', accept: '.pdf,.doc,.docx,.zip' },
              { icon: MapPin, label: 'Location', color: '#00a884', action: () => {} },
            ].map(({ icon: Icon, label, color, accept, action }) => (
              <button key={label}
                onClick={() => { action?.(); if (accept) { fileRef.current.accept = accept; fileRef.current.click(); } setShowAttach(false); }}
                className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: color }}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs text-cw-text-muted">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-end gap-2 px-3 py-2">
        {/* Emoji */}
        <button onClick={() => { setShowEmoji(s => !s); setShowAttach(false); }} className="btn-icon flex-shrink-0 self-end mb-0.5">
          <Smile className="w-6 h-6" />
        </button>

        {/* Input */}
        <div className="flex-1 bg-cw-search rounded-2xl px-4 py-2 min-h-[44px] max-h-[120px] overflow-y-auto">
          <textarea
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Message"
            rows={1}
            className="w-full bg-transparent text-cw-text text-sm resize-none focus:outline-none placeholder-cw-text-muted leading-relaxed"
            style={{ height: 'auto', minHeight: '24px' }}
          />
        </div>

        {/* Attach */}
        <button onClick={() => { setShowAttach(s => !s); setShowEmoji(false); }} className="btn-icon flex-shrink-0 self-end mb-0.5">
          <Paperclip className="w-6 h-6" />
        </button>

        {/* Send or Mic */}
        {text.trim() ? (
          <button onClick={handleSend} disabled={disabled}
            className="w-11 h-11 flex-shrink-0 bg-cw-primary hover:bg-cw-primary-dark text-white rounded-full flex items-center justify-center self-end transition-all active:scale-90">
            <Send className="w-5 h-5" />
          </button>
        ) : (
          <button
            onMouseDown={() => setRecording(true)}
            onMouseUp={() => setRecording(false)}
            onTouchStart={() => setRecording(true)}
            onTouchEnd={() => setRecording(false)}
            className={`w-11 h-11 flex-shrink-0 rounded-full flex items-center justify-center self-end transition-all ${recording ? 'bg-red-500 scale-110' : 'bg-cw-primary hover:bg-cw-primary-dark'}`}>
            <Mic className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
    </div>
  );
}
