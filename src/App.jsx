import CourseManager from '@/components/CourseManager';
import CurrentDateTime from '@/components/CurrentDateTime';
import DegreePlanTab from '@/components/DegreePlanTab';
import MoonSunToggle from '@/components/MoonSunToggle';
import Planner from '@/components/Planner';
import SettingsTab from '@/components/SettingsTab';
import SoundtrackCard from '@/components/SoundtrackCard';
import StudyTrackerTab from '@/components/StudyTrackerTab';
import TimetableView from '@/components/TimetableView';
import TipsRow from '@/components/TipsRow';
import Upcoming from '@/components/Upcoming';
import WeatherWidget from '@/components/WeatherWidget';
import WellnessTab from '@/components/WellnessTab';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useAccentColor from '@/hooks/useAccentColor';
import useBaseStyles from '@/hooks/useBaseStyles';
import useCardOpacityStyles from '@/hooks/useCardOpacityStyles';
import useDarkMode from '@/hooks/useDarkMode';
import useLocalState from '@/hooks/useLocalState';
import { DataTransfer } from '@/lib/data-transfer';
import { uid } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Brain,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  GraduationCap,
  HeartPulse,
  NotebookPen,
  Settings as SettingsIcon,
  Sparkles,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

// -----------------------------
// Helpers & Local Storage Hooks
// -----------------------------
const DEFAULT_COURSES = [
  'Calculus',
  'Chemistry',
  'Linear Algebra',
  'Economics',
  'Programming',
  'Elective',
  'Optional Course',
];

