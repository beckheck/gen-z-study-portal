import CoursesSettings from '@/components/CoursesSettings';
import FocusTimerSettings from '@/components/FocusTimerSettings';
import HydrationSettings from '@/components/HydrationSettings';
import SoundtrackSettings from '@/components/SoundtrackSettings';
import WeatherApiSettings from '@/components/WeatherApiSettings';
import { BookOpen, Cloud, Droplets, Music, Timer } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface SettingsDialog {
  title: string;
  subtitle: string;
  Icon: (props: any) => any;
  Body: () => any;
}

export function useSettingsDialog() {
  const { t } = useTranslation('settings');
  const [activeDialog, setActiveDialog] = useState<string | null>(null);

  // Settings dialogs configuration
  const settingsDialogs: Record<string, SettingsDialog> = useMemo<Record<string, SettingsDialog>>(
    () => ({
      courses: {
        title: t('courses.title'),
        subtitle: t('courses.description'),
        Icon: BookOpen,
        Body: CoursesSettings,
      },
      focusTimer: {
        title: t('focusTimer.title'),
        subtitle: t('focusTimer.description'),
        Icon: Timer,
        Body: FocusTimerSettings,
      },
      hydration: {
        title: t('hydration.title'),
        subtitle: t('hydration.description'),
        Icon: Droplets,
        Body: HydrationSettings,
      },
      soundtrack: {
        title: t('soundtrack.title'),
        subtitle: t('soundtrack.description'),
        Icon: Music,
        Body: SoundtrackSettings,
      },
      weatherApi: {
        title: t('weatherApi.title'),
        subtitle: t('weatherApi.description'),
        Icon: Cloud,
        Body: WeatherApiSettings,
      },
    }),
    [t]
  );

  const openDialog = useCallback((id: string) => {
    setActiveDialog(id);
  }, []);

  const closeDialog = useCallback(() => {
    setActiveDialog(null);
  }, []);

  // Find active dialog
  const currentDialog = useMemo(
    () => (activeDialog ? settingsDialogs[activeDialog] || null : null),
    [settingsDialogs, activeDialog]
  );

  return {
    activeDialog,
    openDialog,
    closeDialog,
    settingsDialogs,
    currentDialog,
  };
}
