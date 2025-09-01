import { EventDialog } from '@/components/EventDialog';
import { useSettingsDialogContext } from '@/components/settings/SettingsDialogProvider';
import { TasksProgressBar, type ProgressData } from '@/components/TasksProgressBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Confetti from '@/components/ui/confetti';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { RichTextDisplay } from '@/components/ui/rich-text-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConfetti } from '@/hooks/useConfetti';
import { useEventDialog } from '@/hooks/useEventDialog';
import { useLocalization } from '@/hooks/useLocalization';
import { useCourses, useExams, useTasks } from '@/hooks/useStore';
import { motion } from 'framer-motion';
import { CalendarDays, Check, Edit, ListTodo, Plus, Settings, Trash2, Undo } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function CourseManagerTab() {
  const { t: tCourse } = useTranslation('courseManager');
  const { t: tCommon } = useTranslation('common');
  const { formatDateDDMMYYYY } = useLocalization();
  const { courses, selectedCourseId, getCourseTitle, setSelectedCourse, clearCourseData } = useCourses();
  const { tasks, toggleTask, deleteTask } = useTasks();
  const { exams, examGrades, addExam, updateExam, setExamGrades, toggleExamComplete } = useExams();
  const eventDialog = useEventDialog();
  const { openDialog: openSettingsDialog } = useSettingsDialogContext();
  const [clearConfirmOpen, setClearConfirmOpen] = useState<boolean>(false);
  const [taskSortOrder, setTaskSortOrder] = useState<'date' | 'priority'>('date');
  const [examNotesProgress, setExamNotesProgress] = useState<Record<string, ProgressData>>({});
  const courseTasks = tasks.filter(t => t.courseId === selectedCourseId);
  const courseExams = exams.filter(e => e.courseId === selectedCourseId);
  const upcomingExams = courseExams.filter(e => !e.completed);
  const completedExams = courseExams.filter(e => e.completed);

  // Get priority color for tasks
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high':
        return '#ef4444'; // red-500
      case 'normal':
        return '#f97316'; // orange-500
      case 'low':
        return '#eab308'; // yellow-500
      default:
        return '#f97316'; // default to orange
    }
  };

  // Sort tasks based on selected order
  const sortTasks = (taskList: typeof courseTasks) => {
    return [...taskList].sort((a, b) => {
      if (taskSortOrder === 'date') {
        // Sort by due date (earliest first), then by priority, then alphabetically
        if (!a.due && !b.due) {
          // Both have no due date, sort by priority then alphabetically
          const priorityOrder = { high: 0, normal: 1, low: 2 };
          const priorityComparison =
            priorityOrder[a.priority as keyof typeof priorityOrder] -
            priorityOrder[b.priority as keyof typeof priorityOrder];
          if (priorityComparison !== 0) return priorityComparison;
          return a.title.localeCompare(b.title);
        }
        if (!a.due) return 1; // Tasks without due date go to end
        if (!b.due) return -1;

        const dateComparison = new Date(a.due).getTime() - new Date(b.due).getTime();
        if (dateComparison !== 0) return dateComparison;

        // If dates are same, sort by priority
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        const priorityComparison =
          priorityOrder[a.priority as keyof typeof priorityOrder] -
          priorityOrder[b.priority as keyof typeof priorityOrder];
        if (priorityComparison !== 0) return priorityComparison;

        // If both date and priority are same, sort alphabetically
        return a.title.localeCompare(b.title);
      } else {
        // Sort by priority (high > normal > low), then by due date, then alphabetically
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        const priorityComparison =
          priorityOrder[a.priority as keyof typeof priorityOrder] -
          priorityOrder[b.priority as keyof typeof priorityOrder];
        if (priorityComparison !== 0) return priorityComparison;

        // If priorities are same, sort by due date
        if (!a.due && !b.due) {
          // Both have no due date, sort alphabetically
          return a.title.localeCompare(b.title);
        }
        if (!a.due) return 1;
        if (!b.due) return -1;

        const dateComparison = new Date(a.due).getTime() - new Date(b.due).getTime();
        if (dateComparison !== 0) return dateComparison;

        // If both priority and date are same, sort alphabetically
        return a.title.localeCompare(b.title);
      }
    });
  };

  // Create sorted task lists
  const openTasks = sortTasks(courseTasks.filter(t => !t.done));
  const completedTasks = sortTasks(courseTasks.filter(t => t.done));

  // Grade calculation logic
  const courseGrades = examGrades.filter(g => {
    const exam = exams.find(e => e.id === g.examId);
    return exam && exam.courseId === selectedCourseId;
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
    // Allow empty string to clear the grade
    if (grade === '') {
      const filtered = examGrades.filter(g => g.examId !== examId);
      setExamGrades(filtered);
      return;
    }

    const gradeValue = parseFloat(grade);

    // Always allow numeric input for better UX, but validate before saving
    if (!isNaN(gradeValue) && gradeValue >= 1 && gradeValue <= 7) {
      const existing = examGrades.find(g => g.examId === examId);
      if (existing) {
        setExamGrades(examGrades.map(g => (g.examId === examId ? { ...g, grade: gradeValue } : g)));
      } else {
        setExamGrades([...examGrades, { examId, grade: gradeValue }]);
      }
    }
  };

  const progress = useMemo(() => {
    const completed = courseTasks.filter(t => t.done).length;
    const total = courseTasks.length || 1;
    return Math.round((completed / total) * 100);
  }, [courseTasks]);

  const confetti = useConfetti({
    trigger: progress === 100 && courseTasks.length > 0,
  });

  return (
    <div className="space-y-6">
      <Confetti confetti={confetti} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={selectedCourseId} onValueChange={v => setSelectedCourse(v)}>
            <SelectTrigger className="w-56 rounded-xl">
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
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => openSettingsDialog('courses')}
            title="Manage courses"
          >
            <Settings className="w-4 h-4" />
          </Button>
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

      <div className="grid md:grid-cols-2 gap-6">
        {/* Tasks */}
        <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ListTodo className="w-5 h-5" />
                  {tCourse('tasks.title')}
                </CardTitle>
                <CardDescription>{tCourse('tasks.description')}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={taskSortOrder} onValueChange={(value: 'date' | 'priority') => setTaskSortOrder(value)}>
                  <SelectTrigger className="w-36 h-8 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">{tCourse('tasks.sortByDate')}</SelectItem>
                    <SelectItem value="priority">{tCourse('tasks.sortByPriority')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() =>
                    eventDialog.openDialog({
                      eventCategory: 'task',
                      courseId: selectedCourseId,
                    })
                  }
                  size="sm"
                  className="rounded-xl"
                  style={{
                    backgroundColor: `hsl(var(--accent-h) var(--accent-s) var(--accent-l))`,
                    color: 'white',
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {tCourse('actions.addTask')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-zinc-500">{tCourse('tasks.sections.open')}</div>
              {openTasks.length === 0 && (
                <div className="text-sm text-zinc-500">{tCourse('tasks.empty.noPending')}</div>
              )}
              {openTasks.map(t => (
                <div
                  key={t.id}
                  className="flex items-center justify-between bg-white/70 dark:bg-white/5 p-3 rounded-xl group border-l-4"
                  style={{ borderLeftColor: getPriorityColor(t.priority) }}
                >
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => {
                      // Create task event with proper format for editing
                      eventDialog.openEditTaskDialog(t);
                    }}
                  >
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-zinc-500">
                      {t.due ? formatDateDDMMYYYY(t.due) : '—'} · {t.priority}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={e => {
                        e.stopPropagation();
                        eventDialog.openEditTaskDialog(t);
                      }}
                      title={tCourse('actions.edit')}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      className="rounded-xl"
                      onClick={() => {
                        toggleTask(t.id);
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

              {completedTasks.length > 0 && (
                <>
                  <div className="text-xs uppercase tracking-wide text-zinc-500 mt-4">
                    {tCommon('status.completed')}
                  </div>
                  <div className="space-y-2">
                    {completedTasks.map(t => (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={t.id}
                        className="flex items-center justify-between bg-white/40 dark:bg-white/5 p-3 rounded-xl group border-l-4"
                        style={{ borderLeftColor: getPriorityColor(t.priority) }}
                      >
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            // Create task event with proper format for editing
                            eventDialog.openEditTaskDialog(t);
                          }}
                        >
                          <div className="line-through group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                            {t.title}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {t.due ? formatDateDDMMYYYY(t.due) : '—'} · {t.priority}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={e => {
                              e.stopPropagation();
                              eventDialog.openEditTaskDialog(t);
                            }}
                            title={tCourse('actions.edit')}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" />
                  {tCourse('exams.upcoming.title')}
                </CardTitle>
                <CardDescription>{tCourse('exams.upcoming.description')}</CardDescription>
              </div>
              <Button
                onClick={() =>
                  eventDialog.openDialog({
                    eventCategory: 'exam',
                    courseId: selectedCourseId,
                  })
                }
                size="sm"
                className="rounded-xl"
                style={{
                  backgroundColor: `hsl(var(--accent-h) var(--accent-s) var(--accent-l))`,
                  color: 'white',
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                {tCourse('actions.addExam')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingExams.length === 0 && (
              <div className="text-sm text-zinc-500">{tCourse('exams.upcoming.empty')}</div>
            )}
            <div className="space-y-2 max-h-[420px] overflow-auto">
              {upcomingExams
                .sort((a, b) => a.date.localeCompare(b.date))
                .map(e => (
                  <div
                    key={e.id}
                    className="flex items-start justify-between bg-white/70 dark:bg-white/5 p-3 rounded-xl cursor-pointer hover:bg-white/80 dark:hover:bg-white/10 transition-colors"
                    onClick={() => {
                      // Create exam event with proper format
                      const examEvent = {
                        ...e,
                        date: e.date, // Keep the exam date format
                      };
                      eventDialog.openEditExamDialog(examEvent);
                    }}
                  >
                    <div className="w-full">
                      <Badge variant="secondary" className="rounded-full self-start float-right">
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
                      </Badge>{' '}
                      <div className="font-medium">{e.title}</div>
                      <div className="text-xs text-zinc-500">
                        {formatDateDDMMYYYY(e.date)} · {e.weight}%
                        {e.notes && (
                          <div className="mt-1">
                            <TasksProgressBar progress={examNotesProgress[e.id]} />
                            <RichTextDisplay
                              content={e.notes}
                              className="text-xs"
                              onContentChange={newContent => {
                                // Update the exam with the new notes content
                                updateExam(e.id, {
                                  ...e,
                                  notes: newContent,
                                });
                              }}
                              onProgressChange={progress => {
                                setExamNotesProgress(prev => ({
                                  ...prev,
                                  [e.id]: progress,
                                }));
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Completed Exams Section */}
            {completedExams.length > 0 && (
              <>
                <div className="text-xs uppercase tracking-wide text-zinc-500 mt-4">{tCommon('status.completed')}</div>
                <div className="space-y-2">
                  {completedExams
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map(e => (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={e.id}
                        className="flex items-start justify-between bg-white/40 dark:bg-white/5 p-3 rounded-xl group cursor-pointer hover:bg-white/50 dark:hover:bg-white/8 transition-colors"
                        onClick={() => {
                          // Create exam event with proper format
                          const examEvent = {
                            ...e,
                            date: e.date, // Keep the exam date format
                          };
                          eventDialog.openEditExamDialog(examEvent);
                        }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-green-700 dark:text-green-400">{e.title}</span>
                          </div>
                          <div className="text-xs text-zinc-500 ml-6">
                            {formatDateDDMMYYYY(e.date)} · {e.weight}% · Completed
                            {e.notes && (
                              <div className="mt-1">
                                <RichTextDisplay
                                  content={e.notes}
                                  className="text-xs"
                                  onContentChange={newContent => {
                                    // Update the exam with the new notes content
                                    updateExam(e.id, {
                                      ...e,
                                      notes: newContent,
                                    });
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={ev => {
                              ev.stopPropagation();
                              toggleExamComplete(e.id);
                            }}
                            title="Mark as upcoming"
                          >
                            <Undo className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                </div>
              </>
            )}
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
                {courseExams
                  .sort((a, b) => {
                    // First sort by date (earliest first)
                    const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
                    if (dateComparison !== 0) return dateComparison;

                    // If dates are the same, sort alphabetically by title
                    return a.title.localeCompare(b.title);
                  })
                  .map(exam => {
                    const currentGrade = courseGrades.find(g => g.examId === exam.id);
                    return (
                      <div
                        key={exam.id}
                        className="flex items-center justify-between bg-white/40 dark:bg-white/5 p-3 rounded-xl cursor-pointer hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
                        onClick={() => {
                          // Create exam event with proper format
                          const examEvent = {
                            ...exam,
                            date: exam.date, // Keep the exam date format
                          };
                          eventDialog.openEditExamDialog(examEvent);
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{exam.title}</div>
                          <div className="text-xs text-zinc-500">
                            {tCourse('grades.weight', { weight: exam.weight })}
                          </div>
                        </div>
                        <div className="ml-3">
                          <Input
                            type="number"
                            min="1"
                            max="7"
                            step="0.1"
                            placeholder={tCourse('tasks.placeholders.grade')}
                            value={currentGrade?.grade?.toString() || ''}
                            onChange={e => updateExamGrade(exam.id, e.target.value)}
                            onClick={e => e.stopPropagation()} // Prevent opening dialog when clicking input
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
            <DialogTitle>
              {tCourse('confirmations.clearData.title', { course: getCourseTitle(selectedCourseId) })}
            </DialogTitle>
            <DialogDescription>
              {tCourse('confirmations.clearData.description', { course: getCourseTitle(selectedCourseId) })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setClearConfirmOpen(false)}>
              {tCommon('actions.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                clearCourseData(selectedCourseId);
                setClearConfirmOpen(false);
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" /> {tCourse('confirmations.clearData.clearButton')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Dialog for editing exams */}
      <EventDialog
        open={eventDialog.open}
        onOpenChange={eventDialog.closeDialog}
        editingEvent={eventDialog.editingEvent}
        form={eventDialog.form}
        setForm={eventDialog.setForm}
        onSave={eventDialog.handleSave}
        onDelete={eventDialog.handleDelete}
        disableEventCategory={true}
        disableCourse={true}
      />
    </div>
  );
}
