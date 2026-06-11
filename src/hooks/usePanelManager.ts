import { useState, useCallback, useEffect, useRef } from 'react';
import type { PanelName } from '../types';

/**
 * Hook to manage panel visibility, active panel, and search logic
 */
export function usePanelManager(defaultPanel: PanelName = 'Engine') {
  const [activePanel, setActivePanel] = useState<PanelName>(defaultPanel);

  const switchPanel = useCallback((panel: PanelName) => {
    setActivePanel(panel);
  }, []);

  return {
    activePanel,
    switchPanel,
  };
}

/**
 * Hook for debounced search
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for auto-load on first mount
 */
export function useOnce(fn: () => void) {
  const done = useRef(false);
  useEffect(() => {
    if (!done.current) {
      done.current = true;
      fn();
    }
  }, [fn]);
}
