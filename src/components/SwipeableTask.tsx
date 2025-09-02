import { Badge } from '@/components/ui/badge';
import SwipeableItem from '@/components/ui/swipeable-item';
import { useLocalization } from '@/hooks/useLocalization';
import { useCourses } from '@/hooks/useStore';
import { Task } from '@/types';
import { AlertTriangle } from 'lucide-react';
import React from 'react';

interface SwipeableTaskProps {
  key: string; // Unique key for React
  task: Task;
  index: number;
  expanded: number;
  calculateDDay: (dateString: string) => string | null;
  onComplete: (taskId: string) => void;
  onClick?: () => void;
}

const SwipeableTask = React.forwardRef<HTMLDivElement, SwipeableTaskProps>(function SwipeableTask(
  { task, index, expanded, calculateDDay, onComplete, onClick },
  ref
) {
  const { getCourseTitle } = useCourses();
  const { formatDateDDMMYYYY } = useLocalization();

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

  return (
    <SwipeableItem
      ref={ref}
      index={index}
      expanded={expanded}
      onComplete={() => onComplete(task.id)}
      onClick={onClick}
      itemStyle={{
        borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
      }}
      itemClassName="border-l-4 rounded-r-xl"
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-medium">{task.title}</span>
          <span className="text-xs text-zinc-500">
            {getCourseTitle(task.courseId)} · {task.priority}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="rounded-full">
            due {formatDateDDMMYYYY(task.due)}
          </Badge>
          <Badge
            variant="outline"
            className={`rounded-full text-xs font-mono flex items-center gap-1 ${
              calculateDDay(task.due)?.startsWith('D+')
                ? 'border-yellow-400 text-yellow-700 bg-yellow-50 dark:border-yellow-500 dark:text-yellow-400 dark:bg-yellow-900/20'
                : ''
            }`}
          >
            {calculateDDay(task.due)?.startsWith('D+') && <AlertTriangle className="w-3 h-3" />}
            {calculateDDay(task.due)}
          </Badge>
        </div>
      </div>
    </SwipeableItem>
  );
});

export default SwipeableTask;
