import React from 'react';

export default function SmartReplies({ suggestions, onSelect }) {
  if (!suggestions?.length) return null;
  return (
    <div className="px-3 py-2 flex gap-2 overflow-x-auto border-t border-cw-border">
      <span className="text-xs text-cw-text-muted self-center flex-shrink-0">💡</span>
      {suggestions.map((s, i) => (
        <button key={i} onClick={() => onSelect(s)}
          className="flex-shrink-0 bg-cw-panel-light hover:bg-cw-panel text-cw-text text-xs px-3 py-1.5 rounded-full border border-cw-border transition-colors whitespace-nowrap">
          {s}
        </button>
      ))}
    </div>
  );
}
