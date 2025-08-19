import { OpacityTheme } from '@/types';
import { useLayoutEffect } from 'react';

export default function useCardOpacityStyles(cardOpacity: OpacityTheme, darkMode: boolean): void {
  // Update card opacity CSS variables
  useLayoutEffect(() => {
    let style = document.getElementById('sp-card-opacity');
    if (!style) {
      style = document.createElement('style');
      style.id = 'sp-card-opacity';
      document.head.appendChild(style);
    }

    const cssContent = `
/* Card opacity adjustments - Light Mode */
:where(:not(.dark)) .bg-white\\/80 {
  background-color: rgba(255, 255, 255, ${cardOpacity.light}) !important;
}

/* Card opacity adjustments - Dark Mode */
:where(.dark) .bg-white\\/80,
:where(.dark) .dark\\:bg-white\\/10 {
  background-color: rgba(39, 39, 42, ${cardOpacity.dark}) !important;
}

/* Ensure dark mode overrides */
.dark .bg-white\\/80 {
  background-color: rgba(39, 39, 42, ${cardOpacity.dark}) !important;
}

.dark .dark\\:bg-white\\/10 {
  background-color: rgba(39, 39, 42, ${cardOpacity.dark}) !important;
}
`;

    style.textContent = cssContent;
  }, [cardOpacity, darkMode]);
}
