import { useEffect, useCallback, useState } from 'react';

export interface KeyboardShortcut {
  key: string;
  label: string;
  description: string;
  action: () => void;
  enabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const [activeShortcuts, setActiveShortcuts] = useState<KeyboardShortcut[]>(shortcuts);

  useEffect(() => {
    setActiveShortcuts(shortcuts);
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Ignore if user is typing in an input field (except for F-keys)
    const target = event.target as HTMLElement;
    const isInputField = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.isContentEditable;
    
    // Only block non-F-key shortcuts when in input fields
    const isFunctionKey = event.key.startsWith('F') && event.key.length <= 3;
    if (isInputField && !isFunctionKey) return;

    // Find matching shortcut
    const shortcut = activeShortcuts.find(s => {
      if (s.enabled === false) return false;
      return s.key.toLowerCase() === event.key.toLowerCase();
    });

    if (shortcut) {
      event.preventDefault();
      event.stopPropagation();
      shortcut.action();
    }
  }, [enabled, activeShortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handleKeyDown]);

  return {
    shortcuts: activeShortcuts,
    updateShortcut: (key: string, updates: Partial<KeyboardShortcut>) => {
      setActiveShortcuts(prev => 
        prev.map(s => s.key === key ? { ...s, ...updates } : s)
      );
    },
  };
}
