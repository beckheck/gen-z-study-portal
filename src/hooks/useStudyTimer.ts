import { uid } from '@/lib/utils';
import { Session, StudyTimer } from '@/types';
import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook for managing study timer functionality
 * @param onSessionComplete - Callback function called when a study session is completed
 */
export default function useStudyTimer(onSessionComplete: (session: Session) => void): StudyTimer {
  const [running, setRunning] = useState<boolean>(false);
  const [elapsed, setElapsed] = useState<number>(0); // seconds
  const [technique, setTechnique] = useState<string>('Pomodoro 25/5');
  const [moodStart, setMoodStart] = useState<number>(3);
  const [moodEnd, setMoodEnd] = useState<number>(3);
  const [note, setNote] = useState<string>('');
  const startRef = useRef<number | null>(null);

  // Timer effect - runs the timer when active
  useEffect(() => {
    let t: number;
    if (running) {
      if (!startRef.current) startRef.current = Date.now();
      t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current!) / 1000)), 1000);
    }
    return () => t && clearInterval(t);
  }, [running]);

  function startTimer(): void {
    setElapsed(0);
    startRef.current = Date.now();
    setRunning(true);
  }

  function resetTimer(): void {
    setElapsed(0);
    startRef.current = Date.now();
  }

  function stopTimer(selectedCourse: number): void {
    if (!running) return;

    const endTs = Date.now();
    const durationMin = Math.max(1, Math.round(elapsed / 60));
    setRunning(false);
    setElapsed(0);
    const startTime = startRef.current!;
    startRef.current = null;
    setNote('');

    // Create session object
    const session: Session = {
      id: uid(),
      courseIndex: selectedCourse,
      startTs: startTime,
      endTs,
      durationMin,
      technique,
      note,
    };

    // Call the callback to update sessions
    if (onSessionComplete) {
      onSessionComplete(session);
    }
  }

  return {
    // State
    running,
    elapsed,
    technique,
    moodStart,
    moodEnd,
    note,

    // Setters
    setTechnique,
    setMoodStart,
    setMoodEnd,
    setNote,

    // Actions
    startTimer,
    resetTimer,
    stopTimer,
  };
}
