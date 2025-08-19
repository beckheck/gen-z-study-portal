import useAccentColor from '@/hooks/useAccentColor';
import useBaseStyles from '@/hooks/useBaseStyles';
import useCardOpacityStyles from '@/hooks/useCardOpacityStyles';
import useDarkMode from '@/hooks/useDarkMode';
import { Theme, ThemeSetters } from '@/types';
import { useMemo } from 'react';
import { useThemeStore } from './useStore';

/**
 * Custom hook for managing all theme-related state
 */
export default function useTheme(): Theme {
  const {
    theme,
    setDarkMode,
    setBgImage,
    setAccentColor,
    setCardOpacity,
    setGradientEnabled,
    setGradientStart,
    setGradientMiddle,
    setGradientEnd,
  } = useThemeStore();

  useDarkMode(theme.darkMode);
  useAccentColor(theme.darkMode ? theme.accentColor.dark : theme.accentColor.light);
  useBaseStyles();
  useCardOpacityStyles(theme.cardOpacity, theme.darkMode);

  // Memoize theme setters to prevent unnecessary re-renders
  const themeSetters: ThemeSetters = useMemo(
    () => ({
      darkMode: setDarkMode,
      bgImage: setBgImage,
      accentColor: setAccentColor,
      cardOpacity: setCardOpacity,
      gradientEnabled: setGradientEnabled,
      gradientStart: setGradientStart,
      gradientMiddle: setGradientMiddle,
      gradientEnd: setGradientEnd,
    }),
    [
      setDarkMode,
      setBgImage,
      setAccentColor,
      setCardOpacity,
      setGradientEnabled,
      setGradientStart,
      setGradientMiddle,
      setGradientEnd,
    ]
  );

  // Return combined theme object with grouped properties
  return useMemo(
    () => ({
      get: theme,
      set: themeSetters,
    }),
    [theme, themeSetters]
  );
}
