import React from 'react';

export default function TypingIndicator({ name }) {
  return (
    <div className="flex items-center gap-2">
      <div className="msg-bubble-in px-3 py-2 rounded-xl rounded-tl-none flex items-center gap-1">
        <div className="typing-dot" style={{ animationDelay: '0ms' }} />
        <div className="typing-dot" style={{ animationDelay: '200ms' }} />
        <div className="typing-dot" style={{ animationDelay: '400ms' }} />
      </div>
      {name && <span className="text-xs text-cw-text-muted">{name} is typing…</span>}
    </div>
  );
}
