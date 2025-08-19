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
import useLocalState from '@/hooks/useLocalState';
import useStudyTimer from '@/hooks/useStudyTimer';
import useTheme from '@/hooks/useTheme';
import { DataTransfer } from '@/lib/data-transfer';
import { uid } from '@/lib/utils';
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
import React, { useEffect, useMemo, useState } from 'react';
import type {
  AppState,
  DegreePlan,
  Exam,
  ExamGrade,
  MoodEmojis,
  RegularEvent,
  ScheduleEvent,
  Session,
  SessionTask,
  SoundtrackPosition,
  Task,
  TimetableEvent,
  WeatherLocation,
} from './types';

// -----------------------------
// Helpers & Local Storage Hooks
// -----------------------------
const DEFAULT_COURSES: string[] = [
  'Calculus',
  'Chemistry',
  'Linear Algebra',
  'Economics',
  'Programming',
  'Elective',
  'Optional Course',
];

// -----------------------------
// Main App Component
// -----------------------------
export default function StudyPortal(): React.JSX.Element {
  // Core state
  const [courses, setCourses] = useLocalState<string[]>('sp:courses', DEFAULT_COURSES);
  const [schedule, setSchedule] = useLocalState<ScheduleEvent[]>('sp:schedule', []); // {id, courseIndex, type, title, day, start, end, location}
  const [timetableEvents, setTimetableEvents] = useLocalState<TimetableEvent[]>('sp:timetableEvents', []); // {id, courseIndex, eventType, classroom, teacher, day, startTime, endTime, block}
  const [tasks, setTasks] = useLocalState<Task[]>('sp:tasks', []); // per-course to-dos
  const [exams, setExams] = useLocalState<Exam[]>('sp:exams', []);
  const [examGrades, setExamGrades] = useLocalState<ExamGrade[]>('sp:examGrades', []); // {examId, grade}
  const [regularEvents, setRegularEvents] = useLocalState<RegularEvent[]>('sp:regularEvents', []); // multi-day events
  const [sessions, setSessions] = useLocalState<Session[]>('sp:sessions', []);
  const [sessionTasks, setSessionTasks] = useLocalState<SessionTask[]>('sp:sessionTasks', []);
  const [selectedCourse, setSelectedCourse] = useLocalState<number>('sp:selectedCourse', 0);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [degreePlan, setDegreePlan] = useLocalState<DegreePlan>('sp:degreePlan', {
    semesters: [],
    totalSemesters: 0,
    completedCourses: [], // Array of course acronyms that are completed
  });

  // Soundtrack state
  const [soundtrackPosition, setSoundtrackPosition] = useState<SoundtrackPosition>('dashboard'); // 'dashboard', 'floating', 'hidden'
  const [soundtrackEmbed, setSoundtrackEmbed] = useLocalState<string>('sp:soundtrackEmbed', '');

  // Weather state
  const [weatherApiKey, setWeatherApiKey] = useLocalState<string>('sp:weatherApiKey', '');
  const [weatherLocation, setWeatherLocation] = useLocalState<WeatherLocation>('sp:weatherLocation', {
    useGeolocation: true,
    city: '',
  });

  // Wellness/Mood Bubble state
  const [water, setWater] = useLocalState<number>('sp:water', 0);
  const [gratitude, setGratitude] = useLocalState<string>('sp:gratitude', '');
  const [moodPercentages, setMoodPercentages] = useLocalState<Record<string, number>>('sp:moodPercentages', {});
  const [hasInteracted, setHasInteracted] = useLocalState<boolean>('sp:moodInteracted', false);
  const [monthlyMoods, setMonthlyMoods] = useLocalState<Record<string, any>>('sp:monthlyMoods', {}); // Store moods by date
  const [showWords, setShowWords] = useLocalState<boolean>('sp:showMoodWords', true); // Toggle for showing words
  const [moodEmojis, setMoodEmojis] = useLocalState<MoodEmojis>('sp:moodEmojis', {
    angry: { emoji: '😠', color: '#ff6b6b', word: 'Angry' },
    sad: { emoji: '😔', color: '#ff9f43', word: 'Sad' },
    neutral: { emoji: '😐', color: '#f7dc6f', word: 'Neutral' },
    happy: { emoji: '🙂', color: '#45b7d1', word: 'Happy' },
    excited: { emoji: '😁', color: '#10ac84', word: 'Excited' },
  });

  // Ensure courses array always has 7 courses (migration for existing users)
  useEffect(() => {
    if (courses.length < DEFAULT_COURSES.length) {
      const updatedCourses = [...courses];
      // Add missing courses from DEFAULT_COURSES
      for (let i = courses.length; i < DEFAULT_COURSES.length; i++) {
        updatedCourses.push(DEFAULT_COURSES[i]);
      }
      setCourses(updatedCourses);
    }
  }, [courses, setCourses]);

  // Data transfer instance for import/export
  const dataTransfer = useMemo(
    () =>
      new DataTransfer(
        // Get state callback
        (): AppState => ({
          sessions,
          exams,
          examGrades,
          tasks,
          regularEvents,
          timetableEvents,
          schedule,
          sessionTasks,
          courses,
          selectedCourse,
          theme: theme.get,
          soundtrackEmbed,
          weatherApiKey,
          weatherLocation,
          degreePlan,
          // Wellness data
          water,
          gratitude,
          moodPercentages,
          hasInteracted,
          monthlyMoods,
          showWords,
          moodEmojis,
        }),
        // Set state callback
        (newState: Partial<AppState>): void => {
          if (newState.sessions) setSessions(newState.sessions);
          if (newState.exams) setExams(newState.exams);
          if (newState.examGrades) setExamGrades(newState.examGrades);
          if (newState.tasks) setTasks(newState.tasks);
          if (newState.regularEvents) setRegularEvents(newState.regularEvents);
          if (newState.schedule) setSchedule(newState.schedule);
          if (newState.timetableEvents) setTimetableEvents(newState.timetableEvents);
          if (newState.sessionTasks) setSessionTasks(newState.sessionTasks);
          if (newState.courses) setCourses(newState.courses);
          if (newState.selectedCourse !== undefined) setSelectedCourse(newState.selectedCourse);
          if (newState.theme) {
            const themeState = newState.theme;
            if (themeState.darkMode !== undefined) theme.set.darkMode(themeState.darkMode);
            if (themeState.gradientEnabled !== undefined) theme.set.gradientEnabled(themeState.gradientEnabled);
            if (themeState.gradientStart) theme.set.gradientStart(themeState.gradientStart);
            if (themeState.gradientMiddle) theme.set.gradientMiddle(themeState.gradientMiddle);
            if (themeState.gradientEnd) theme.set.gradientEnd(themeState.gradientEnd);
            if (themeState.bgImage !== undefined) theme.set.bgImage(themeState.bgImage);
            if (themeState.accentColor !== undefined) theme.set.accentColor(themeState.accentColor);
            if (themeState.cardOpacity !== undefined) theme.set.cardOpacity(themeState.cardOpacity);
          }
          if (newState.soundtrackEmbed !== undefined) setSoundtrackEmbed(newState.soundtrackEmbed);
          if (newState.weatherApiKey !== undefined) setWeatherApiKey(newState.weatherApiKey);
          if (newState.weatherLocation !== undefined) setWeatherLocation(newState.weatherLocation);
          if (newState.degreePlan !== undefined) setDegreePlan(newState.degreePlan);
          // Wellness state setters
          if (newState.water !== undefined) setWater(newState.water);
          if (newState.gratitude !== undefined) setGratitude(newState.gratitude);
          if (newState.moodPercentages !== undefined) setMoodPercentages(newState.moodPercentages);
          if (newState.hasInteracted !== undefined) setHasInteracted(newState.hasInteracted);
          if (newState.monthlyMoods !== undefined) setMonthlyMoods(newState.monthlyMoods);
          if (newState.showWords !== undefined) setShowWords(newState.showWords);
          if (newState.moodEmojis !== undefined) setMoodEmojis(newState.moodEmojis);
        }
      ),
    []
  );

  // Theme state
  const theme = useTheme();


  // Study timer - using custom hook with session completion callback
  const studyTimer = useStudyTimer(session => {
    setSessions(s => [session, ...s]);
  });

  // Function to clear all data related to a specific course
  function clearCourseData(courseIndex: number): void {
    // Clear tasks
    setTasks(tasks.filter(task => task.courseIndex !== courseIndex));

    // Clear exams
    const examIdsToDelete = exams.filter(exam => exam.courseIndex === courseIndex).map(exam => exam.id);
    setExams(exams.filter(exam => exam.courseIndex !== courseIndex));

    // Clear exam grades for this course's exams
    setExamGrades(examGrades.filter(grade => !examIdsToDelete.includes(grade.examId)));

    // Clear timetable events
    setTimetableEvents(timetableEvents.filter(event => event.courseIndex !== courseIndex));

    // Clear regular events (multi-day events)
    setRegularEvents(regularEvents.filter(event => event.courseIndex !== courseIndex));

    // Clear schedule entries
    setSchedule(schedule.filter(item => item.courseIndex !== courseIndex));

    // Clear study sessions related to this course
    setSessions(sessions.filter(session => session.courseIndex !== courseIndex));
  }

  // Schedule helpers
  function addSchedule(item: Omit<ScheduleEvent, 'id'>): void {
    setSchedule(s => [...s, { ...item, id: uid() }]);
  }
  function removeSchedule(id: string): void {
    setSchedule(s => s.filter(x => x.id !== id));
  }
  function eventsForDay(day: string): ScheduleEvent[] {
    return schedule.filter(e => e.day === day).sort((a, b) => a.start.localeCompare(b.start));
  }

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
        {/* Header */}
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

        {/* Tabs */}
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

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <DashboardTab
              weatherApiKey={weatherApiKey}
              weatherLocation={weatherLocation}
              exams={exams}
              tasks={tasks}
              courses={courses}
              setTasks={setTasks}
              setSelectedCourse={setSelectedCourse}
              onTabChange={setActiveTab}
              soundtrackEmbed={soundtrackEmbed}
              soundtrackPosition={soundtrackPosition}
              setSoundtrackPosition={setSoundtrackPosition}
            />
          </TabsContent>

          {/* Planner */}
          <TabsContent value="planner">
            <PlannerTab
              courses={courses}
              onAdd={addSchedule}
              onRemove={removeSchedule}
              eventsByDay={eventsForDay}
              exams={exams}
              tasks={tasks}
              regularEvents={regularEvents}
              addExam={e => setExams(s => [{ ...e, id: uid() }, ...s])}
              addTask={t => setTasks(s => [{ ...t, id: uid(), done: false }, ...s])}
              addRegularEvent={e => setRegularEvents(s => [{ ...e, id: uid() }, ...s])}
              deleteExam={id => {
                setExams(s => s.filter(e => e.id !== id));
                setExamGrades(g => g.filter(grade => grade.examId !== id));
              }}
              deleteTask={id => setTasks(s => s.filter(t => t.id !== id))}
              deleteRegularEvent={id => setRegularEvents(s => s.filter(e => e.id !== id))}
            />
          </TabsContent>

          {/* Timetable */}
          <TabsContent value="timetable">
            <TimetableTab courses={courses} timetableEvents={timetableEvents} setTimetableEvents={setTimetableEvents} />
          </TabsContent>

          {/* Courses */}
          <TabsContent value="courses">
            <CourseManagerTab
              courses={courses}
              selected={selectedCourse}
              setSelected={setSelectedCourse}
              tasks={tasks}
              addTask={t => setTasks(s => [{ ...t, id: uid(), done: false }, ...s])}
              toggleTask={id => setTasks(s => s.map(t => (t.id === id ? { ...t, done: !t.done } : t)))}
              deleteTask={id => setTasks(s => s.filter(t => t.id !== id))}
              exams={exams}
              addExam={e => setExams(s => [{ ...e, id: uid() }, ...s])}
              updateExam={(id, updatedExam) => setExams(s => s.map(e => (e.id === id ? { ...updatedExam, id } : e)))}
              deleteExam={id => {
                setExams(s => s.filter(e => e.id !== id));
                setExamGrades(g => g.filter(grade => grade.examId !== id));
              }}
              examGrades={examGrades}
              setExamGrades={setExamGrades}
              clearCourseData={clearCourseData}
            />
          </TabsContent>

          {/* Degree Plan */}
          <TabsContent value="degree-plan" className="space-y-6">
            <DegreePlanTab />
          </TabsContent>

          {/* Study Tracker */}
          <TabsContent value="study">
            <StudyTrackerTab
              courses={courses}
              selectedCourse={selectedCourse}
              setSelectedCourse={setSelectedCourse}
              studyTimer={studyTimer}
              sessions={sessions}
              setSessions={setSessions}
              sessionTasks={sessionTasks}
              setSessionTasks={setSessionTasks}
            />
          </TabsContent>

          {/* Wellness */}
          <TabsContent value="wellness">
            <WellnessTab
              water={water}
              setWater={setWater}
              gratitude={gratitude}
              setGratitude={setGratitude}
              moodPercentages={moodPercentages}
              setMoodPercentages={setMoodPercentages}
              hasInteracted={hasInteracted}
              setHasInteracted={setHasInteracted}
              monthlyMoods={monthlyMoods}
              setMonthlyMoods={setMonthlyMoods}
              showWords={showWords}
              setShowWords={setShowWords}
              moodEmojis={moodEmojis}
              setMoodEmojis={setMoodEmojis}
            />
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings">
            <SettingsTab
              courses={courses}
              renameCourse={(i, name) =>
                setCourses(arr => arr.map((c, idx) => (idx === i ? name || `Course ${i + 1}` : c)))
              }
              soundtrackEmbed={soundtrackEmbed}
              setSoundtrackEmbed={setSoundtrackEmbed}
              theme={theme}
              weatherApiKey={weatherApiKey}
              setWeatherApiKey={setWeatherApiKey}
              weatherLocation={weatherLocation}
              setWeatherLocation={setWeatherLocation}
              dataTransfer={dataTransfer}
            />
          </TabsContent>
        </Tabs>

        {/* Floating Soundtrack - Persists across all tabs */}
        {soundtrackPosition === 'floating' && soundtrackEmbed && (
          <SoundtrackCard embed={soundtrackEmbed} position="floating" onPositionChange={setSoundtrackPosition} />
        )}
      </div>
    </div>
  );
}
