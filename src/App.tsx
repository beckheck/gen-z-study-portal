import CourseManagerTab from '@/components/CourseManagerTab';
import DashboardTab from '@/components/DashboardTab';
import DegreePlanTab from '@/components/DegreePlanTab';
import MoonSunToggle from '@/components/MoonSunToggle';
import PlannerTab from '@/components/PlannerTab';
import SettingsTab from '@/components/SettingsTab';
import SoundtrackCard from '@/components/SoundtrackCard';
import StudyTrackerTab from '@/components/StudyTrackerTab';
import TimetableTab from '@/components/TimetableTab';
import WellnessTab from '@/components/WellnessTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppState } from '@/hooks/useStore';
import { useSoundtrack } from '@/hooks/useStore';
import useTheme from '@/hooks/useTheme';
import { motion } from 'framer-motion';
import {
  Brain,
  CalendarDays,
  CalendarRange,
  GraduationCap,
  HeartPulse,
  NotebookPen,
  Settings as SettingsIcon,
  Sparkles,
} from 'lucide-react';
import React, { useState } from 'react';
import type { SoundtrackPosition } from './types';

// -----------------------------
// Main App Component
// -----------------------------
export default function StudyPortal(): React.JSX.Element {
  // Get state from centralized store
  const state = useAppState();
  const theme = useTheme();
  const { soundtrack, setSoundtrackPosition } = useSoundtrack();

  // Local UI state (not persisted)
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  return (
    <div
      className="min-h-screen relative text-zinc-900 dark:text-zinc-100"
      style={
        theme.get.gradientEnabled
          ? {
              background: `linear-gradient(to bottom right, ${
                theme.get.darkMode ? theme.get.gradientStart.dark : theme.get.gradientStart.light
              }, ${theme.get.darkMode ? theme.get.gradientMiddle.dark : theme.get.gradientMiddle.light}, ${
                theme.get.darkMode ? theme.get.gradientEnd.dark : theme.get.gradientEnd.light
              })`,
            }
          : {}
      }
    >
      {theme.get.bgImage && (
        <div
          className="pointer-events-none absolute inset-0 bg-center bg-cover bg-no-repeat opacity-60 mix-blend-luminosity"
          style={{ backgroundImage: `url(${theme.get.bgImage})` }}
          aria-hidden="true"
        />
      )}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-4 mb-8"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-white/70 dark:bg-white/10 backdrop-blur shadow-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                StudyHub ✨ — <span className="text-white dark:text-black">Gen Z</span> Portal
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Plan smarter. Study deeper. Protect your vibe.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/70 dark:bg-white/10 backdrop-blur">
              <MoonSunToggle checked={theme.get.darkMode} onCheckedChange={theme.set.darkMode} />
            </div>
          </div>
        </motion.header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex justify-center">
            <TabsList
              className="flex flex-wrap justify-center gap-2 bg-white/70 dark:bg-white/10 backdrop-blur p-3 rounded-2xl shadow-lg"
              style={{ paddingTop: '8px', paddingBottom: '16px' }}
            >
              {[
                { value: 'dashboard', label: 'Dashboard' },
                { value: 'planner', label: 'Planner', icon: CalendarDays },
                { value: 'timetable', label: 'Timetable', icon: CalendarRange },
                { value: 'courses', label: 'Courses', icon: NotebookPen },
                { value: 'degree-plan', label: 'Degree Plan', icon: GraduationCap },
                { value: 'study', label: 'Study Tracker', icon: Brain },
                { value: 'wellness', label: 'Wellness', icon: HeartPulse },
                { value: 'settings', label: 'Settings', icon: SettingsIcon },
              ].map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="rounded-xl px-4"
                  style={{
                    '--tab-accent': 'hsl(var(--accent-h) var(--accent-s) var(--accent-l))',
                    transform: 'translateY(-2px)',
                  }}
                >
                  {Icon && <Icon className="w-4 h-4 mr-2" />}
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-6">
            <DashboardTab onTabChange={setActiveTab} />
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
          <SoundtrackCard embed={soundtrack.embed} position={soundtrack.position} onPositionChange={setSoundtrackPosition} />
        )}
      </div>
    </div>
  );
}
