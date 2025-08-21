import { useCourses } from '@/hooks/useStore';

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

// Shared event type indicator component
export const EventTypeIndicator = ({ event, size = 'sm' }: { event: any; size?: 'sm' | 'md' }) => {
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
export const EventTooltip = ({ event }: { event: any }) => {
  const { getCourseTitle } = useCourses();
  return (
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
          <div>{getCourseTitle(event.courseId)}</div>
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
    </div>
  );
};
