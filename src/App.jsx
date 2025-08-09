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
import { CalendarDays, Clock, Flame, ListTodo, NotebookPen, Plus, Settings, Sparkles, Brain, HeartHandshake, HeartPulse, Target, TimerReset, Download, Trash2, Coffee, Music2, GraduationCap, Undo } from "lucide-react";

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
  task: "bg-amber-500"
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
  const [tasks, setTasks] = useLocalState("sp:tasks", []);           // per-course to-dos
  const [exams, setExams] = useLocalState("sp:exams", []);
  const [sessions, setSessions] = useLocalState("sp:sessions", []);
  const [selectedCourse, setSelectedCourse] = useLocalState("sp:selectedCourse", 0);

  // Data transfer instance for import/export
  const dataTransfer = useMemo(() => new DataTransfer(
    // Get state callback
    () => ({
      sessions,
      exams,
      tasks,
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
      soundtrackEmbed
    }),
    // Set state callback
    (newState) => {
      if (newState.sessions) setSessions(newState.sessions);
      if (newState.exams) setExams(newState.exams);
      if (newState.tasks) setTasks(newState.tasks);
      if (newState.schedule) setSchedule(newState.schedule);
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
    }
  ), []);

  // Theme + cosmetics
  const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [darkMode, setDarkMode] = useLocalState("sp:dark", prefersDark);
  const [soundtrackEmbed, setSoundtrackEmbed] = useLocalState("sp:soundtrackEmbed", "");
  const [bgImage, setBgImage] = useLocalState("sp:bgImage", "");
  const [accentColor, setAccentColor] = useLocalState("sp:accentColor", {
    light: "#7c3aed", // violet-600
    dark: "#8b5cf6"   // violet-500
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
  useLayoutEffect(() => {
    if (document.getElementById('sp-reset')) return;
    const style = document.createElement('style');
    style.id = 'sp-reset';
    style.textContent = `
:root {
  --accent-h: 0;
  --accent-s: 0%;
  --accent-l: 50%;
}
:where(*, *::before, *::after){box-sizing:border-box}
:where(html, body){height:100%}
:where(body){margin:0; line-height:1.5; -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility}
:where(img, picture, video, canvas, svg){display:block; max-width:100%}
:where(input, button, textarea, select){font:inherit}
:where(p, h1, h2, h3, h4, h5, h6){overflow-wrap:break-word}
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
          <TabsList className="flex flex-wrap gap-2 bg-white/70 dark:bg-white/10 backdrop-blur p-2 rounded-2xl shadow-lg">
            <TabsTrigger value="dashboard" className="rounded-xl" style={{"--tab-accent": "hsl(var(--accent-h) var(--accent-s) var(--accent-l))"}}>Dashboard</TabsTrigger>
            <TabsTrigger value="planner" className="rounded-xl" style={{"--tab-accent": "hsl(var(--accent-h) var(--accent-s) var(--accent-l))"}}><CalendarDays className="w-4 h-4 mr-1" />Planner</TabsTrigger>
            <TabsTrigger value="courses" className="rounded-xl" style={{"--tab-accent": "hsl(var(--accent-h) var(--accent-s) var(--accent-l))"}}><NotebookPen className="w-4 h-4 mr-1" />Courses</TabsTrigger>
            <TabsTrigger value="study" className="rounded-xl" style={{"--tab-accent": "hsl(var(--accent-h) var(--accent-s) var(--accent-l))"}}><Brain className="w-4 h-4 mr-1" />Study Tracker</TabsTrigger>
            <TabsTrigger value="wellness" className="rounded-xl" style={{"--tab-accent": "hsl(var(--accent-h) var(--accent-s) var(--accent-l))"}}><HeartPulse className="w-4 h-4 mr-1" />Wellness</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-xl" style={{"--tab-accent": "hsl(var(--accent-h) var(--accent-s) var(--accent-l))"}}><Settings className="w-4 h-4 mr-1" />Settings</TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Flame className="w-5 h-5" />This Week Focus</CardTitle>
                  <CardDescription>Hours by course (this week)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-56 text-zinc-900 dark:text-zinc-100">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyStats.courseData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'currentColor' }} />
                        <YAxis tick={{ fontSize: 12, fill: 'currentColor' }} />
                        <Tooltip />
                        <Bar dataKey="hours" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" />Daily Flow</CardTitle>
                  <CardDescription>Minutes studied by day</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-56 text-zinc-900 dark:text-zinc-100">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weeklyStats.dayData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'currentColor' }} />
                        <YAxis tick={{ fontSize: 12, fill: 'currentColor' }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="minutes" strokeWidth={3} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
                <CardFooter className="text-sm text-zinc-600 dark:text-zinc-400">
                  Total this week: {(weeklyStats.totalMin / 60).toFixed(1)}h · Avg session: {weeklyStats.avgSession}m · Streak: {weeklyStats.streak}d
                </CardFooter>
              </Card>

              <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><CalendarDays className="w-5 h-5" />Next Up</CardTitle>
                  <CardDescription>Upcoming exams & tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Upcoming exams={exams} tasks={tasks} courses={courses} />
                </CardContent>
              </Card>
            </div>

            <SoundtrackCard embed={soundtrackEmbed} />
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
              dataTransfer={dataTransfer}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// -----------------------------
// UI SUBCOMPONENTS
// -----------------------------
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

function SoundtrackCard({ embed }) {
  return (
    <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Music2 className="w-5 h-5" />Soundtrack</CardTitle>
        <CardDescription>Focus with your own vibe</CardDescription>
      </CardHeader>
      <CardContent>
        {embed ? (
          <div className="rounded-2xl overflow-hidden">
            <div className="aspect-video">
              <iframe src={embed} className="w-full h-full" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="Study soundtrack" />
            </div>
          </div>
        ) : (
          <div className="text-sm text-zinc-500">Add an embed URL in <strong>Settings → Soundtrack</strong> (e.g., Spotify/YouTube embed link) and it will show up here.</div>
        )}
      </CardContent>
    </Card>
  );
}

function Upcoming({ exams, tasks, courses }) {
  const upcomingExams = useMemo(() => exams.slice().sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3), [exams]);
  const upcomingTasks = useMemo(() => tasks.slice().filter(t => !t.done).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5), [tasks]);
  return (
    <div className="grid gap-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Exams</div>
        <div className="space-y-2">
          {upcomingExams.length === 0 && <div className="text-sm text-zinc-500">No exams scheduled yet.</div>}
          {upcomingExams.map(e => (
            <div key={e.id} className="flex items-center justify-between bg-white/70 dark:bg-white/5 rounded-xl p-3">
              <div className="flex flex-col">
                <span className="font-medium">{e.title}</span>
                <span className="text-xs text-zinc-500">{courses[e.courseIndex]} · {e.weight || 0}%</span>
              </div>
              <Badge variant="secondary" className="rounded-full">{e.date}</Badge>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Tasks</div>
        <div className="space-y-2">
          {upcomingTasks.length === 0 && <div className="text-sm text-zinc-500">No tasks due soon. Love that for you ✨</div>}
          {upcomingTasks.map(t => (
            <div key={t.id} className="flex items-center justify-between bg-white/70 dark:bg-white/5 rounded-xl p-3">
              <div className="flex flex-col">
                <span className="font-medium">{t.title}</span>
                <span className="text-xs text-zinc-500">{courses[t.courseIndex]} · {t.priority}</span>
              </div>
              <Badge variant="secondary" className="rounded-full">due {t.due}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -----------------------------
// Planner (Week + Month views)
// -----------------------------
function Planner({ courses, onAdd, onRemove, eventsByDay, exams, tasks }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ courseIndex: 0, type: "class", title: "", day: "Mon", start: "10:00", end: "11:30", location: "" });
  const [filterCourse, setFilterCourse] = useState("all");
  const [view, setView] = useState("week");
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
              <div className="font-serif text-2xl md:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r">
                {MONTHS[monthView.month]} {monthView.year}
              </div>
              <Button variant="outline" onClick={() => shiftMonth(1)} className="rounded-xl">Next</Button>
            </div>
          )}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="rounded-xl"><Plus className="w-4 h-4 mr-2" />Add event</Button></DialogTrigger>
          <DialogContent className="rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle>Add to weekly schedule</DialogTitle>
              <DialogDescription>Classes, labs, workshops, assistantships</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <Label>Course</Label>
              <Select value={String(form.courseIndex)} onValueChange={(v) => setForm({ ...form, courseIndex: Number(v) })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{courses.map((c, i) => <SelectItem key={i} value={String(i)}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="class">Class</SelectItem>
                  <SelectItem value="lab">Lab</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="assistantship">Assistantship</SelectItem>
                </SelectContent>
              </Select>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-xl" placeholder="e.g., Lecture, Lab 1" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Day</Label>
                  <Select value={form.day} onValueChange={(v) => setForm({ ...form, day: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Location</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="rounded-xl" placeholder="Room 204" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start</Label><Input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className="rounded-xl" /></div>
                <div><Label>End</Label><Input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className="rounded-xl" /></div>
              </div>
              <Button onClick={() => { onAdd(form); setOpen(false); }} className="rounded-xl mt-2">Add</Button>
            </div>
          </DialogContent>
        </Dialog>
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
        <div className="space-y-3">
          <div className="grid grid-cols-7 gap-2 text-xs uppercase tracking-wide text-zinc-500">
            {DAYS.map(d => <div key={d} className="text-center">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {matrix.map((date, i) => {
              const inMonth = date.getMonth() === monthView.month;
              const today = new Date(); today.setHours(0, 0, 0, 0);
              const isToday = date.toDateString() === today.toDateString();
              const dayName = DAYS[(date.getDay() + 6) % 7];
              const dayEvents = eventsByDay(dayName).filter(e => filterCourse === 'all' || String(e.courseIndex) === filterCourse);
              return (
                <div key={i} className={`rounded-xl p-2 bg-white/70 dark:bg-white/5 backdrop-blur border ${isToday ? 'border-fuchsia-500' : 'border-transparent'} ${inMonth ? '' : 'opacity-50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-serif font-bold">{date.getDate()}</div>
                    {dayEvents.length > 0 && <Badge variant="secondary" className="rounded-full">{dayEvents.length}</Badge>}
                  </div>
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 3).map((e, idx) => (
                      <div key={idx} className="text-[11px] truncate flex items-center gap-1">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${typeColors[e.type]}`}></span>
                        <span>{e.title || e.type}</span>
                      </div>
                    ))}
                    {dayEvents.length > 3 && <div className="text-[11px] text-zinc-500">+{dayEvents.length - 3} more…</div>}
                  </div>
                </div>
              );
            })}
          </div>
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
function SettingsTab({ courses, renameCourse, soundtrackEmbed, setSoundtrackEmbed, bgImage, setBgImage, gradientStart, setGradientStart, gradientMiddle, setGradientMiddle, gradientEnd, setGradientEnd, darkMode, gradientEnabled, setGradientEnabled, accentColor, setAccentColor, dataTransfer }) {
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
    </div>
  );
}
