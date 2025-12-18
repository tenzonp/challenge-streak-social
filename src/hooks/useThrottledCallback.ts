import { useCallback, useRef } from 'react';
import { isPerfLowEnd } from './usePerformanceMode';

export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const lastCall = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const lowEnd = isPerfLowEnd();
    const actualDelay = lowEnd ? delay * 2 : delay; // Double throttle on low-end

    if (now - lastCall.current >= actualDelay) {
      lastCall.current = now;
      return callback(...args);
    } else {
      // Queue the last call
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        lastCall.current = Date.now();
        callback(...args);
      }, actualDelay - (now - lastCall.current));
    }
  }, [callback, delay]) as T;
}

export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback((...args: Parameters<T>) => {
    const lowEnd = isPerfLowEnd();
    const actualDelay = lowEnd ? delay * 1.5 : delay;

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, actualDelay);
  }, [callback, delay]) as T;
}
