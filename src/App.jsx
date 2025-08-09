import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { CalendarDays, Clock, Flame, ListTodo, NotebookPen, Plus, Settings, Sparkles, Brain, HeartHandshake, HeartPulse, Target, TimerReset, Download, Trash2, Coffee, Music2, GraduationCap } from "lucide-react";

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
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (_) {}
  }, [key, state]);
  return [state, setState];
};

function uid() { return Math.random().toString(36).slice(2, 10); }

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Color chips for schedule types
const typeColors = { class: "bg-violet-500", lab: "bg-emerald-500", workshop: "bg-amber-500", assistantship: "bg-sky-500" };

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
  const csv2 = tricky.map(r => r.map(x => `"${String(x ?? "").replace(/"/g,'""').replace(/[\r\n]+/g, " ")}"`).join(",")).join("\n");
  console.assert(csv2.includes('He said ""hello""'), "CSV quote doubling failed");
  console.assert(!/\nline2/.test(csv2), "CSV fields should not contain raw newlines");

  // 4) Background style helper-like expectation
  const sample = "data:image/png;base64,AAA";
  const style = { backgroundImage: `url(${sample})` };
  console.assert(style.backgroundImage.startsWith("url("), "Background image style should be a CSS url()");

  // 5) Month matrix shape (replicates Planner logic for a known month)
  const y = 2025, m = 0; // Jan 2025
  const first = new Date(y,m,1);
  const offset = (first.getDay()+6)%7; // Mon=0
  const start = new Date(y,m,1 - offset);
  const mat = Array.from({length:42}, (_,i)=> new Date(start.getFullYear(), start.getMonth(), start.getDate()+i));
  console.assert(mat.length === 42, "Month view must have 42 cells");
}

