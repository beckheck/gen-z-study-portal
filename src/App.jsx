import React, { useEffect, useMemo, useRef, useState, useLayoutEffect, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ReactConfetti from "react-confetti";
import { DataTransfer } from "@/lib/data-transfer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { CalendarDays, Clock, Flame, ListTodo, NotebookPen, Plus, Settings, Sparkles, Brain, HeartHandshake, HeartPulse, Target, TimerReset, Download, Trash2, Coffee, Music2, GraduationCap, Undo, CalendarRange, ChevronDown } from "lucide-react";
import TimetableView from "@/components/TimetableView";

// -----------------------------
// Theme Context
// -----------------------------
const ThemeContext = createContext();
export function useTheme() {
  return useContext(ThemeContext);
}

// -----------------------------
// Helpers & Local Storage Hooks
// -----------------------------
const DEFAULT_COURSES = [
  "Calculus",
  "Chemistry",
  "Linear Algebra",
  "Economics",
  "Programming",
  "Elective",
];

const useLocalState = (key, initial) => {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch (_) {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (_) { }
  }, [key, state]);
  return [state, setState];
};

function uid() { return Math.random().toString(36).slice(2, 10); }

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Color chips for different event types
const typeColors = { 
  class: "bg-violet-500", 
  lab: "bg-emerald-500", 
  workshop: "bg-amber-500", 
  assistantship: "bg-sky-500",
  exam: "bg-rose-500",
  task: "bg-amber-500",
  regular: "bg-indigo-500"
};

// -----------------------------
// Dev sanity checks (lightweight "tests")
// -----------------------------
function __devTests__() {
  // 1) Newline replacement logic
  const txt = `a\nb\nc`;
  const cleaned = txt.replace(/[\r\n]+/g, " ");
  console.assert(cleaned === "a b c", "Newline replacement failed");

  // 2) CSV join uses \n and not accidental line breaks
  const rows = [["x", "y"], ["1", "2"]];
  const csv = rows.map(r => r.map(x => `"${String(x ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  console.assert(csv.includes("\n"), "CSV join should contain newline character");

  // 3) CSV quoting & newline normalization inside fields
  const tricky = [[`He said "hello"`, `line1\nline2`]];
  const csv2 = tricky.map(r => r.map(x => `"${String(x ?? "").replace(/"/g, '""').replace(/[\r\n]+/g, " ")}"`).join(",")).join("\n");
  console.assert(csv2.includes('He said ""hello""'), "CSV quote doubling failed");
  console.assert(!/\nline2/.test(csv2), "CSV fields should not contain raw newlines");

  // 4) Background style helper-like expectation
  const sample = "data:image/png;base64,AAA";
  const style = { backgroundImage: `url(${sample})` };
  console.assert(style.backgroundImage.startsWith("url("), "Background image style should be a CSS url()");

  // 5) Month matrix shape (replicates Planner logic for a known month)
  const y = 2025, m = 0; // Jan 2025
  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7; // Mon=0
  const start = new Date(y, m, 1 - offset);
  const mat = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  console.assert(mat.length === 42, "Month view must have 42 cells");
}

// -----------------------------
// Main App Component
// -----------------------------
// Accent color CSS variables updater
function useAccentColor(color) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const hsl = getHSLComponents(color);
    
    root.style.setProperty('--accent-h', hsl.h);
    root.style.setProperty('--accent-s', hsl.s + '%');
    root.style.setProperty('--accent-l', hsl.l + '%');
  }, [color]);
}

// Convert hex to HSL components
function getHSLComponents(hex) {
  // Remove the hash if present
  hex = hex.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

export default function StudyPortal() {
  // Core state
  const [courses, setCourses] = useLocalState("sp:courses", DEFAULT_COURSES);
  const [schedule, setSchedule] = useLocalState("sp:schedule", []); // {id, courseIndex, type, title, day, start, end, location}
  const [timetableEvents, setTimetableEvents] = useLocalState("sp:timetableEvents", []); // {id, courseIndex, eventType, classroom, teacher, day, startTime, endTime, block}
  const [tasks, setTasks] = useLocalState("sp:tasks", []);           // per-course to-dos
  const [exams, setExams] = useLocalState("sp:exams", []);
  const [regularEvents, setRegularEvents] = useLocalState("sp:regularEvents", []); // multi-day events
  const [sessions, setSessions] = useLocalState("sp:sessions", []);
  const [selectedCourse, setSelectedCourse] = useLocalState("sp:selectedCourse", 0);
  const [nextUpExpanded, setNextUpExpanded] = useState(0); // Number of additional "pages" shown (0 = collapsed)

  // Data transfer instance for import/export
  const dataTransfer = useMemo(() => new DataTransfer(
    // Get state callback
    () => ({
      sessions,
      exams,
      tasks,
      regularEvents,
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
      weatherApiKey
    }),
    // Set state callback
    (newState) => {
      if (newState.sessions) setSessions(newState.sessions);
      if (newState.exams) setExams(newState.exams);
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
    }
  ), []);

  // Theme + cosmetics
  const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [darkMode, setDarkMode] = useLocalState("sp:dark", prefersDark);
  const [soundtrackPosition, setSoundtrackPosition] = useState('dashboard'); // 'dashboard', 'floating', 'hidden'
  const [bgImage, setBgImage] = useLocalState("sp:bgImage", "");
  const [soundtrackEmbed, setSoundtrackEmbed] = useLocalState("sp:soundtrackEmbed", "");
  const [accentColor, setAccentColor] = useLocalState("sp:accentColor", {
    light: "#7c3aed", // violet-600
    dark: "#8b5cf6"   // violet-500
  });
  const [cardOpacity, setCardOpacity] = useLocalState("sp:cardOpacity", {
    light: 80, // 80% opacity for light mode
    dark: 25   // 25% opacity for dark mode (increased from 18%)
  });
  const [weatherApiKey, setWeatherApiKey] = useLocalState("sp:weatherApiKey", "");
  const [weatherLocation, setWeatherLocation] = useLocalState("sp:weatherLocation", {
    useGeolocation: true,
    city: ""
  });
  const [gradientStart, setGradientStart] = useLocalState("sp:gradientStart", {
    light: "#ffd2e9", // fuchsia-200 equivalent
    dark: "#18181b"   // zinc-900 equivalent
  });
  const [gradientMiddle, setGradientMiddle] = useLocalState("sp:gradientMiddle", {
    light: "#bae6fd", // sky-200 equivalent
    dark: "#0f172a"   // slate-900 equivalent
  });
  const [gradientEnd, setGradientEnd] = useLocalState("sp:gradientEnd", {
    light: "#a7f3d0", // emerald-200 equivalent
    dark: "#1e293b"   // slate-800 equivalent
  });
  const [gradientEnabled, setGradientEnabled] = useLocalState("sp:gradientEnabled", true);

  // Study-tracker-only tasks
  const [sessionTasks, setSessionTasks] = useLocalState("sp:sessionTasks", []); // {id, title, done, createdAt}

  // Apply theme and accent color before paint + minimal reset for consistency
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.remove("light");
      root.classList.add("dark");
      root.style.colorScheme = "dark";
      root.style.setProperty('--background', '#1e1e1e');
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
      root.style.colorScheme = "light";
      root.style.setProperty('--background', '#ffffff');
    }
  }, [darkMode]);

  // Update accent color CSS variables
  useAccentColor(darkMode ? accentColor.dark : accentColor.light);

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
  background-color: rgba(255, 255, 255, ${cardOpacity.light / 100}) !important;
}

/* Card opacity adjustments - Dark Mode */
:where(.dark) .bg-white\\/80,
:where(.dark) .dark\\:bg-white\\/10 {
  background-color: rgba(39, 39, 42, ${cardOpacity.dark / 100}) !important;
}

/* Ensure dark mode overrides */
.dark .bg-white\\/80 {
  background-color: rgba(39, 39, 42, ${cardOpacity.dark / 100}) !important;
}

.dark .dark\\:bg-white\\/10 {
  background-color: rgba(39, 39, 42, ${cardOpacity.dark / 100}) !important;
}
`;

    style.textContent = cssContent;
    console.log('Updated card opacity CSS:', { 
      lightOpacity: cardOpacity.light + '%', 
      darkOpacity: cardOpacity.dark + '%',
      isDarkMode: darkMode 
    });
  }, [cardOpacity, darkMode]);
  useLayoutEffect(() => {
    if (document.getElementById('sp-reset')) return;
    const style = document.createElement('style');
    style.id = 'sp-reset';
    
    // Import Gen Z friendly font
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);
    
    style.textContent = `
