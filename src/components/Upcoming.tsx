import { useLocalization } from '@/hooks/useLocalization';
import { useCourses, useExams, useTasks } from '@/hooks/useStore';
import { Task } from '@/types';
import { AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import SwipeableExam from './SwipeableExam';
import SwipeableTask from './SwipeableTask';

interface UpcomingProps {
  expanded: number;
  hidePending?: boolean;
  showOnlyPending?: boolean;
  onTaskComplete?: (taskId: string) => void;
  onExamComplete?: (examId: string) => void;
  onTaskClick?: (task: any) => void;
  onTabChange?: (tab: string) => void;
  onCourseSelect?: (courseId: string) => void;
}

export default function Upcoming({
  expanded,
  hidePending = false,
  showOnlyPending = false,
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let filtered = [...exams].filter(e => !e.completed);
    
    if (showOnlyPending) {
      // Show only overdue exams
      filtered = filtered.filter(e => {
        const examDate = new Date(e.date);
        examDate.setHours(0, 0, 0, 0);
        return examDate.getTime() < today.getTime();
      });
    } else if (hidePending) {
      // Hide overdue exams
      filtered = filtered.filter(e => {
        const examDate = new Date(e.date);
        examDate.setHours(0, 0, 0, 0);
        return examDate.getTime() >= today.getTime();
      });
    }
    
    const sorted = filtered.sort((a, b) => a.date.localeCompare(b.date));
    const baseCount = showOnlyPending ? 50 : 5; // Changed from 3 to 5 to match tasks
    const additionalCount = expanded * 3;
    return sorted.slice(0, baseCount + additionalCount);
  }, [exams, expanded, hidePending, showOnlyPending]);

  const upcomingTasks: Task[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let filtered = [...tasks].filter(t => !t.done);
    
    if (showOnlyPending) {
      // Show only overdue tasks
      filtered = filtered.filter(t => {
        if (!t.due) return false;
        const taskDate = new Date(t.due);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() < today.getTime();
      });
    } else if (hidePending) {
      // Hide overdue tasks
      filtered = filtered.filter(t => {
        if (!t.due) return true; // Tasks without due date are not overdue
        const taskDate = new Date(t.due);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() >= today.getTime();
      });
    }
    
    const sorted = filtered.sort((a, b) => a.due.localeCompare(b.due));
    const baseCount = showOnlyPending ? 50 : 5; // Show more pending items when expanded
    const additionalCount = expanded * 3;
    return sorted.slice(0, baseCount + additionalCount);
  }, [tasks, expanded, hidePending, showOnlyPending]);

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