// -----------------------------
// Dev sanity checks (lightweight "tests")
// -----------------------------
function __devTests__() {
  // 1) Newline replacement logic
  const txt = `a\nb\nc`;
  const cleaned = txt.replace(/[\r\n]+/g, ' ');
  console.assert(cleaned === 'a b c', 'Newline replacement failed');

  // 2) CSV join uses \n and not accidental line breaks
  const rows = [
    ['x', 'y'],
    ['1', '2'],
  ];
  const csv = rows.map(r => r.map(x => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  console.assert(csv.includes('\n'), 'CSV join should contain newline character');

  // 3) CSV quoting & newline normalization inside fields
  const tricky = [[`He said "hello"`, `line1\nline2`]];
  const csv2 = tricky
    .map(r =>
      r
        .map(
          x =>
            `"${String(x ?? '')
              .replace(/"/g, '""')
              .replace(/[\r\n]+/g, ' ')}"`
        )
        .join(',')
    )
    .join('\n');
  console.assert(csv2.includes('He said ""hello""'), 'CSV quote doubling failed');
  console.assert(!/\nline2/.test(csv2), 'CSV fields should not contain raw newlines');

  // 4) Background style helper-like expectation
  const sample = 'data:image/png;base64,AAA';
  const style = { backgroundImage: `url(${sample})` };
  console.assert(style.backgroundImage.startsWith('url('), 'Background image style should be a CSS url()');

  // 5) Month matrix shape (replicates Planner logic for a known month)
  const y = 2025,
    m = 0; // Jan 2025
  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7; // Mon=0
  const start = new Date(y, m, 1 - offset);
  const mat = Array.from(
    { length: 42 },
    (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
  );
  console.assert(mat.length === 42, 'Month view must have 42 cells');
}

// -----------------------------
// Main App Component
// -----------------------------
export default function StudyPortal() {
  // Core state
  const [courses, setCourses] = useLocalState('sp:courses', DEFAULT_COURSES);
  const [schedule, setSchedule] = useLocalState('sp:schedule', []); // {id, courseIndex, type, title, day, start, end, location}
  const [timetableEvents, setTimetableEvents] = useLocalState('sp:timetableEvents', []); // {id, courseIndex, eventType, classroom, teacher, day, startTime, endTime, block}
  const [tasks, setTasks] = useLocalState('sp:tasks', []); // per-course to-dos
  const [exams, setExams] = useLocalState('sp:exams', []);
  const [examGrades, setExamGrades] = useLocalState('sp:examGrades', []); // {examId, grade}
  const [regularEvents, setRegularEvents] = useLocalState('sp:regularEvents', []); // multi-day events
  const [sessions, setSessions] = useLocalState('sp:sessions', []);
  const [selectedCourse, setSelectedCourse] = useLocalState('sp:selectedCourse', 0);
  const [nextUpExpanded, setNextUpExpanded] = useState(0); // Number of additional "pages" shown (0 = collapsed)

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
        () => ({
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
          darkMode,
          gradientEnabled,
          gradientStart,
          gradientMiddle,
          gradientEnd,
          bgImage,
          soundtrackEmbed,
          accentColor,
          cardOpacity,
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
        newState => {
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
          if (newState.darkMode !== undefined) setDarkMode(newState.darkMode);
          if (newState.gradientEnabled !== undefined) setGradientEnabled(newState.gradientEnabled);
          if (newState.gradientStart) setGradientStart(newState.gradientStart);
          if (newState.gradientMiddle) setGradientMiddle(newState.gradientMiddle);
          if (newState.gradientEnd) setGradientEnd(newState.gradientEnd);
          if (newState.bgImage !== undefined) setBgImage(newState.bgImage);
          if (newState.soundtrackEmbed !== undefined) setSoundtrackEmbed(newState.soundtrackEmbed);
          if (newState.accentColor !== undefined) setAccentColor(newState.accentColor);
          if (newState.cardOpacity !== undefined) setCardOpacity(newState.cardOpacity);
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

  // Theme + cosmetics
  const prefersDark =
    typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [darkMode, setDarkMode] = useLocalState('sp:dark', prefersDark);
  const [soundtrackPosition, setSoundtrackPosition] = useState('dashboard'); // 'dashboard', 'floating', 'hidden'
  const [bgImage, setBgImage] = useLocalState('sp:bgImage', '');
  const [soundtrackEmbed, setSoundtrackEmbed] = useLocalState('sp:soundtrackEmbed', '');
  const [accentColor, setAccentColor] = useLocalState('sp:accentColor', {
    light: '#7c3aed', // violet-600
    dark: '#8b5cf6', // violet-500
  });
  const [cardOpacity, setCardOpacity] = useLocalState('sp:cardOpacity', {
    light: 80, // 80% opacity for light mode
    dark: 25, // 25% opacity for dark mode (increased from 18%)
  });
  const [weatherApiKey, setWeatherApiKey] = useLocalState('sp:weatherApiKey', '');
  const [weatherLocation, setWeatherLocation] = useLocalState('sp:weatherLocation', {
    useGeolocation: true,
    city: '',
  });
  const [gradientStart, setGradientStart] = useLocalState('sp:gradientStart', {
    light: '#ffd2e9', // fuchsia-200 equivalent
    dark: '#18181b', // zinc-900 equivalent
  });
  const [gradientMiddle, setGradientMiddle] = useLocalState('sp:gradientMiddle', {
    light: '#bae6fd', // sky-200 equivalent
    dark: '#0f172a', // slate-900 equivalent
  });
  const [gradientEnd, setGradientEnd] = useLocalState('sp:gradientEnd', {
    light: '#a7f3d0', // emerald-200 equivalent
    dark: '#1e293b', // slate-800 equivalent
  });
  const [gradientEnabled, setGradientEnabled] = useLocalState('sp:gradientEnabled', true);

  // Study-tracker-only tasks
  const [sessionTasks, setSessionTasks] = useLocalState('sp:sessionTasks', []); // {id, title, done, createdAt}

  // Wellness/Mood Bubble state
  const [water, setWater] = useLocalState('sp:water', 0);
  const [gratitude, setGratitude] = useLocalState('sp:gratitude', '');
  const [moodPercentages, setMoodPercentages] = useLocalState('sp:moodPercentages', {});
  const [hasInteracted, setHasInteracted] = useLocalState('sp:moodInteracted', false);
  const [monthlyMoods, setMonthlyMoods] = useLocalState('sp:monthlyMoods', {}); // Store moods by date
  const [showWords, setShowWords] = useLocalState('sp:showMoodWords', true); // Toggle for showing words
  const [moodEmojis, setMoodEmojis] = useLocalState('sp:moodEmojis', {
    angry: { emoji: '😠', color: '#ff6b6b', word: 'Angry' },
    sad: { emoji: '😔', color: '#ff9f43', word: 'Sad' },
    neutral: { emoji: '😐', color: '#f7dc6f', word: 'Neutral' },
    happy: { emoji: '🙂', color: '#45b7d1', word: 'Happy' },
    excited: { emoji: '😁', color: '#10ac84', word: 'Excited' },
  });

  // Degree Plan state
  const [degreePlan, setDegreePlan] = useLocalState('sp:degreePlan', {
    semesters: [],
    totalSemesters: 0,
    completedCourses: [], // Array of course acronyms that are completed
  });

  useDarkMode(darkMode);
  useAccentColor(darkMode ? accentColor.dark : accentColor.light);
  useBaseStyles();
  useCardOpacityStyles(cardOpacity, darkMode);

  // Run dev tests once in the browser
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && !window.__ranDevTests) {
        __devTests__();
        window.__ranDevTests = true;
      }
    } catch (_) {}
  }, []);

  // Study timer
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [technique, setTechnique] = useState('Pomodoro 25/5');
  const [moodStart, setMoodStart] = useState(3);
  const [moodEnd, setMoodEnd] = useState(3);
  const [note, setNote] = useState('');
  const startRef = useRef(null);
  useEffect(() => {
    let t;
    if (running) {
      if (!startRef.current) startRef.current = Date.now();
      t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    }
    return () => t && clearInterval(t);
  }, [running]);

  function startTimer() {
    setElapsed(0);
    startRef.current = Date.now();
    setRunning(true);
  }
  function resetTimer() {
    setElapsed(0);
    startRef.current = Date.now();
  }

  // Function to clear all data related to a specific course
  function clearCourseData(courseIndex) {
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

  function stopTimer() {
    if (!running) return;
    const endTs = Date.now();
    const durationMin = Math.max(1, Math.round(elapsed / 60));
    const session = {
      id: uid(),
      courseIndex: selectedCourse,
      startTs: startRef.current,
      endTs,
      durationMin,
      technique,
      moodStart,
      moodEnd,
      note,
    };
    setSessions(s => [session, ...s]);
    setRunning(false);
    setElapsed(0);
    startRef.current = null;
    setNote('');
  }

  // Schedule helpers
  function addSchedule(item) {
    setSchedule(s => [...s, { ...item, id: uid() }]);
  }
  function removeSchedule(id) {
    setSchedule(s => s.filter(x => x.id !== id));
  }
  function eventsForDay(day) {
    return schedule.filter(e => e.day === day).sort((a, b) => a.start.localeCompare(b.start));
  }

  return (
    <div
      className="min-h-screen relative text-zinc-900 dark:text-zinc-100"
      style={
        gradientEnabled
          ? {
              background: `linear-gradient(to bottom right, ${darkMode ? gradientStart.dark : gradientStart.light}, ${
                darkMode ? gradientMiddle.dark : gradientMiddle.light
              }, ${darkMode ? gradientEnd.dark : gradientEnd.light})`,
            }
          : {}
      }
    >
      {bgImage && (
        <div
          className="pointer-events-none absolute inset-0 bg-center bg-cover bg-no-repeat opacity-60 mix-blend-luminosity"
          style={{ backgroundImage: `url(${bgImage})` }}
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
              <MoonSunToggle checked={darkMode} onCheckedChange={setDarkMode} />
            </div>
          </div>
        </motion.header>

        {/* Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <div className="flex justify-center">
            <TabsList
              className="flex flex-wrap justify-center gap-2 bg-white/70 dark:bg-white/10 backdrop-blur p-3 rounded-2xl shadow-lg"
              style={{ paddingTop: '8px', paddingBottom: '16px' }}
            >
              <TabsTrigger
                value="dashboard"
                className="rounded-xl px-4"
                style={{
                  '--tab-accent': 'hsl(var(--accent-h) var(--accent-s) var(--accent-l))',
                  transform: 'translateY(-2px)',
                }}
              >
                Dashboard
              </TabsTrigger>
              <TabsTrigger
                value="planner"
                className="rounded-xl px-4"
                style={{
                  '--tab-accent': 'hsl(var(--accent-h) var(--accent-s) var(--accent-l))',
                  transform: 'translateY(-2px)',
                }}
              >
                <CalendarDays className="w-4 h-4 mr-2" />
                Planner
              </TabsTrigger>
              <TabsTrigger
                value="timetable"
                className="rounded-xl px-4"
                style={{
                  '--tab-accent': 'hsl(var(--accent-h) var(--accent-s) var(--accent-l))',
                  transform: 'translateY(-2px)',
                }}
              >
                <CalendarRange className="w-4 h-4 mr-2" />
                Timetable
              </TabsTrigger>
              <TabsTrigger
                value="courses"
                className="rounded-xl px-4"
                style={{
                  '--tab-accent': 'hsl(var(--accent-h) var(--accent-s) var(--accent-l))',
                  transform: 'translateY(-2px)',
                }}
              >
                <NotebookPen className="w-4 h-4 mr-2" />
                Courses
              </TabsTrigger>
              <TabsTrigger
                value="degree-plan"
                className="rounded-xl px-4"
                style={{
                  '--tab-accent': 'hsl(var(--accent-h) var(--accent-s) var(--accent-l))',
                  transform: 'translateY(-2px)',
                }}
              >
                <GraduationCap className="w-4 h-4 mr-2" />
                Degree Plan
              </TabsTrigger>
              <TabsTrigger
                value="study"
                className="rounded-xl px-4"
                style={{
                  '--tab-accent': 'hsl(var(--accent-h) var(--accent-s) var(--accent-l))',
                  transform: 'translateY(-2px)',
                }}
              >
                <Brain className="w-4 h-4 mr-2" />
                Study Tracker
              </TabsTrigger>
              <TabsTrigger
                value="wellness"
                className="rounded-xl px-4"
                style={{
                  '--tab-accent': 'hsl(var(--accent-h) var(--accent-s) var(--accent-l))',
                  transform: 'translateY(-2px)',
                }}
              >
                <HeartPulse className="w-4 h-4 mr-2" />
                Wellness
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="rounded-xl px-4"
                style={{
                  '--tab-accent': 'hsl(var(--accent-h) var(--accent-s) var(--accent-l))',
                  transform: 'translateY(-2px)',
                }}
              >
                <SettingsIcon className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="flex justify-between items-start mb-4">
              <WeatherWidget apiKey={weatherApiKey} location={weatherLocation} />
              <CurrentDateTime />
            </div>
            <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" />
                  Next Up
                </CardTitle>
                <CardDescription>Upcoming exams & tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Upcoming
                  exams={exams}
                  tasks={tasks}
                  courses={courses}
                  expanded={nextUpExpanded}
                  onExpandChange={setNextUpExpanded}
                  onTaskComplete={taskId => setTasks(s => s.map(t => (t.id === taskId ? { ...t, done: true } : t)))}
                  onTaskClick={task => {
                    setSelectedCourse(task.courseIndex);
                  }}
                  onExamClick={exam => {
                    setSelectedCourse(exam.courseIndex);
                  }}
                />
              </CardContent>
              {(() => {
                // Calculate if there are more items to show
                const allExams = exams.slice().sort((a, b) => a.date.localeCompare(b.date));
                const allTasks = tasks
                  .slice()
                  .filter(t => !t.done)
                  .sort((a, b) => a.due.localeCompare(b.due));

                const currentExamCount = 3 + nextUpExpanded * 3;
                const currentTaskCount = 5 + nextUpExpanded * 3;

                const hasMoreExams = allExams.length > currentExamCount;
                const hasMoreTasks = allTasks.length > currentTaskCount;
                const hasMore = hasMoreExams || hasMoreTasks;

                // Show button if there are more items OR if currently expanded (to allow collapse)
                const showButton = hasMore || nextUpExpanded > 0;

                if (!showButton) return null;

                return (
                  <div className="flex justify-center pb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (hasMore) {
                          // Show 3 more items
                          setNextUpExpanded(nextUpExpanded + 1);
                        } else {
                          // Collapse to original state
                          setNextUpExpanded(0);
                        }
                      }}
                      className="h-8 w-8 p-0 hover:bg-white/20 rounded-full transition-all duration-300 ease-in-out"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-all duration-500 ease-in-out transform ${
                          !hasMore && nextUpExpanded > 0 ? 'rotate-180' : 'rotate-0'
                        }`}
                      />
                    </Button>
                  </div>
                );
              })()}
            </Card>

            <SoundtrackCard
              embed={soundtrackEmbed}
              position={soundtrackPosition}
              onPositionChange={setSoundtrackPosition}
            />
            <TipsRow />
          </TabsContent>

          {/* Planner */}
          <TabsContent value="planner">
            <Planner
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
            <TimetableView
              courses={courses}
              timetableEvents={timetableEvents}
              setTimetableEvents={setTimetableEvents}
            />
          </TabsContent>

          {/* Courses */}
          <TabsContent value="courses">
            <CourseManager
              courses={courses}
              selected={selectedCourse}
              setSelected={setSelectedCourse}
              tasks={tasks}
              addTask={t => setTasks(s => [{ ...t, id: uid(), done: false }, ...s])}
              toggleTask={id => setTasks(s => s.map(t => (t.id === id ? { ...t, done: !t.done } : t)))}
              deleteTask={id => setTasks(s => s.filter(t => t.id !== id))}
              exams={exams}
              addExam={e => setExams(s => [{ ...e, id: uid() }, ...s])}
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
              running={running}
              elapsed={elapsed}
              start={startTimer}
              stop={stopTimer}
              reset={resetTimer}
              technique={technique}
              setTechnique={setTechnique}
              moodStart={moodStart}
              setMoodStart={setMoodStart}
              moodEnd={moodEnd}
              setMoodEnd={setMoodEnd}
              note={note}
              setNote={setNote}
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
              bgImage={bgImage}
              setBgImage={setBgImage}
              gradientStart={gradientStart}
              setGradientStart={setGradientStart}
              gradientMiddle={gradientMiddle}
              setGradientMiddle={setGradientMiddle}
              gradientEnd={gradientEnd}
              setGradientEnd={setGradientEnd}
              darkMode={darkMode}
              gradientEnabled={gradientEnabled}
              setGradientEnabled={setGradientEnabled}
              accentColor={accentColor}
              setAccentColor={setAccentColor}
              cardOpacity={cardOpacity}
              setCardOpacity={setCardOpacity}
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
