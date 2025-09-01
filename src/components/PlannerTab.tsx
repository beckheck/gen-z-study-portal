import { EventDialog } from '@/components/EventDialog';
import { EventDialogTrigger } from '@/components/EventDialogTrigger';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useEventDialog } from '@/hooks/useEventDialog';
import { useLocalization } from '@/hooks/useLocalization';
import { useCourses, useExams, useRegularEvents, useSchedule, useTasks } from '@/hooks/useStore';
import { CalendarDays, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarView } from '../types';
import { PlannerMonthView } from './PlannerMonthView';
import { PlannerWeekView } from './PlannerWeekView';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

// -----------------------------
// Planner (Week + Month views)
// -----------------------------

export default function PlannerTab() {
  const { courses } = useCourses();
  const { tasks } = useTasks();
  const { exams } = useExams();
  const { regularEvents } = useRegularEvents();
  const { eventsForDay } = useSchedule();

  // Localization hooks
  const { t } = useTranslation('planner');
  const { t: tCommon } = useTranslation('common');
  const { getShortDayNames, getShortMonthNames, getMonthNames, formatDate: localizedFormatDate } = useLocalization();

  const [showMultiDayEvents, setShowMultiDayEvents] = useState<boolean>(false);
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [view, setView] = useState<'week' | 'month'>('month');
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Event dialog hook
  const eventDialog = useEventDialog();

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

  // Handle day click to create new event with pre-filled date
  const handleDayClick = (date: Date): void => {
    const dateString = date.toISOString().split('T')[0];
    eventDialog.openDialog({ startDate: dateString });
  };

  // Helper: get all events for a specific date
  function getAllEventsForDate(date: Date): any[] {
    const events = [];
    const dateStr = date.toISOString().split('T')[0];
    const dayName = DAYS[(date.getDay() + 6) % 7];

    // Regular schedule events
    const scheduleEvents = eventsForDay(dayName)
      .filter(e => filterCourse === 'all' || e.courseId === filterCourse)
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
          (filterCourse === 'all' || e.courseId === filterCourse) &&
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
      .filter(e => e.date === dateStr && (filterCourse === 'all' || e.courseId === filterCourse))
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
      .filter(t => t.due === dateStr && !t.done && (filterCourse === 'all' || t.courseId === filterCourse))
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
      .filter(e => filterCourse === 'all' || e.courseId === filterCourse)
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
          (filterCourse === 'all' || e.courseId === filterCourse)
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
      .filter(e => e.date === dateStr && (filterCourse === 'all' || e.courseId === filterCourse))
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
      .filter(t => t.due === dateStr && !t.done && (filterCourse === 'all' || t.courseId === filterCourse))
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
              {courses.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
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
                {localizedFormatDate(startOfWeek, { month: 'short', day: 'numeric' })} -{' '}
                {localizedFormatDate(new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000), {
                  month: 'short',
                  day: 'numeric',
                })}
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
          <EventDialogTrigger onOpenDialog={() => eventDialog.openDialog()}>
            <Button className="rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              {t('events.addEvent')}
            </Button>
          </EventDialogTrigger>

          <EventDialog
            open={eventDialog.open}
            onOpenChange={eventDialog.onOpenChange}
            form={eventDialog.form}
            setForm={eventDialog.setForm}
            editingEvent={eventDialog.editingEvent}
            onSave={eventDialog.handleSave}
            onDelete={eventDialog.handleDelete}
          />
        </div>
      </div>

      {/* Views */}
      {view === 'week' ? (
        <PlannerWeekView
          startOfWeek={startOfWeek}
          getAllEventsForDate={getAllEventsForDate}
          handleDayClick={handleDayClick}
          eventDialog={eventDialog}
        />
      ) : (
        <PlannerMonthView
          monthView={monthView}
          matrix={matrix}
          filterCourse={filterCourse}
          showMultiDayEvents={showMultiDayEvents}
          getAllEventsForDate={getAllEventsForDate}
          getAllEventsForTooltip={getAllEventsForTooltip}
          handleDayClick={handleDayClick}
          eventDialog={eventDialog}
        />
      )}
    </div>
  );
}
