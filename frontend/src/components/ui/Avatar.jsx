import React from 'react';

const COLORS = ['#00a884','#25d366','#128c7e','#075e54','#34b7f1','#9c27b0','#ff6f00','#e91e63'];

const getColor = (name = '') => COLORS[name.charCodeAt(0) % COLORS.length];
const getInitials = (name = '') => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

export default function Avatar({ src, name = '', size = 40, className = '' }) {
  const style = { width: size, height: size, minWidth: size, minHeight: size };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={style}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        onError={e => { e.target.style.display = 'none'; e.target.nextSibling?.style.removeProperty('display'); }}
      />
    );
  }

  return (
    <div
      style={{ ...style, background: getColor(name) }}
      className={`rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-white ${className}`}
    >
      <span style={{ fontSize: size * 0.38 }}>{getInitials(name)}</span>
    </div>
  );
}
