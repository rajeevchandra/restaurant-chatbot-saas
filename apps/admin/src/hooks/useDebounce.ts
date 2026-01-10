import { useState, useCallback } from 'react';

/**
 * Hook for debouncing search inputs to reduce API calls
 * @param callback Function to call after debounce
 * @param delay Delay in milliseconds (default: 500ms)
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
) {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const debouncedFunction = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const newTimeoutId = setTimeout(() => {
        callback(...args);
      }, delay);

      setTimeoutId(newTimeoutId);
    },
    [callback, delay, timeoutId]
  );

  return debouncedFunction;
}

/**
 * Hook for throttling frequent function calls
 * @param callback Function to call
 * @param delay Minimum time between calls (default: 300ms)
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
) {
  const [isThrottled, setIsThrottled] = useState(false);

  const throttledFunction = useCallback(
    (...args: Parameters<T>) => {
      if (isThrottled) return;

      callback(...args);
      setIsThrottled(true);

      setTimeout(() => {
        setIsThrottled(false);
      }, delay);
    },
    [callback, delay, isThrottled]
  );

  return throttledFunction;
}
