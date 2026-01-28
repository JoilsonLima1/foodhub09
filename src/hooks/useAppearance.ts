import { useState, useEffect } from 'react';

export type FontSize = 'small' | 'medium' | 'large';

const fontSizeMap: Record<FontSize, string> = {
  small: '14px',
  medium: '16px',
  large: '18px',
};

export function useAppearance() {
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('fontSize') as FontSize;
      if (stored && fontSizeMap[stored]) return stored;
    }
    return 'medium';
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--base-font-size', fontSizeMap[fontSize]);
    root.classList.remove('font-small', 'font-medium', 'font-large');
    root.classList.add(`font-${fontSize}`);
    localStorage.setItem('fontSize', fontSize);
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const toggleSidebar = () => setSidebarCollapsed(prev => !prev);

  return { 
    fontSize, 
    setFontSize, 
    sidebarCollapsed, 
    setSidebarCollapsed, 
    toggleSidebar 
  };
}
