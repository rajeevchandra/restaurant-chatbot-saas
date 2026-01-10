import { useEffect, useRef } from 'react';
import { logout } from '@/lib/auth';

// 20 minutes in milliseconds
const AUTO_LOGOUT_DELAY = 20 * 60 * 1000;

export function useAutoLogout() {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        logout();
      }, AUTO_LOGOUT_DELAY);
    };

    // List of events that indicate user activity
    const events = [
      'mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll',
    ];

    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Start timer on mount
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, []);
}
