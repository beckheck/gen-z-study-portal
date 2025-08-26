import MoodSlider from '@/components/MoodSlider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useCourses, useStudySessions } from '@/hooks/useStore';
import useStudyTimer from '@/hooks/useStudyTimer';
import { Brain, Flame, HeartHandshake, ListTodo, Plus, TimerReset, Trash2, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function StudyTrackerTab() {
  // Translation hooks
  const { t } = useTranslation('tracker');
  const { t: tCommon } = useTranslation('common');
  const { courses, selectedCourseId, getCourseTitle, setSelectedCourse } = useCourses();
  const {
    sessions,
    sessionTasks,
    addSession,
    deleteSession,
    addSessionTask,
    toggleSessionTask,
    deleteSessionTask,
    clearCompletedSessionTasks,
  } = useStudySessions();

  // Study timer with session completion callback
  const studyTimer = useStudyTimer(session => {
    addSession(session);
  }, selectedCourseId);
  const { timerState } = studyTimer;

  const elapsedMin = Math.floor(timerState.elapsed / 60)
    .toString()
    .padStart(2, '0');
  const elapsedSec = (timerState.elapsed % 60).toString().padStart(2, '0');
  const elapsedMinSec = `${elapsedMin}:${elapsedSec}`;

  // Session-only tasks
  const [sessionTaskTitle, setSessionTaskTitle] = useState<string>('');

  /**
   * Add a new session task
   */
  const addSessionTaskAndClearInput = useCallback((): void => {
    const title = sessionTaskTitle.trim();
    if (!title) return;
    addSessionTask(title);
    setSessionTaskTitle('');
  }, [sessionTaskTitle, addSessionTask]);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Focus Timer */}
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            {t('focusTimer.title')}
          </CardTitle>
          <CardDescription>{t('focusTimer.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>{t('focusTimer.course')}</Label>
              <Select value={selectedCourseId} onValueChange={v => setSelectedCourse(v)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('focusTimer.technique')}</Label>
              <Select value={timerState.technique} onValueChange={studyTimer.setTechnique}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pomodoro 25/5">{t('focusTimer.techniques.pomodoro')}</SelectItem>
                  <SelectItem value="Deep Work 50/10">{t('focusTimer.techniques.deepWork')}</SelectItem>
                  <SelectItem value="Flow (no breaks)">{t('focusTimer.techniques.flow')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <MoodSlider
              label={t('focusTimer.moodStart')}
              value={timerState.moodStart}
              onChange={studyTimer.setMoodStart}
            />
            <MoodSlider label={t('focusTimer.moodEnd')} value={timerState.moodEnd} onChange={studyTimer.setMoodEnd} />
          </div>

          <div className="text-center p-6 bg-white/70 dark:bg-white/5 rounded-2xl">
            <div className="text-5xl font-extrabold tracking-wider tabular-nums">{elapsedMinSec}</div>
            <div className="text-xs text-zinc-500 mt-1">
              {timerState.running ? t('focusTimer.status.studying') : t('focusTimer.status.ready')}
            </div>
            <div className="flex items-center justify-center gap-2 mt-4">
              {!timerState.running ? (
                <Button onClick={studyTimer.startTimer} className="rounded-xl">
                  <Flame className="w-4 h-4 mr-2" />
                  {t('focusTimer.buttons.start')}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => studyTimer.stopTimer(selectedCourseId)}
                    variant="secondary"
                    className="rounded-xl"
                  >
                    <HeartHandshake className="w-4 h-4 mr-2" />
                    {t('focusTimer.buttons.stop')}
                  </Button>
                  <Button onClick={studyTimer.resetTimer} variant="ghost" className="rounded-xl">
                    <TimerReset className="w-4 h-4 mr-2" />
                    {t('focusTimer.buttons.reset')}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div>
            <Label>{t('focusTimer.sessionNotes')}</Label>
            <Textarea
              value={timerState.note}
              onChange={e => studyTimer.setNote(e.target.value)}
              className="rounded-xl"
              placeholder={t('focusTimer.notesPlaceholder')}
            />
          </div>

          {/* Audio Settings */}
          <div className="bg-white/50 dark:bg-white/5 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {timerState.audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <Label className="text-sm font-medium">{t('focusTimer.audio.notifications')}</Label>
              </div>
              <Switch checked={timerState.audioEnabled} onCheckedChange={studyTimer.setAudioEnabled} />
            </div>

            {timerState.audioEnabled && (
              <div className="space-y-2">
                <Label className="text-xs text-zinc-500 uppercase tracking-wide">{t('focusTimer.audio.volume')}</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={timerState.audioVolume}
                    onChange={e => studyTimer.setAudioVolume(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-white/70 dark:bg-white/10 rounded-lg appearance-none slider"
                  />
                  <span className="text-sm text-zinc-500 min-w-[3rem]">
                    {Math.round(timerState.audioVolume * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Session Tasks */}
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="w-5 h-5" />
            {t('sessionTasks.title')}
          </CardTitle>
          <CardDescription>{t('sessionTasks.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={sessionTaskTitle}
              onChange={e => setSessionTaskTitle(e.target.value)}
              className="rounded-xl"
              placeholder={t('sessionTasks.placeholder')}
            />
            <Button onClick={addSessionTaskAndClearInput} className="rounded-xl">
              <Plus className="w-4 h-4 mr-1" />
              {tCommon('actions.add')}
            </Button>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-zinc-500">{t('sessionTasks.open')}</div>
            {sessionTasks.filter(t => !t.done).length === 0 && (
              <div className="text-sm text-zinc-500">{t('sessionTasks.noTasks')}</div>
            )}
            {sessionTasks
              .filter(task => !task.done)
              .map(task => (
                <div
                  key={task.id}
                  className="flex items-center justify-between bg-white/70 dark:bg-white/5 p-3 rounded-xl"
                >
                  <div className="font-medium">{task.title}</div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="rounded-xl"
                      onClick={() => toggleSessionTask(task.id)}
                    >
                      {tCommon('actions.done')}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-xl"
                      onClick={() => deleteSessionTask(task.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

            {sessionTasks.filter(task => task.done).length > 0 && (
              <div className="text-xs uppercase tracking-wide text-zinc-500 mt-3">{tCommon('status.completed')}</div>
            )}
            {sessionTasks
              .filter(task => task.done)
              .map(task => (
                <div
                  key={task.id}
                  className="flex items-center justify-between bg-white/40 dark:bg-white/5 p-3 rounded-xl opacity-70"
                >
                  <div className="line-through">{task.title}</div>
                  <Button size="icon" variant="ghost" className="rounded-xl" onClick={() => deleteSessionTask(task.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
          </div>
          {sessionTasks.some(task => task.done) && (
            <Button variant="outline" size="sm" onClick={clearCompletedSessionTasks} className="rounded-xl mt-2">
              {t('sessionTasks.clearCompleted')}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Session Log */}
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="w-5 h-5" />
            {t('sessionLog.title')}
          </CardTitle>
          <CardDescription>{t('sessionLog.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.length === 0 && <div className="text-sm text-zinc-500">{t('sessionLog.noSessions')}</div>}
          <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
            {sessions.map(session => (
              <div
                key={session.id}
                className="flex items-start justify-between bg-white/70 dark:bg-white/5 p-3 rounded-xl"
              >
                <div className="flex-1">
                  <div className="font-medium">
                    {t('sessionLog.sessionInfo', {
                      course: getCourseTitle(session.courseId),
                      duration: session.durationMin,
                      technique: session.technique,
                    })}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {new Date(session.startTs).toLocaleString()} → {new Date(session.endTs).toLocaleString()}
                  </div>
                  {session.note && <div className="text-sm mt-1">{session.note}</div>}
                </div>
                <Button size="icon" variant="ghost" className="rounded-xl" onClick={() => deleteSession(session.id)}>
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
