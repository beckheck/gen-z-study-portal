import CourseManagerTab from '@/components/CourseManagerTab';
import DashboardTab from '@/components/DashboardTab';
import DegreePlanTab from '@/components/DegreePlanTab';
import { LanguageSelector } from '@/components/LanguageSelector';
import MoonSunToggle from '@/components/MoonSunToggle';
import OverflowTabs from '@/components/OverflowTabs';
import PlannerTab from '@/components/PlannerTab';
import SettingsTab from '@/components/SettingsTab';
import SoundtrackCard from '@/components/SoundtrackCard';
import StudyTrackerTab from '@/components/StudyTrackerTab';
import TimetableTab from '@/components/TimetableTab';
import WellnessTab from '@/components/WellnessTab';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import useAccentColorStyles from '@/hooks/useAccentColorStyles';
import useBaseStyles from '@/hooks/useBaseStyles';
import useCardOpacityStyles from '@/hooks/useCardOpacityStyles';
import useDarkModeStyles from '@/hooks/useDarkModeStyles';
import useHashNavigation from '@/hooks/useHashNavigation';
import { useSoundtrack, useTheme } from '@/hooks/useStore';
import { motion } from 'framer-motion';
import {
  Brain,
  CalendarDays,
  CalendarRange,
  GraduationCap,
  HeartPulse,
  Home,
  Menu,
  NotebookPen,
  Settings as SettingsIcon,
  Sparkles,
} from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppTab } from './types';

function AppSubtitle() {
  const { t } = useTranslation('common');

  return (
    <>
      <span
        className="font-semibold"
        style={{
          color: `hsl(var(--accent-h) var(--accent-s) var(--accent-l))`,
        }}
      >
        {t('app.subtitle.genZ')}
      </span>{' '}
      {t('app.subtitle.portal')}
    </>
  );
}

