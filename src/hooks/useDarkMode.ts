import { useLayoutEffect } from 'react';

export default function useDarkMode(darkMode: boolean): void {
  // Apply theme and accent color before paint + minimal reset for consistency
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.remove('light');
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
      root.style.setProperty('--background', '#1e1e1e');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.style.colorScheme = 'light';
      root.style.setProperty('--background', '#ffffff');
    }
  }, [darkMode]);
}
