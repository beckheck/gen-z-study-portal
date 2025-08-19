import { Badge } from '@/components/ui/badge';
import { useCourses, useExams, useTasks } from '@/hooks/useStore';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';
import SwipeableTask from './SwipeableTask';
import { Task } from '@/types';

interface UpcomingProps {
  expanded: number;
  onTaskComplete?: (taskId: string) => void;
  onTaskClick?: (task: any) => void;
  onTabChange?: (tab: string) => void;
  onCourseSelect?: (courseIndex: number) => void;
}

export default function Upcoming({
  expanded,
  onTaskComplete,
  onTaskClick,
  onTabChange,
  onCourseSelect,
}: UpcomingProps) {
  const { courses } = useCourses();
  const { tasks, toggleTask } = useTasks();
  const { exams } = useExams();

  const upcomingExams = useMemo(() => {
    const sorted = [...exams].sort((a, b) => a.date.localeCompare(b.date));
    const baseCount = 3;
    const additionalCount = expanded * 3;
    return sorted.slice(0, baseCount + additionalCount);
  }, [exams, expanded]);

  const upcomingTasks: Task[] = useMemo(() => {
    const filtered = [...tasks].filter(t => !t.done).sort((a, b) => a.due.localeCompare(b.due));
    const baseCount = 5;
    const additionalCount = expanded * 3;
    return filtered.slice(0, baseCount + additionalCount);
  }, [tasks, expanded]);

  // Check if there are more items to show
  const allExams = useMemo(() => [...exams].sort((a, b) => a.date.localeCompare(b.date)), [exams]);
  const allTasks = useMemo(() => [...tasks].filter(t => !t.done).sort((a, b) => a.due.localeCompare(b.due)), [tasks]);

  const hasMoreExams = allExams.length > upcomingExams.length;
  const hasMoreTasks = allTasks.length > upcomingTasks.length;
  const hasMore = hasMoreExams || hasMoreTasks;

  // Helper function to calculate D-Day
  const calculateDDay = (dateString: string): string | null => {
    if (!dateString) return null;
    const targetDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    // Add 1 day to all calculations
    diffDays = diffDays + 1;

    if (diffDays === 0) return 'D-DAY';
    if (diffDays > 0) return `D-${diffDays}`;
    return `D+${Math.abs(diffDays)}`;
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Exams</div>
        <div className="space-y-2">
          {upcomingExams.length === 0 && <div className="text-sm text-zinc-500">No exams scheduled yet.</div>}
          <AnimatePresence mode="popLayout">
            {upcomingExams.map((e, index) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{
                  duration: 0.3,
                  ease: 'easeInOut',
                  delay: expanded > 0 ? index * 0.05 : 0,
                }}
                className="flex items-center justify-between bg-white/70 dark:bg-white/5 rounded-xl p-3 overflow-hidden cursor-pointer hover:bg-white/80 dark:hover:bg-white/10 transition-colors"
                onClick={() => {
                  onTabChange?.('courses');
                  onCourseSelect?.(e.courseIndex);
                }}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{e.title}</span>
                  <span className="text-xs text-zinc-500">
                    {courses[e.courseIndex]} · {e.weight || 0}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="rounded-full">
                    {e.date}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`rounded-full text-xs font-mono flex items-center gap-1 ${
                      calculateDDay(e.date)?.startsWith('D+')
                        ? 'border-yellow-400 text-yellow-700 bg-yellow-50 dark:border-yellow-500 dark:text-yellow-400 dark:bg-yellow-900/20'
                        : ''
                    }`}
                  >
                    {calculateDDay(e.date)?.startsWith('D+') && <AlertTriangle className="w-3 h-3" />}
                    {calculateDDay(e.date)}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Tasks</div>
        <div className="space-y-2">
          {upcomingTasks.length === 0 && (
            <div className="text-sm text-zinc-500">No tasks due soon. Love that for you ✨</div>
          )}
          <AnimatePresence mode="popLayout">
            {upcomingTasks.map((t, index) => {
              return (
                <SwipeableTask
                  key={t.id}
                  task={t}
                  index={index}
                  expanded={expanded}
                  calculateDDay={calculateDDay}
                  onComplete={onTaskComplete || toggleTask}
                  onClick={() => onTaskClick && onTaskClick(t)}
                />
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
