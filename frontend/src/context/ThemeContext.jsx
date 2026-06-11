import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem('cw_theme') || 'dark');
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('cw_fontsize') || 'medium');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.fontSize = fontSize === 'small' ? '14px' : fontSize === 'large' ? '17px' : '16px';
    localStorage.setItem('cw_theme', theme);
    localStorage.setItem('cw_fontsize', fontSize);
  }, [theme, fontSize]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, fontSize, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
