import { useLayoutEffect } from 'react';
import { getHSLComponents } from '@/lib/utils';

// Accent color CSS variables updater
export default function useAccentColor(color) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const hsl = getHSLComponents(color);

    root.style.setProperty('--accent-h', hsl.h);
    root.style.setProperty('--accent-s', hsl.s + '%');
    root.style.setProperty('--accent-l', hsl.l + '%');
  }, [color]);
}