:root {
  --accent-h: 0;
  --accent-s: 0%;
  --accent-l: 50%;
}
:where(*, *::before, *::after){box-sizing:border-box}
:where(html, body){height:100%; font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif}
:where(body){margin:0; line-height:1.5; -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility}
:where(img, picture, video, canvas, svg){display:block; max-width:100%}
:where(input, button, textarea, select){font:inherit}
:where(p, h1, h2, h3, h4, h5, h6){overflow-wrap:break-word; font-family: 'Space Grotesk', sans-serif}
:where(#root, #__next){isolation:isolate}
:where(iframe){border:0}
:where(.dark) label{color:#e5e7eb}
:where(.dark) h1, :where(.dark) h2, :where(.dark) h3, :where(.dark) h4{color:#fafafa}

/* Apply accent color to UI elements */
[role="tab"][data-state="active"] {
  background-color: var(--tab-accent) !important;
  color: white !important;
}

/* Primary buttons */
button:not([variant="ghost"]):not([variant="outline"]):not([variant="secondary"]):not([variant="link"]),
button[variant="default"],
.bg-gradient-to-br {
  background-color: hsl(var(--accent-h) var(--accent-s) var(--accent-l)) !important;
  color: white !important;
}

/* Progress bars */
[role="progressbar"] > div {
  background-color: hsl(var(--accent-h) var(--accent-s) var(--accent-l)) !important;
}

/* Switches */
[data-state="checked"] {
  background-color: hsl(var(--accent-h) var(--accent-s) var(--accent-l)) !important;
}

/* Button hover states */
button:hover:not([variant="ghost"]):not([variant="outline"]):not([variant="secondary"]):not([variant="link"]),
button[variant="default"]:hover {
  background-color: hsl(var(--accent-h) var(--accent-s) calc(var(--accent-l) - 5%)) !important;
}

/* Gradients */
.text-transparent.bg-gradient-to-r {
  background-image: linear-gradient(to right, 
    hsl(var(--accent-h) var(--accent-s) var(--accent-l)), 
    hsl(calc(var(--accent-h) + 60) var(--accent-s) var(--accent-l))
  ) !important;
}

/* Badge accents */
.bg-violet-500 {
  background-color: hsl(var(--accent-h) var(--accent-s) var(--accent-l)) !important;
}

/* Focus ring */
*:focus-visible {
  outline-color: hsl(var(--accent-h) var(--accent-s) var(--accent-l)) !important;
}

/* Gen Z styling enhancements */
h1, h2, h3, h4, h5, h6 {
  font-family: 'Space Grotesk', sans-serif !important;
  font-weight: 600 !important;
  letter-spacing: -0.025em !important;
}

button, .button {
  font-family: 'Space Grotesk', sans-serif !important;
  font-weight: 500 !important;
  letter-spacing: -0.01em !important;
}

/* Weather widget 3D effects */
.weather-icon-3d {
  filter: drop-shadow(3px 3px 6px rgba(0,0,0,0.4)) drop-shadow(1px 1px 2px rgba(0,0,0,0.2));
  transform: perspective(150px) rotateX(20deg) rotateY(-5deg);
  transition: transform 0.3s ease;
}

.weather-icon-3d:hover {
  transform: perspective(150px) rotateX(25deg) rotateY(-10deg) scale(1.1);
}
`;
    document.head.appendChild(style);
  }, []);

  // Run dev tests once in the browser
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && !window.__ranDevTests) {
        __devTests__();
        window.__ranDevTests = true;
      }
    } catch (_) { }
  }, []);

  // Study timer
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [technique, setTechnique] = useState("Pomodoro 25/5");
  const [moodStart, setMoodStart] = useState(3);
  const [moodEnd, setMoodEnd] = useState(3);
  const [note, setNote] = useState("");
  const startRef = useRef(null);
  useEffect(() => {
    let t;
    if (running) {
      if (!startRef.current) startRef.current = Date.now();
      t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    }
    return () => t && clearInterval(t);
  }, [running]);
  
  function startTimer() { setElapsed(0); startRef.current = Date.now(); setRunning(true); }
  function resetTimer() { setElapsed(0); startRef.current = Date.now(); }
  function stopTimer() {
    if (!running) return;
    const endTs = Date.now();
    const durationMin = Math.max(1, Math.round(elapsed / 60));
    const session = { id: uid(), courseIndex: selectedCourse, startTs: startRef.current, endTs, durationMin, technique, moodStart, moodEnd, note };
    setSessions(s => [session, ...s]);
    setRunning(false); setElapsed(0); startRef.current = null; setNote("");
  }

  // Stats (this week)
  const weeklyStats = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    const day = (now.getDay() + 6) % 7; // Mon=0
    startOfWeek.setDate(now.getDate() - day); startOfWeek.setHours(0, 0, 0, 0);
    const perCourse = Array(courses.length).fill(0), perDay = Array(7).fill(0);
    sessions.forEach(s => { if (s.startTs >= startOfWeek.getTime()) { perCourse[s.courseIndex] += s.durationMin; const d = (new Date(s.startTs).getDay() + 6) % 7; perDay[d] += s.durationMin; } });
    const courseData = perCourse.map((min, i) => ({ name: courses[i], hours: +(min / 60).toFixed(2) }));
    const dayData = perDay.map((min, i) => ({ name: DAYS[i], minutes: min }));
    const totalMin = perDay.reduce((a, b) => a + b, 0);
    const avgSession = sessions.length ? Math.round(sessions.reduce((a, b) => a + b.durationMin, 0) / sessions.length) : 0;
    let streak = 0; for (let i = 6; i >= 0; i--) { if (dayData[i].minutes > 0) streak++; else if (streak > 0) break; }
    return { courseData, dayData, totalMin, avgSession, streak };
  }, [sessions, courses]);

  // Schedule helpers
  function addSchedule(item) { setSchedule(s => [...s, { ...item, id: uid() }]); }
  function removeSchedule(id) { setSchedule(s => s.filter(x => x.id !== id)); }
  function eventsForDay(day) { return schedule.filter(e => e.day === day).sort((a, b) => a.start.localeCompare(b.start)); }

  return (
    <div
      className="min-h-screen relative text-zinc-900 dark:text-zinc-100"
      style={gradientEnabled ? {
        background: `linear-gradient(to bottom right, ${darkMode ? gradientStart.dark : gradientStart.light}, ${darkMode ? gradientMiddle.dark : gradientMiddle.light}, ${darkMode ? gradientEnd.dark : gradientEnd.light})`
      } : {}}
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
        <motion.header initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-4 mb-8">
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
            <TabsList className="flex flex-wrap justify-center gap-2 bg-white/70 dark:bg-white/10 backdrop-blur p-3 rounded-2xl shadow-lg" style={{paddingTop: '8px', paddingBottom: '16px'}}>
              <TabsTrigger value="dashboard" className="rounded-xl px-4" style={{"--tab-accent": "hsl(var(--accent-h) var(--accent-s) var(--accent-l))", transform: "translateY(-2px)"}}>Dashboard</TabsTrigger>
              <TabsTrigger value="planner" className="rounded-xl px-4" style={{"--tab-accent": "hsl(var(--accent-h) var(--accent-s) var(--accent-l))", transform: "translateY(-2px)"}}><CalendarDays className="w-4 h-4 mr-2" />Planner</TabsTrigger>
              <TabsTrigger value="timetable" className="rounded-xl px-4" style={{"--tab-accent": "hsl(var(--accent-h) var(--accent-s) var(--accent-l))", transform: "translateY(-2px)"}}><CalendarRange className="w-4 h-4 mr-2" />Timetable</TabsTrigger>
              <TabsTrigger value="courses" className="rounded-xl px-4" style={{"--tab-accent": "hsl(var(--accent-h) var(--accent-s) var(--accent-l))", transform: "translateY(-2px)"}}><NotebookPen className="w-4 h-4 mr-2" />Courses</TabsTrigger>
              <TabsTrigger value="study" className="rounded-xl px-4" style={{"--tab-accent": "hsl(var(--accent-h) var(--accent-s) var(--accent-l))", transform: "translateY(-2px)"}}><Brain className="w-4 h-4 mr-2" />Study Tracker</TabsTrigger>
              <TabsTrigger value="wellness" className="rounded-xl px-4" style={{"--tab-accent": "hsl(var(--accent-h) var(--accent-s) var(--accent-l))", transform: "translateY(-2px)"}}><HeartPulse className="w-4 h-4 mr-2" />Wellness</TabsTrigger>
              <TabsTrigger value="settings" className="rounded-xl px-4" style={{"--tab-accent": "hsl(var(--accent-h) var(--accent-s) var(--accent-l))", transform: "translateY(-2px)"}}><Settings className="w-4 h-4 mr-2" />Settings</TabsTrigger>
            </TabsList>
          </div>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="flex justify-between items-start mb-4">
              <WeatherWidget 
                apiKey={weatherApiKey} 
                location={weatherLocation}
              />
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
                />
              </CardContent>
              {(() => {
                // Calculate if there are more items to show
                const allExams = exams.slice().sort((a, b) => a.date.localeCompare(b.date));
                const allTasks = tasks.slice().filter(t => !t.done).sort((a, b) => a.due.localeCompare(b.due));
                
                const currentExamCount = 3 + (nextUpExpanded * 3);
                const currentTaskCount = 5 + (nextUpExpanded * 3);
                
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
              addExam={(e) => setExams(s => [{ ...e, id: uid() }, ...s])}
              addTask={(t) => setTasks(s => [{ ...t, id: uid(), done: false }, ...s])}
              addRegularEvent={(e) => setRegularEvents(s => [{ ...e, id: uid() }, ...s])}
              deleteExam={(id) => setExams(s => s.filter(e => e.id !== id))}
              deleteTask={(id) => setTasks(s => s.filter(t => t.id !== id))}
              deleteRegularEvent={(id) => setRegularEvents(s => s.filter(e => e.id !== id))}
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
              addTask={(t) => setTasks(s => [{ ...t, id: uid(), done: false }, ...s])}
              toggleTask={(id) => setTasks(s => s.map(t => t.id === id ? { ...t, done: !t.done } : t))}
              deleteTask={(id) => setTasks(s => s.filter(t => t.id !== id))}
              exams={exams}
              addExam={(e) => setExams(s => [{ ...e, id: uid() }, ...s])}
              deleteExam={(id) => setExams(s => s.filter(e => e.id !== id))}
            />
          </TabsContent>

          {/* Study Tracker */}
          <TabsContent value="study">
            <StudyTracker
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
            <Wellness />
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings">
            <SettingsTab
              courses={courses}
              renameCourse={(i, name) => setCourses(arr => arr.map((c, idx) => idx === i ? (name || `Course ${i + 1}`) : c))}
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
          <SoundtrackCard 
            embed={soundtrackEmbed} 
            position="floating"
            onPositionChange={setSoundtrackPosition}
          />
        )}
      </div>
    </div>
  );
}

// -----------------------------
// UI SUBCOMPONENTS
// -----------------------------
function CurrentDateTime() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="text-right">
      <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {formatDate(currentTime)}
      </div>
      <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
        {formatTime(currentTime)}
      </div>
    </div>
  );
}

// -----------------------------
// -----------------------------
// Weather Widget Component
// -----------------------------
function WeatherWidget({ apiKey, location }) {
  const [weather, setWeather] = useState({
    condition: 'loading',
    temperature: '--',
    location: 'Getting location...',
    description: 'Loading...'
  });
  const [error, setError] = useState(null);

  // OpenWeatherMap API integration
  useEffect(() => {
    const API_KEY = apiKey || 'demo_key'; // Use provided API key or demo
    
    const fetchWeatherByCity = async (city) => {
      try {
        if (!apiKey || apiKey.trim() === '') {
          throw new Error('No API key provided');
        }
        
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`
        );
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Invalid API key or key not yet activated');
          } else if (response.status === 404) {
            throw new Error(`City "${city}" not found`);
          } else {
            throw new Error(`Weather API error: ${response.status}`);
          }
        }
        
        const data = await response.json();
        
        // Map OpenWeatherMap icons to our emoji system
        const getWeatherIcon = (weatherMain, icon) => {
          const iconMap = {
            'Clear': '☀️',
            'Clouds': icon.includes('01') ? '☀️' : icon.includes('02') ? '⛅' : '☁️',
            'Rain': '🌧️',
            'Drizzle': '🌦️',
            'Thunderstorm': '⛈️',
            'Snow': '❄️',
            'Mist': '🌫️',
            'Fog': '🌫️',
            'Haze': '🌫️'
          };
          return iconMap[weatherMain] || '🌤️';
        };

        setWeather({
          condition: data.weather[0].main.toLowerCase(),
          temperature: Math.round(data.main.temp),
          location: data.name,
          description: data.weather[0].description,
          icon: getWeatherIcon(data.weather[0].main, data.weather[0].icon)
        });
        setError(null);
        
      } catch (err) {
        console.log('Weather API failed:', err.message);
        setError(err.message);
        fallbackToSimulation();
      }
    };
    
    const fetchWeatherData = async (lat, lon) => {
      try {
        if (!apiKey || apiKey.trim() === '') {
          throw new Error('No API key provided');
        }
        
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
        );
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Invalid API key or key not yet activated');
          } else {
            throw new Error(`Weather API error: ${response.status}`);
          }
        }
        
        const data = await response.json();
        
        // Map OpenWeatherMap icons to our emoji system
        const getWeatherIcon = (weatherMain, icon) => {
          const iconMap = {
            'Clear': '☀️',
            'Clouds': icon.includes('01') ? '☀️' : icon.includes('02') ? '⛅' : '☁️',
            'Rain': '🌧️',
            'Drizzle': '🌦️',
            'Thunderstorm': '⛈️',
            'Snow': '❄️',
            'Mist': '🌫️',
            'Fog': '🌫️',
            'Haze': '🌫️'
          };
          return iconMap[weatherMain] || '🌤️';
        };

        setWeather({
          condition: data.weather[0].main.toLowerCase(),
          temperature: Math.round(data.main.temp),
          location: data.name,
          description: data.weather[0].description,
          icon: getWeatherIcon(data.weather[0].main, data.weather[0].icon)
        });
        setError(null);
        
      } catch (err) {
        console.log('Weather API failed, falling back to simulation:', err.message);
        // Fallback to simulated weather if API fails
        fallbackToSimulation();
      }
    };

    const fallbackToSimulation = () => {
      const conditions = [
        { condition: 'sunny', temp: 28, icon: '☀️', desc: 'Clear sky' },
        { condition: 'cloudy', temp: 24, icon: '☁️', desc: 'Overcast clouds' },
        { condition: 'rainy', temp: 18, icon: '🌧️', desc: 'Light rain' },
        { condition: 'partly-cloudy', temp: 25, icon: '⛅', desc: 'Partly cloudy' },
      ];
      
      const hour = new Date().getHours();
      let weatherIndex = 0;
      
      if (hour >= 6 && hour < 12) weatherIndex = 0;
      else if (hour >= 12 && hour < 15) weatherIndex = 3;
      else if (hour >= 15 && hour < 18) weatherIndex = 1;
      else weatherIndex = 3;
      
      const selectedWeather = conditions[weatherIndex];
      setWeather({
        condition: selectedWeather.condition,
        temperature: selectedWeather.temp + Math.floor(Math.random() * 6 - 3),
        location: 'Simulated',
        description: selectedWeather.desc,
        icon: selectedWeather.icon
      });
    };

    const getLocationAndWeather = () => {
      if (location && !location.useGeolocation && location.city) {
        // Use city name from settings
        fetchWeatherByCity(location.city);
      } else if (navigator.geolocation) {
        // Use geolocation
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            fetchWeatherData(latitude, longitude);
          },
          (err) => {
            console.log('Geolocation failed:', err.message);
            setError('Location access denied');
            if (location && location.city) {
              // Try fallback to city if available
              fetchWeatherByCity(location.city);
            } else {
              fallbackToSimulation();
            }
          },
          { timeout: 10000, enableHighAccuracy: true }
        );
      } else {
        setError('Geolocation not supported');
        if (location && location.city) {
          // Try fallback to city if available
          fetchWeatherByCity(location.city);
        } else {
          fallbackToSimulation();
        }
      }
    };

    getLocationAndWeather();
    
    // Update weather every 10 minutes
    const interval = setInterval(getLocationAndWeather, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [apiKey, location]);

  const getWeatherDescription = (condition) => {
    if (weather.description) {
      return weather.description.charAt(0).toUpperCase() + weather.description.slice(1);
    }
    
    const descriptions = {
      'clear': 'Clear Sky',
      'sunny': 'Sunny',
      'clouds': 'Cloudy',
      'rain': 'Rainy',
      'drizzle': 'Drizzle',
      'thunderstorm': 'Stormy',
      'snow': 'Snowy',
      'mist': 'Misty',
      'fog': 'Foggy',
      'partly-cloudy': 'Partly Cloudy',
      'loading': 'Loading...'
    };
    return descriptions[condition] || 'Clear';
  };

  return (
    <div className="text-left">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl weather-icon-3d cursor-pointer">
          {weather.condition === 'loading' ? '⏳' : weather.icon}
        </span>
        <div>
          <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {getWeatherDescription(weather.condition)}
          </div>
          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {weather.temperature === '--' ? '--' : `${weather.temperature}°C`}
          </div>
          {error && (
            <div className="text-xs text-orange-500 dark:text-orange-400">
              {error} {!error.includes('Invalid API key') && !error.includes('not found') ? '(simulated)' : ''}
            </div>
          )}
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {weather.location}
          </div>
        </div>
      </div>
    </div>
  );
}

