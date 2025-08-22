import { EventTypeIndicator } from '@/components/PlannerSharedComponents';
import { Badge } from '@/components/ui/badge';
import { useLocalization } from '@/hooks/useLocalization';
import { useCourses, useRegularEvents, useSchedule } from '@/hooks/useStore';
import { useTranslation } from 'react-i18next';
import { CalendarView } from '../types';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

interface PlannerMonthViewProps {
  monthView: CalendarView;
  matrix: Date[];
  filterCourse: string;
  showMultiDayEvents: boolean;
  getAllEventsForDate: (date: Date) => any[];
  getAllEventsForTooltip: (date: Date) => any[];
  handleDayClick: (date: Date) => void;
  eventDialog: any;
}

export function PlannerMonthView({
  monthView,
  matrix,
  filterCourse,
  showMultiDayEvents,
  getAllEventsForDate,
  getAllEventsForTooltip,
  handleDayClick,
  eventDialog,
}: PlannerMonthViewProps) {
  const { getCourseTitle } = useCourses();
  const { regularEvents } = useRegularEvents();
  const { removeSchedule } = useSchedule();
  const { t } = useTranslation('planner');
  const { getShortDayNames, formatDate: localizedFormatDate, formatDateDDMMYYYY } = useLocalization();

  return (
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
                      event.stopPropagation();
                      if (e.eventType === 'schedule') {
                        // For schedule events, show delete confirmation directly
                        if (confirm(t('messages.deleteScheduleEvent'))) {
                          removeSchedule(e.id);
                        }
                      } else {
                        // For other events, directly open edit dialog
                        eventDialog.openEditDialog(e);
                      }
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
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{e.title || e.type}</span>
                        </div>

                        <div className="text-sm text-zinc-600 dark:text-zinc-300 ml-4">
                          <div className="font-medium">{getCourseTitle(e.courseId)}</div>
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
                    (filterCourse === 'all' || e.courseId === filterCourse) &&
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
                      e.stopPropagation();
                      eventDialog.openEditDialog({ ...event, eventType: 'regular' });
                    }}
                    title={t('messages.clickToEdit')}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{event.title}</div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-300 space-y-1">
                          {event.courseId && <div>📚 {getCourseTitle(event.courseId)}</div>}
                          <div>
                            📅{' '}
                            {event.isMultiDay
                              ? `${formatDateDDMMYYYY(event.startDate)} - ${formatDateDDMMYYYY(event.endDate)}`
                              : formatDateDDMMYYYY(event.startDate)}
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
  );
}
