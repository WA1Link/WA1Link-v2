import { useEffect, useRef } from 'react';

/**
 * Hook to safely manage Electron IPC listeners with cleanup
 */
export function useElectronListener<T>(
  subscribe: (callback: (data: T) => void) => () => void,
  callback: (data: T) => void,
  deps: React.DependencyList = []
) {
  const callbackRef = useRef(callback);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    // Subscribe with a wrapper that uses the latest callback
    const unsubscribe = subscribe((data: T) => {
      callbackRef.current(data);
    });

    // Cleanup on unmount
    return unsubscribe;
  }, deps);
}