function MoonSunToggle({ checked, onCheckedChange }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs">🌞</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
      <span className="text-xs">🌚</span>
    </div>
  );
}

function TipsRow() {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {[
        { icon: <Target className="w-5 h-5" />, title: "Micro-goals", tip: "Break big tasks into 25–45 min sprints. Reward tiny wins." },
        { icon: <Coffee className="w-5 h-5" />, title: "Break hygiene", tip: "5–10 min off-screen breaks every hour. Hydrate + stretch." },
        { icon: <Music2 className="w-5 h-5" />, title: "Soundtrack", tip: "Lo-fi beats or brown noise can boost focus." },
      ].map((t, i) => (
        <Card key={i} className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">{t.icon}{t.title}</CardTitle>
            <CardDescription>{t.tip}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

function SoundtrackCard({ embed, position = 'dashboard', onPositionChange }) {
  const [isMinimized, setIsMinimized] = useState(false);
  
  if (position === 'hidden' || !embed) {
    return position === 'dashboard' ? (
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Music2 className="w-5 h-5" />Soundtrack</CardTitle>
          <CardDescription>Focus with your own vibe</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-zinc-500">Add an embed URL in <strong>Settings → Soundtrack</strong> (e.g., Spotify/YouTube embed link) and it will show up here.</div>
        </CardContent>
      </Card>
    ) : null;
  }

  if (position === 'floating') {
    return (
      <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
        isMinimized ? 'w-16 h-16' : 'w-80 h-48'
      }`}>
        <Card className="h-full rounded-2xl border-none shadow-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur">
          {!isMinimized && (
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Music2 className="w-4 h-4" />
                  Soundtrack
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMinimized(true)}
                    className="h-6 w-6 p-0 hover:bg-white/20"
                    title="Minimize"
                  >
                    ➖
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPositionChange && onPositionChange('dashboard')}
                    className="h-6 w-6 p-0 hover:bg-white/20"
                    title="Maximize to Dashboard"
                  >
                    ⬜
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPositionChange && onPositionChange('hidden')}
                    className="h-6 w-6 p-0 hover:bg-white/20"
                    title="Close"
                  >
                    ✖️
                  </Button>
                </div>
              </div>
            </CardHeader>
          )}
          <CardContent className={`${isMinimized ? 'p-2' : 'p-3 pt-0'} h-full`}>
            {isMinimized ? (
              <Button
                variant="ghost"
                onClick={() => setIsMinimized(false)}
                className="w-full h-full p-0 flex items-center justify-center"
              >
                <Music2 className="w-6 h-6" />
              </Button>
            ) : (
              <div className="rounded-xl overflow-hidden h-full">
                <iframe 
                  src={embed} 
                  className="w-full h-full" 
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                  loading="lazy" 
                  title="Study soundtrack" 
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Dashboard position
  return (
    <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Music2 className="w-5 h-5" />Soundtrack</CardTitle>
            <CardDescription>Focus with your own vibe</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPositionChange && onPositionChange('floating')}
            className="h-8 w-8 p-0 hover:bg-white/20"
            title="Minimize to floating player (plays across all tabs)"
          >
            ⬇️
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl overflow-hidden">
          <div className="aspect-video">
            <iframe src={embed} className="w-full h-full" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="Study soundtrack" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Upcoming({ exams, tasks, courses, expanded }) {
  const upcomingExams = useMemo(() => {
    const sorted = exams.slice().sort((a, b) => a.date.localeCompare(b.date));
    const baseCount = 3;
    const additionalCount = expanded * 3;
    return sorted.slice(0, baseCount + additionalCount);
  }, [exams, expanded]);
  
  const upcomingTasks = useMemo(() => {
    const filtered = tasks.slice().filter(t => !t.done).sort((a, b) => a.due.localeCompare(b.due));
    const baseCount = 5;
    const additionalCount = expanded * 3;
    return filtered.slice(0, baseCount + additionalCount);
  }, [tasks, expanded]);

  // Check if there are more items to show
  const allExams = useMemo(() => exams.slice().sort((a, b) => a.date.localeCompare(b.date)), [exams]);
  const allTasks = useMemo(() => tasks.slice().filter(t => !t.done).sort((a, b) => a.due.localeCompare(b.due)), [tasks]);
  
  const hasMoreExams = allExams.length > upcomingExams.length;
  const hasMoreTasks = allTasks.length > upcomingTasks.length;
  const hasMore = hasMoreExams || hasMoreTasks;
  
  // Helper function to calculate D-Day
  const calculateDDay = (dateString) => {
    if (!dateString) return null;
    const targetDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    
    const diffTime = targetDate - today;
    let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    // Add 1 day to all calculations
    diffDays = diffDays + 1;
    
    if (diffDays === 0) return "D-DAY";
    if (diffDays > 0) return `D-${diffDays}`;
    return `D+${Math.abs(diffDays)}`;
  };
  
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Exams</div>
        <div className="space-y-2">
          {upcomingExams.length === 0 && <div className="text-sm text-zinc-500">No exams scheduled yet.</div>}
          <AnimatePresence mode="popLayout">
            {upcomingExams.map((e, index) => (
              <motion.div 
                key={e.id}
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ 
                  duration: 0.3, 
                  ease: "easeInOut",
                  delay: expanded > 0 ? index * 0.05 : 0
                }}
                className="flex items-center justify-between bg-white/70 dark:bg-white/5 rounded-xl p-3 overflow-hidden cursor-pointer hover:bg-white/80 dark:hover:bg-white/10 transition-colors"
                onClick={() => {
                  setActiveTab('courses');
                  setSelectedCourse(e.courseIndex);
                }}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{e.title}</span>
                  <span className="text-xs text-zinc-500">{courses[e.courseIndex]} · {e.weight || 0}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="rounded-full">{e.date}</Badge>
                  <Badge variant="outline" className="rounded-full text-xs font-mono">{calculateDDay(e.date)}</Badge>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Tasks</div>
        <div className="space-y-2">
          {upcomingTasks.length === 0 && <div className="text-sm text-zinc-500">No tasks due soon. Love that for you ✨</div>}
          <AnimatePresence mode="popLayout">
            {upcomingTasks.map((t, index) => (
              <motion.div 
                key={t.id}
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ 
                  duration: 0.3, 
                  ease: "easeInOut",
                  delay: expanded > 0 ? index * 0.05 : 0
                }}
                className="flex items-center justify-between bg-white/70 dark:bg-white/5 rounded-xl p-3 overflow-hidden cursor-pointer hover:bg-white/80 dark:hover:bg-white/10 transition-colors"
                onClick={() => {
                  setActiveTab('courses');
                  setSelectedCourse(t.courseIndex);
                }}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{t.title}</span>
                  <span className="text-xs text-zinc-500">{courses[t.courseIndex]} · {t.priority}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="rounded-full">due {t.due}</Badge>
                  <Badge variant="outline" className="rounded-full text-xs font-mono">{calculateDDay(t.due)}</Badge>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// -----------------------------
// Planner (Week + Month views)
// -----------------------------
function Planner({ courses, onAdd, onRemove, eventsByDay, exams, tasks, regularEvents, addExam, addTask, addRegularEvent, deleteExam, deleteTask, deleteRegularEvent }) {
  const [open, setOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, event: null });
  const [showMultiDayEvents, setShowMultiDayEvents] = useState(false); // Toggle for showing multi-day events on day cards
  const [editingEvent, setEditingEvent] = useState(null); // Track the event being edited
  const [form, setForm] = useState({ 
    eventCategory: "regular", // regular, exam, task
    courseIndex: -1, // -1 means no course selected 
    type: "class", 
    title: "", 
    startDate: "", 
    endDate: "", 
    day: "Mon", 
    start: "10:00", 
    end: "11:30", 
    location: "",
    weight: 20,
    priority: "normal",
    notes: "",
    color: "#6366f1" // Default color
  });
  const [filterCourse, setFilterCourse] = useState("all");
  const [view, setView] = useState("month");
  const [weekOffset, setWeekOffset] = useState(0);

  // Month data
  const now = new Date();
  const [monthView, setMonthView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function monthMatrix(y, m) {
    const first = new Date(y, m, 1);
    const offset = (first.getDay() + 6) % 7; // Mon=0
    const start = new Date(y, m, 1 - offset);
    return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }
  const matrix = useMemo(() => monthMatrix(monthView.year, monthView.month), [monthView]);
  function shiftMonth(delta) { const d = new Date(monthView.year, monthView.month + delta, 1); setMonthView({ year: d.getFullYear(), month: d.getMonth() }); }

  // Weekly dates (show numbered days on headers)
  const startOfWeek = useMemo(() => { 
    const d = new Date(); 
    const w = (d.getDay() + 6) % 7; 
    d.setDate(d.getDate() - w + (weekOffset * 7)); 
    d.setHours(0, 0, 0, 0); 
    return d; 
  }, [weekOffset]);
  
  function dayNumOfWeek(i) { 
    const d = new Date(startOfWeek); 
    d.setDate(startOfWeek.getDate() + i); 
    return d.getDate(); 
  }

  // Format date for display
  function formatDate(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  }

  // Handler for adding new events
  const handleAddEvent = () => {
    if (!form.title) return;
    
    // If we're editing an existing event, delete the original first
    if (editingEvent) {
      if (editingEvent.eventType === 'regular') {
        deleteRegularEvent(editingEvent.id);
      } else if (editingEvent.eventType === 'exam') {
        deleteExam(editingEvent.id);
      } else if (editingEvent.eventType === 'task') {
        deleteTask(editingEvent.id);
      }
    }
    
    if (form.eventCategory === "regular") {
      const eventData = {
        courseIndex: form.courseIndex,
        title: form.title,
        startDate: form.startDate,
        location: form.location,
        notes: form.notes,
        color: form.color
      };
      
      // Only add endDate if user explicitly provided one that's different from startDate
      if (form.endDate && form.endDate !== form.startDate) {
        eventData.endDate = form.endDate;
        eventData.isMultiDay = true;
      } else {
        eventData.isMultiDay = false;
      }
      
      addRegularEvent(eventData);
    } else if (form.eventCategory === "exam") {
      addExam({
        courseIndex: form.courseIndex,
        title: form.title,
        date: form.startDate,
        weight: form.weight,
        notes: form.notes
      });
    } else if (form.eventCategory === "task") {
      addTask({
        courseIndex: form.courseIndex,
        title: form.title,
        due: form.startDate,
        priority: form.priority,
        notes: form.notes
      });
    }
    
    // Reset form and editing state
    setForm({
      eventCategory: "regular",
      courseIndex: -1, // -1 means no course selected
      type: "class", 
      title: "", 
      startDate: "", 
      endDate: "", 
      day: "Mon", 
      start: "10:00", 
      end: "11:30", 
      location: "",
      weight: 20,
      priority: "normal",
      notes: "",
      color: "#6366f1"
    });
    setEditingEvent(null);
    setOpen(false);
  };

  // Handle event edit action
  const handleEditEvent = (event) => {
    setEditingEvent(event); // Store the original event for potential restoration
    
    if (event.eventType === 'regular') {
      setForm({
        eventCategory: "regular",
        courseIndex: event.courseIndex ?? -1,
        title: event.title || "",
        startDate: event.startDate ? new Date(event.startDate).toISOString().split('T')[0] : "",
        endDate: event.endDate ? new Date(event.endDate).toISOString().split('T')[0] : "",
        location: event.location || "",
        notes: event.notes || "",
        color: event.color || "#6366f1",
        type: "class",
        day: "Mon",
        start: "10:00",
        end: "11:30",
        weight: 20,
        priority: "normal"
      });
    } else if (event.eventType === 'exam') {
      setForm({
        eventCategory: "exam",
        courseIndex: event.courseIndex ?? -1,
        title: event.title || "",
        startDate: event.date ? new Date(event.date).toISOString().split('T')[0] : "",
        weight: event.weight || 20,
        notes: event.notes || "",
        color: "#ef4444", // Red for exams
        endDate: "",
        location: "",
        type: "class",
        day: "Mon",
        start: "10:00",
        end: "11:30",
        priority: "normal"
      });
    } else if (event.eventType === 'task') {
      setForm({
        eventCategory: "task",
        courseIndex: event.courseIndex ?? -1,
        title: event.title || "",
        startDate: event.due ? new Date(event.due).toISOString().split('T')[0] : "",
        priority: event.priority || "normal",
        notes: event.notes || "",
        color: "#f59e0b", // Amber for tasks
        endDate: "",
        location: "",
        type: "class",
        day: "Mon",
        start: "10:00",
        end: "11:30",
        weight: 20
      });
    }
    setConfirmDialog({ open: false, event: null });
    setOpen(true);
  };

  // Handle event delete action
  const handleDeleteEvent = (event) => {
    if (event.eventType === 'regular') {
      deleteRegularEvent(event.id);
    } else if (event.eventType === 'exam') {
      deleteExam(event.id);
    } else if (event.eventType === 'task') {
      deleteTask(event.id);
    }
    setConfirmDialog({ open: false, event: null });
  };

  // Handle day click to create new event with pre-filled date
  const handleDayClick = (date) => {
    const dateString = date.toISOString().split('T')[0];
    setForm({
      eventCategory: "regular",
      courseIndex: -1,
      type: "class",
      title: "",
      startDate: dateString,
      endDate: "",
      day: "Mon",
      start: "10:00",
      end: "11:30",
      location: "",
      weight: 20,
      priority: "normal",
      notes: "",
      color: "#6366f1"
    });
    setEditingEvent(null); // Make sure we're not in edit mode
    setOpen(true);
  };

  // Handle dialog close (including cancel)
  const handleDialogClose = (open) => {
    if (!open) {
      // Dialog is being closed - reset editing state and form
      setEditingEvent(null);
      setForm({
        eventCategory: "regular",
        courseIndex: -1,
        type: "class", 
        title: "", 
        startDate: "", 
        endDate: "", 
        day: "Mon", 
        start: "10:00", 
        end: "11:30", 
        location: "",
        weight: 20,
        priority: "normal",
        notes: "",
        color: "#6366f1"
      });
    }
    setOpen(open);
  };

  // Helper: get all events for a specific date
  function getAllEventsForDate(date) {
    const events = [];
    const dateStr = date.toISOString().split('T')[0];
    const dayName = DAYS[(date.getDay() + 6) % 7];

    // Regular schedule events
    const scheduleEvents = eventsByDay(dayName)
      .filter(e => filterCourse === 'all' || String(e.courseIndex) === filterCourse)
      .map(e => ({
        ...e,
        eventType: 'schedule',
        time: e.start,
        displayTime: `${e.start}–${e.end}`
      }));
    events.push(...scheduleEvents);

    // Regular events - always include single-day events, multi-day events only if toggle is on
    const regularEventsForDate = regularEvents
      .filter(e => {
        const startDate = new Date(e.startDate);
        const endDate = e.endDate ? new Date(e.endDate) : startDate;
        const currentDate = new Date(dateStr);
        const isMultiDay = e.isMultiDay !== false && (e.endDate && e.endDate !== e.startDate);
        
        // Check if current date is within the event range
        const isInRange = currentDate >= startDate && currentDate <= endDate;
        
        // Include if: within range AND (single-day event OR multi-day event with toggle on)
        return isInRange && 
               (filterCourse === 'all' || String(e.courseIndex) === filterCourse) &&
               (!isMultiDay || showMultiDayEvents);
      })
      .map(e => ({
        ...e,
        eventType: 'regular',
        time: '00:00',
        displayTime: 'Event',
        type: 'regular'
      }));
    events.push(...regularEventsForDate);

    // Exams for this date
    const dayExams = exams
      .filter(e => e.date === dateStr && (filterCourse === 'all' || String(e.courseIndex) === filterCourse))
      .map(e => ({
        ...e,
        eventType: 'exam',
        time: '00:00',
        displayTime: 'Exam',
        type: 'exam'
      }));
    events.push(...dayExams);

    // Tasks due on this date
    const dayTasks = tasks
      .filter(t => t.due === dateStr && !t.done && (filterCourse === 'all' || String(t.courseIndex) === filterCourse))
      .map(t => ({
        ...t,
        eventType: 'task',
        time: '00:00',
        displayTime: 'Due',
        type: 'task'
      }));
    events.push(...dayTasks);

    return events.sort((a, b) => a.time.localeCompare(b.time));
  }

  // Helper: get all events for tooltip (including hidden multi-day events)
  function getAllEventsForTooltip(date) {
    const events = [];
    const dateStr = date.toISOString().split('T')[0];
    const dayName = DAYS[(date.getDay() + 6) % 7];

    // Regular schedule events
    const scheduleEvents = eventsByDay(dayName)
      .filter(e => filterCourse === 'all' || String(e.courseIndex) === filterCourse)
      .map(e => ({
        ...e,
        eventType: 'schedule',
        time: e.start,
        displayTime: `${e.start}–${e.end}`
      }));
    events.push(...scheduleEvents);

    // ALL Regular events - for tooltip, show all regardless of toggle
    const regularEventsForDate = regularEvents
      .filter(e => {
        const startDate = new Date(e.startDate);
        const endDate = e.endDate ? new Date(e.endDate) : startDate;
        const currentDate = new Date(dateStr);
        return currentDate >= startDate && currentDate <= endDate &&
               (filterCourse === 'all' || String(e.courseIndex) === filterCourse);
      })
      .map(e => ({
        ...e,
        eventType: 'regular',
        time: '00:00',
        displayTime: 'Event',
        type: 'regular'
      }));
    events.push(...regularEventsForDate);

    // Exams for this date
    const dayExams = exams
      .filter(e => e.date === dateStr && (filterCourse === 'all' || String(e.courseIndex) === filterCourse))
      .map(e => ({
        ...e,
        eventType: 'exam',
        time: '00:00',
        displayTime: 'Exam',
        type: 'exam'
      }));
    events.push(...dayExams);

    // Tasks due on this date
    const dayTasks = tasks
      .filter(t => t.due === dateStr && !t.done && (filterCourse === 'all' || String(t.courseIndex) === filterCourse))
      .map(t => ({
        ...t,
        eventType: 'task',
        time: '00:00',
        displayTime: 'Due',
        type: 'task'
      }));
    events.push(...dayTasks);

    return events.sort((a, b) => a.time.localeCompare(b.time));
  }

  // Helper: events for weekday name (Mon..Sun), filtered & sorted
  function eventsForWeekdayName(dayName) {
    const date = new Date(startOfWeek);
    const dayIndex = DAYS.indexOf(dayName);
    date.setDate(date.getDate() + dayIndex);
    return getAllEventsForDate(date);
  }

  // Helper: get regular events that span multiple days for the calendar view
  const getRegularEventsForCalendar = () => {
    return regularEvents
      .filter(e => filterCourse === 'all' || String(e.courseIndex) === filterCourse)
      .map(e => {
        const startDate = new Date(e.startDate);
        const endDate = new Date(e.endDate || e.startDate);
        return {
          ...e,
          startDate,
          endDate,
          durationDays: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1
        };
      });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={filterCourse} onValueChange={setFilterCourse}>
            <SelectTrigger className="w-48 rounded-xl"><SelectValue placeholder="Filter course" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All courses</SelectItem>
              {courses.map((c, i) => <SelectItem key={i} value={String(i)}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={view === 'week' ? 'default' : 'outline'} onClick={() => setView('week')} className="rounded-xl">Week</Button>
          <Button variant={view === 'month' ? 'default' : 'outline'} onClick={() => setView('month')} className="rounded-xl">Month</Button>
          {view === 'week' ? (
            <div className="flex items-center gap-2 ml-2">
              <Button variant="outline" onClick={() => setWeekOffset(offset => offset - 1)} className="rounded-xl">
                <CalendarDays className="w-4 h-4 mr-2" />Prev Week
              </Button>
              <div className="font-medium">
                {formatDate(startOfWeek)} - {formatDate(new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000))}
              </div>
              <Button variant="outline" onClick={() => setWeekOffset(offset => offset + 1)} className="rounded-xl">
                Next Week<CalendarDays className="w-4 h-4 ml-2" />
              </Button>
              {weekOffset !== 0 && (
                <Button variant="ghost" onClick={() => setWeekOffset(0)} className="rounded-xl">
                  Today
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <Button variant="outline" onClick={() => shiftMonth(-1)} className="rounded-xl">Prev</Button>
              <div className="text-2xl md:text-3xl font-extrabold text-white dark:text-black">
                {MONTHS[monthView.month]} {monthView.year}
              </div>
              <Button variant="outline" onClick={() => shiftMonth(1)} className="rounded-xl">Next</Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {view === 'month' && (
            <div className="flex items-center gap-2">
              <Switch 
                checked={showMultiDayEvents} 
                onCheckedChange={setShowMultiDayEvents}
                className="data-[state=checked]:bg-blue-600"
              />
              <Label className="text-sm text-white dark:text-black">Show multi-day events on cards</Label>
            </div>
          )}
          <Dialog open={open} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild><Button className="rounded-xl"><Plus className="w-4 h-4 mr-2" />Add event</Button></DialogTrigger>
            <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-white border border-gray-200 dark:border-gray-700">
            <DialogHeader>
              <DialogTitle>{editingEvent ? 'Edit Event' : 'Add Event'}</DialogTitle>
              <DialogDescription>
                {editingEvent ? 'Modify the event details below' : 'Create a regular event, exam, or task'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div>
                <Label>Event Type</Label>
                <Select value={form.eventCategory} onValueChange={(v) => setForm({ ...form, eventCategory: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular Event</SelectItem>
                    <SelectItem value="exam">Exam</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Course (Optional)</Label>
                <Select value={String(form.courseIndex)} onValueChange={(v) => setForm({ ...form, courseIndex: Number(v) })}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select a course (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-1">No Course</SelectItem>
                    {courses.map((c, i) => <SelectItem key={i} value={String(i)}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Title</Label>
                <Input 
                  value={form.title} 
                  onChange={(e) => setForm({ ...form, title: e.target.value })} 
                  className="rounded-xl" 
                  placeholder={
                    form.eventCategory === "regular" ? "e.g., Math Olympics Week" :
                    form.eventCategory === "exam" ? "e.g., Midterm Exam" :
                    "e.g., Submit Assignment"
                  } 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>
                    {form.eventCategory === "regular" ? "Start Date" : 
                     form.eventCategory === "exam" ? "Exam Date" : "Due Date"}
                  </Label>
                  <Input 
                    type="date" 
                    value={form.startDate} 
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })} 
                    className="rounded-xl" 
                  />
                </div>
                {form.eventCategory === "regular" && (
                  <div>
                    <Label>End Date (Optional)</Label>
                    <Input 
                      type="date" 
                      value={form.endDate} 
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })} 
                      className="rounded-xl"
                      min={form.startDate}
                    />
                  </div>
                )}
              </div>

              {form.eventCategory === "regular" && (
                <div>
                  <Label>Location (Optional)</Label>
                  <Input 
                    value={form.location} 
                    onChange={(e) => setForm({ ...form, location: e.target.value })} 
                    className="rounded-xl" 
                    placeholder="e.g., Main Auditorium" 
                  />
                </div>
              )}

              {form.eventCategory === "regular" && (
                <div>
                  <Label>Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      className="w-12 h-10 rounded-xl border border-gray-300 cursor-pointer"
                    />
                    <div className="flex flex-wrap gap-2">
                      {[
                        "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", 
                        "#f97316", "#f59e0b", "#84cc16", "#10b981", 
                        "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6"
                      ].map((color) => (
                        <button
                          key={color}
                          type="button"
                          className="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                          onClick={() => setForm({ ...form, color })}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {form.eventCategory === "exam" && (
                <div>
                  <Label>Weight (%)</Label>
                  <Input 
                    type="number" 
                    value={form.weight} 
                    onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })} 
                    className="rounded-xl"
                    min="0"
                    max="100"
                  />
                </div>
              )}

              {form.eventCategory === "task" && (
                <div>
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Notes (Optional)</Label>
                <Textarea 
                  value={form.notes} 
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} 
                  className="rounded-xl" 
                  placeholder={
                    form.eventCategory === "regular" ? "Event details, agenda, etc." :
                    form.eventCategory === "exam" ? "Chapters, topics, allowed materials..." :
                    "Additional task details..."
                  }
                  rows={3}
                />
              </div>

              <Button onClick={handleAddEvent} className="rounded-xl mt-2">
                {editingEvent ? 'Update' : 'Add'} {form.eventCategory === "regular" ? "Event" : 
                     form.eventCategory === "exam" ? "Exam" : "Task"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Event Action Confirmation Dialog */}
        <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ open, event: null })}>
          <DialogContent className="rounded-2xl max-w-md bg-white dark:bg-white border border-gray-200 dark:border-gray-700">
            <DialogHeader>
              <DialogTitle>Event Actions</DialogTitle>
              <DialogDescription>
                What would you like to do with "{confirmDialog.event?.title || confirmDialog.event?.type}"?
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 mt-4">
              <Button 
                onClick={() => handleEditEvent(confirmDialog.event)}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
              >
                Edit Event
              </Button>
              <Button 
                onClick={() => handleDeleteEvent(confirmDialog.event)}
                variant="destructive"
                className="rounded-xl"
              >
                Delete Event
              </Button>
              <Button 
                onClick={() => setConfirmDialog({ open: false, event: null })}
                variant="outline"
                className="rounded-xl"
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Views */}
      {view === 'week' ? (
        <div className="grid grid-cols-7 gap-4 relative">
          {DAYS.map((d, idx) => (
            <Card key={d} className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur relative">
              <CardHeader className="relative z-[1]">
                <CardTitle className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span>{d}</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-8 h-8 rounded-xl bg-white/50 dark:bg-white/5 backdrop-blur flex items-center justify-center font-medium">
                        {dayNumOfWeek(idx)}
                      </div>
                      {eventsForWeekdayName(d).length > 0 && (
                        <Badge variant="secondary" className="h-8 px-2.5 rounded-xl flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-500"></div>
                          <span>{eventsForWeekdayName(d).length}</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardTitle>
                <CardDescription>Upcoming</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {eventsForWeekdayName(d).map(e => (
                  <div 
                    key={e.id} 
                    className="group relative flex items-start justify-between gap-2 bg-white/70 dark:bg-white/5 p-3 rounded-xl"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {e.eventType === 'schedule' && (
                          <span className={`flex-shrink-0 inline-block w-2 h-2 rounded-full ${typeColors[e.type]}`}></span>
                        )}
                        {e.eventType === 'exam' && (
                          <span className="flex-shrink-0 inline-block w-2 h-2 rounded-full bg-rose-500"></span>
                        )}
                        {e.eventType === 'task' && (
                          <span className="flex-shrink-0 inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                        )}
                        <span className="font-medium truncate">{e.title || e.type}</span>
                      </div>
                      <div className="text-xs text-zinc-500 truncate">
                        {e.displayTime && `${e.displayTime} · `}
                        {courses[e.courseIndex]}
                        {e.location && ` · ${e.location}`}
                        {e.weight && ` · ${e.weight}%`}
                        {e.priority && ` · ${e.priority} priority`}
                      </div>
                    </div>
                    {e.eventType === 'schedule' && (
                      <Button size="icon" variant="ghost" onClick={() => onRemove(e.id)} className="flex-shrink-0 rounded-xl">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    
                    {/* Hover tooltip */}
                    <div 
                      style={{ 
                        backgroundColor: 'var(--background, white)',
                        zIndex: 99999,
                        position: 'fixed',
                        transform: 'translateY(-100%)',
                        marginBottom: '8px',
                        left: '50%',
                        marginLeft: '-8rem' // half of w-64 (16rem)
                      }} 
                      className="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-64 p-3 rounded-xl shadow-xl border border-white/20 dark:border-white/10"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {e.eventType === 'schedule' && (
                            <span className={`flex-shrink-0 inline-block w-2 h-2 rounded-full ${typeColors[e.type]}`}></span>
                          )}
                          {e.eventType === 'exam' && (
                            <span className="flex-shrink-0 inline-block w-2 h-2 rounded-full bg-rose-500"></span>
                          )}
                          {e.eventType === 'task' && (
                            <span className="flex-shrink-0 inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                          )}
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{e.title || e.type}</span>
                        </div>
                        <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                          <div>{courses[e.courseIndex]}</div>
                          {e.displayTime && <div>{e.displayTime}</div>}
                          {e.location && <div>{e.location}</div>}
                          {e.weight && <div>Weight: {e.weight}%</div>}
                          {e.priority && <div>Priority: {e.priority}</div>}
                          {e.notes && <div className="italic mt-2">{e.notes}</div>}
                        </div>
                      </div>
                      {/* Arrow */}
                      <div className="absolute bottom-0 left-4 transform translate-y-full">
                        <div style={{ backgroundColor: 'var(--background, white)' }} className="w-2 h-2 rotate-45 transform -translate-y-1 border-r border-b border-white/20 dark:border-white/10"></div>
                      </div>
                    </div>
                  </div>
                ))}
                {eventsForWeekdayName(d).length === 0 && <div className="text-sm text-zinc-500">No events.</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {DAYS.map(d => <div key={d} className="text-center py-2">{d}</div>)}
          </div>
          
          <div className="grid grid-cols-7 gap-3">
            {matrix.map((date, i) => {
              const inMonth = date.getMonth() === monthView.month;
              const today = new Date(); today.setHours(0, 0, 0, 0);
              const isToday = date.toDateString() === today.toDateString();
              const dayEvents = getAllEventsForDate(date);
              const tooltipEvents = getAllEventsForTooltip(date); // For tooltip, show all events including hidden multi-day
              
              // Check if this day has any multi-day events for border color
              const allRegularEventsOnDay = tooltipEvents.filter(e => e.eventType === 'regular');
              const multiDayEventsOnDay = allRegularEventsOnDay.filter(e => e.isMultiDay !== false && (e.endDate && e.endDate !== e.startDate));
              const hasMultiDayEvent = multiDayEventsOnDay.length > 0;
              const multiDayEventColor = hasMultiDayEvent ? multiDayEventsOnDay[0].color || '#6366f1' : null;
              
              return (
                <div 
                  key={i} 
                  className={`group relative rounded-xl p-3 min-h-[120px] bg-white/70 dark:bg-white/5 backdrop-blur border-2 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer ${
                    isToday ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-900/20' : 'border-transparent hover:border-violet-200 dark:hover:border-violet-700'
                  } ${inMonth ? '' : 'opacity-50'} ${hasMultiDayEvent ? 'border-t-4' : ''}`}
                  style={{
                    borderTopColor: hasMultiDayEvent ? multiDayEventColor : undefined
                  }}
                  onClick={() => handleDayClick(date)}
                  title="Click to create new event on this date"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`text-lg font-bold ${isToday ? 'text-violet-700 dark:text-violet-300' : 'text-zinc-800 dark:text-zinc-200'}`}>
                      {date.getDate()}
                    </div>
                    {dayEvents.length > 0 && (
                      <Badge variant="secondary" className="text-xs rounded-full">
                        {dayEvents.length}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    {dayEvents.slice(0, 4).map((e, idx) => (
                      <div 
                        key={idx} 
                        className="text-xs truncate flex items-center gap-1.5 p-1 rounded bg-white/50 dark:bg-white/10 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                        onClick={(event) => {
                          event.stopPropagation();
                          setConfirmDialog({ open: true, event: e });
                        }}
                        title="Click to edit or delete event"
                      >
                        {e.eventType === 'schedule' && (
                          <span className={`flex-shrink-0 w-2 h-2 rounded-full ${typeColors[e.type]}`}></span>
                        )}
                        {e.eventType === 'regular' && (
                          <span 
                            className="flex-shrink-0 w-2 h-2 rounded-full" 
                            style={{ backgroundColor: e.color || '#6366f1' }}
                          ></span>
                        )}
                        {e.eventType === 'exam' && (
                          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-rose-500"></span>
                        )}
                        {e.eventType === 'task' && (
                          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500"></span>
                        )}
                        <span className="font-medium truncate">{e.title || e.type}</span>
                      </div>
                    ))}
                    {dayEvents.length > 4 && (
                      <div className="text-xs text-zinc-500 font-medium mt-1">
                        +{dayEvents.length - 4} more...
                      </div>
                    )}
                  </div>
                  
                  {/* Detailed hover tooltip */}
                  {tooltipEvents.length > 0 && (
                    <div className="absolute left-1/2 bottom-full mb-2 w-80 bg-white dark:bg-zinc-800 shadow-xl rounded-xl p-4 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform -translate-x-1/2 border border-white/20 dark:border-white/10">
                      <div className="mb-3">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">
                          {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                        <div className="text-sm text-zinc-500 dark:text-zinc-400">
                          {tooltipEvents.length} event{tooltipEvents.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {tooltipEvents.map((e, idx) => (
                          <div key={idx} className="space-y-1 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-700/50">
                            <div className="flex items-center gap-2">
                              {e.eventType === 'schedule' && (
                                <span className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${typeColors[e.type]}`}></span>
                              )}
                              {e.eventType === 'regular' && (
                                <span 
                                  className="flex-shrink-0 w-2.5 h-2.5 rounded-full" 
                                  style={{ backgroundColor: e.color || '#6366f1' }}
                                ></span>
                              )}
                              {e.eventType === 'exam' && (
                                <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                              )}
                              {e.eventType === 'task' && (
                                <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                              )}
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                {e.title || e.type}
                              </span>
                            </div>
                            
                            <div className="text-sm text-zinc-600 dark:text-zinc-300 ml-4">
                              <div className="font-medium">{courses[e.courseIndex]}</div>
                              {e.displayTime && <div>{e.displayTime}</div>}
                              {e.location && <div>📍 {e.location}</div>}
                              {e.weight && <div>⚖️ Weight: {e.weight}%</div>}
                              {e.priority && <div>🎯 Priority: {e.priority}</div>}
                              {e.notes && <div className="italic mt-1">📝 {e.notes}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Tooltip arrow */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                        <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white dark:border-t-zinc-800"></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Hidden Multi-Day Events Section */}
          {!showMultiDayEvents && regularEvents.some(e => e.isMultiDay !== false && (e.endDate && e.endDate !== e.startDate)) && (
            <div className="mt-6">
              <h3 className="text-lg font-bold text-white dark:text-black mb-3">Hidden Multi-Day Events</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {regularEvents
                  .filter(e => (filterCourse === 'all' || String(e.courseIndex) === filterCourse) && 
                              (e.isMultiDay !== false && (e.endDate && e.endDate !== e.startDate)))
                  .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
                  .map((event) => (
                  <div
                    key={event.id}
                    className="bg-white/90 dark:bg-white/10 rounded-xl p-4 border-t-4 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    style={{ borderTopColor: event.color || '#6366f1' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDialog({ open: true, event: { ...event, eventType: 'regular' } });
                    }}
                    title="Click to edit or delete event"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                          {event.title}
                        </div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-300 space-y-1">
                          {event.courseIndex >= 0 && (
                            <div>📚 {courses[event.courseIndex]}</div>
                          )}
                          <div>📅 {event.isMultiDay 
                            ? `${new Date(event.startDate).toLocaleDateString()} - ${new Date(event.endDate).toLocaleDateString()}`
                            : new Date(event.startDate).toLocaleDateString()
                          }</div>
                          {event.location && <div>📍 {event.location}</div>}
                          {event.notes && <div className="italic">📝 {event.notes}</div>}
                        </div>
                      </div>
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0 ml-2"
                        style={{ backgroundColor: event.color || '#6366f1' }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// -----------------------------
// Course Manager
// -----------------------------
function CourseManager({ courses, selected, setSelected, tasks, addTask, toggleTask, deleteTask, exams, addExam, deleteExam }) {
  const [taskForm, setTaskForm] = useState({ title: "", due: "", priority: "normal" });
  const [examForm, setExamForm] = useState({ title: "", date: "", weight: 20, notes: "" });
  const [editingExam, setEditingExam] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const courseTasks = tasks.filter(t => t.courseIndex === selected);
  const courseExams = exams.filter(e => e.courseIndex === selected);
  const progress = useMemo(() => { 
    const d = courseTasks.filter(t => t.done).length; 
    const tot = courseTasks.length || 1; 
    return Math.round((d / tot) * 100); 
  }, [courseTasks]);
  return (
    <div className="space-y-6">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <ReactConfetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={500}
            gravity={0.2}
            onConfettiComplete={() => {
              setTimeout(() => setShowConfetti(false), 2000);
            }}
          />
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={String(selected)} onValueChange={(v) => setSelected(Number(v))}>
            <SelectTrigger className="w-56 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{courses.map((c, i) => <SelectItem key={i} value={String(i)}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Badge variant="secondary" className="rounded-full"><GraduationCap className="w-3 h-3 mr-1" />{courses[selected]}</Badge>
        </div>
        <div className="text-sm text-zinc-600 dark:text-zinc-400">Task progress</div>
      </div>
      <Progress value={progress} className="h-3 rounded-xl" />

      <div className="grid md:grid-cols-3 gap-6">
        {/* Tasks */}
        <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ListTodo className="w-5 h-5" />To‑Dos</CardTitle>
            <CardDescription>Add, complete, delete</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <Label>Title</Label>
              <Input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} className="rounded-xl" placeholder="Assignment, reading, project…" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Due date</Label>
                  <Input type="date" value={taskForm.due} onChange={(e) => setTaskForm({ ...taskForm, due: e.target.value })} className="rounded-xl" />
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                onClick={() => { 
                  if (!taskForm.title) return; 
                  addTask({ ...taskForm, courseIndex: selected }); 
                  setTaskForm({ title: "", due: "", priority: "normal" }); 
                }} 
                className="rounded-xl w-full"
                variant="default">
                <Plus className="w-4 h-4 mr-2" />Add task
              </Button>
            </div>

            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Open</div>
              {courseTasks.filter(t => !t.done).length === 0 && <div className="text-sm text-zinc-500">Nothing pending. Go touch sky ☁️</div>}
              {courseTasks.filter(t => !t.done).map(t => (
                <div key={t.id} className="flex items-center justify-between bg-white/70 dark:bg-white/5 p-3 rounded-xl">
                  <div>
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-zinc-500">due {t.due || "—"} · {t.priority}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="default" 
                      className="rounded-xl" 
                      onClick={() => {
                        toggleTask(t.id);
                        // Check if this was the last incomplete task
                        const incompleteTasks = courseTasks.filter(task => !task.done && task.id !== t.id);
                        if (incompleteTasks.length === 0 && courseTasks.length > 0) {
                          setShowConfetti(true);
                        }
                      }}>
                      Done
                    </Button>
                    <Button size="icon" variant="ghost" className="rounded-xl" onClick={() => deleteTask(t.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}

              {courseTasks.filter(t => t.done).length > 0 && (
                <>
                  <div className="text-xs uppercase tracking-wide text-zinc-500 mt-4">Completed</div>
                  <div className="space-y-2">
                    {courseTasks.filter(t => t.done).map(t => (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={t.id} 
                        className="flex items-center justify-between bg-white/40 dark:bg-white/5 p-3 rounded-xl group"
                      >
                        <div className="flex-1">
                          <div className="line-through group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                            {t.title}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {t.due || "—"} · {t.priority}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" 
                            onClick={() => toggleTask(t.id)}
                            title="Undo"
                          >
                            <Undo className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" 
                            onClick={() => deleteTask(t.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Evaluations */}
        <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarDays className="w-5 h-5" />Upcoming Evals</CardTitle>
            <CardDescription>Your next evaluations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {courseExams.length === 0 && <div className="text-sm text-zinc-500">No upcoming exams yet.</div>}
            <div className="space-y-2 max-h-[420px] overflow-auto">
              {courseExams
                .sort((a, b) => a.date.localeCompare(b.date))
                .map(e => (
                  <div key={e.id} className="flex items-start justify-between bg-white/70 dark:bg-white/5 p-3 rounded-xl">
                    <div>
                      <div className="font-medium">{e.title}</div>
                      <div className="text-xs text-zinc-500">
                        {e.date} · {e.weight}%
                        {e.notes && <div className="mt-1 text-xs italic">{e.notes}</div>}
                      </div>
                    </div>
                    <Badge variant="secondary" className="rounded-full self-start">
                      {(() => {
                        const examDate = new Date(e.date);
                        const today = new Date();
                        const diffTime = examDate - today;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return diffDays <= 0 ? "Today" : 
                               diffDays === 1 ? "Tomorrow" :
                               `${diffDays} days`;
                      })()}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Exams */}
        <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><NotebookPen className="w-5 h-5" />Exams / Evals</CardTitle>
            <CardDescription>Dates, weight, notes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <Label>Title</Label>
              <Input value={examForm.title} onChange={(e) => setExamForm({ ...examForm, title: e.target.value })} className="rounded-xl" placeholder="Midterm, quiz, lab check…" />
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date</Label><Input type="date" value={examForm.date} onChange={(e) => setExamForm({ ...examForm, date: e.target.value })} className="rounded-xl" /></div>
                <div><Label>Weight (%)</Label><Input type="number" value={examForm.weight} onChange={(e) => setExamForm({ ...examForm, weight: Number(e.target.value) })} className="rounded-xl" /></div>
              </div>
              <Label>Notes</Label>
              <Textarea value={examForm.notes} onChange={(e) => setExamForm({ ...examForm, notes: e.target.value })} className="rounded-xl" placeholder="Chapters, topics, allowed materials…" />
              <Button 
                onClick={() => { 
                  if (!examForm.title || !examForm.date) return;
                  if (editingExam) {
                    setExams(s => s.map(e => e.id === editingExam ? { ...examForm, id: e.id, courseIndex: selected } : e));
                    setEditingExam(null);
                  } else {
                    addExam({ ...examForm, courseIndex: selected });
                  }
                  setExamForm({ title: "", date: "", weight: 20, notes: "" }); 
                }} 
                className="rounded-xl w-full"
                style={{
                  backgroundColor: `hsl(var(--accent-h) var(--accent-s) var(--accent-l))`,
                  color: 'white'
                }}>
                <Plus className="w-4 h-4 mr-2" />{editingExam ? 'Update' : 'Add'} exam
              </Button>
              {editingExam && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingExam(null);
                    setExamForm({ title: "", date: "", weight: 20, notes: "" });
                  }} 
                  className="rounded-xl mt-2 w-full">
                  Cancel Edit
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// -----------------------------
// Study Tracker (with Session Tasks)
// -----------------------------
function StudyTracker({ courses, selectedCourse, setSelectedCourse, running, elapsed, start, stop, reset, technique, setTechnique, moodStart, setMoodStart, moodEnd, setMoodEnd, note, setNote, sessions, setSessions, sessionTasks, setSessionTasks }) {
  function deleteSession(id) { setSessions(s => s.filter(x => x.id !== id)); }
  const elapsedMin = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const elapsedSec = (elapsed % 60).toString().padStart(2, '0');

  // Session-only tasks
  const [stTitle, setStTitle] = useState("");
  function addST() { const title = stTitle.trim(); if (!title) return; setSessionTasks(s => [{ id: uid(), title, done: false, createdAt: Date.now() }, ...s]); setStTitle(""); }
  function toggleST(id) { setSessionTasks(s => s.map(t => t.id === id ? { ...t, done: !t.done } : t)); }
  function delST(id) { setSessionTasks(s => s.filter(t => t.id !== id)); }
  function clearDone() { setSessionTasks(s => s.filter(t => !t.done)); }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Focus Timer */}
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5" />Focus Timer</CardTitle>
          <CardDescription>Track study sessions and vibes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Course</Label>
              <Select value={String(selectedCourse)} onValueChange={(v) => setSelectedCourse(Number(v))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{courses.map((c, i) => <SelectItem key={i} value={String(i)}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Technique</Label>
              <Select value={technique} onValueChange={setTechnique}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pomodoro 25/5">Pomodoro 25/5</SelectItem>
                  <SelectItem value="Deep Work 50/10">Deep Work 50/10</SelectItem>
                  <SelectItem value="Flow (no breaks)">Flow (no breaks)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <MoodSlider label="Mood start" value={moodStart} onChange={setMoodStart} />
            <MoodSlider label="Mood end" value={moodEnd} onChange={setMoodEnd} />
          </div>

          <div className="text-center p-6 bg-white/70 dark:bg-white/5 rounded-2xl">
            <div className="text-5xl font-extrabold tracking-wider tabular-nums">{elapsedMin}:{elapsedSec}</div>
            <div className="text-xs text-zinc-500 mt-1">{running ? "Studying…" : "Ready"}</div>
            <div className="flex items-center justify-center gap-2 mt-4">
              {!running ? (
                <Button onClick={start} className="rounded-xl"><Flame className="w-4 h-4 mr-2" />Start</Button>
              ) : (
                <>
                  <Button onClick={stop} variant="secondary" className="rounded-xl"><HeartHandshake className="w-4 h-4 mr-2" />Stop</Button>
                  <Button onClick={reset} variant="ghost" className="rounded-xl"><TimerReset className="w-4 h-4 mr-2" />Reset</Button>
                </>
              )}
            </div>
          </div>

          <div>
            <Label>Session notes</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="rounded-xl" placeholder="What did you cover? Any blockers?" />
          </div>
        </CardContent>
      </Card>

      {/* Session Tasks */}
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ListTodo className="w-5 h-5" />Session Tasks</CardTitle>
          <CardDescription>Tasks just for this study block</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={stTitle} onChange={(e) => setStTitle(e.target.value)} className="rounded-xl" placeholder="Quick task…" />
            <Button onClick={addST} className="rounded-xl"><Plus className="w-4 h-4 mr-1" />Add</Button>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Open</div>
            {sessionTasks.filter(t => !t.done).length === 0 && <div className="text-sm text-zinc-500">Add a couple of tasks to guide this session.</div>}
            {sessionTasks.filter(t => !t.done).map(t => (
              <div key={t.id} className="flex items-center justify-between bg-white/70 dark:bg-white/5 p-3 rounded-xl">
                <div className="font-medium">{t.title}</div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" className="rounded-xl" onClick={() => toggleST(t.id)}>Done</Button>
                  <Button size="icon" variant="ghost" className="rounded-xl" onClick={() => delST(t.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}

            {sessionTasks.filter(t => t.done).length > 0 && <div className="text-xs uppercase tracking-wide text-zinc-500 mt-3">Completed</div>}
            {sessionTasks.filter(t => t.done).map(t => (
              <div key={t.id} className="flex items-center justify-between bg-white/40 dark:bg-white/5 p-3 rounded-xl opacity-70">
                <div className="line-through">{t.title}</div>
                <Button size="icon" variant="ghost" className="rounded-xl" onClick={() => delST(t.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
          </div>
          {sessionTasks.some(t => t.done) && <Button variant="outline" size="sm" onClick={clearDone} className="rounded-xl mt-2">Clear completed</Button>}
        </CardContent>
      </Card>

      {/* Session Log */}
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ListTodo className="w-5 h-5" />Session Log</CardTitle>
          <CardDescription>Your recent sessions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.length === 0 && <div className="text-sm text-zinc-500">No sessions yet. Let's cook. 👨‍🍳</div>}
          <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
            {sessions.map(s => (
              <div key={s.id} className="flex items-start justify-between bg-white/70 dark:bg-white/5 p-3 rounded-xl">
                <div className="flex-1">
                  <div className="font-medium">{courses[s.courseIndex]} · {s.durationMin}m · {s.technique}</div>
                  <div className="text-xs text-zinc-500">{new Date(s.startTs).toLocaleString()} → {new Date(s.endTs).toLocaleString()}</div>
                  {s.note && <div className="text-sm mt-1">{s.note}</div>}
                </div>
                <Button size="icon" variant="ghost" className="rounded-xl" onClick={() => deleteSession(s.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MoodSlider({ label, value, onChange }) {
  const faces = ["💀", "😕", "😐", "🙂", "🔥"];
  return (
    <div>
      <Label>{label} <span className="ml-2">{faces[value - 1]}</span></Label>
      <input type="range" min={1} max={5} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
      <div className="flex justify-between text-xs text-zinc-500"><span>low</span><span>high</span></div>
    </div>
  );
}

// -----------------------------
// Wellness
// -----------------------------
function Wellness() {
  const [water, setWater] = useLocalState("sp:water", 0);
  const [gratitude, setGratitude] = useLocalState("sp:gratitude", "");
  const [breathing, setBreathing] = useState(false);
  return (
    <div className="grid md:grid-cols-3 gap-6">
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader><CardTitle>Hydration</CardTitle><CardDescription>Goal: 8 cups / day</CardDescription></CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Button className="rounded-xl" onClick={() => setWater(w => Math.max(0, w - 1))}>-1</Button>
            <div className="text-4xl font-extrabold tabular-nums">{water}</div>
            <Button className="rounded-xl" onClick={() => setWater(w => Math.min(12, w + 1))}>+1</Button>
          </div>
          <Progress value={(water / 8) * 100} className="mt-4 h-3 rounded-xl" />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader><CardTitle>Gratitude note</CardTitle><CardDescription>Protect your vibe 💖</CardDescription></CardHeader>
        <CardContent><Textarea value={gratitude} onChange={(e) => setGratitude(e.target.value)} className="rounded-xl" placeholder="One thing you're grateful for today…" /></CardContent>
      </Card>

      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader><CardTitle>Breathing box</CardTitle><CardDescription>4 in · 4 hold · 4 out · 4 hold</CardDescription></CardHeader>
        <CardContent>
          <motion.div animate={{ scale: breathing ? [1, 1.2, 1.2, 1, 1] : 1 }} transition={{ duration: 16, repeat: breathing ? Infinity : 0 }} className="w-28 h-28 mx-auto rounded-2xl bg-gradient-to-br from-fuchsia-500 to-sky-500" />
          <Button onClick={() => setBreathing(b => !b)} className="rounded-xl w-full mt-4">{breathing ? 'Stop' : 'Start'}</Button>
        </CardContent>
      </Card>
    </div>
  );
}

// -----------------------------
// Settings
// -----------------------------
function SettingsTab({ courses, renameCourse, soundtrackEmbed, setSoundtrackEmbed, bgImage, setBgImage, gradientStart, setGradientStart, gradientMiddle, setGradientMiddle, gradientEnd, setGradientEnd, darkMode, gradientEnabled, setGradientEnabled, accentColor, setAccentColor, cardOpacity, setCardOpacity, weatherApiKey, setWeatherApiKey, weatherLocation, setWeatherLocation, dataTransfer }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle>Courses</CardTitle>
          <CardDescription>Rename your 6 courses</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {courses.map((c, i) => (
            <div key={i} className="grid grid-cols-[100px_1fr] items-center gap-3">
              <Label>Course {i + 1}</Label>
              <Input defaultValue={c} onBlur={(e) => renameCourse(i, e.target.value)} className="rounded-xl" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle>About</CardTitle>
          <CardDescription>Local-first · Private · Cute af</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
          <div className="space-y-2">
            <p>Everything saves to your browser (localStorage).</p>
            <p>Built with Tailwind, shadcn/ui, lucide icons, framer‑motion, and Recharts.</p>
            <p>Pro tip: pin this tab and live your best study life ✨</p>
          </div>
          <div className="grid gap-2">
            <Button variant="outline" onClick={() => dataTransfer.exportData()} className="w-full rounded-xl">
              <Download className="w-4 h-4 mr-2" />Export Data
            </Button>
            <div className="space-y-2">
              <div className="space-y-2">
                <Button variant="outline" asChild className="w-full rounded-xl">
                  <label>
                    <Input 
                      type="file" 
                      accept=".json"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const success = await dataTransfer.importData(file);
                            if (success) {
                              alert("✨ Data imported successfully!");
                              window.location.reload(); // Refresh to ensure all components update
                            } else {
                              alert("❌ Failed to import data. Please check if the file is valid.");
                            }
                          } catch (error) {
                            alert("❌ Error importing data. Make sure this is a valid StudyHub export file.");
                          }
                          e.target.value = ''; // Reset input
                        }
                      }} 
                      className="hidden"
                    />
                    <span className="flex items-center justify-center gap-2">
                      <Download className="w-4 h-4 rotate-180" />Import Data
                    </span>
                  </label>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle>Soundtrack</CardTitle>
          <CardDescription>Paste an embed URL (Spotify/YouTube)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={soundtrackEmbed} onChange={(e) => setSoundtrackEmbed(e.target.value)} placeholder="https://open.spotify.com/embed/playlist/..." className="rounded-xl" />
          {soundtrackEmbed && (
            <div className="rounded-2xl overflow-hidden">
              <div className="aspect-video">
                <iframe src={soundtrackEmbed} className="w-full h-full" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="Soundtrack preview" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle>Background</CardTitle>
          <CardDescription>Upload a custom wallpaper</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input type="file" accept="image/*" className="rounded-xl" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setBgImage(r.result); r.readAsDataURL(f); }} />
            <Button variant="outline" className="rounded-xl" onClick={() => setBgImage("")}>Clear</Button>
          </div>
          {bgImage && <img src={bgImage} alt="Background preview" className="rounded-xl max-h-40 w-full object-cover" />}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle>Accent Color</CardTitle>
          <CardDescription>Customize the main theme color</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Accent Color {darkMode ? '(Dark Mode)' : '(Light Mode)'}</Label>
            <div className="w-24 h-24 relative mt-2">
              <div 
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(
                    from 0deg,
                    hsl(0, 100%, 50%),
                    hsl(60, 100%, 50%),
                    hsl(120, 100%, 50%),
                    hsl(180, 100%, 50%),
                    hsl(240, 100%, 50%),
                    hsl(300, 100%, 50%),
                    hsl(360, 100%, 50%)
                  )`
                }}
              />
              <div 
                className="absolute inset-1 rounded-full border-4 border-white dark:border-zinc-800"
                style={{ backgroundColor: darkMode ? accentColor.dark : accentColor.light }}
              />
              <label className="block absolute inset-0 rounded-full cursor-pointer">
                <input
                  type="color"
                  value={darkMode ? accentColor.dark : accentColor.light}
                  onChange={(e) => setAccentColor(prev => ({
                    ...prev,
                    [darkMode ? 'dark' : 'light']: e.target.value
                  }))}
                  className="sr-only"
                />
              </label>
            </div>
          </div>
          <Button variant="outline" className="rounded-xl w-full" onClick={() => {
            setAccentColor({
              light: "#7c3aed",
              dark: "#8b5cf6"
            });
          }}>Reset to Default</Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle>Card Opacity</CardTitle>
          <CardDescription>Adjust card transparency for better visibility</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Light Mode Opacity: {cardOpacity.light}%</Label>
            <input
              type="range"
              min="10"
              max="100"
              value={cardOpacity.light}
              onChange={(e) => setCardOpacity(prev => ({
                ...prev,
                light: parseInt(e.target.value)
              }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 mt-2"
            />
          </div>
          <div>
            <Label>Dark Mode Opacity: {cardOpacity.dark}%</Label>
            <input
              type="range"
              min="5"
              max="100"
              value={cardOpacity.dark}
              onChange={(e) => setCardOpacity(prev => ({
                ...prev,
                dark: parseInt(e.target.value)
              }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 mt-2"
            />
          </div>
          <Button variant="outline" className="rounded-xl w-full" onClick={() => {
            setCardOpacity({
              light: 80,
              dark: 25
            });
          }}>Reset to Default</Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle>Background Gradient</CardTitle>
          <CardDescription>Customize the background colors</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 pb-2">
            <Switch
              checked={gradientEnabled}
              onCheckedChange={setGradientEnabled}
            />
            <Label>Enable gradient background</Label>
          </div>

          <div className={gradientEnabled ? "" : "opacity-50 pointer-events-none"}>
            <div>
              <Label>Start Color {darkMode ? '(Dark Mode)' : '(Light Mode)'}</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="w-10 h-10 rounded-lg shadow-inner" style={{ backgroundColor: darkMode ? gradientStart.dark : gradientStart.light }}></div>
                <Input
                  type="color"
                  value={darkMode ? gradientStart.dark : gradientStart.light}
                  onChange={(e) => setGradientStart(prev => ({ ...prev, [darkMode ? 'dark' : 'light']: e.target.value }))}
                  className="h-10 rounded-xl w-full"
                />
              </div>
            </div>
            <div className="mt-4">
              <Label>Middle Color {darkMode ? '(Dark Mode)' : '(Light Mode)'}</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="w-10 h-10 rounded-lg shadow-inner" style={{ backgroundColor: darkMode ? gradientMiddle.dark : gradientMiddle.light }}></div>
                <Input
                  type="color"
                  value={darkMode ? gradientMiddle.dark : gradientMiddle.light}
                  onChange={(e) => setGradientMiddle(prev => ({ ...prev, [darkMode ? 'dark' : 'light']: e.target.value }))}
                  className="h-10 rounded-xl w-full"
                />
              </div>
            </div>
            <div className="mt-4">
              <Label>End Color {darkMode ? '(Dark Mode)' : '(Light Mode)'}</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="w-10 h-10 rounded-lg shadow-inner" style={{ backgroundColor: darkMode ? gradientEnd.dark : gradientEnd.light }}></div>
                <Input
                  type="color"
                  value={darkMode ? gradientEnd.dark : gradientEnd.light}
                  onChange={(e) => setGradientEnd(prev => ({ ...prev, [darkMode ? 'dark' : 'light']: e.target.value }))}
                  className="h-10 rounded-xl w-full"
                />
              </div>
            </div>
            <Button variant="outline" className="rounded-xl w-full mt-4" onClick={() => {
              if (darkMode) {
                setGradientStart(prev => ({ ...prev, dark: "#18181b" }));
                setGradientMiddle(prev => ({ ...prev, dark: "#0f172a" }));
                setGradientEnd(prev => ({ ...prev, dark: "#1e293b" }));
              } else {
                setGradientStart(prev => ({ ...prev, light: "#ffd2e9" }));
                setGradientMiddle(prev => ({ ...prev, light: "#bae6fd" }));
                setGradientEnd(prev => ({ ...prev, light: "#a7f3d0" }));
              }
            }}>Reset to Default</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle>🌤️ Weather API</CardTitle>
          <CardDescription>Get real weather data for your location</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="weather-api-key">OpenWeatherMap API Key</Label>
            <Input
              id="weather-api-key"
              type="password"
              placeholder="Enter your API key here..."
              value={weatherApiKey}
              onChange={(e) => setWeatherApiKey(e.target.value)}
              className="mt-2"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
              Without an API key, weather will be simulated. Get a free key from{' '}
              <a 
                href="https://openweathermap.org/api" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 underline"
              >
                OpenWeatherMap
              </a>
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg text-sm">
            <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">📋 How to get an API key:</p>
            <ol className="text-blue-700 dark:text-blue-300 text-xs space-y-1 ml-4 list-decimal">
              <li>Visit <span className="font-mono">openweathermap.org</span></li>
              <li>Sign up for a free account</li>
              <li>Go to "My API keys" in your account</li>
              <li>Copy your key and paste it above</li>
              <li><strong>Important:</strong> New API keys may take 2-24 hours to activate!</li>
            </ol>
          </div>
          {weatherApiKey && (
            <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
              <p className="text-green-800 dark:text-green-200 text-sm">
                ✅ API key configured! Real weather data will be used.
              </p>
            </div>
          )}
          
          <div className="mt-6 border-t pt-4 border-zinc-200 dark:border-zinc-800">
            <h3 className="text-md font-medium mb-2">Weather Location Settings</h3>
            <div className="flex items-center justify-between mb-3">
              <Label htmlFor="use-geolocation">Use device location</Label>
              <Switch 
                id="use-geolocation"
                checked={weatherLocation.useGeolocation}
                onCheckedChange={(checked) => setWeatherLocation({
                  ...weatherLocation,
                  useGeolocation: checked
                })}
              />
            </div>
            
            <div className={weatherLocation.useGeolocation ? "opacity-50" : ""}>
              <Label htmlFor="city-name">City name</Label>
              <Input
                id="city-name"
                type="text"
                placeholder="Enter city name (e.g., London, Tokyo, New York)"
                value={weatherLocation.city}
                onChange={(e) => setWeatherLocation({
                  ...weatherLocation,
                  city: e.target.value
                })}
                disabled={weatherLocation.useGeolocation}
                className="mt-2"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                {weatherLocation.useGeolocation 
                  ? "Turn off device location to enter a city manually" 
                  : "Enter a city name to get weather for that location"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
