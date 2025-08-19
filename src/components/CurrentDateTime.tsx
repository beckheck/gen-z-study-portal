import React, { useEffect, useState } from 'react';

/**
 * Current Date and Time Component
 * Displays the current date and time, updating every second
 */
export default function CurrentDateTime(): React.ReactElement {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="text-right">
      <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{formatDate(currentTime)}</div>
      <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">{formatTime(currentTime)}</div>
    </div>
  );
}
