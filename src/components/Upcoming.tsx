import { Badge } from '@/components/ui/badge';
import { useLocalization } from '@/hooks/useLocalization';
import { useCourses, useExams, useTasks } from '@/hooks/useStore';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import SwipeableTask from './SwipeableTask';
import SwipeableExam from './SwipeableExam';
import { Task } from '@/types';

interface UpcomingProps {
  expanded: number;
  onTaskComplete?: (taskId: string) => void;
  onExamComplete?: (examId: string) => void;
  onTaskClick?: (task: any) => void;
  onTabChange?: (tab: string) => void;
  onCourseSelect?: (courseId: string) => void;
}

export default function Upcoming({
  expanded,
  onTaskComplete,
  onExamComplete,
  onTaskClick,
  onTabChange,
  onCourseSelect,
}: UpcomingProps) {
  const { t } = useTranslation('common');
  const { formatDateDDMMYYYY } = useLocalization();
  const { getCourseTitle } = useCourses();
  const { tasks, toggleTask } = useTasks();
  const { exams, toggleExamComplete } = useExams();

  const upcomingExams = useMemo(() => {
    const filtered = [...exams].filter(e => !e.completed);
    const sorted = filtered.sort((a, b) => a.date.localeCompare(b.date));
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
  const allExams = useMemo(() => [...exams].filter(e => !e.completed).sort((a, b) => a.date.localeCompare(b.date)), [exams]);
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

    if (diffDays === 0) return t('upcoming.dDay');
    if (diffDays > 0) return `D-${diffDays}`;
    return `D+${Math.abs(diffDays)}`;
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">{t('upcoming.exams')}</div>
        <div className="space-y-2">
          {upcomingExams.length === 0 && <div className="text-sm text-zinc-500">{t('upcoming.noExams')}</div>}
          <AnimatePresence mode="popLayout">
            {upcomingExams.map((e, index) => (
              <SwipeableExam
                key={e.id}
                exam={e}
                index={index}
                expanded={expanded}
                calculateDDay={calculateDDay}
                onComplete={onExamComplete || toggleExamComplete}
                onClick={() => {
                  onTabChange?.('courses');
                  onCourseSelect?.(e.courseId);
                }}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">{t('upcoming.tasks')}</div>
        <div className="space-y-2">
          {upcomingTasks.length === 0 && <div className="text-sm text-zinc-500">{t('upcoming.noTasks')}</div>}
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
