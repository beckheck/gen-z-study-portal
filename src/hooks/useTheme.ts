import useAccentColor from '@/hooks/useAccentColor';
import useBaseStyles from '@/hooks/useBaseStyles';
import useCardOpacityStyles from '@/hooks/useCardOpacityStyles';
import useDarkMode from '@/hooks/useDarkMode';
import { ColorTheme, OpacityTheme, Theme } from '@/types';
import useLocalState from './useLocalState';

/**
 * Custom hook for managing all theme-related state
 */
export default function useTheme(): Theme {
  // Detect system preference for dark mode
  const prefersDark =
    typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Theme state management
  const [darkMode, setDarkMode] = useLocalState<boolean>('sp:dark', prefersDark);
  const [bgImage, setBgImage] = useLocalState<string>('sp:bgImage', '');

  const [accentColor, setAccentColor] = useLocalState<ColorTheme>('sp:accentColor', {
    light: '#7c3aed', // violet-600
    dark: '#8b5cf6', // violet-500
  });

  const [cardOpacity, setCardOpacity] = useLocalState<OpacityTheme>('sp:cardOpacity', {
    light: 80, // 80% opacity for light mode
    dark: 25, // 25% opacity for dark mode (increased from 18%)
  });

  const [gradientStart, setGradientStart] = useLocalState<ColorTheme>('sp:gradientStart', {
    light: '#ffd2e9', // fuchsia-200 equivalent
    dark: '#18181b', // zinc-900 equivalent
  });

  const [gradientMiddle, setGradientMiddle] = useLocalState<ColorTheme>('sp:gradientMiddle', {
    light: '#bae6fd', // sky-200 equivalent
    dark: '#0f172a', // slate-900 equivalent
  });

  const [gradientEnd, setGradientEnd] = useLocalState<ColorTheme>('sp:gradientEnd', {
    light: '#a7f3d0', // emerald-200 equivalent
    dark: '#1e293b', // slate-800 equivalent
  });

  const [gradientEnabled, setGradientEnabled] = useLocalState<boolean>('sp:gradientEnabled', true);

  useDarkMode(darkMode);
  useAccentColor(darkMode ? accentColor.dark : accentColor.light);
  useBaseStyles();
  useCardOpacityStyles(cardOpacity, darkMode);

  // Return all theme-related state and setters
  return {
    // Core theme state
    darkMode,
    setDarkMode,

    // Background and visual settings
    bgImage,
    setBgImage,

    // Accent and opacity settings
    accentColor,
    setAccentColor,
    cardOpacity,
    setCardOpacity,

    // Gradient settings
    gradientEnabled,
    setGradientEnabled,
    gradientStart,
    setGradientStart,
    gradientMiddle,
    setGradientMiddle,
    gradientEnd,
    setGradientEnd,
  };
}