// -----------------------------
// Main App Component
// -----------------------------
export default function StudyPortal() {
  // Core state
  const [courses, setCourses] = useLocalState("sp:courses", DEFAULT_COURSES);
  const [schedule, setSchedule] = useLocalState("sp:schedule", []); // {id, courseIndex, type, title, day, start, end, location}
  const [tasks, setTasks] = useLocalState("sp:tasks", []);           // per-course to-dos
  const [exams, setExams] = useLocalState("sp:exams", []);
  const [sessions, setSessions] = useLocalState("sp:sessions", []);
  const [selectedCourse, setSelectedCourse] = useLocalState("sp:selectedCourse", 0);

  // Theme + cosmetics
  const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [darkMode, setDarkMode] = useLocalState("sp:dark", prefersDark);
  const [soundtrackEmbed, setSoundtrackEmbed] = useLocalState("sp:soundtrackEmbed", "");
  const [bgImage, setBgImage] = useLocalState("sp:bgImage", "");
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

  // Apply theme before paint + minimal reset for consistency
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.remove("light");
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
      root.style.colorScheme = "light";
    }
  }, [darkMode]);
  useLayoutEffect(() => {
    if (document.getElementById('sp-reset')) return;
    const style = document.createElement('style');
    style.id = 'sp-reset';
    style.textContent = `
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
    } catch (_) {}
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
  function startTimer(){ setElapsed(0); startRef.current = Date.now(); setRunning(true); }
  function resetTimer(){ setElapsed(0); startRef.current = Date.now(); }
  function stopTimer(){
    if (!running) return;
    const endTs = Date.now();
    const durationMin = Math.max(1, Math.round(elapsed/60));
    const session = { id: uid(), courseIndex: selectedCourse, startTs: startRef.current, endTs, durationMin, technique, moodStart, moodEnd, note };
    setSessions(s => [session, ...s]);
    setRunning(false); setElapsed(0); startRef.current = null; setNote("");
  }

  // Stats (this week)
  const weeklyStats = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    const day = (now.getDay() + 6) % 7; // Mon=0
    startOfWeek.setDate(now.getDate() - day); startOfWeek.setHours(0,0,0,0);
    const perCourse = Array(courses.length).fill(0), perDay = Array(7).fill(0);
    sessions.forEach(s => { if (s.startTs >= startOfWeek.getTime()) { perCourse[s.courseIndex]+=s.durationMin; const d=(new Date(s.startTs).getDay()+6)%7; perDay[d]+=s.durationMin; } });
    const courseData = perCourse.map((min,i)=>({ name:courses[i], hours:+(min/60).toFixed(2) }));
    const dayData = perDay.map((min,i)=>({ name:DAYS[i], minutes:min }));
    const totalMin = perDay.reduce((a,b)=>a+b,0);
    const avgSession = sessions.length ? Math.round(sessions.reduce((a,b)=>a+b.durationMin,0)/sessions.length) : 0;
    let streak=0; for(let i=6;i>=0;i--){ if(dayData[i].minutes>0) streak++; else if(streak>0) break; }
    return { courseData, dayData, totalMin, avgSession, streak };
  }, [sessions, courses]);

  // Schedule helpers
  function addSchedule(item){ setSchedule(s => [...s, { ...item, id: uid() }]); }
  function removeSchedule(id){ setSchedule(s => s.filter(x => x.id !== id)); }
  function eventsForDay(day){ return schedule.filter(e => e.day === day).sort((a,b)=> a.start.localeCompare(b.start)); }

  // JSON export with settings
  function exportJSON(){
    const data = {
      // Core data
      sessions: sessions.map(s => ({
        type: "session",
        course: courses[s.courseIndex],
        startTs: new Date(s.startTs).toISOString(),
        endTs: new Date(s.endTs).toISOString(),
        durationMin: s.durationMin,
        technique: s.technique,
        moodStart: s.moodStart,
        moodEnd: s.moodEnd,
        note: (s.note || "").replace(/[\r\n]+/g, " ")
      })),
      exams: exams.map(e => ({
        type: "exam",
        course: courses[e.courseIndex],
        title: e.title,
        date: e.date,
        weight: e.weight,
        notes: (e.notes || "").replace(/[\r\n]+/g, " ")
      })),
      tasks: tasks.map(t => ({
        type: "task",
        course: courses[t.courseIndex],
        title: t.title,
        due: t.due,
        priority: t.priority,
        done: t.done
      })),
      schedule: schedule.map(e => ({
        type: "schedule",
        course: courses[e.courseIndex],
        title: e.title,
        day: e.day,
        start: e.start,
        end: e.end,
        location: e.location
      })),
      sessionTasks: sessionTasks,
      
      // Settings
      settings: {
        courses: courses,
        selectedCourse: selectedCourse,
        darkMode: darkMode,
        gradient: {
          enabled: gradientEnabled,
          start: gradientStart,
          middle: gradientMiddle,
          end: gradientEnd
        },
        bgImage: bgImage,
        soundtrackEmbed: soundtrackEmbed
      }
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'study_portal_export.json'; a.click();
    URL.revokeObjectURL(url);
  }

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
        <motion.header initial={{opacity:0, y:-12}} animate={{opacity:1, y:0}} className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-white/70 dark:bg-white/10 backdrop-blur shadow-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                StudyHub ✨ — <span className="text-fuchsia-600 dark:text-fuchsia-400">Gen Z</span> Portal
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Plan smarter. Study deeper. Protect your vibe.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={exportJSON} className="rounded-xl"><Download className="w-4 h-4 mr-2"/>Export JSON</Button>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/70 dark:bg-white/10 backdrop-blur">
              <MoonSunToggle checked={darkMode} onCheckedChange={setDarkMode} />
            </div>
          </div>
        </motion.header>

        {/* Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="flex flex-wrap gap-2 bg-white/70 dark:bg-white/10 backdrop-blur p-2 rounded-2xl shadow-lg">
            <TabsTrigger value="dashboard" className="rounded-xl">Dashboard</TabsTrigger>
            <TabsTrigger value="planner" className="rounded-xl"><CalendarDays className="w-4 h-4 mr-1"/>Planner</TabsTrigger>
            <TabsTrigger value="courses" className="rounded-xl"><NotebookPen className="w-4 h-4 mr-1"/>Courses</TabsTrigger>
            <TabsTrigger value="study" className="rounded-xl"><Brain className="w-4 h-4 mr-1"/>Study Tracker</TabsTrigger>
            <TabsTrigger value="wellness" className="rounded-xl"><HeartPulse className="w-4 h-4 mr-1"/>Wellness</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-xl"><Settings className="w-4 h-4 mr-1"/>Settings</TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Flame className="w-5 h-5"/>This Week Focus</CardTitle>
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
                        <Bar dataKey="hours" radius={[8,8,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5"/>Daily Flow</CardTitle>
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
                  Total this week: {(weeklyStats.totalMin/60).toFixed(1)}h · Avg session: {weeklyStats.avgSession}m · Streak: {weeklyStats.streak}d
                </CardFooter>
              </Card>

              <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><CalendarDays className="w-5 h-5"/>Next Up</CardTitle>
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
            />
          </TabsContent>

          {/* Courses */}
          <TabsContent value="courses">
            <CourseManager
              courses={courses}
              selected={selectedCourse}
              setSelected={setSelectedCourse}
              tasks={tasks}
              addTask={(t)=> setTasks(s=> [{...t, id: uid(), done:false}, ...s])}
              toggleTask={(id)=> setTasks(s=> s.map(t=> t.id===id? {...t, done:!t.done}: t))}
              deleteTask={(id)=> setTasks(s=> s.filter(t=> t.id!==id))}
              exams={exams}
              addExam={(e)=> setExams(s=> [{...e, id: uid()}, ...s])}
              deleteExam={(id)=> setExams(s=> s.filter(e=> e.id!==id))}
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
              renameCourse={(i,name)=> setCourses(arr=> arr.map((c,idx)=> idx===i? (name||`Course ${i+1}`): c))}
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
function MoonSunToggle({ checked, onCheckedChange }){
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs">🌞</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
      <span className="text-xs">🌚</span>
    </div>
  );
}

function TipsRow(){
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {[
        { icon:<Target className="w-5 h-5"/>, title:"Micro-goals", tip:"Break big tasks into 25–45 min sprints. Reward tiny wins." },
        { icon:<Coffee className="w-5 h-5"/>, title:"Break hygiene", tip:"5–10 min off-screen breaks every hour. Hydrate + stretch." },
        { icon:<Music2 className="w-5 h-5"/>, title:"Soundtrack", tip:"Lo-fi beats or brown noise can boost focus." },
      ].map((t,i)=> (
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

function SoundtrackCard({ embed }){
  return (
    <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Music2 className="w-5 h-5"/>Soundtrack</CardTitle>
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

function Upcoming({ exams, tasks, courses }){
  const upcomingExams = useMemo(()=> exams.slice().sort((a,b)=> a.date.localeCompare(b.date)).slice(0,3), [exams]);
  const upcomingTasks = useMemo(()=> tasks.slice().filter(t=>!t.done).sort((a,b)=> a.due.localeCompare(b.due)).slice(0,5), [tasks]);
  return (
    <div className="grid gap-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Exams</div>
        <div className="space-y-2">
          {upcomingExams.length===0 && <div className="text-sm text-zinc-500">No exams scheduled yet.</div>}
          {upcomingExams.map(e=> (
            <div key={e.id} className="flex items-center justify-between bg-white/70 dark:bg-white/5 rounded-xl p-3">
              <div className="flex flex-col">
                <span className="font-medium">{e.title}</span>
                <span className="text-xs text-zinc-500">{courses[e.courseIndex]} · {e.weight||0}%</span>
              </div>
              <Badge variant="secondary" className="rounded-full">{e.date}</Badge>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Tasks</div>
        <div className="space-y-2">
          {upcomingTasks.length===0 && <div className="text-sm text-zinc-500">No tasks due soon. Love that for you ✨</div>}
          {upcomingTasks.map(t=> (
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
function Planner({ courses, onAdd, onRemove, eventsByDay }){
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ courseIndex:0, type:"class", title:"", day:"Mon", start:"10:00", end:"11:30", location:"" });
  const [filterCourse, setFilterCourse] = useState("all");
  const [view, setView] = useState("week");

  // Month data
  const now = new Date();
  const [monthView, setMonthView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  function monthMatrix(y,m){
    const first = new Date(y,m,1);
    const offset = (first.getDay()+6)%7; // Mon=0
    const start = new Date(y,m,1 - offset);
    return Array.from({length:42}, (_,i)=> new Date(start.getFullYear(), start.getMonth(), start.getDate()+i));
  }
  const matrix = useMemo(()=> monthMatrix(monthView.year, monthView.month), [monthView]);
  function shiftMonth(delta){ const d=new Date(monthView.year, monthView.month+delta, 1); setMonthView({year:d.getFullYear(), month:d.getMonth()}); }

  // Weekly dates (show numbered days on headers)
  const startOfWeek = useMemo(()=> { const d=new Date(); const w=(d.getDay()+6)%7; d.setDate(d.getDate()-w); d.setHours(0,0,0,0); return d; }, []);
  function dayNumOfWeek(i){ const d=new Date(startOfWeek); d.setDate(startOfWeek.getDate()+i); return d.getDate(); }

  // Helper: events for weekday name (Mon..Sun), filtered & sorted
  function eventsForWeekdayName(dayName){
    return eventsByDay(dayName).filter(e=> filterCourse==='all' || String(e.courseIndex)===filterCourse);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={filterCourse} onValueChange={setFilterCourse}>
            <SelectTrigger className="w-48 rounded-xl"><SelectValue placeholder="Filter course" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All courses</SelectItem>
              {courses.map((c,i)=> <SelectItem key={i} value={String(i)}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={view==='week'? 'default':'outline'} onClick={()=>setView('week')} className="rounded-xl">Week</Button>
          <Button variant={view==='month'? 'default':'outline'} onClick={()=>setView('month')} className="rounded-xl">Month</Button>
          {view==='month' && (
            <div className="flex items-center gap-2 ml-2">
              <Button variant="outline" onClick={()=>shiftMonth(-1)} className="rounded-xl">Prev</Button>
              <div className="font-serif text-2xl md:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-600 to-sky-500">
                {MONTHS[monthView.month]} {monthView.year}
              </div>
              <Button variant="outline" onClick={()=>shiftMonth(1)} className="rounded-xl">Next</Button>
            </div>
          )}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="rounded-xl"><Plus className="w-4 h-4 mr-2"/>Add event</Button></DialogTrigger>
          <DialogContent className="rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle>Add to weekly schedule</DialogTitle>
              <DialogDescription>Classes, labs, workshops, assistantships</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <Label>Course</Label>
              <Select value={String(form.courseIndex)} onValueChange={(v)=>setForm({...form, courseIndex:Number(v)})}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{courses.map((c,i)=> <SelectItem key={i} value={String(i)}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v)=>setForm({...form, type:v})}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="class">Class</SelectItem>
                  <SelectItem value="lab">Lab</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="assistantship">Assistantship</SelectItem>
                </SelectContent>
              </Select>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e)=>setForm({...form, title:e.target.value})} className="rounded-xl" placeholder="e.g., Lecture, Lab 1"/>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Day</Label>
                  <Select value={form.day} onValueChange={(v)=>setForm({...form, day:v})}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>{DAYS.map(d=> <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Location</Label>
                  <Input value={form.location} onChange={(e)=>setForm({...form, location:e.target.value})} className="rounded-xl" placeholder="Room 204"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start</Label><Input type="time" value={form.start} onChange={(e)=>setForm({...form, start:e.target.value})} className="rounded-xl"/></div>
                <div><Label>End</Label><Input type="time" value={form.end} onChange={(e)=>setForm({...form, end:e.target.value})} className="rounded-xl"/></div>
              </div>
              <Button onClick={()=>{ onAdd(form); setOpen(false); }} className="rounded-xl mt-2">Add</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Views */}
      {view==='week' ? (
        <div className="grid grid-cols-7 gap-4">
          {DAYS.map((d,idx)=> (
            <Card key={d} className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {d} <span className="ml-2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/80 dark:bg-white/5 text-sm">{dayNumOfWeek(idx)}</span>
                  <Badge variant="secondary" className="ml-2 rounded-full">{eventsForWeekdayName(d).length}</Badge>
                </CardTitle>
                <CardDescription>Events</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {eventsForWeekdayName(d).map(e=> (
                  <div key={e.id} className="flex items-start justify-between gap-2 bg-white/70 dark:bg-white/5 p-3 rounded-xl">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${typeColors[e.type]}`}></span>
                        <span className="font-medium">{e.title || e.type}</span>
                      </div>
                      <div className="text-xs text-zinc-500">{e.start}–{e.end} · {courses[e.courseIndex]} · {e.location}</div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={()=>onRemove(e.id)} className="rounded-xl"><Trash2 className="w-4 h-4"/></Button>
                  </div>
                ))}
                {eventsForWeekdayName(d).length===0 && <div className="text-sm text-zinc-500">No events.</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-7 gap-2 text-xs uppercase tracking-wide text-zinc-500">
            {DAYS.map(d=> <div key={d} className="text-center">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {matrix.map((date,i)=> {
              const inMonth = date.getMonth()===monthView.month;
              const today = new Date(); today.setHours(0,0,0,0);
              const isToday = date.toDateString()===today.toDateString();
              const dayName = DAYS[(date.getDay()+6)%7];
              const dayEvents = eventsByDay(dayName).filter(e=> filterCourse==='all' || String(e.courseIndex)===filterCourse);
              return (
                <div key={i} className={`rounded-xl p-2 bg-white/70 dark:bg-white/5 backdrop-blur border ${isToday? 'border-fuchsia-500':'border-transparent'} ${inMonth? '':'opacity-50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-serif font-bold">{date.getDate()}</div>
                    {dayEvents.length>0 && <Badge variant="secondary" className="rounded-full">{dayEvents.length}</Badge>}
                  </div>
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0,3).map((e,idx)=> (
                      <div key={idx} className="text-[11px] truncate flex items-center gap-1">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${typeColors[e.type]}`}></span>
                        <span>{e.title || e.type}</span>
                      </div>
                    ))}
                    {dayEvents.length>3 && <div className="text-[11px] text-zinc-500">+{dayEvents.length-3} more…</div>}
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
function CourseManager({ courses, selected, setSelected, tasks, addTask, toggleTask, deleteTask, exams, addExam, deleteExam }){
  const [taskForm, setTaskForm] = useState({ title:"", due:"", priority:"normal" });
  const [examForm, setExamForm] = useState({ title:"", date:"", weight:20, notes:"" });
  const courseTasks = tasks.filter(t=> t.courseIndex===selected);
  const courseExams = exams.filter(e=> e.courseIndex===selected);
  const progress = useMemo(()=> { const d=courseTasks.filter(t=>t.done).length; const tot=courseTasks.length||1; return Math.round((d/tot)*100); }, [courseTasks]);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={String(selected)} onValueChange={(v)=>setSelected(Number(v))}>
            <SelectTrigger className="w-56 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{courses.map((c,i)=> <SelectItem key={i} value={String(i)}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Badge variant="secondary" className="rounded-full"><GraduationCap className="w-3 h-3 mr-1"/>{courses[selected]}</Badge>
        </div>
        <div className="text-sm text-zinc-600 dark:text-zinc-400">Task progress</div>
      </div>
      <Progress value={progress} className="h-3 rounded-xl"/>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Tasks */}
        <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ListTodo className="w-5 h-5"/>To‑Dos</CardTitle>
            <CardDescription>Add, complete, delete</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <Label>Title</Label>
              <Input value={taskForm.title} onChange={(e)=>setTaskForm({...taskForm, title:e.target.value})} className="rounded-xl" placeholder="Assignment, reading, project…"/>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Due date</Label>
                  <Input type="date" value={taskForm.due} onChange={(e)=>setTaskForm({...taskForm, due:e.target.value})} className="rounded-xl"/>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={taskForm.priority} onValueChange={(v)=>setTaskForm({...taskForm, priority:v})}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={()=>{ if(!taskForm.title) return; addTask({ ...taskForm, courseIndex: selected }); setTaskForm({ title:"", due:"", priority:"normal" }); }} className="rounded-xl"><Plus className="w-4 h-4 mr-2"/>Add task</Button>
            </div>

            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Open</div>
              {courseTasks.filter(t=>!t.done).length===0 && <div className="text-sm text-zinc-500">Nothing pending. Go touch sky ☁️</div>}
              {courseTasks.filter(t=>!t.done).map(t=> (
                <div key={t.id} className="flex items-center justify-between bg-white/70 dark:bg-white/5 p-3 rounded-xl">
                  <div>
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-zinc-500">due {t.due||"—"} · {t.priority}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" className="rounded-xl" onClick={()=>toggleTask(t.id)}>Done</Button>
                    <Button size="icon" variant="ghost" className="rounded-xl" onClick={()=>deleteTask(t.id)}><Trash2 className="w-4 h-4"/></Button>
                  </div>
                </div>
              ))}

              {courseTasks.filter(t=>t.done).length>0 && <div className="text-xs uppercase tracking-wide text-zinc-500 mt-4">Completed</div>}
              {courseTasks.filter(t=>t.done).map(t=> (
                <div key={t.id} className="flex items-center justify-between bg-white/40 dark:bg-white/5 p-3 rounded-xl opacity-70">
                  <div>
                    <div className="line-through">{t.title}</div>
                    <div className="text-xs text-zinc-500">{t.due||"—"}</div>
                  </div>
                  <Button size="icon" variant="ghost" className="rounded-xl" onClick={()=>deleteTask(t.id)}><Trash2 className="w-4 h-4"/></Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Exams */}
        <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><NotebookPen className="w-5 h-5"/>Exams / Evals</CardTitle>
            <CardDescription>Dates, weight, notes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <Label>Title</Label>
              <Input value={examForm.title} onChange={(e)=>setExamForm({...examForm, title:e.target.value})} className="rounded-xl" placeholder="Midterm, quiz, lab check…"/>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date</Label><Input type="date" value={examForm.date} onChange={(e)=>setExamForm({...examForm, date:e.target.value})} className="rounded-xl"/></div>
                <div><Label>Weight (%)</Label><Input type="number" value={examForm.weight} onChange={(e)=>setExamForm({...examForm, weight:Number(e.target.value)})} className="rounded-xl"/></div>
              </div>
              <Label>Notes</Label>
              <Textarea value={examForm.notes} onChange={(e)=>setExamForm({...examForm, notes:e.target.value})} className="rounded-xl" placeholder="Chapters, topics, allowed materials…"/>
              <Button onClick={()=>{ if(!examForm.title || !examForm.date) return; addExam({ ...examForm, courseIndex: selected }); setExamForm({ title:"", date:"", weight:20, notes:"" }); }} className="rounded-xl"><Plus className="w-4 h-4 mr-2"/>Add exam</Button>
            </div>

            <div className="space-y-2">
              {courseExams.length===0 && <div className="text-sm text-zinc-500">No upcoming exams yet.</div>}
              {courseExams.sort((a,b)=> a.date.localeCompare(b.date)).map(e=> (
                <div key={e.id} className="flex items-start justify-between bg-white/70 dark:bg-white/5 p-3 rounded-xl">
                  <div>
                    <div className="font-medium">{e.title} <span className="text-xs text-zinc-500">{e.weight}%</span></div>
                    <div className="text-xs text-zinc-500">{e.date} · {e.notes||""}</div>
                  </div>
                  <Button size="icon" variant="ghost" className="rounded-xl" onClick={()=>deleteExam(e.id)}><Trash2 className="w-4 h-4"/></Button>
                </div>
              ))}
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
function StudyTracker({ courses, selectedCourse, setSelectedCourse, running, elapsed, start, stop, reset, technique, setTechnique, moodStart, setMoodStart, moodEnd, setMoodEnd, note, setNote, sessions, setSessions, sessionTasks, setSessionTasks }){
  function deleteSession(id){ setSessions(s=> s.filter(x=> x.id!==id)); }
  const elapsedMin = Math.floor(elapsed/60).toString().padStart(2,'0');
  const elapsedSec = (elapsed%60).toString().padStart(2,'0');

  // Session-only tasks
  const [stTitle, setStTitle] = useState("");
  function addST(){ const title=stTitle.trim(); if(!title) return; setSessionTasks(s=> [{id:uid(), title, done:false, createdAt:Date.now()}, ...s]); setStTitle(""); }
  function toggleST(id){ setSessionTasks(s=> s.map(t=> t.id===id? {...t, done:!t.done}: t)); }
  function delST(id){ setSessionTasks(s=> s.filter(t=> t.id!==id)); }
  function clearDone(){ setSessionTasks(s=> s.filter(t=> !t.done)); }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Focus Timer */}
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5"/>Focus Timer</CardTitle>
          <CardDescription>Track study sessions and vibes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Course</Label>
              <Select value={String(selectedCourse)} onValueChange={(v)=>setSelectedCourse(Number(v))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{courses.map((c,i)=> <SelectItem key={i} value={String(i)}>{c}</SelectItem>)}</SelectContent>
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
                <Button onClick={start} className="rounded-xl"><Flame className="w-4 h-4 mr-2"/>Start</Button>
              ) : (
                <>
                  <Button onClick={stop} variant="secondary" className="rounded-xl"><HeartHandshake className="w-4 h-4 mr-2"/>Stop</Button>
                  <Button onClick={reset} variant="ghost" className="rounded-xl"><TimerReset className="w-4 h-4 mr-2"/>Reset</Button>
                </>
              )}
            </div>
          </div>

          <div>
            <Label>Session notes</Label>
            <Textarea value={note} onChange={(e)=>setNote(e.target.value)} className="rounded-xl" placeholder="What did you cover? Any blockers?"/>
          </div>
        </CardContent>
      </Card>

      {/* Session Tasks */}
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ListTodo className="w-5 h-5"/>Session Tasks</CardTitle>
          <CardDescription>Tasks just for this study block</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={stTitle} onChange={(e)=>setStTitle(e.target.value)} className="rounded-xl" placeholder="Quick task…"/>
            <Button onClick={addST} className="rounded-xl"><Plus className="w-4 h-4 mr-1"/>Add</Button>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Open</div>
            {sessionTasks.filter(t=>!t.done).length===0 && <div className="text-sm text-zinc-500">Add a couple of tasks to guide this session.</div>}
            {sessionTasks.filter(t=>!t.done).map(t=> (
              <div key={t.id} className="flex items-center justify-between bg-white/70 dark:bg-white/5 p-3 rounded-xl">
                <div className="font-medium">{t.title}</div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" className="rounded-xl" onClick={()=>toggleST(t.id)}>Done</Button>
                  <Button size="icon" variant="ghost" className="rounded-xl" onClick={()=>delST(t.id)}><Trash2 className="w-4 h-4"/></Button>
                </div>
              </div>
            ))}

            {sessionTasks.filter(t=>t.done).length>0 && <div className="text-xs uppercase tracking-wide text-zinc-500 mt-3">Completed</div>}
            {sessionTasks.filter(t=>t.done).map(t=> (
              <div key={t.id} className="flex items-center justify-between bg-white/40 dark:bg-white/5 p-3 rounded-xl opacity-70">
                <div className="line-through">{t.title}</div>
                <Button size="icon" variant="ghost" className="rounded-xl" onClick={()=>delST(t.id)}><Trash2 className="w-4 h-4"/></Button>
              </div>
            ))}
          </div>
          {sessionTasks.some(t=>t.done) && <Button variant="outline" size="sm" onClick={clearDone} className="rounded-xl mt-2">Clear completed</Button>}
        </CardContent>
      </Card>

      {/* Session Log */}
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ListTodo className="w-5 h-5"/>Session Log</CardTitle>
          <CardDescription>Your recent sessions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.length===0 && <div className="text-sm text-zinc-500">No sessions yet. Let's cook. 👨‍🍳</div>}
          <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
            {sessions.map(s=> (
              <div key={s.id} className="flex items-start justify-between bg-white/70 dark:bg-white/5 p-3 rounded-xl">
                <div className="flex-1">
                  <div className="font-medium">{courses[s.courseIndex]} · {s.durationMin}m · {s.technique}</div>
                  <div className="text-xs text-zinc-500">{new Date(s.startTs).toLocaleString()} → {new Date(s.endTs).toLocaleString()}</div>
                  {s.note && <div className="text-sm mt-1">{s.note}</div>}
                </div>
                <Button size="icon" variant="ghost" className="rounded-xl" onClick={()=>deleteSession(s.id)}><Trash2 className="w-4 h-4"/></Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MoodSlider({ label, value, onChange }){
  const faces=["💀","😕","😐","🙂","🔥"];
  return (
    <div>
      <Label>{label} <span className="ml-2">{faces[value-1]}</span></Label>
      <input type="range" min={1} max={5} value={value} onChange={(e)=>onChange(Number(e.target.value))} className="w-full"/>
      <div className="flex justify-between text-xs text-zinc-500"><span>low</span><span>high</span></div>
    </div>
  );
}

// -----------------------------
// Wellness
// -----------------------------
function Wellness(){
  const [water, setWater] = useLocalState("sp:water", 0);
  const [gratitude, setGratitude] = useLocalState("sp:gratitude", "");
  const [breathing, setBreathing] = useState(false);
  return (
    <div className="grid md:grid-cols-3 gap-6">
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader><CardTitle>Hydration</CardTitle><CardDescription>Goal: 8 cups / day</CardDescription></CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Button className="rounded-xl" onClick={()=>setWater(w=>Math.max(0,w-1))}>-1</Button>
            <div className="text-4xl font-extrabold tabular-nums">{water}</div>
            <Button className="rounded-xl" onClick={()=>setWater(w=>Math.min(12,w+1))}>+1</Button>
          </div>
          <Progress value={(water/8)*100} className="mt-4 h-3 rounded-xl"/>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader><CardTitle>Gratitude note</CardTitle><CardDescription>Protect your vibe 💖</CardDescription></CardHeader>
        <CardContent><Textarea value={gratitude} onChange={(e)=>setGratitude(e.target.value)} className="rounded-xl" placeholder="One thing you're grateful for today…"/></CardContent>
      </Card>

      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader><CardTitle>Breathing box</CardTitle><CardDescription>4 in · 4 hold · 4 out · 4 hold</CardDescription></CardHeader>
        <CardContent>
          <motion.div animate={{ scale: breathing ? [1,1.2,1.2,1,1] : 1 }} transition={{ duration: 16, repeat: breathing ? Infinity : 0 }} className="w-28 h-28 mx-auto rounded-2xl bg-gradient-to-br from-fuchsia-500 to-sky-500"/>
          <Button onClick={()=>setBreathing(b=>!b)} className="rounded-xl w-full mt-4">{breathing? 'Stop':'Start'}</Button>
        </CardContent>
      </Card>
    </div>
  );
}

// -----------------------------
// Settings
// -----------------------------
function SettingsTab({ courses, renameCourse, soundtrackEmbed, setSoundtrackEmbed, bgImage, setBgImage, gradientStart, setGradientStart, gradientMiddle, setGradientMiddle, gradientEnd, setGradientEnd, darkMode, gradientEnabled, setGradientEnabled }){
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle>Courses</CardTitle>
          <CardDescription>Rename your 6 courses</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {courses.map((c,i)=> (
            <div key={i} className="grid grid-cols-[100px_1fr] items-center gap-3">
              <Label>Course {i+1}</Label>
              <Input defaultValue={c} onBlur={(e)=>renameCourse(i, e.target.value)} className="rounded-xl"/>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle>About</CardTitle>
          <CardDescription>Local-first · Private · Cute af</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <p>Everything saves to your browser (localStorage). Export CSV anytime from the header.</p>
          <p>Built with Tailwind, shadcn/ui, lucide icons, framer‑motion, and Recharts.</p>
          <p>Pro tip: pin this tab and live your best study life ✨</p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle>Soundtrack</CardTitle>
          <CardDescription>Paste an embed URL (Spotify/YouTube)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={soundtrackEmbed} onChange={(e)=>setSoundtrackEmbed(e.target.value)} placeholder="https://open.spotify.com/embed/playlist/..." className="rounded-xl"/>
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
            <Input type="file" accept="image/*" className="rounded-xl" onChange={(e)=>{ const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=> setBgImage(r.result); r.readAsDataURL(f); }} />
            <Button variant="outline" className="rounded-xl" onClick={()=>setBgImage("")}>Clear</Button>
          </div>
          {bgImage && <img src={bgImage} alt="Background preview" className="rounded-xl max-h-40 w-full object-cover"/>}
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
              className="data-[state=checked]:bg-fuchsia-600"
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
