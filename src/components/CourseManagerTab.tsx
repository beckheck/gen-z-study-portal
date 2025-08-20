import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCourses, useExams, useTasks } from '@/hooks/useStore';
import { motion } from 'framer-motion';
import { CalendarDays, GraduationCap, ListTodo, NotebookPen, Plus, Trash2, Undo } from 'lucide-react';
import { useMemo, useState } from 'react';
import ReactConfetti from 'react-confetti';
import { useTranslation } from 'react-i18next';

export default function CourseManagerTab() {
  const { t: tCourse } = useTranslation('courseManager');
  const { t: tCommon } = useTranslation('common');
  const { courses, selectedCourse, setSelectedCourse, clearCourseData } = useCourses();
  const { tasks, addTask, toggleTask, deleteTask } = useTasks();
  const { exams, examGrades, addExam, updateExam, setExamGrades } = useExams();
  const [taskForm, setTaskForm] = useState<{
    title: string;
    due: string;
    priority: string;
  }>({ title: '', due: '', priority: 'normal' });
  const [examForm, setExamForm] = useState<{
    title: string;
    date: string;
    weight: number;
    notes: string;
  }>({ title: '', date: '', weight: 20, notes: '' });
  const [editingExam, setEditingExam] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState<boolean>(false);
  const courseTasks = tasks.filter(t => t.courseIndex === selectedCourse);
  const courseExams = exams.filter(e => e.courseIndex === selectedCourse);

  // Grade calculation logic
  const courseGrades = examGrades.filter(g => {
    const exam = exams.find(e => e.id === g.examId);
    return exam && exam.courseIndex === selectedCourse;
  });

  const calculateCourseAverage = (): string | null => {
    const examsWithGrades = courseExams.filter(exam => courseGrades.some(grade => grade.examId === exam.id));

    if (examsWithGrades.length === 0) return null;

    let totalWeightedScore = 0;
    let totalWeight = 0;

    examsWithGrades.forEach(exam => {
      const grade = courseGrades.find(g => g.examId === exam.id);
      if (grade && grade.grade >= 1 && grade.grade <= 7) {
        totalWeightedScore += grade.grade * exam.weight;
        totalWeight += exam.weight;
      }
    });

    return totalWeight > 0 ? (totalWeightedScore / totalWeight).toFixed(1) : null;
  };

  const updateExamGrade = (examId: string, grade: string): void => {
    const gradeValue = parseFloat(grade);
    if (gradeValue < 1 || gradeValue > 7) return;

    const existing = examGrades.find(g => g.examId === examId);
    if (existing) {
      setExamGrades(examGrades.map(g => (g.examId === examId ? { ...g, grade: gradeValue } : g)));
    } else {
      setExamGrades([...examGrades, { examId, grade: gradeValue }]);
    }
  };

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
          <Select value={String(selectedCourse)} onValueChange={v => setSelectedCourse(Number(v))}>
            <SelectTrigger className="w-56 rounded-xl">
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
          <Badge variant="secondary" className="rounded-full">
            <GraduationCap className="w-3 h-3 mr-1" />
            {courses[selectedCourse]}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-900 dark:hover:bg-red-950"
            onClick={() => setClearConfirmOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            {tCourse('actions.clearCourseData')}
          </Button>
        </div>
        <div className="text-sm text-zinc-600 dark:text-zinc-400">{tCourse('tasks.taskProgress')}</div>
      </div>
      <Progress value={progress} className="h-3 rounded-xl" />

      <div className="grid md:grid-cols-3 gap-6">
        {/* Tasks */}
        <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="w-5 h-5" />
              {tCourse('tasks.title')}
            </CardTitle>
            <CardDescription>{tCourse('tasks.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <Label>{tCourse('tasks.form.title')}</Label>
              <Input
                value={taskForm.title}
                onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                className="rounded-xl"
                placeholder={tCourse('tasks.placeholders.title')}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{tCourse('tasks.form.dueDate')}</Label>
                  <Input
                    type="date"
                    value={taskForm.due}
                    onChange={e => setTaskForm({ ...taskForm, due: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>{tCourse('tasks.form.priority')}</Label>
                  <Select value={taskForm.priority} onValueChange={v => setTaskForm({ ...taskForm, priority: v })}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{tCommon('priorities.low')}</SelectItem>
                      <SelectItem value="normal">{tCommon('priorities.normal')}</SelectItem>
                      <SelectItem value="high">{tCommon('priorities.high')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={() => {
                  if (!taskForm.title) return;
                  addTask({ ...taskForm, courseIndex: selectedCourse });
                  setTaskForm({ title: '', due: '', priority: 'normal' });
                }}
                className="rounded-xl w-full"
                variant="default"
              >
                <Plus className="w-4 h-4 mr-2" />
                {tCourse('actions.addTask')}
              </Button>
            </div>

            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-zinc-500">{tCourse('tasks.sections.open')}</div>
              {courseTasks.filter(t => !t.done).length === 0 && (
                <div className="text-sm text-zinc-500">{tCourse('tasks.empty.noPending')}</div>
              )}
              {courseTasks
                .filter(t => !t.done)
                .map(t => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between bg-white/70 dark:bg-white/5 p-3 rounded-xl"
                  >
                    <div>
                      <div className="font-medium">{t.title}</div>
                      <div className="text-xs text-zinc-500">
                        {t.due || '—'} · {t.priority}
                      </div>
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
                        }}
                      >
                        {tCourse('actions.done')}
                      </Button>
                      <Button size="icon" variant="ghost" className="rounded-xl" onClick={() => deleteTask(t.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

              {courseTasks.filter(t => t.done).length > 0 && (
                <>
                  <div className="text-xs uppercase tracking-wide text-zinc-500 mt-4">
                    {tCommon('status.completed')}
                  </div>
                  <div className="space-y-2">
                    {courseTasks
                      .filter(t => t.done)
                      .map(t => (
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
                              {t.due || '—'} · {t.priority}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => toggleTask(t.id)}
                              title={tCourse('actions.undo')}
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
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              {tCourse('exams.upcoming.title')}
            </CardTitle>
            <CardDescription>{tCourse('exams.upcoming.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {courseExams.length === 0 && <div className="text-sm text-zinc-500">{tCourse('exams.upcoming.empty')}</div>}
            <div className="space-y-2 max-h-[420px] overflow-auto">
              {courseExams
                .sort((a, b) => a.date.localeCompare(b.date))
                .map(e => (
                  <div
                    key={e.id}
                    className="flex items-start justify-between bg-white/70 dark:bg-white/5 p-3 rounded-xl"
                  >
                    <div>
                      <div className="font-medium">{e.title}</div>
                      <div className="text-xs text-zinc-500">
                        {e.date} · {e.weight}%{e.notes && <div className="mt-1 text-xs italic">{e.notes}</div>}
                      </div>
                    </div>
                    <Badge variant="secondary" className="rounded-full self-start">
                      {(() => {
                        const examDate = new Date(e.date);
                        const today = new Date();
                        const diffTime = examDate.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return diffDays <= 0
                          ? tCommon('fields.today')
                          : diffDays === 1
                          ? tCommon('fields.tomorrow')
                          : tCourse('exams.timing.days', { count: diffDays });
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
            <CardTitle className="flex items-center gap-2">
              <NotebookPen className="w-5 h-5" />
              {tCourse('exams.title')}
            </CardTitle>
            <CardDescription>{tCourse('exams.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <Label>{tCourse('exams.form.title')}</Label>
              <Input
                value={examForm.title}
                onChange={e => setExamForm({ ...examForm, title: e.target.value })}
                className="rounded-xl"
                placeholder={tCourse('exams.placeholders.title')}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{tCourse('exams.form.date')}</Label>
                  <Input
                    type="date"
                    value={examForm.date}
                    onChange={e => setExamForm({ ...examForm, date: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>{tCourse('exams.form.weight')}</Label>
                  <Input
                    type="number"
                    value={examForm.weight}
                    onChange={e => setExamForm({ ...examForm, weight: Number(e.target.value) })}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <Label>{tCourse('exams.form.notes')}</Label>
              <Textarea
                value={examForm.notes}
                onChange={e => setExamForm({ ...examForm, notes: e.target.value })}
                className="rounded-xl"
                placeholder={tCourse('exams.placeholders.notes')}
              />
              <Button
                onClick={() => {
                  if (!examForm.title || !examForm.date) return;
                  if (editingExam) {
                    updateExam(editingExam, { ...examForm, courseIndex: selectedCourse });
                    setEditingExam(null);
                  } else {
                    addExam({ ...examForm, courseIndex: selectedCourse });
                  }
                  setExamForm({ title: '', date: '', weight: 20, notes: '' });
                }}
                className="rounded-xl w-full"
                style={{
                  backgroundColor: `hsl(var(--accent-h) var(--accent-s) var(--accent-l))`,
                  color: 'white',
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                {editingExam ? tCourse('actions.updateExam') : tCourse('actions.addExam')}
              </Button>
              {editingExam && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingExam(null);
                    setExamForm({ title: '', date: '', weight: 20, notes: '' });
                  }}
                  className="rounded-xl mt-2 w-full"
                >
                  {tCourse('actions.cancelEdit')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grade Calculator - Standalone Card */}
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 002 2z"
              />
            </svg>
            {tCourse('grades.title')}
          </CardTitle>
          <CardDescription>{tCourse('grades.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {courseExams.length === 0 ? (
            <div className="text-sm text-zinc-500 text-center py-6">{tCourse('grades.addExamsFirst')}</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Column - Exam Grades Input */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-zinc-700 dark:text-zinc-300 mb-3">
                  {tCourse('grades.examGrades')}
                </h4>
                {courseExams.map(exam => {
                  const currentGrade = courseGrades.find(g => g.examId === exam.id);
                  return (
                    <div
                      key={exam.id}
                      className="flex items-center justify-between bg-white/40 dark:bg-white/5 p-3 rounded-xl"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{exam.title}</div>
                        <div className="text-xs text-zinc-500">{tCourse('grades.weight', { weight: exam.weight })}</div>
                      </div>
                      <div className="ml-3">
                        <Input
                          type="number"
                          min="1"
                          max="7"
                          step="0.1"
                          placeholder={tCourse('tasks.placeholders.grade')}
                          value={currentGrade?.grade || ''}
                          onChange={e => updateExamGrade(exam.id, e.target.value)}
                          className="w-20 h-8 text-center rounded-lg"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column - Course Average Display */}
              <div className="flex flex-col justify-center items-center bg-white/40 dark:bg-white/5 p-6 rounded-xl">
                <h4 className="font-medium text-sm text-zinc-700 dark:text-zinc-300 mb-4">
                  {tCourse('grades.courseAverage')}
                </h4>
                <div className="text-center">
                  {calculateCourseAverage() ? (
                    <div
                      className={`text-4xl font-bold mb-2 ${
                        parseFloat(calculateCourseAverage()) >= 4.0
                          ? 'text-green-600 dark:text-green-400'
                          : parseFloat(calculateCourseAverage()) >= 3.0
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {calculateCourseAverage()}
                    </div>
                  ) : (
                    <div className="text-4xl font-bold text-zinc-400 mb-2">--</div>
                  )}
                  <div className="text-sm text-zinc-500 mb-3">{tCourse('grades.outOf')}</div>

                  {calculateCourseAverage() && (
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">
                      {tCourse('grades.examsSummary', { graded: courseGrades.length, total: courseExams.length })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog for clearing course data */}
      <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <DialogContent className="rounded-xl bg-white dark:bg-zinc-950 border-none shadow-xl backdrop-blur">
          <DialogHeader className="">
            <DialogTitle>{tCourse('confirmations.clearData.title', { course: courses[selectedCourse] })}</DialogTitle>
            <DialogDescription>
              {tCourse('confirmations.clearData.description', { course: courses[selectedCourse] })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setClearConfirmOpen(false)}>
              {tCommon('actions.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                clearCourseData(selectedCourse);
                setClearConfirmOpen(false);
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" /> {tCourse('confirmations.clearData.clearButton')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
