import { Badge } from '@/components/ui/badge';
import { useLocalization } from '@/hooks/useLocalization';
import { useCourses } from '@/hooks/useStore';
import { Exam } from '@/types';
import { motion } from 'framer-motion';
import { AlertTriangle, Check } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface SwipeableExamProps {
  key: string; // Unique key for React
  exam: Exam;
  index: number;
  expanded: number;
  calculateDDay: (dateString: string) => string | null;
  onComplete: (examId: string) => void;
  onClick?: () => void;
}

const SwipeableExam = React.forwardRef<HTMLDivElement, SwipeableExamProps>(function SwipeableExam(
  { exam, index, expanded, calculateDDay, onComplete, onClick },
  ref
) {
  const { getCourseTitle } = useCourses();
  const { formatDateDDMMYYYY } = useLocalization();
  const [dragX, setDragX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [startX, setStartX] = useState<number>(0);
  const dragRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const preventClickRef = useRef<boolean>(false);

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
    const hadSignificantDrag = Math.abs(finalDragX) >= 5;

    // Set prevent click flag if there was significant drag movement
    if (hadSignificantDrag) {
      preventClickRef.current = true;
      // Reset the flag after a short delay to allow future clicks
      setTimeout(() => {
        preventClickRef.current = false;
      }, 100);
    }

    if (finalDragX >= COMPLETE_THRESHOLD) {
      // Complete the exam
      onComplete(exam.id);
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
      preventClickRef.current = false;
    };
  }, []);

  const completionProgress = Math.abs(dragX) / Math.abs(COMPLETE_THRESHOLD);
  const shouldComplete = dragX >= COMPLETE_THRESHOLD;
  const animationsEnabled = expanded > 0;

  return (
    <motion.div
      ref={ref}
      initial={animationsEnabled ? { opacity: 0, height: 0, y: -10 } : false}
      animate={animationsEnabled ? { opacity: 1, height: 'auto', y: 0 } : false}
      exit={animationsEnabled ? { opacity: 0, height: 0, y: -10 } : false}
      transition={
        animationsEnabled
          ? {
              duration: 0.3,
              ease: 'easeInOut',
              delay: expanded > 0 ? index * 0.05 : 0,
            }
          : undefined
      }
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

      {/* Exam item */}
      <div
        className="relative bg-white/70 dark:bg-white/5 p-3 cursor-pointer hover:bg-white/80 dark:hover:bg-white/10 transition-colors will-change-transform rounded-xl"
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
          // Only trigger click if there was no recent swipe gesture and not currently dragging
          if (!isDraggingRef.current && !preventClickRef.current && onClick) {
            onClick();
          }
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-medium">{exam.title}</span>
            <span className="text-xs text-zinc-500">
              {getCourseTitle(exam.courseId)} · {exam.weight || 0}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full">
              {formatDateDDMMYYYY(exam.date)}
            </Badge>
            <Badge
              variant="outline"
              className={`rounded-full text-xs font-mono flex items-center gap-1 ${
                calculateDDay(exam.date)?.startsWith('D+')
                  ? 'border-yellow-400 text-yellow-700 bg-yellow-50 dark:border-yellow-500 dark:text-yellow-400 dark:bg-yellow-900/20'
                  : ''
              }`}
            >
              {calculateDDay(exam.date)?.startsWith('D+') && <AlertTriangle className="w-3 h-3" />}
              {calculateDDay(exam.date)}
            </Badge>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export default SwipeableExam;
