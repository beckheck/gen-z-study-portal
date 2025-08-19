import CourseManager from '@/components/CourseManager';
import CurrentDateTime from '@/components/CurrentDateTime';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  ArrowLeft,
  ArrowRight,
  Brain,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  Edit,
  GraduationCap,
  HeartPulse,
  NotebookPen,
  Plus,
  Settings as SettingsIcon,
  Sparkles,
  Trash2,
  X,
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
  const [degreePlanDialog, setDegreePlanDialog] = useState(false);
  const [degreePlanStep, setDegreePlanStep] = useState('setup'); // 'setup', 'courses', 'view'
  const [currentSemester, setCurrentSemester] = useState(1);
  const [editingCourse, setEditingCourse] = useState(null); // Track course being edited
  const [resetConfirmDialog, setResetConfirmDialog] = useState(false); // Confirm reset dialog
  const [clearConfirmDialog, setClearConfirmDialog] = useState(false); // Confirm clear dialog
  const [draggedCourse, setDraggedCourse] = useState(null); // Track dragged course
  const [draggedFromSemester, setDraggedFromSemester] = useState(null); // Track source semester
  const [semesterForm, setSemesterForm] = useState({
    acronym: '',
    name: '',
    credits: '',
    prerequisites: '',
    corequisites: '',
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

  // Degree Plan Management Functions
  function setupDegreePlan(totalSemesters) {
    const semesters = Array.from({ length: totalSemesters }, (_, i) => ({
      id: i + 1,
      number: i + 1,
      courses: [],
    }));

    setDegreePlan(prev => ({
      ...prev,
      semesters,
      totalSemesters,
    }));

    setDegreePlanStep('courses');
    setCurrentSemester(1);
  }

  function addCourseToSemester(semesterNumber, courseData) {
    setDegreePlan(prev => ({
      ...prev,
      semesters: prev.semesters.map(sem =>
        sem.number === semesterNumber
          ? {
              ...sem,
              courses: [
                ...sem.courses,
                {
                  id: uid(),
                  ...courseData,
                  completed: false,
                },
              ],
            }
          : sem
      ),
    }));
  }

  function toggleCourseCompletion(courseAcronym) {
    setDegreePlan(prev => {
      const isCompleted = prev.completedCourses.includes(courseAcronym);
      return {
        ...prev,
        completedCourses: isCompleted
          ? prev.completedCourses.filter(c => c !== courseAcronym)
          : [...prev.completedCourses, courseAcronym],
      };
    });
  }

  function checkPrerequisites(course, semester) {
    if (!course.prerequisites) return true;

    const prereqAcronyms = course.prerequisites.split(',').map(p => p.trim());
    const completedCourses = degreePlan.completedCourses;

    // Check if ALL prerequisites are completed
    return prereqAcronyms.every(prereq => completedCourses.includes(prereq));
  }

  function getCourseColor(course, semester) {
    const isCompleted = degreePlan.completedCourses.includes(course.acronym);
    const prerequisitesMet = checkPrerequisites(course, semester);

    if (isCompleted) {
      return '#10ac84'; // Green for completed
    } else if (prerequisitesMet) {
      return '#3b82f6'; // Blue for available
    } else {
      return 'transparent'; // No color for unavailable
    }
  }

  function resetDegreePlan() {
    setDegreePlan({
      semesters: [],
      totalSemesters: 0,
      completedCourses: [],
    });
    setDegreePlanStep('setup');
    setCurrentSemester(1);
    setEditingCourse(null);
    setSemesterForm({
      acronym: '',
      name: '',
      credits: '',
      prerequisites: '',
      corequisites: '',
    });
    setDegreePlanDialog(false);
  }

  // Drag and Drop Functions for Course Management
  function handleDragStart(course, sourceSemester) {
    setDraggedCourse(course);
    setDraggedFromSemester(sourceSemester);
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  function handleDrop(e, targetSemester) {
    e.preventDefault();

    if (!draggedCourse || !draggedFromSemester) return;

    // Don't allow dropping on the same semester
    if (draggedFromSemester === targetSemester) {
      setDraggedCourse(null);
      setDraggedFromSemester(null);
      return;
    }

    // Check if target semester has space (max 8 courses)
    const targetSemesterData = degreePlan.semesters.find(s => s.number === targetSemester);
    if (targetSemesterData && targetSemesterData.courses.length >= 8) {
      setDraggedCourse(null);
      setDraggedFromSemester(null);
      return;
    }

    // Move course from source to target semester
    setDegreePlan(prev => {
      const newPlan = { ...prev };

      // Remove course from source semester
      const sourceSemesterIndex = newPlan.semesters.findIndex(s => s.number === draggedFromSemester);
      if (sourceSemesterIndex >= 0) {
        newPlan.semesters[sourceSemesterIndex] = {
          ...newPlan.semesters[sourceSemesterIndex],
          courses: newPlan.semesters[sourceSemesterIndex].courses.filter(c => c.id !== draggedCourse.id),
        };
      }

      // Add course to target semester
      const targetSemesterIndex = newPlan.semesters.findIndex(s => s.number === targetSemester);
      if (targetSemesterIndex >= 0) {
        newPlan.semesters[targetSemesterIndex] = {
          ...newPlan.semesters[targetSemesterIndex],
          courses: [...newPlan.semesters[targetSemesterIndex].courses, draggedCourse],
        };
      }

      return newPlan;
    });

    // Clear drag state
    setDraggedCourse(null);
    setDraggedFromSemester(null);
  }

  // Credit calculation functions
  const getTotalCredits = () => {
    return degreePlan.semesters.reduce((total, semester) => {
      return (
        total +
        semester.courses.reduce((semesterTotal, course) => {
          return semesterTotal + parseInt(course.credits || 0);
        }, 0)
      );
    }, 0);
  };

  const getCompletedCredits = () => {
    return degreePlan.semesters.reduce((total, semester) => {
      return (
        total +
        semester.courses.reduce((semesterTotal, course) => {
          const isCompleted = degreePlan.completedCourses.includes(course.acronym);
          return semesterTotal + (isCompleted ? parseInt(course.credits || 0) : 0);
        }, 0)
      );
    }, 0);
  };

  // Add new semester function
  const addNewSemester = () => {
    const newSemesterNumber = degreePlan.semesters.length + 1;
    setDegreePlan(prev => ({
      ...prev,
      totalSemesters: prev.totalSemesters + 1,
      semesters: [
        ...prev.semesters,
        {
          id: Math.random().toString(36).slice(2, 10),
          number: newSemesterNumber,
          courses: [],
        },
      ],
    }));
  };

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
            <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5" />
                      Degree Plan
                    </CardTitle>
                    <CardDescription>Plan your academic journey</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    {degreePlan.totalSemesters > 0 && (
                      <div className="text-right">
                        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          {getCompletedCredits()}/{getTotalCredits()} credits done ✨
                        </div>
                        <div className="text-xs text-zinc-500">
                          {getTotalCredits() > 0 ? Math.round((getCompletedCredits() / getTotalCredits()) * 100) : 0}%
                          complete
                        </div>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-xl"
                      onClick={() => {
                        // If degree plan already exists, go to view step, otherwise start setup
                        if (degreePlan.totalSemesters > 0) {
                          setDegreePlanStep('view');
                        } else {
                          setDegreePlanStep('setup');
                        }
                        setDegreePlanDialog(true);
                      }}
                      title="Customize Degree Plan"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {degreePlan.totalSemesters > 0 ? (
                  <div className="space-y-6">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        💡 <strong>Tip:</strong> Drag and drop courses between semesters to reorganize your degree plan.
                        Click courses to mark as completed.
                      </p>
                    </div>
                    <div
                      className="grid gap-4 lg:gap-6"
                      style={{
                        gridTemplateColumns:
                          degreePlan.totalSemesters <= 2
                            ? `repeat(${degreePlan.totalSemesters}, 1fr)`
                            : degreePlan.totalSemesters <= 4
                            ? `repeat(${Math.min(degreePlan.totalSemesters, 2)}, 1fr)`
                            : `repeat(3, 1fr)`,
                      }}
                    >
                      {degreePlan.semesters.map(semester => (
                        <div key={semester.id} className="space-y-3">
                          <h3 className="font-semibold text-center text-sm px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                            {semester.number}° Semestre
                          </h3>
                          <div
                            className={`space-y-2 min-h-[200px] p-3 border-2 border-dashed rounded-lg transition-colors ${
                              draggedCourse && draggedFromSemester !== semester.number
                                ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/20 dark:border-blue-600'
                                : 'border-zinc-200 dark:border-zinc-700'
                            }`}
                            onDragOver={handleDragOver}
                            onDrop={e => handleDrop(e, semester.number)}
                          >
                            {semester.courses.map(course => {
                              const isCompleted = degreePlan.completedCourses.includes(course.acronym);
                              const prerequisitesMet = checkPrerequisites(course, semester);
                              const bgColor = getCourseColor(course, semester);

                              return (
                                <div
                                  key={course.id}
                                  draggable
                                  onDragStart={() => handleDragStart(course, semester.number)}
                                  className={`p-3 rounded-lg border-2 transition-all hover:shadow-md group ${
                                    draggedCourse?.id === course.id ? 'opacity-50 cursor-grabbing' : 'cursor-grab'
                                  } ${
                                    isCompleted
                                      ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-600'
                                      : prerequisitesMet
                                      ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-600'
                                      : 'bg-gray-50 border-dashed border-gray-300 dark:bg-gray-800/50 dark:border-gray-500 opacity-60'
                                  }`}
                                  style={
                                    bgColor !== 'transparent'
                                      ? {
                                          backgroundColor: bgColor + '15',
                                          borderColor: bgColor + '60',
                                        }
                                      : {}
                                  }
                                  title={`${
                                    isCompleted
                                      ? 'Click to mark as incomplete'
                                      : prerequisitesMet
                                      ? 'Click to mark as completed'
                                      : 'Prerequisites not met'
                                  } • Drag to move between semesters`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div
                                      className="flex-1"
                                      onClick={() => prerequisitesMet && toggleCourseCompletion(course.acronym)}
                                    >
                                      <div
                                        className={`text-xs font-mono font-bold ${
                                          isCompleted
                                            ? 'line-through text-green-700 dark:text-green-400'
                                            : prerequisitesMet
                                            ? 'text-blue-700 dark:text-blue-400'
                                            : 'text-gray-500'
                                        }`}
                                      >
                                        {course.acronym}
                                      </div>
                                      <div
                                        className={`text-xs mt-1 ${
                                          isCompleted
                                            ? 'line-through text-green-600 dark:text-green-300'
                                            : prerequisitesMet
                                            ? 'text-blue-600 dark:text-blue-300'
                                            : 'text-gray-400'
                                        }`}
                                      >
                                        {course.name}
                                      </div>
                                      <div className="text-xs text-zinc-500 mt-1 flex items-center justify-between">
                                        <span>{course.credits} créditos</span>
                                        {isCompleted && <Check className="w-3 h-3 text-green-600" />}
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={e => {
                                        e.stopPropagation();
                                        // Set up editing mode for this course
                                        setEditingCourse(course);
                                        setSemesterForm({
                                          acronym: course.acronym,
                                          name: course.name,
                                          credits: course.credits,
                                          prerequisites: course.prerequisites || '',
                                          corequisites: course.corequisites || '',
                                        });
                                        setCurrentSemester(semester.number);
                                        setDegreePlanStep('courses');
                                        setDegreePlanDialog(true);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                      title="Edit course"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                            {semester.courses.length === 0 && !draggedCourse && (
                              <div className="text-center text-zinc-400 py-8 text-sm">No courses added</div>
                            )}
                            {draggedCourse && draggedFromSemester !== semester.number && (
                              <div className="text-center text-blue-500 py-4 text-sm border-2 border-dashed border-blue-300 rounded-lg bg-blue-50/20 dark:bg-blue-900/10">
                                {semester.courses.length >= 8
                                  ? 'Semester full (8/8 courses)'
                                  : `Drop course here (${semester.courses.length}/8 courses)`}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-center border-t pt-4">
                      <div className="text-sm text-zinc-500 mb-3">
                        Progress: {degreePlan.completedCourses.length} /{' '}
                        {degreePlan.semesters.flatMap(s => s.courses).length} courses completed
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setClearConfirmDialog(true)}
                        className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear Degree Plan
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-zinc-500">Add your semesters and your courses here</div>
                )}
              </CardContent>
            </Card>

            {/* Degree Plan Dialog */}
            <Dialog open={degreePlanDialog} onOpenChange={setDegreePlanDialog}>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white dark:bg-black border-zinc-200 dark:border-zinc-800">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                    <GraduationCap className="w-5 h-5" />
                    {degreePlanStep === 'setup' && 'Setup Degree Plan'}
                    {degreePlanStep === 'courses' &&
                      `Semester ${currentSemester} Courses${editingCourse ? ' - Editing' : ''}`}
                    {degreePlanStep === 'view' && 'Degree Plan Overview'}
                  </DialogTitle>
                  <DialogDescription className="text-zinc-600 dark:text-zinc-400">
                    {degreePlanStep === 'setup' && 'Set up your degree plan by specifying the number of semesters.'}
                    {degreePlanStep === 'courses' &&
                      (editingCourse
                        ? `Edit course "${editingCourse.acronym}" in semester ${currentSemester}.`
                        : `Add courses for semester ${currentSemester}. Maximum 8 courses per semester.`)}
                    {degreePlanStep === 'view' && 'Review and manage your complete degree plan.'}
                  </DialogDescription>
                </DialogHeader>

                {degreePlanStep === 'setup' && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <Label className="text-zinc-900 dark:text-zinc-100">Number of Semesters in Your Degree</Label>
                      <Input
                        type="number"
                        min="1"
                        max="12"
                        placeholder="e.g., 8"
                        value={degreePlan.totalSemesters || ''}
                        onChange={e =>
                          setDegreePlan(prev => ({
                            ...prev,
                            totalSemesters: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={() => setDegreePlanDialog(false)}
                        className="rounded-xl border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => setupDegreePlan(degreePlan.totalSemesters)}
                        disabled={!degreePlan.totalSemesters || degreePlan.totalSemesters < 1}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
                      >
                        Next <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}

                {degreePlanStep === 'courses' && (
                  <div className="space-y-6">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      Semester {currentSemester} of {degreePlan.totalSemesters}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                          {editingCourse ? 'Edit Course' : 'Add Course'}
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <Label className="text-zinc-900 dark:text-zinc-100">Course Acronym</Label>
                            <Input
                              placeholder="e.g., MAT101"
                              value={semesterForm.acronym}
                              onChange={e =>
                                setSemesterForm(prev => ({
                                  ...prev,
                                  acronym: e.target.value,
                                }))
                              }
                              className="rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                            />
                          </div>
                          <div>
                            <Label className="text-zinc-900 dark:text-zinc-100">Course Name</Label>
                            <Input
                              placeholder="e.g., Calculus I"
                              value={semesterForm.name}
                              onChange={e =>
                                setSemesterForm(prev => ({
                                  ...prev,
                                  name: e.target.value,
                                }))
                              }
                              className="rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                            />
                          </div>
                          <div>
                            <Label className="text-zinc-900 dark:text-zinc-100">Credits</Label>
                            <Input
                              type="number"
                              min="1"
                              max="12"
                              placeholder="e.g., 4"
                              value={semesterForm.credits}
                              onChange={e =>
                                setSemesterForm(prev => ({
                                  ...prev,
                                  credits: e.target.value,
                                }))
                              }
                              className="rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                            />
                          </div>
                          <div>
                            <Label className="text-zinc-900 dark:text-zinc-100">
                              Prerequisites (separate with commas)
                            </Label>
                            <Input
                              placeholder="e.g., MAT100, PHY101"
                              value={semesterForm.prerequisites}
                              onChange={e =>
                                setSemesterForm(prev => ({
                                  ...prev,
                                  prerequisites: e.target.value,
                                }))
                              }
                              className="rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                            />
                          </div>
                          <div>
                            <Label className="text-zinc-900 dark:text-zinc-100">
                              Co-requisites (separate with commas)
                            </Label>
                            <Input
                              placeholder="e.g., LAB101"
                              value={semesterForm.corequisites}
                              onChange={e =>
                                setSemesterForm(prev => ({
                                  ...prev,
                                  corequisites: e.target.value,
                                }))
                              }
                              className="rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                            />
                          </div>
                          {editingCourse && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setEditingCourse(null);
                                setSemesterForm({
                                  acronym: '',
                                  name: '',
                                  credits: '',
                                  prerequisites: '',
                                  corequisites: '',
                                });
                              }}
                              className="rounded-xl w-full border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 mb-2"
                            >
                              Cancel Editing
                            </Button>
                          )}
                          <Button
                            onClick={() => {
                              if (semesterForm.acronym && semesterForm.name && semesterForm.credits) {
                                const currentSemesterData = degreePlan.semesters.find(
                                  s => s.number === currentSemester
                                );

                                if (editingCourse) {
                                  // Update existing course
                                  setDegreePlan(prev => ({
                                    ...prev,
                                    semesters: prev.semesters.map(sem =>
                                      sem.number === currentSemester
                                        ? {
                                            ...sem,
                                            courses: sem.courses.map(c =>
                                              c.id === editingCourse.id ? { ...c, ...semesterForm } : c
                                            ),
                                          }
                                        : sem
                                    ),
                                  }));
                                  setEditingCourse(null);
                                } else {
                                  // Add new course
                                  if (currentSemesterData && currentSemesterData.courses.length < 7) {
                                    addCourseToSemester(currentSemester, semesterForm);
                                  }
                                }

                                setSemesterForm({
                                  acronym: '',
                                  name: '',
                                  credits: '',
                                  prerequisites: '',
                                  corequisites: '',
                                });
                              }
                            }}
                            disabled={
                              !semesterForm.acronym ||
                              !semesterForm.name ||
                              !semesterForm.credits ||
                              (!editingCourse &&
                                degreePlan.semesters.find(s => s.number === currentSemester)?.courses.length >= 8)
                            }
                            className="rounded-xl w-full bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            {editingCourse ? 'Update Course' : 'Add Course'}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                          Semester {currentSemester} Courses (
                          {degreePlan.semesters.find(s => s.number === currentSemester)?.courses.length || 0}
                          /7)
                        </h3>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {degreePlan.semesters
                            .find(s => s.number === currentSemester)
                            ?.courses.map(course => (
                              <div
                                key={course.id}
                                className="p-3 border rounded-lg bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                      {course.acronym}
                                    </div>
                                    <div className="text-sm text-zinc-700 dark:text-zinc-300">{course.name}</div>
                                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                      {course.credits} credits
                                    </div>
                                    {course.prerequisites && (
                                      <div className="text-xs text-zinc-400 dark:text-zinc-500">
                                        Prereq: {course.prerequisites}
                                      </div>
                                    )}
                                    {course.corequisites && (
                                      <div className="text-xs text-zinc-400 dark:text-zinc-500">
                                        Co-req: {course.corequisites}
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setDegreePlan(prev => ({
                                        ...prev,
                                        semesters: prev.semesters.map(sem =>
                                          sem.number === currentSemester
                                            ? {
                                                ...sem,
                                                courses: sem.courses.filter(c => c.id !== course.id),
                                              }
                                            : sem
                                        ),
                                      }));
                                    }}
                                    className="rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          {!degreePlan.semesters.find(s => s.number === currentSemester)?.courses.length && (
                            <div className="text-center text-zinc-500 dark:text-zinc-400 py-8">
                              No courses added yet
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingCourse(null);
                          setSemesterForm({
                            acronym: '',
                            name: '',
                            credits: '',
                            prerequisites: '',
                            corequisites: '',
                          });
                          if (currentSemester > 1) {
                            setCurrentSemester(currentSemester - 1);
                          } else {
                            setDegreePlanStep('setup');
                          }
                        }}
                        className="rounded-xl border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {currentSemester > 1 ? 'Previous Semester' : 'Back to Setup'}
                      </Button>

                      {currentSemester < degreePlan.totalSemesters ? (
                        <Button
                          onClick={() => {
                            setEditingCourse(null);
                            setSemesterForm({
                              acronym: '',
                              name: '',
                              credits: '',
                              prerequisites: '',
                              corequisites: '',
                            });
                            setCurrentSemester(currentSemester + 1);
                          }}
                          className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
                        >
                          Next Semester <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      ) : (
                        <Button
                          onClick={() => {
                            setEditingCourse(null);
                            setSemesterForm({
                              acronym: '',
                              name: '',
                              credits: '',
                              prerequisites: '',
                              corequisites: '',
                            });
                            setDegreePlanStep('view');
                            setDegreePlanDialog(false);
                          }}
                          className="rounded-xl bg-green-600 hover:bg-green-700 text-white dark:bg-green-500 dark:hover:bg-green-600"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Finish Setup
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {degreePlanStep === 'view' && (
                  <div className="space-y-6">
                    <div
                      className="grid gap-4 lg:gap-6"
                      style={{
                        gridTemplateColumns:
                          degreePlan.totalSemesters <= 2
                            ? `repeat(${degreePlan.totalSemesters}, 1fr)`
                            : degreePlan.totalSemesters <= 4
                            ? `repeat(2, 1fr)`
                            : `repeat(3, 1fr)`,
                      }}
                    >
                      {degreePlan.semesters.map(semester => (
                        <div
                          key={semester.id}
                          className="space-y-3 border rounded-lg p-4 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                        >
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                              Semester {semester.number}
                            </h3>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingCourse(null);
                                setSemesterForm({
                                  acronym: '',
                                  name: '',
                                  credits: '',
                                  prerequisites: '',
                                  corequisites: '',
                                });
                                setCurrentSemester(semester.number);
                                setDegreePlanStep('courses');
                              }}
                              className="rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {semester.courses.map(course => {
                              const isCompleted = degreePlan.completedCourses.includes(course.acronym);
                              const prerequisitesMet = checkPrerequisites(course, semester);

                              return (
                                <div
                                  key={course.id}
                                  className={`p-2 text-xs border rounded cursor-pointer transition-all hover:shadow-sm ${
                                    isCompleted
                                      ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700'
                                      : prerequisitesMet
                                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'
                                      : 'border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-zinc-800'
                                  }`}
                                  onClick={() => toggleCourseCompletion(course.acronym)}
                                >
                                  <div
                                    className={`font-mono font-bold flex items-center justify-between ${
                                      isCompleted
                                        ? 'line-through text-green-700 dark:text-green-400'
                                        : prerequisitesMet
                                        ? 'text-blue-700 dark:text-blue-400'
                                        : 'text-gray-500 dark:text-gray-400'
                                    }`}
                                  >
                                    {course.acronym}
                                    {isCompleted && <Check className="w-3 h-3" />}
                                  </div>
                                  <div
                                    className={`${
                                      isCompleted
                                        ? 'line-through text-green-600 dark:text-green-300'
                                        : prerequisitesMet
                                        ? 'text-blue-600 dark:text-blue-300'
                                        : 'text-gray-400 dark:text-gray-500'
                                    }`}
                                  >
                                    {course.name}
                                  </div>
                                  <div className="text-zinc-500 dark:text-zinc-400 mt-1">{course.credits} credits</div>
                                </div>
                              );
                            })}
                            {semester.courses.length === 0 && (
                              <div className="text-center text-zinc-400 dark:text-zinc-500 py-4">No courses</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4 border-zinc-200 dark:border-zinc-800">
                      <div className="text-center text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                        Overall Progress: {degreePlan.completedCourses.length} /{' '}
                        {degreePlan.semesters.flatMap(s => s.courses).length} courses completed (
                        {Math.round(
                          (degreePlan.completedCourses.length /
                            Math.max(1, degreePlan.semesters.flatMap(s => s.courses).length)) *
                            100
                        )}
                        %)
                      </div>
                      <div className="flex justify-between">
                        <Button
                          variant="outline"
                          onClick={() => setResetConfirmDialog(true)}
                          className="rounded-xl border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          Reset Plan
                        </Button>
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            onClick={addNewSemester}
                            className="rounded-xl border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add New Semester
                          </Button>
                          <Button
                            onClick={() => setDegreePlanDialog(false)}
                            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Reset Confirmation Dialog */}
            <Dialog open={resetConfirmDialog} onOpenChange={setResetConfirmDialog}>
              <DialogContent className="max-w-md bg-white dark:bg-black border-zinc-200 dark:border-zinc-800">
                <DialogHeader>
                  <DialogTitle className="text-zinc-900 dark:text-zinc-100">Reset Degree Plan</DialogTitle>
                  <DialogDescription className="text-zinc-600 dark:text-zinc-400">
                    Are you sure you want to reset your entire degree plan? This will delete all semesters, courses, and
                    progress. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setResetConfirmDialog(false)}
                    className="rounded-xl border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      resetDegreePlan();
                      setResetConfirmDialog(false);
                    }}
                    className="rounded-xl"
                  >
                    Reset Everything
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Clear Confirmation Dialog */}
            <Dialog open={clearConfirmDialog} onOpenChange={setClearConfirmDialog}>
              <DialogContent className="max-w-md bg-white dark:bg-black border-zinc-200 dark:border-zinc-800">
                <DialogHeader>
                  <DialogTitle className="text-zinc-900 dark:text-zinc-100">Clear Degree Plan</DialogTitle>
                  <DialogDescription className="text-zinc-600 dark:text-zinc-400">
                    Are you sure you want to clear your entire degree plan? This will delete all semesters, courses, and
                    progress. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setClearConfirmDialog(false)}
                    className="rounded-xl border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      resetDegreePlan();
                      setClearConfirmDialog(false);
                    }}
                    className="rounded-xl"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Everything
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
