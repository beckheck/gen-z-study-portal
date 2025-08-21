import { Badge } from '@/components/ui/badge';
import { useCourses } from '@/hooks/useStore';
import { Task } from '@/types';
import { motion } from 'framer-motion';
import { AlertTriangle, Check } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

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
  const [dragX, setDragX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [startX, setStartX] = useState<number>(0);
  const dragRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  const COMPLETE_THRESHOLD = 80; // Drag 80px right to complete

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const clientX =
      e.type === 'mousedown' ? (e as React.MouseEvent).clientX : (e as React.TouchEvent).touches[0].clientX;
    setStartX(clientX);
    setIsDragging(true);
    isDraggingRef.current = true;
    dragRef.current = 0;
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingRef.current) return;

    e.preventDefault();
    const clientX =
      e.type === 'mousemove' ? (e as React.MouseEvent).clientX : (e as React.TouchEvent).touches[0].clientX;
    const deltaX = clientX - startX;

    // Only allow right swipe (positive values) with smoother updates
    if (deltaX >= 0) {
      const newDragX = Math.min(deltaX, 120); // Max drag distance
      dragRef.current = newDragX;

      // Use requestAnimationFrame for smoother updates
      requestAnimationFrame(() => {
        setDragX(newDragX);
      });
    }
  };

  const handleEnd = (e?: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingRef.current) return;

    e?.preventDefault();
    isDraggingRef.current = false;

    const finalDragX = dragRef.current;

    if (finalDragX >= COMPLETE_THRESHOLD) {
      // Complete the task
      onComplete(task.id);
    }

    // Reset position smoothly
    setIsDragging(false);
    setDragX(0);
    dragRef.current = 0;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isDraggingRef.current = false;
      dragRef.current = 0;
    };
  }, []);

  const completionProgress = Math.abs(dragX) / Math.abs(COMPLETE_THRESHOLD);
  const shouldComplete = dragX >= COMPLETE_THRESHOLD;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, height: 0, y: -10 }}
      animate={{ opacity: 1, height: 'auto', y: 0 }}
      exit={{ opacity: 0, height: 0, y: -10 }}
      transition={{
        duration: 0.3,
        ease: 'easeInOut',
        delay: expanded > 0 ? index * 0.05 : 0,
      }}
      className="relative overflow-hidden rounded-xl"
      style={{ position: 'relative' }} // Ensure positioning context
    >
      {/* Background action area - only show when dragging */}
      <div
        className="absolute inset-0 flex items-center justify-start pl-4 pointer-events-none"
        style={{
          background:
            isDragging && dragX > 0
              ? shouldComplete
                ? 'linear-gradient(270deg, #10b981, #059669)'
                : `linear-gradient(270deg, rgba(16, 185, 129, ${completionProgress * 0.3}), rgba(5, 150, 105, ${
                    completionProgress * 0.5
                  }))`
              : 'transparent',
          opacity: isDragging && dragX > 0 ? 1 : 0,
          transition: isDragging ? 'none' : 'opacity 0.2s ease-out',
        }}
      >
        {isDragging && dragX > 0 && (
          <Check className={`w-6 h-6 ${shouldComplete ? 'text-white' : 'text-emerald-600'}`} />
        )}
      </div>

      {/* Task item */}
      <div
        className="relative bg-white/70 dark:bg-white/5 p-3 cursor-pointer hover:bg-white/80 dark:hover:bg-white/10 transition-colors will-change-transform"
        style={{
          transform: `translate3d(${dragX}px, 0, 0)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          zIndex: 1,
          position: 'relative',
        }}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        onTouchCancel={handleEnd}
        onClick={e => {
          if (Math.abs(dragX) < 5 && onClick) {
            // Only trigger click if not dragging
            onClick();
          }
        }}
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
              due {task.due}
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
      </div>
    </motion.div>
  );
});

export default SwipeableTask;
