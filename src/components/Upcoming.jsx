import { Badge } from '@/components/ui/badge';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function Upcoming({ exams, tasks, courses, expanded, onTaskComplete, onExamClick, onTaskClick }) {
  const upcomingExams = useMemo(() => {
    const sorted = exams.slice().sort((a, b) => a.date.localeCompare(b.date));
    const baseCount = 3;
    const additionalCount = expanded * 3;
    return sorted.slice(0, baseCount + additionalCount);
  }, [exams, expanded]);

  const upcomingTasks = useMemo(() => {
    const filtered = tasks
      .slice()
      .filter(t => !t.done)
      .sort((a, b) => a.due.localeCompare(b.due));
    const baseCount = 5;
    const additionalCount = expanded * 3;
    return filtered.slice(0, baseCount + additionalCount);
  }, [tasks, expanded]);

  // Check if there are more items to show
  const allExams = useMemo(() => exams.slice().sort((a, b) => a.date.localeCompare(b.date)), [exams]);
  const allTasks = useMemo(
    () =>
      tasks
        .slice()
        .filter(t => !t.done)
        .sort((a, b) => a.due.localeCompare(b.due)),
    [tasks]
  );

  const hasMoreExams = allExams.length > upcomingExams.length;
  const hasMoreTasks = allTasks.length > upcomingTasks.length;
  const hasMore = hasMoreExams || hasMoreTasks;

  // Helper function to calculate D-Day
  const calculateDDay = dateString => {
    if (!dateString) return null;
    const targetDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate - today;
    let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    // Add 1 day to all calculations
    diffDays = diffDays + 1;

    if (diffDays === 0) return 'D-DAY';
    if (diffDays > 0) return `D-${diffDays}`;
    return `D+${Math.abs(diffDays)}`;
  };

  // Swipeable Task Component - Memoized for stability
  const SwipeableTask = React.memo(({ task, index, courses, calculateDDay, onComplete, onClick }) => {
    const [dragX, setDragX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const dragRef = useRef(0);
    const isDraggingRef = useRef(false);

    const COMPLETE_THRESHOLD = 80; // Drag 80px right to complete

    const handleStart = e => {
      e.preventDefault();
      const clientX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
      setStartX(clientX);
      setIsDragging(true);
      isDraggingRef.current = true;
      dragRef.current = 0;
    };

    const handleMove = e => {
      if (!isDraggingRef.current) return;

      e.preventDefault();
      const clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
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

    const handleEnd = e => {
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
        key={task.id}
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
                {courses[task.courseIndex]} · {task.priority}
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
                  setActiveTab('courses');
                  setSelectedCourse(e.courseIndex);
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
            {upcomingTasks.map((t, index) => (
              <SwipeableTask
                key={t.id}
                task={t}
                index={index}
                courses={courses}
                calculateDDay={calculateDDay}
                onComplete={onTaskComplete}
                onClick={() => onTaskClick && onTaskClick(t)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
