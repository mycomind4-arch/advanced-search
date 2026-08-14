'use client';

import { useEffect } from 'react';
import { useApp } from '@/lib/store';

export function useKeyboardShortcuts() {
  const { state, dispatch } = useApp();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Cmd/Ctrl + K — command palette (always works)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_COMMAND_PALETTE' });
        return;
      }

      // Escape — close panels
      if (e.key === 'Escape') {
        if (state.commandPaletteOpen) {
          dispatch({ type: 'TOGGLE_COMMAND_PALETTE', open: false });
        } else if (state.inspectorOpen) {
          dispatch({ type: 'TOGGLE_INSPECTOR', open: false });
        }
        return;
      }

      // Don't trigger shortcuts while typing
      if (isTyping) return;

      // '/' — focus search (navigate to search page)
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        window.location.href = '/search';
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch, state.commandPaletteOpen, state.inspectorOpen]);
}
