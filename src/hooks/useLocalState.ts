import { Dispatch, SetStateAction, useEffect, useState } from 'react';

/**
 * Custom hook for managing state that persists to localStorage
 * @template T
 * @param key - The localStorage key
 * @param initial - The initial value
 * @returns A tuple of [state, setState]
 */
export default function useLocalState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch (_) {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
      window.dispatchEvent(
        new StorageEvent('storage', {
          key,
          newValue: JSON.stringify(state),
          storageArea: localStorage,
        })
      );
    } catch (_) {}
  }, [key, state]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          const newState = JSON.parse(e.newValue);
          setState(newState);
        } catch (error) {
          console.error('Failed to parse state:', error);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, setState]);

  return [state, setState];
}