// -----------------------------
// Main App Component
// -----------------------------
export default function StudyPortal(): React.JSX.Element {
  // Translation hook
  const { t } = useTranslation('common');

  // Get state from centralized store
  const { theme, setDarkMode } = useTheme();
  const { soundtrack, setSoundtrackPosition } = useSoundtrack();

  // Localized tabs array
  const tabs: AppTab[] = [
    { value: 'dashboard', label: t('navigation.dashboard'), icon: Home },
    { value: 'planner', label: t('navigation.planner'), icon: CalendarDays },
    { value: 'timetable', label: t('navigation.timetable'), icon: CalendarRange },
    { value: 'courses', label: t('navigation.courses'), icon: NotebookPen },
    { value: 'degree-plan', label: t('navigation.degreePlan'), icon: GraduationCap },
    { value: 'study', label: t('navigation.study'), icon: Brain },
    { value: 'wellness', label: t('navigation.wellness'), icon: HeartPulse },
    { value: 'settings', label: t('navigation.settings'), icon: SettingsIcon },
  ];

  const navigationValues = tabs.map(tab => tab.value);

  // Hash-based navigation for tabs
  const { currentValue: activeTab, setValue: setActiveTab } = useHashNavigation({
    validValues: navigationValues,
    defaultValue: navigationValues[0],
    useHistory: true,
  });

  // Local UI state (not persisted)
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Style hooks
  useDarkModeStyles();
  useAccentColorStyles();
  useBaseStyles();
  useCardOpacityStyles();

  const handleTabChange = useCallback(
    (value: string) => {
      setActiveTab(value);
      setIsDrawerOpen(false); // Close drawer when tab is selected
    },
    [setActiveTab, setIsDrawerOpen]
  );

  return (
    <div
      className="min-h-screen relative text-zinc-900 dark:text-zinc-100"
      style={
        theme.gradientEnabled
          ? {
              background: `linear-gradient(to bottom right, ${
                theme.darkMode ? theme.gradientStart.dark : theme.gradientStart.light
              }, ${theme.darkMode ? theme.gradientMiddle.dark : theme.gradientMiddle.light}, ${
                theme.darkMode ? theme.gradientEnd.dark : theme.gradientEnd.light
              })`,
            }
          : {}
      }
    >
      {theme.bgImage && (
        <div
          className="pointer-events-none absolute inset-0 bg-center bg-cover bg-no-repeat opacity-60 mix-blend-luminosity"
          style={{ backgroundImage: `url(${theme.bgImage})` }}
          aria-hidden="true"
        />
      )}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Floating burger menu for mobile */}
        <div className="md:hidden fixed top-6 left-6 z-50">
          <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <SheetTrigger asChild>
              <button className="p-3 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md hover:bg-white/90 dark:hover:bg-zinc-900/90 transition-all duration-200 shadow-lg hover:shadow-xl border border-white/20 dark:border-white/10">
                <Menu className="w-6 h-6" />
                <span className="sr-only">{t('navigation.openNavigationMenu')}</span>
              </button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-r border-white/20 dark:border-white/10"
            >
              <div className="flex flex-col space-y-6">
                {/* Header content in drawer */}
                <div className="flex items-center gap-3 pt-4">
                  <div className="p-3 rounded-2xl bg-white/70 dark:bg-white/10 backdrop-blur shadow-lg">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-xl font-extrabold tracking-tight">
                      {t('app.title')} — <AppSubtitle />
                    </h1>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">{t('app.tagline')}</p>
                  </div>
                </div>

                {/* Dark/Light mode toggle in drawer */}
                <div className="flex items-center justify-center gap-6 px-3 py-2 rounded-xl bg-white/70 dark:bg-white/10 backdrop-blur">
                  <LanguageSelector />
                  <MoonSunToggle checked={theme.darkMode} onCheckedChange={setDarkMode} />
                </div>

                {/* Navigation */}
                <div className="flex flex-col space-y-2">
                  {tabs.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => handleTabChange(value)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                        activeTab === value
                          ? 'bg-white/90 dark:bg-white/20 text-zinc-900 dark:text-zinc-100 shadow-md scale-105 font-semibold border border-white/40'
                          : 'hover:bg-white/50 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300'
                      }`}
                      style={{
                        transform: activeTab === value ? 'scale(1.02)' : 'scale(1)',
                        boxShadow:
                          activeTab === value
                            ? '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 0 1px hsl(var(--accent-h) var(--accent-s) var(--accent-l) / 0.3)'
                            : undefined,
                      }}
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 ${activeTab === value ? 'text-current' : ''}`} />
                      <span className={`font-medium ${activeTab === value ? 'font-semibold' : ''}`}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-4 mb-8"
        >
          {/* Empty div for spacing on mobile */}
          <div className="md:hidden"></div>

          {/* Desktop header content */}
          <div className="flex items-center gap-3 md:justify-start justify-center flex-1 md:flex-initial">
            <div className="hidden md:block p-3 rounded-2xl bg-white/70 dark:bg-white/10 backdrop-blur shadow-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="hidden md:block">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {t('app.title')} — <AppSubtitle />
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{t('app.tagline')}</p>
            </div>
            {/* Mobile title - simplified and centered */}
            <div className="md:hidden text-center">
              <h1 className="text-3xl font-extrabold tracking-tight">{t('app.title')}</h1>
            </div>
          </div>

          {/* Desktop dark/light mode toggle */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-6 px-3 py-2 rounded-xl bg-white/70 dark:bg-white/10 backdrop-blur">
              <LanguageSelector />
              <MoonSunToggle checked={theme.darkMode} onCheckedChange={setDarkMode} />
            </div>
          </div>
        </motion.header>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          {/* Desktop tabs with overflow handling - hidden on mobile */}
          <div className="hidden md:flex justify-center">
            <OverflowTabs
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              className="flex flex-wrap justify-center gap-2 bg-white/70 dark:bg-white/10 backdrop-blur p-3 rounded-2xl shadow-lg"
              style={{ paddingTop: '8px', paddingBottom: '16px' }}
            />
          </div>

          <TabsContent value="dashboard" className="space-y-6">
            <DashboardTab onTabChange={handleTabChange} />
          </TabsContent>

          <TabsContent value="planner">
            <PlannerTab />
          </TabsContent>

          <TabsContent value="timetable">
            <TimetableTab />
          </TabsContent>

          <TabsContent value="courses">
            <CourseManagerTab />
          </TabsContent>

          <TabsContent value="degree-plan" className="space-y-6">
            <DegreePlanTab />
          </TabsContent>

          <TabsContent value="study">
            <StudyTrackerTab />
          </TabsContent>

          <TabsContent value="wellness">
            <WellnessTab />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
        </Tabs>

        {/* Floating Soundtrack - Persists across all tabs */}
        {soundtrack.position !== 'dashboard' && soundtrack.embed && (
          <SoundtrackCard
            embed={soundtrack.embed}
            position={soundtrack.position}
            onPositionChange={setSoundtrackPosition}
          />
        )}
      </div>
    </div>
  );
}
