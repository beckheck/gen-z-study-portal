import MoodSlider from '@/components/MoodSlider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { uid } from '@/lib/utils';
import { Brain, Flame, HeartHandshake, ListTodo, Plus, TimerReset, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function StudyTrackerTab({
  courses,
  selectedCourse,
  setSelectedCourse,
  running,
  elapsed,
  start,
  stop,
  reset,
  technique,
  setTechnique,
  moodStart,
  setMoodStart,
  moodEnd,
  setMoodEnd,
  note,
  setNote,
  sessions,
  setSessions,
  sessionTasks,
  setSessionTasks,
}) {
  function deleteSession(id) {
    setSessions(s => s.filter(x => x.id !== id));
  }
  const elapsedMin = Math.floor(elapsed / 60)
    .toString()
    .padStart(2, '0');
  const elapsedSec = (elapsed % 60).toString().padStart(2, '0');

  // Session-only tasks
  const [stTitle, setStTitle] = useState('');
  function addST() {
    const title = stTitle.trim();
    if (!title) return;
    setSessionTasks(s => [{ id: uid(), title, done: false, createdAt: Date.now() }, ...s]);
    setStTitle('');
  }
  function toggleST(id) {
    setSessionTasks(s => s.map(t => (t.id === id ? { ...t, done: !t.done } : t)));
  }
  function delST(id) {
    setSessionTasks(s => s.filter(t => t.id !== id));
  }
  function clearDone() {
    setSessionTasks(s => s.filter(t => !t.done));
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Focus Timer */}
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Focus Timer
          </CardTitle>
          <CardDescription>Track study sessions and vibes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Course</Label>
              <Select value={String(selectedCourse)} onValueChange={v => setSelectedCourse(Number(v))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Technique</Label>
              <Select value={technique} onValueChange={setTechnique}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
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
            <div className="text-5xl font-extrabold tracking-wider tabular-nums">
              {elapsedMin}:{elapsedSec}
            </div>
            <div className="text-xs text-zinc-500 mt-1">{running ? 'Studying…' : 'Ready'}</div>
            <div className="flex items-center justify-center gap-2 mt-4">
              {!running ? (
                <Button onClick={start} className="rounded-xl">
                  <Flame className="w-4 h-4 mr-2" />
                  Start
                </Button>
              ) : (
                <>
                  <Button onClick={stop} variant="secondary" className="rounded-xl">
                    <HeartHandshake className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                  <Button onClick={reset} variant="ghost" className="rounded-xl">
                    <TimerReset className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </>
              )}
            </div>
          </div>

          <div>
            <Label>Session notes</Label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              className="rounded-xl"
              placeholder="What did you cover? Any blockers?"
            />
          </div>
        </CardContent>
      </Card>

      {/* Session Tasks */}
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="w-5 h-5" />
            Session Tasks
          </CardTitle>
          <CardDescription>Tasks just for this study block</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={stTitle}
              onChange={e => setStTitle(e.target.value)}
              className="rounded-xl"
              placeholder="Quick task…"
            />
            <Button onClick={addST} className="rounded-xl">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Open</div>
            {sessionTasks.filter(t => !t.done).length === 0 && (
              <div className="text-sm text-zinc-500">Add a couple of tasks to guide this session.</div>
            )}
            {sessionTasks
              .filter(t => !t.done)
              .map(t => (
                <div
                  key={t.id}
                  className="flex items-center justify-between bg-white/70 dark:bg-white/5 p-3 rounded-xl"
                >
                  <div className="font-medium">{t.title}</div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" className="rounded-xl" onClick={() => toggleST(t.id)}>
                      Done
                    </Button>
                    <Button size="icon" variant="ghost" className="rounded-xl" onClick={() => delST(t.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

            {sessionTasks.filter(t => t.done).length > 0 && (
              <div className="text-xs uppercase tracking-wide text-zinc-500 mt-3">Completed</div>
            )}
            {sessionTasks
              .filter(t => t.done)
              .map(t => (
                <div
                  key={t.id}
                  className="flex items-center justify-between bg-white/40 dark:bg-white/5 p-3 rounded-xl opacity-70"
                >
                  <div className="line-through">{t.title}</div>
                  <Button size="icon" variant="ghost" className="rounded-xl" onClick={() => delST(t.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
          </div>
          {sessionTasks.some(t => t.done) && (
            <Button variant="outline" size="sm" onClick={clearDone} className="rounded-xl mt-2">
              Clear completed
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Session Log */}
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="w-5 h-5" />
            Session Log
          </CardTitle>
          <CardDescription>Your recent sessions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.length === 0 && <div className="text-sm text-zinc-500">No sessions yet. Let's cook. 👨‍🍳</div>}
          <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
            {sessions.map(s => (
              <div key={s.id} className="flex items-start justify-between bg-white/70 dark:bg-white/5 p-3 rounded-xl">
                <div className="flex-1">
                  <div className="font-medium">
                    {courses[s.courseIndex]} · {s.durationMin}m · {s.technique}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {new Date(s.startTs).toLocaleString()} → {new Date(s.endTs).toLocaleString()}
                  </div>
                  {s.note && <div className="text-sm mt-1">{s.note}</div>}
                </div>
                <Button size="icon" variant="ghost" className="rounded-xl" onClick={() => deleteSession(s.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
