import { getHSLComponents } from '@/lib/utils';
import { useLayoutEffect } from 'react';

// Accent color CSS variables updater
export default function useAccentColor(color: string): void {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const hsl = getHSLComponents(color);

    root.style.setProperty('--accent-h', String(hsl.h));
    root.style.setProperty('--accent-s', hsl.s + '%');
    root.style.setProperty('--accent-l', hsl.l + '%');
  }, [color]);
}
