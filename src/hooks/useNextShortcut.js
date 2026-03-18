import { useEffect } from 'react';

export default function useNextShortcut(handler, enabled) {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handler();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handler, enabled]);
}
