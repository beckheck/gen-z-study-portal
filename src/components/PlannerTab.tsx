import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ColorPicker from '@/components/ui/color-picker';
import { ContextMenu, ContextMenuItem } from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useContextMenu } from '@/hooks/useContextMenu';
import { useCourses, useExams, useRegularEvents, useSchedule, useTasks } from '@/hooks/useStore';
import { useLocalization } from '@/hooks/useLocalization';
import { uid } from '@/lib/utils';
import { CalendarDays, Plus, Target, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import ReactConfetti from 'react-confetti';
import { useTranslation } from 'react-i18next';
import { CalendarView } from '../types';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
type DayName = (typeof DAYS)[number];

// Color chips for different event types
const typeColors: Record<string, string> = {
  class: 'bg-violet-500',
  lab: 'bg-emerald-500',
  workshop: 'bg-amber-500',
  assistantship: 'bg-sky-500',
  exam: 'bg-rose-500',
  task: 'bg-amber-500',
  regular: 'bg-indigo-500',
};

interface WeeklyGoal {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  color?: string;
}

interface PlannerForm {
  eventCategory: 'regular' | 'exam' | 'task';
  courseIndex: number;
  type: string;
  title: string;
  startDate: string;
  endDate: string;
  day: DayName;
  start: string;
  end: string;
  location: string;
  weight: number;
  priority: string;
  notes: string;
  color: string;
}

// Default form values to avoid redundancy
const DEFAULT_PLANNER_FORM: PlannerForm = {
  eventCategory: 'regular',
  courseIndex: -1,
  type: 'class',
  title: '',
  startDate: '',
  endDate: '',
  day: 'Mon',
  start: '10:00',
  end: '11:30',
  location: '',
  weight: 20,
  priority: 'normal',
  notes: '',
  color: '#6366f1',
};

// -----------------------------
// Planner (Week + Month views)
// -----------------------------

export default function PlannerTab() {
  const { courses } = useCourses();
  const { tasks, addTask, deleteTask } = useTasks();
  const { exams, addExam, deleteExam } = useExams();
  const { regularEvents, addRegularEvent, deleteRegularEvent } = useRegularEvents();
  const { eventsForDay, removeSchedule } = useSchedule();

  // Localization hooks
  const { t } = useTranslation('planner');
  const { t: tCommon } = useTranslation('common');
  const { getShortDayNames, getShortMonthNames, getMonthNames, formatDate: localizedFormatDate } = useLocalization();

  const [open, setOpen] = useState<boolean>(false);
  const contextMenu = useContextMenu<any>();
  const [showMultiDayEvents, setShowMultiDayEvents] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoal[]>([]);
  const [goalForm, setGoalForm] = useState<{ title: string }>({ title: '' });
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [form, setForm] = useState<PlannerForm>(DEFAULT_PLANNER_FORM);
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [view, setView] = useState<'week' | 'month'>('month');
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Month data
  const now = new Date();
  const [monthView, setMonthView] = useState<CalendarView>({ year: now.getFullYear(), month: now.getMonth() });

  function monthMatrix(y: number, m: number): Date[] {
    const first = new Date(y, m, 1);
    const offset = (first.getDay() + 6) % 7; // Mon=0
    const start = new Date(y, m, 1 - offset);
    return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }
  const matrix = useMemo(() => monthMatrix(monthView.year, monthView.month), [monthView]);
  function shiftMonth(delta: number): void {
    const d = new Date(monthView.year, monthView.month + delta, 1);
    setMonthView({ year: d.getFullYear(), month: d.getMonth() });
  }

  // Weekly dates (show numbered days on headers)
  const startOfWeek = useMemo(() => {
    const d = new Date();
    const w = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - w + weekOffset * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [weekOffset]);

  // Event handlers that work with the new context menu
  const editEvent = (event: any): void => {
    handleEditEvent(event);
    contextMenu.hideMenu();
  };

  const deleteEvent = (event: any): void => {
    handleDeleteEvent(event);
    contextMenu.hideMenu();
  };

  // Calculate goal progress
  const completedGoals = weeklyGoals.filter(goal => goal.completed).length;
  const totalGoals = weeklyGoals.length;
  const fillPercentage = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

  // Generate random color for each completed task
  const generateRandomColor = (): string => {
    const colors = [
      '#ff6b6b',
      '#4ecdc4',
      '#45b7d1',
      '#96ceb4',
      '#ffeaa7',
      '#dda0dd',
      '#98d8c8',
      '#f7dc6f',
      '#bb8fce',
      '#85c1e9',
      '#f8c471',
      '#82e0aa',
      '#f1948a',
      '#85c1e9',
      '#d7bde2',
      '#ff9ff3',
      '#54a0ff',
      '#5f27cd',
      '#00d2d3',
      '#ff9f43',
      '#10ac84',
      '#ee5a24',
      '#0984e3',
      '#6c5ce7',
      '#a29bfe',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Build gradient from completed tasks colors
  const buildGradientFromCompletedTasks = (): string => {
    const completedTasks = weeklyGoals.filter(goal => goal.completed);

    if (completedTasks.length === 0) {
      return 'transparent';
    }

    if (completedTasks.length === 1) {
      // Single color for first completed task
      return completedTasks[0].color || generateRandomColor();
    }

    // Multiple colors - create gradient
    const colors = completedTasks.map(task => task.color || generateRandomColor());
    const step = 100 / (colors.length - 1);
    const gradientStops = colors.map((color, index) => `${color} ${Math.round(index * step)}%`).join(', ');

    return `linear-gradient(180deg, ${gradientStops})`;
  };

  const currentGradient = buildGradientFromCompletedTasks();

  // Get border color from first completed task
  const getBorderColor = (): string => {
    const firstCompletedTask = weeklyGoals.find(goal => goal.completed);
    if (firstCompletedTask && firstCompletedTask.color) {
      return firstCompletedTask.color + '40'; // Add transparency
    }
    return '#e5e7eb'; // Default gray border
  };

  function dayNumOfWeek(i: number): number {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d.getDate();
  }

  // Weekly Goals Management
  function addGoal(): void {
    if (!goalForm.title.trim()) return;
    const newGoal = {
      id: uid(),
      title: goalForm.title.trim(),
      completed: false,
      createdAt: Date.now(),
    };
    setWeeklyGoals(prev => [...prev, newGoal]);
    setGoalForm({ title: '' });
  }

  function toggleGoal(id: string): void {
    setWeeklyGoals(prev => {
      const updated = prev.map(goal => {
        if (goal.id === id) {
          const isBeingCompleted = !goal.completed;
          return {
            ...goal,
            completed: isBeingCompleted,
            // Assign random color when completing (but keep existing color if uncompleting)
            color: isBeingCompleted ? goal.color || generateRandomColor() : goal.color,
          };
        }
        return goal;
      });

      // Check if all goals are completed
      const allCompleted = updated.every(goal => goal.completed);
      if (allCompleted && updated.length > 0) {
        // Trigger confetti
        setShowConfetti(true);
        // Reset all goals after a short delay
        setTimeout(() => {
          setWeeklyGoals([]);
          setShowConfetti(false);
        }, 3000);
      }

      return updated;
    });
  }

  function deleteGoal(id: string): void {
    setWeeklyGoals(prev => prev.filter(goal => goal.id !== id));
  }

  // Handler for adding new events
  const handleAddEvent = (): void => {
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

    if (form.eventCategory === 'regular') {
      const eventData: any = {
        courseIndex: form.courseIndex,
        title: form.title,
        startDate: form.startDate,
        location: form.location,
        notes: form.notes,
        color: form.color,
      };

      // Only add endDate if user explicitly provided one that's different from startDate
      if (form.endDate && form.endDate !== form.startDate) {
        eventData.endDate = form.endDate;
        eventData.isMultiDay = true;
      } else {
        eventData.isMultiDay = false;
      }

      addRegularEvent(eventData);
    } else if (form.eventCategory === 'exam') {
      addExam({
        courseIndex: form.courseIndex,
        title: form.title,
        date: form.startDate,
        weight: form.weight,
        notes: form.notes,
      });
    } else if (form.eventCategory === 'task') {
      addTask({
        courseIndex: form.courseIndex,
        title: form.title,
        due: form.startDate,
        priority: form.priority,
        notes: form.notes,
      });
    }

    // Reset form and editing state
    setForm(DEFAULT_PLANNER_FORM);
    setEditingEvent(null);
    setOpen(false);
  };

  // Handle event edit action
  const handleEditEvent = (event: any): void => {
    setEditingEvent(event); // Store the original event for potential restoration

    if (event.eventType === 'regular') {
      setForm({
        eventCategory: 'regular',
        courseIndex: event.courseIndex ?? -1,
        title: event.title || '',
        startDate: event.startDate ? new Date(event.startDate).toISOString().split('T')[0] : '',
        endDate: event.endDate ? new Date(event.endDate).toISOString().split('T')[0] : '',
        location: event.location || '',
        notes: event.notes || '',
        color: event.color || '#6366f1',
        type: 'class',
        day: 'Mon',
        start: '10:00',
        end: '11:30',
        weight: 20,
        priority: 'normal',
      });
    } else if (event.eventType === 'exam') {
      setForm({
        eventCategory: 'exam',
        courseIndex: event.courseIndex ?? -1,
        title: event.title || '',
        startDate: event.date ? new Date(event.date).toISOString().split('T')[0] : '',
        weight: event.weight || 20,
        notes: event.notes || '',
        color: '#ef4444', // Red for exams
        endDate: '',
        location: '',
        type: 'class',
        day: 'Mon',
        start: '10:00',
        end: '11:30',
        priority: 'normal',
      });
    } else if (event.eventType === 'task') {
      setForm({
        eventCategory: 'task',
        courseIndex: event.courseIndex ?? -1,
        title: event.title || '',
        startDate: event.due ? new Date(event.due).toISOString().split('T')[0] : '',
        priority: event.priority || 'normal',
        notes: event.notes || '',
        color: '#f59e0b', // Amber for tasks
        endDate: '',
        location: '',
        type: 'class',
        day: 'Mon',
        start: '10:00',
        end: '11:30',
        weight: 20,
      });
    }
    setOpen(true);
  };

  // Handle event delete action
  const handleDeleteEvent = (event: any): void => {
    if (event.eventType === 'regular') {
      deleteRegularEvent(event.id);
    } else if (event.eventType === 'exam') {
      deleteExam(event.id);
    } else if (event.eventType === 'task') {
      deleteTask(event.id);
    }
  };

  // Handle day click to create new event with pre-filled date
  const handleDayClick = (date: Date): void => {
    const dateString = date.toISOString().split('T')[0];
    setForm({
      ...DEFAULT_PLANNER_FORM,
      startDate: dateString,
    });
    setEditingEvent(null); // Make sure we're not in edit mode
    setOpen(true);
  };

  // Handle dialog close (including cancel)
  const handleDialogClose = (open: boolean): void => {
    if (!open) {
      // Dialog is being closed - reset editing state and form
      setEditingEvent(null);
      setForm(DEFAULT_PLANNER_FORM);
    }
    setOpen(open);
  };

  // Helper: get all events for a specific date
  function getAllEventsForDate(date: Date): any[] {
    const events = [];
    const dateStr = date.toISOString().split('T')[0];
    const dayName = DAYS[(date.getDay() + 6) % 7];

    // Regular schedule events
    const scheduleEvents = eventsForDay(dayName)
      .filter(e => filterCourse === 'all' || String(e.courseIndex) === filterCourse)
      .map(e => ({
        ...e,
        eventType: 'schedule',
        time: e.start,
        displayTime: `${e.start}–${e.end}`,
      }));
    events.push(...scheduleEvents);

    // Regular events - always include single-day events, multi-day events only if toggle is on
    const regularEventsForDate = regularEvents
      .filter(e => {
        const startDate = new Date(e.startDate);
        const endDate = e.endDate ? new Date(e.endDate) : startDate;
        const currentDate = new Date(dateStr);
        const isMultiDay = e.isMultiDay !== false && e.endDate && e.endDate !== e.startDate;

        // Check if current date is within the event range
        const isInRange = currentDate >= startDate && currentDate <= endDate;

        // Include if: within range AND (single-day event OR multi-day event with toggle on)
        return (
          isInRange &&
          (filterCourse === 'all' || String(e.courseIndex) === filterCourse) &&
          (!isMultiDay || showMultiDayEvents)
        );
      })
      .map(e => ({
        ...e,
        eventType: 'regular',
        time: '00:00',
        displayTime: 'Event',
        type: 'regular',
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
        type: 'exam',
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
        type: 'task',
      }));
    events.push(...dayTasks);

    return events.sort((a, b) => a.time.localeCompare(b.time));
  }

  // Helper: get all events for tooltip (including hidden multi-day events)
  function getAllEventsForTooltip(date: Date): any[] {
    const events = [];
    const dateStr = date.toISOString().split('T')[0];
    const dayName = DAYS[(date.getDay() + 6) % 7];

    // Regular schedule events
    const scheduleEvents = eventsForDay(dayName)
      .filter(e => filterCourse === 'all' || String(e.courseIndex) === filterCourse)
      .map(e => ({
        ...e,
        eventType: 'schedule',
        time: e.start,
        displayTime: `${e.start}–${e.end}`,
      }));
    events.push(...scheduleEvents);

    // ALL Regular events - for tooltip, show all regardless of toggle
    const regularEventsForDate = regularEvents
      .filter(e => {
        const startDate = new Date(e.startDate);
        const endDate = e.endDate ? new Date(e.endDate) : startDate;
        const currentDate = new Date(dateStr);
        return (
          currentDate >= startDate &&
          currentDate <= endDate &&
          (filterCourse === 'all' || String(e.courseIndex) === filterCourse)
        );
      })
      .map(e => ({
        ...e,
        eventType: 'regular',
        time: '00:00',
        displayTime: 'Event',
        type: 'regular',
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
        type: 'exam',
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
        type: 'task',
      }));
    events.push(...dayTasks);

    return events.sort((a, b) => a.time.localeCompare(b.time));
  }

  // Helper: events for weekday name (Mon..Sun), filtered & sorted
  function eventsForWeekdayName(dayName: DayName): any[] {
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
            <SelectTrigger className="w-48 rounded-xl">
              <SelectValue placeholder={t('filters.filterByCourse')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allCourses')}</SelectItem>
              {courses.map((c, i) => (
                <SelectItem key={i} value={String(i)}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={view === 'week' ? 'default' : 'outline'}
            onClick={() => setView('week')}
            className="rounded-xl"
          >
            {t('views.week')}
          </Button>
          <Button
            variant={view === 'month' ? 'default' : 'outline'}
            onClick={() => setView('month')}
            className="rounded-xl"
          >
            {t('views.month')}
          </Button>
          {view === 'week' ? (
            <div className="flex items-center gap-2 ml-2">
              <Button variant="outline" onClick={() => setWeekOffset(offset => offset - 1)} className="rounded-xl">
                <CalendarDays className="w-4 h-4 mr-2" />
                {tCommon('actions.previous')}
              </Button>
              <div className="font-medium">
                {localizedFormatDate(startOfWeek, { month: 'short', day: 'numeric' })} - {localizedFormatDate(new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000), { month: 'short', day: 'numeric' })}
              </div>
              <Button variant="outline" onClick={() => setWeekOffset(offset => offset + 1)} className="rounded-xl">
                {tCommon('actions.next')}
                <CalendarDays className="w-4 h-4 ml-2" />
              </Button>
              {weekOffset !== 0 && (
                <Button variant="ghost" onClick={() => setWeekOffset(0)} className="rounded-xl">
                  {tCommon('actions.today')}
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <Button variant="outline" onClick={() => shiftMonth(-1)} className="rounded-xl">
                {tCommon('actions.previous')}
              </Button>
              <div className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-100">
                <span className="sm:hidden">
                  {getShortMonthNames()[monthView.month]} '{String(monthView.year).slice(-2)}
                </span>
                <span className="hidden sm:block">
                  {getMonthNames()[monthView.month]} {monthView.year}
                </span>
              </div>
              <Button variant="outline" onClick={() => shiftMonth(1)} className="rounded-xl">
                {tCommon('actions.next')}
              </Button>
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
              <Label className="text-sm text-gray-900 dark:text-gray-100">{t('filters.showMultiDayEvents')}</Label>
            </div>
          )}
          <Dialog open={open} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button className="rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                {t('events.addEvent')}
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
              <DialogHeader className="">
                <DialogTitle className="text-gray-900 dark:text-gray-100">
                  {editingEvent ? t('events.editEvent') : t('events.addEvent')}
                </DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-300">
                  {editingEvent ? t('messages.modifyEventDetails') : t('messages.createEventDescription')}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">{t('forms.eventCategory')}</Label>
                  <Select value={form.eventCategory} onValueChange={v => setForm({ ...form, eventCategory: v })}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">{t('eventTypes.regular')}</SelectItem>
                      <SelectItem value="exam">{t('eventTypes.exam')}</SelectItem>
                      <SelectItem value="task">{t('eventTypes.task')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-700 dark:text-gray-300">{t('forms.courseOptional')}</Label>
                  <Select
                    value={String(form.courseIndex)}
                    onValueChange={v => setForm({ ...form, courseIndex: Number(v) })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder={t('forms.courseOptional')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-1">{tCommon('common.none')}</SelectItem>
                      {courses.map((c, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-700 dark:text-gray-300">{t('forms.title')}</Label>
                  <Input
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    className="rounded-xl"
                    placeholder={
                      form.eventCategory === 'regular'
                        ? t('placeholders.regularEventTitle')
                        : form.eventCategory === 'exam'
                        ? t('placeholders.examTitle')
                        : t('placeholders.taskTitle')
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">
                      {form.eventCategory === 'regular'
                        ? t('forms.startDate')
                        : form.eventCategory === 'exam'
                        ? t('forms.startDate')
                        : t('forms.startDate')}
                    </Label>
                    <Input
                      type="date"
                      value={form.startDate}
                      onChange={e => setForm({ ...form, startDate: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  {form.eventCategory === 'regular' && (
                    <div>
                      <Label className="text-gray-700 dark:text-gray-300">
                        {t('forms.endDate')} {tCommon('common.optional')}
                      </Label>
                      <Input
                        type="date"
                        value={form.endDate}
                        onChange={e => setForm({ ...form, endDate: e.target.value })}
                        className="rounded-xl"
                        min={form.startDate}
                      />
                    </div>
                  )}
                </div>

                {form.eventCategory === 'regular' && (
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">
                      {t('forms.location')} {tCommon('common.optional')}
                    </Label>
                    <Input
                      value={form.location}
                      onChange={e => setForm({ ...form, location: e.target.value })}
                      className="rounded-xl"
                      placeholder={t('placeholders.locationExample')}
                    />
                  </div>
                )}

                {form.eventCategory === 'regular' && (
                  <ColorPicker
                    label={t('forms.color')}
                    value={form.color}
                    onChange={color => setForm({ ...form, color })}
                  />
                )}

                {form.eventCategory === 'exam' && (
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">{t('forms.weight')}</Label>
                    <Input
                      type="number"
                      value={form.weight}
                      onChange={e => setForm({ ...form, weight: Number(e.target.value) })}
                      className="rounded-xl"
                      min="0"
                      max="100"
                    />
                  </div>
                )}

                {form.eventCategory === 'task' && (
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">{t('forms.priority')}</Label>
                    <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
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
                )}

                <div>
                  <Label className="text-gray-700 dark:text-gray-300">
                    {t('forms.notes')} {tCommon('common.optional')}
                  </Label>
                  <Textarea
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    className="rounded-xl"
                    placeholder={
                      form.eventCategory === 'regular'
                        ? t('messages.eventDetailsAgenda')
                        : form.eventCategory === 'exam'
                        ? t('messages.examTopicsChapters')
                        : t('messages.taskDetails')
                    }
                    rows={3}
                  />
                </div>

                <Button onClick={handleAddEvent} className="rounded-xl mt-2">
                  {editingEvent ? tCommon('actions.edit') : tCommon('actions.add')}{' '}
                  {form.eventCategory === 'regular'
                    ? t('eventTypes.regular')
                    : form.eventCategory === 'exam'
                    ? t('eventTypes.exam')
                    : t('eventTypes.task')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Event Options Context Menu */}
          <ContextMenu show={contextMenu.showMenu} position={contextMenu.position} menuRef={contextMenu.menuRef}>
            {contextMenu.selectedItem && (
              <>
                <ContextMenuItem onClick={() => editEvent(contextMenu.selectedItem)}>
                  {t('events.editEvent')}
                </ContextMenuItem>
                <ContextMenuItem variant="destructive" onClick={() => deleteEvent(contextMenu.selectedItem)}>
                  {t('events.deleteEvent')}
                </ContextMenuItem>
              </>
            )}
          </ContextMenu>
        </div>
      </div>

      {/* Views */}
      {view === 'week' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-7 gap-4 relative">
            {getShortDayNames().map((dayName, idx) => {
              // Calculate the date for this day
              const dayDate = new Date(startOfWeek);
              dayDate.setDate(startOfWeek.getDate() + idx);
              const dayKey = DAYS[idx]; // Keep original key for logic

              return (
                <Card
                  key={dayKey}
                  className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur relative cursor-pointer hover:shadow-2xl transition-shadow duration-200"
                  onClick={() => handleDayClick(dayDate)}
                  title={t('messages.clickToCreate')}
                >
                  <CardHeader className="relative z-[1] lg:block hidden">
                    <CardTitle className="flex items-center justify-start gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{dayName}</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-8 h-8 rounded-xl bg-white/50 dark:bg-white/5 backdrop-blur flex items-center justify-center font-medium">
                            {dayNumOfWeek(idx)}
                          </div>
                          {eventsForWeekdayName(dayKey).length > 0 && (
                            <Badge variant="secondary" className="h-8 px-2.5 rounded-xl flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-violet-500"></div>
                              <span>{eventsForWeekdayName(dayKey).length}</span>
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardTitle>
                    <CardDescription>{t('messages.upcoming')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {/* Mobile & Medium: Horizontal same-row layout for space efficiency */}
                    <div className="block lg:hidden">
                      {eventsForWeekdayName(dayKey).length === 0 ? (
                        <div className="flex items-start gap-3 h-12 pt-2">
                          {/* Left: Consistent day name and date layout */}
                          <div className="flex flex-col gap-1 flex-shrink-0 w-20 sm:w-24">
                            {/* Top row: Day name and date */}
                            <div className="flex items-center justify-start gap-2">
                              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 min-w-[2rem] text-left">
                                {dayName}
                              </span>
                              <div className="w-8 h-8 rounded-xl bg-white/50 dark:bg-white/5 backdrop-blur flex items-center justify-center font-medium text-lg">
                                {dayNumOfWeek(idx)}
                              </div>
                            </div>
                            {/* Bottom row: Empty space to maintain consistent height */}
                            <div className="h-6"></div>
                          </div>
                          {/* Right: No events message */}
                          <div className="flex-1 text-sm text-zinc-500 dark:text-zinc-400 ml-3">
                            {t('messages.noEvents')}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 pt-2">
                          {eventsForWeekdayName(dayKey).map((e, eventIdx) => (
                            <div key={e.id} className="flex items-start gap-3 min-h-[3rem]">
                              {/* Left: Day name, Date and Counter (only show on first event) */}
                              {eventIdx === 0 && (
                                <div className="flex flex-col gap-1 flex-shrink-0 w-20 sm:w-24">
                                  {/* Top row: Day name and date */}
                                  <div className="flex items-center justify-start gap-2">
                                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 min-w-[2rem] text-left">
                                      {dayName}
                                    </span>
                                    <div className="w-8 h-8 rounded-xl bg-white/50 dark:bg-white/5 backdrop-blur flex items-center justify-center font-medium text-lg">
                                      {dayNumOfWeek(idx)}
                                    </div>
                                  </div>
                                  {/* Bottom row: Events counter badge */}
                                  <Badge
                                    variant="secondary"
                                    className="h-6 px-2 rounded-xl flex items-center gap-1 self-start"
                                  >
                                    <div className="w-1 h-1 rounded-full bg-violet-500"></div>
                                    <span className="text-xs">{eventsForWeekdayName(dayKey).length}</span>
                                  </Badge>
                                </div>
                              )}
                              {/* Spacer for subsequent events to align with first event's content */}
                              {eventIdx > 0 && <div className="w-20 sm:w-24 flex-shrink-0"></div>}

                              {/* Right: Event content */}
                              <div
                                className="flex-1 group relative bg-white/70 dark:bg-white/5 p-2.5 rounded-xl cursor-pointer hover:bg-white/90 dark:hover:bg-white/10 transition-colors"
                                onClick={event => {
                                  if (e.eventType === 'schedule') {
                                    // For schedule events, show delete confirmation directly
                                    if (confirm(t('messages.deleteScheduleEvent'))) {
                                      removeSchedule(e.id);
                                    }
                                  } else {
                                    // For other events, show the options menu
                                    contextMenu.showContextMenu(e, event);
                                  }
                                }}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 overflow-hidden mb-1">
                                      <EventTypeIndicator event={e} />
                                      <span className="font-medium truncate text-sm">{e.title || e.type}</span>
                                    </div>
                                    <div className="text-xs text-zinc-500 truncate">
                                      {e.displayTime && `${e.displayTime} · `}
                                      {courses[e.courseIndex]}
                                      {e.location && ` · ${e.location}`}
                                      {e.weight && ` · ${e.weight}%`}
                                      {e.priority && ` · ${e.priority} priority`}
                                    </div>
                                  </div>
                                </div>
                                <EventTooltip event={e} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Large: Default vertical behavior */}
                    <div className="hidden lg:block space-y-2">
                      {eventsForWeekdayName(dayKey).map(e => (
                        <div
                          key={e.id}
                          className="group relative flex flex-row items-start justify-between gap-2 bg-white/70 dark:bg-white/5 p-3 rounded-xl mb-2 cursor-pointer hover:bg-white/90 dark:hover:bg-white/10 transition-colors"
                          onClick={event => {
                            if (e.eventType === 'schedule') {
                              // For schedule events, show delete confirmation directly
                              if (confirm(t('messages.deleteScheduleEvent'))) {
                                removeSchedule(e.id);
                              }
                            } else {
                              // For other events, show the options menu
                              contextMenu.showContextMenu(e, event);
                            }
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <EventTypeIndicator event={e} />
                              <span className="font-medium truncate text-sm">{e.title || e.type}</span>
                            </div>
                            <div className="text-xs text-zinc-500 truncate mt-0">
                              {e.displayTime && `${e.displayTime} · `}
                              {courses[e.courseIndex]}
                              <span className="inline">
                                {e.location && ` · ${e.location}`}
                                {e.weight && ` · ${e.weight}%`}
                                {e.priority && ` · ${e.priority} priority`}
                              </span>
                            </div>
                          </div>
                          <EventTooltip event={e} />
                        </div>
                      ))}
                      {eventsForWeekdayName(dayKey).length === 0 && (
                        <div className="text-sm text-zinc-500 dark:text-zinc-400">{t('messages.noEvents')}</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Present Goals Card - Only visible in weekly view */}
          <Card className="mt-6 rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                {t('goals.weeklyGoals')}
              </CardTitle>
              <CardDescription>{t('goals.weeklyFocusGoals')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Left Column - Goals List */}
                <div className="space-y-4">
                  {/* Add Goal Form */}
                  <div className="space-y-2">
                    <Label htmlFor="goalTitle" className="text-gray-700 dark:text-gray-300">
                      {t('goals.addGoal')}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="goalTitle"
                        value={goalForm.title}
                        onChange={e => setGoalForm({ title: e.target.value })}
                        placeholder={t('goals.goalPlaceholder')}
                        className="rounded-xl"
                        onKeyPress={e => e.key === 'Enter' && addGoal()}
                      />
                      <Button onClick={addGoal} size="sm" className="rounded-xl px-4">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Goals List */}
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {weeklyGoals.length === 0 ? (
                      <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-8 whitespace-pre-line">
                        {t('messages.noGoalsSet')}
                      </div>
                    ) : (
                      weeklyGoals.map(goal => (
                        <div
                          key={goal.id}
                          className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                            goal.completed
                              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                              : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700'
                          }`}
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleGoal(goal.id)}
                            className={`w-6 h-6 rounded-full border-2 p-0 ${
                              goal.completed
                                ? 'text-white hover:opacity-80'
                                : 'border-zinc-300 dark:border-zinc-600 hover:border-green-400'
                            }`}
                            style={
                              goal.completed
                                ? {
                                    backgroundColor: goal.color,
                                    borderColor: goal.color,
                                  }
                                : {}
                            }
                          >
                            {goal.completed && <span className="text-xs">✓</span>}
                          </Button>

                          <span
                            className={`flex-1 ${
                              goal.completed ? 'line-through text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'
                            }`}
                          >
                            {goal.title}
                          </span>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteGoal(goal.id)}
                            className="w-6 h-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Right Column - Water Fill Circle */}
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="relative w-32 h-32">
                    {/* Circle Container */}
                    <div
                      className="w-full h-full rounded-full border-4 bg-white dark:bg-zinc-900 overflow-hidden relative transition-all duration-1000"
                      style={{ borderColor: getBorderColor() }}
                    >
                      {/* Water Fill Animation */}
                      <div
                        className="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out"
                        style={{
                          height: `${fillPercentage}%`,
                          background: currentGradient,
                        }}
                      >
                        {/* Water Wave Effect */}
                        <div
                          className="absolute top-0 left-0 right-0 h-2 opacity-70"
                          style={{
                            background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.3) 0%, transparent 70%)',
                            animation: fillPercentage > 0 ? 'wave 2s ease-in-out infinite' : 'none',
                          }}
                        />
                      </div>

                      {/* Progress Text */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-lg font-bold text-zinc-700 dark:text-zinc-300">
                            {completedGoals}/{totalGoals}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">{t('messages.goals')}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {fillPercentage === 100 && totalGoals > 0 && (
                    <div className="text-sm font-medium text-green-600 dark:text-green-400 animate-pulse">
                      {t('messages.allGoalsCompletedStatus')}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {getShortDayNames().map((dayName, idx) => (
              <div key={DAYS[idx]} className="text-center py-2">
                {dayName}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-3">
            {matrix.map((date, i) => {
              const inMonth = date.getMonth() === monthView.month;
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isToday = date.toDateString() === today.toDateString();
              const dayEvents = getAllEventsForDate(date);
              const tooltipEvents = getAllEventsForTooltip(date); // For tooltip, show all events including hidden multi-day

              // Check if this day has any multi-day events for border color
              const allRegularEventsOnDay = tooltipEvents.filter(e => e.eventType === 'regular');
              const multiDayEventsOnDay = allRegularEventsOnDay.filter(
                e => e.isMultiDay !== false && e.endDate && e.endDate !== e.startDate
              );
              const hasMultiDayEvent = multiDayEventsOnDay.length > 0;
              const multiDayEventColor = hasMultiDayEvent ? multiDayEventsOnDay[0].color || '#6366f1' : null;

              return (
                <div
                  key={i}
                  className={`group relative rounded-xl p-2 sm:p-3 min-h-[80px] sm:min-h-[120px] bg-white/70 dark:bg-white/5 backdrop-blur border-2 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer ${
                    isToday
                      ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-900/20'
                      : 'border-transparent hover:border-violet-200 dark:hover:border-violet-700'
                  } ${inMonth ? '' : 'opacity-50'} ${hasMultiDayEvent ? 'border-t-4' : ''}`}
                  style={{
                    borderTopColor: hasMultiDayEvent ? multiDayEventColor : undefined,
                  }}
                  onClick={() => handleDayClick(date)}
                  title={t('messages.clickToCreate')}
                >
                  <div className="flex items-center justify-between mb-1 sm:mb-2">
                    <div
                      className={`text-base sm:text-lg font-bold ${
                        isToday ? 'text-violet-700 dark:text-violet-300' : 'text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      {date.getDate()}
                    </div>
                    {dayEvents.length > 0 && (
                      <Badge variant="secondary" className="text-xs rounded-full hidden sm:block">
                        {dayEvents.length}
                      </Badge>
                    )}
                  </div>

                  {/* Events counter positioned at 75% height on mobile */}
                  {dayEvents.length > 0 && (
                    <div className="absolute inset-x-0 bottom-0 top-1/2 flex items-center justify-center sm:hidden">
                      <Badge
                        variant="secondary"
                        className="text-xs rounded-full cursor-pointer"
                        onClick={event => {
                          event.stopPropagation(); // Prevent opening the add event dialog
                        }}
                      >
                        {dayEvents.length}
                      </Badge>
                    </div>
                  )}

                  <div className="space-y-1 hidden sm:block">
                    {dayEvents.slice(0, 4).map((e, idx) => (
                      <div
                        key={idx}
                        className="text-xs truncate flex items-center gap-1.5 p-1 rounded bg-white/50 dark:bg-white/10 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                        onClick={event => {
                          contextMenu.showContextMenu(e, event);
                        }}
                        title={t('messages.clickToEdit')}
                      >
                        <EventTypeIndicator event={e} />
                        <span className="font-medium truncate">{e.title || e.type}</span>
                      </div>
                    ))}
                    {dayEvents.length > 4 && (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
                        +{dayEvents.length - 4} {t('messages.moreEvents')}
                      </div>
                    )}
                  </div>

                  {/* Detailed hover tooltip */}
                  {tooltipEvents.length > 0 && (
                    <div className="absolute left-1/2 bottom-full mb-2 w-80 bg-white dark:bg-zinc-800 shadow-xl rounded-xl p-4 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform -translate-x-1/2 border border-white/20 dark:border-white/10">
                      <div className="mb-3">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">
                          {localizedFormatDate(date, { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                        <div className="text-sm text-zinc-500 dark:text-zinc-400">
                          {tooltipEvents.length} event{tooltipEvents.length !== 1 ? 's' : ''}
                        </div>
                      </div>

                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {tooltipEvents.map((e, idx) => (
                          <div key={idx} className="space-y-1 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-700/50">
                            <div className="flex items-center gap-2">
                              <EventTypeIndicator event={e} size="md" />
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
          {!showMultiDayEvents &&
            regularEvents.some(e => e.isMultiDay !== false && e.endDate && e.endDate !== e.startDate) && (
              <div className="mt-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
                  {t('messages.hiddenMultiDayEvents')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {regularEvents
                    .filter(
                      e =>
                        (filterCourse === 'all' || String(e.courseIndex) === filterCourse) &&
                        e.isMultiDay !== false &&
                        e.endDate &&
                        e.endDate !== e.startDate
                    )
                    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                    .map(event => (
                      <div
                        key={event.id}
                        className="bg-white/90 dark:bg-white/10 rounded-xl p-4 border-t-4 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                        style={{ borderTopColor: event.color || '#6366f1' }}
                        onClick={e => {
                          contextMenu.showContextMenu({ ...event, eventType: 'regular' }, e);
                        }}
                        title={t('messages.clickToEdit')}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{event.title}</div>
                            <div className="text-sm text-zinc-600 dark:text-zinc-300 space-y-1">
                              {event.courseIndex >= 0 && <div>📚 {courses[event.courseIndex]}</div>}
                              <div>
                                📅{' '}
                                {event.isMultiDay
                                  ? `${new Date(event.startDate).toLocaleDateString()} - ${new Date(
                                      event.endDate
                                    ).toLocaleDateString()}`
                                  : new Date(event.startDate).toLocaleDateString()}
                              </div>
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

      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <ReactConfetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={200}
            gravity={0.3}
          />
        </div>
      )}
    </div>
  );
}

// Shared event type indicator component
const EventTypeIndicator = ({ event, size = 'sm' }: { event: any; size?: 'sm' | 'md' }) => {
  const sizeClass = size === 'md' ? 'w-2.5 h-2.5' : 'w-2 h-2';

  if (event.eventType === 'schedule') {
    return <span className={`flex-shrink-0 inline-block rounded-full ${sizeClass} ${typeColors[event.type]}`}></span>;
  }
  if (event.eventType === 'exam') {
    return <span className={`flex-shrink-0 inline-block rounded-full bg-rose-500 ${sizeClass}`}></span>;
  }
  if (event.eventType === 'task') {
    return <span className={`flex-shrink-0 inline-block rounded-full bg-amber-500 ${sizeClass}`}></span>;
  }
  if (event.eventType === 'regular') {
    return (
      <span
        className={`flex-shrink-0 rounded-full ${sizeClass}`}
        style={{ backgroundColor: event.color || '#6366f1' }}
      ></span>
    );
  }
  return null;
};

// Shared event tooltip component
const EventTooltip = ({ event }: { event: any }) => {
  const { courses } = useCourses();
  <div
    style={{
      backgroundColor: 'var(--background, white)',
      zIndex: 99999,
      position: 'fixed',
      transform: 'translateY(-100%)',
      marginBottom: '8px',
      left: '50%',
      marginLeft: '-8rem', // half of w-64 (16rem)
    }}
    className="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-64 p-3 rounded-xl shadow-xl border border-white/20 dark:border-white/10"
  >
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <EventTypeIndicator event={event} />
        <span className="font-medium text-zinc-900 dark:text-zinc-100">{event.title || event.type}</span>
      </div>
      <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        <div>{courses[event.courseIndex]}</div>
        {event.displayTime && <div>{event.displayTime}</div>}
        {event.location && <div>{event.location}</div>}
        {event.weight && <div>Weight: {event.weight}%</div>}
        {event.priority && <div>Priority: {event.priority}</div>}
        {event.notes && <div className="italic mt-2">{event.notes}</div>}
      </div>
    </div>
    {/* Arrow */}
    <div className="absolute bottom-0 left-4 transform translate-y-full">
      <div
        style={{ backgroundColor: 'var(--background, white)' }}
        className="w-2 h-2 rotate-45 transform -translate-y-1 border-r border-b border-white/20 dark:border-white/10"
      ></div>
    </div>
  </div>;
};
