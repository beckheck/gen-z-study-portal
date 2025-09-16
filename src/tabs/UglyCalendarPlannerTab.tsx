import '@/components/UglyCalendar.css';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCourses, useItems } from '@/hooks/useStore';
import { ItemDialogTrigger } from '@/items/ItemDialogTrigger';
import { ItemDialog } from '@/items/base/dialog';
import { Item } from '@/items/models';
import { getTimetableInstancesBetween, ItemTimetable } from '@/items/timetable/modelSchema';
import { useItemDialog } from '@/items/useItemDialog';
import { getDateString } from '@/lib/date-utils';
import { addDays, endOfMonth, endOfWeek, format, getDay, parse, startOfMonth, startOfWeek } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { CalendarDays, Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useTranslation } from 'react-i18next';

// Set up the localizer for react-big-calendar
const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Event interface for react-big-calendar
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Item;
  allDay?: boolean;
  type: 'task' | 'exam' | 'event' | 'timetable';
}

// -----------------------------
// Ugly Calendar Planner
// -----------------------------

export default function UglyCalendarPlannerTab() {
  const { courses } = useCourses();
  const { items } = useItems();

  const { t } = useTranslation('common');

  const [showMultiDayEvents, setShowMultiDayEvents] = useState<boolean>(true);
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState<Date>(new Date());

  const itemDialog = useItemDialog();

  // Helper function to get the visible date range based on current view and date
  const getVisibleDateRange = useCallback(() => {
    let rangeStart: Date;
    let rangeEnd: Date;

    switch (view) {
      case Views.WEEK:
        rangeStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday start
        rangeEnd = endOfWeek(date, { weekStartsOn: 1 });
        break;
      case Views.MONTH:
        // For month view, we need to include the full calendar grid (6 weeks)
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);
        rangeStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        rangeEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
        break;
      case Views.AGENDA:
        // For agenda view, show current month + next month
        rangeStart = startOfMonth(date);
        rangeEnd = endOfMonth(addDays(date, 30));
        break;
      default:
        // Default to current month
        rangeStart = startOfMonth(date);
        rangeEnd = endOfMonth(date);
    }

    return { rangeStart, rangeEnd };
  }, [view, date]);

  // Convert items to calendar events
  const events = useMemo((): CalendarEvent[] => {
    const { rangeStart, rangeEnd } = getVisibleDateRange();

    return items
      .filter(item => filterCourse === 'all' || item.courseId === filterCourse)
      .flatMap(item => {
        // get course name
        const courseId = item.courseId;
        const course = courses.find(c => c.id === courseId);
        const courseName = course ? course.title : 'No Course';
        if (item.type === 'event') {
          return [
            {
              id: item.id,
              title: item.title || '',
              start: item.startsAt,
              end: item.endsAt,
              resource: item,
              allDay: item.isAllDay,
              type: item.type,
            } as CalendarEvent,
          ];
        }
        if (item.type === 'exam' && !item.isCompleted) {
          const startDate = new Date(item.startsAt);
          const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2-hour exam
          return [
            {
              id: item.id,
              title: `${t('items:exam.title')}: ${item.title || ''}`,
              start: startDate,
              end: endDate,
              resource: item,
              allDay: false,
              type: item.type,
            } as CalendarEvent,
          ];
        }
        if (item.type === 'task' && !item.isCompleted) {
          const dueDate = new Date(item.dueAt);
          return [
            {
              id: item.id,
              title: `${t('items:task.title')}: ${item.title || ''}`,
              start: dueDate,
              end: dueDate,
              resource: item,
              allDay: true,
              type: item.type,
            } as CalendarEvent,
          ];
        }
        if (item.type === 'timetable') {
          // Generate timetable instances for the visible date range
          const instances = getTimetableInstancesBetween(
            item as ItemTimetable,
            rangeStart,
            rangeEnd,
            'America/Santiago'
          );
          return instances.map(
            instance =>
              ({
                id: `${item.id}-${instance.startsAt.getTime()}`, // Unique ID for each instance
                title: `${item.title}: ${courseName}` || '',
                start: instance.startsAt,
                end: instance.endsAt,
                resource: item, // Keep reference to original timetable item
                allDay: false,
                type: item.type,
              } as CalendarEvent)
          );
        }
        return [];
      })
      .filter(Boolean);
  }, [items, filterCourse, showMultiDayEvents, t, getVisibleDateRange]);

  // Handle slot selection (creating new events)
  const handleSelectSlot = useCallback(
    ({ start, end }: { start: Date; end: Date }) => {
      const startDateString = getDateString(start);
      const endDateString = getDateString(end);

      itemDialog.openAddDialog('event', {
        startsAt: startDateString,
        startsAtTime: format(start, 'HH:mm'),
        endsAt: endDateString,
        endsAtTime: format(end, 'HH:mm'),
        isAllDay: false,
      });
    },
    [itemDialog]
  );

  // Handle event selection
  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      itemDialog.openEditDialog(event.resource);
    },
    [itemDialog]
  );

  // Event style getter for different item types
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    let backgroundColor = '#3174ad';
    let borderColor = '#3174ad';

    if (event.resource.color) {
      backgroundColor = event.resource.color;
      borderColor = event.resource.color;
    } else {
      switch (event.type) {
        case 'exam':
          backgroundColor = '#dc2626'; // red
          borderColor = '#dc2626';
          break;
        case 'task':
          backgroundColor = '#059669'; // green
          borderColor = '#059669';
          break;
        case 'event':
          backgroundColor = '#2563eb'; // blue
          borderColor = '#2563eb';
          break;
        case 'timetable':
          backgroundColor = '#7c3aed'; // purple
          borderColor = '#7c3aed';
          break;
      }
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        color: 'white',
        border: 'none',
        borderRadius: '4px',
      },
    };
  }, []);

  // Custom toolbar
  const CustomToolbar = ({ date, view, onNavigate, onView }: any) => {
    const goToBack = () => {
      if (view === Views.MONTH) {
        onNavigate('PREV');
      } else if (view === Views.WEEK) {
        onNavigate('PREV');
      } else {
        onNavigate('PREV');
      }
    };

    const goToNext = () => {
      if (view === Views.MONTH) {
        onNavigate('NEXT');
      } else if (view === Views.WEEK) {
        onNavigate('NEXT');
      } else {
        onNavigate('NEXT');
      }
    };

    const goToToday = () => onNavigate('TODAY');

    return (
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Select value={filterCourse} onValueChange={setFilterCourse}>
            <SelectTrigger className="w-48 rounded-xl">
              <SelectValue placeholder={t('planner:filters.filterByCourse')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('planner:filters.allCourses')}</SelectItem>
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
            variant={view === Views.WEEK ? 'default' : 'outline'}
            onClick={() => onView(Views.WEEK)}
            className="rounded-xl"
          >
            {t('planner:views.week')}
          </Button>
          <Button
            variant={view === Views.MONTH ? 'default' : 'outline'}
            onClick={() => onView(Views.MONTH)}
            className="rounded-xl"
          >
            {t('planner:views.month')}
          </Button>
          <Button
            variant={view === Views.AGENDA ? 'default' : 'outline'}
            onClick={() => onView(Views.AGENDA)}
            className="rounded-xl"
          >
            {t('planner:views.agenda')}
          </Button>

          <div className="flex items-center gap-2 ml-2">
            <Button variant="outline" onClick={goToBack} className="rounded-xl">
              <CalendarDays className="w-4 h-4 mr-2" />
              {t('actions.previous')}
            </Button>
            <div className="font-medium px-4">{format(date, 'MMMM yyyy')}</div>
            <Button variant="outline" onClick={goToNext} className="rounded-xl">
              {t('actions.next')}
              <CalendarDays className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="ghost" onClick={goToToday} className="rounded-xl">
              {t('actions.today')}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={showMultiDayEvents}
              onCheckedChange={setShowMultiDayEvents}
              className="data-[state=checked]:bg-blue-600"
            />
            <Label className="text-sm text-gray-900 dark:text-gray-100">
              {t('planner:filters.showMultiDayEvents')}
            </Label>
          </div>
          <ItemDialogTrigger itemType="event" onOpenDialog={() => itemDialog.openAddDialog('event')}>
            <Button className="rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              {t('items:event.actions.add')}
            </Button>
          </ItemDialogTrigger>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="h-[calc(100vh-8rem)]">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          eventPropGetter={eventStyleGetter}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          components={{
            toolbar: CustomToolbar,
          }}
          step={30}
          timeslots={2}
          defaultView={Views.MONTH}
          views={[Views.MONTH, Views.WEEK, Views.AGENDA]}
          messages={{
            next: t('actions.next'),
            previous: t('actions.previous'),
            today: t('actions.today'),
            month: t('planner:views.month'),
            week: t('planner:views.week'),
            agenda: t('planner:views.agenda'),
            date: t('planner:labels.date'),
            time: t('planner:labels.time'),
            event: t('planner:labels.event'),
            noEventsInRange: t('planner:messages.noEventsInRange'),
            showMore: (total: number) => `+${total} ${t('planner:labels.more')}`,
          }}
        />
      </div>

      <ItemDialog
        open={itemDialog.open}
        onOpenChange={itemDialog.onOpenChange}
        editingItem={itemDialog.editingItem}
        itemType={itemDialog.itemType}
        form={itemDialog.form}
        hidden={itemDialog.hidden}
        disabled={itemDialog.disabled}
        availableItemTypes={itemDialog.availableItemTypes}
        onTypeChange={itemDialog.handleChangeItemType}
        onSave={itemDialog.handleSave}
        onDelete={itemDialog.handleDelete}
      />
    </div>
  );
}
