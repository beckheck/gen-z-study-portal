import { browserRuntime, browserRuntimeStub, isExtension } from '@/lib/browser-runtime-stub';
import { StudySessionTimerManager } from '@/lib/study-session-timer-manager';
import { BackgroundMessage_Timer, BackgroundTimerState, StudySession } from '@/types';
import { useCallback, useEffect, useState } from 'react';

let studySessionTimerManager: StudySessionTimerManager | undefined = undefined;

if (!isExtension) {
  studySessionTimerManager = new StudySessionTimerManager();
}

function sendBackgroundMessage(message: BackgroundMessage_Timer) {
  return browserRuntime.sendMessage(message);
}

/**
 * Helper function to handle background message responses with consistent error handling
 */
function handleBackgroundResponse(
  responsePromise: Promise<any>,
  operation: string,
  onSuccess?: (response: any) => void
): Promise<void> {
  return responsePromise
    .then(response => {
      if (response?.success) {
        onSuccess?.(response);
      }
    })
    .catch(error => {
      console.error(`[useStudyTimer] Failed to ${operation}:`, error);
    });
}

/**
 * Study timer object with state and methods for tracking study sessions
 */
interface StudyTimer {
  timerState: BackgroundTimerState;
  /** Function to set the study technique */
  setTechnique: (technique: string) => void;
  /** Function to set the starting mood */
  setMoodStart: (mood: number) => void;
  /** Function to set the ending mood */
  setMoodEnd: (mood: number) => void;
  /** Function to set session notes */
  setNote: (note: string) => void;
  /** Function to set audio notifications enabled/disabled */
  setAudioEnabled: (enabled: boolean) => void;
  /** Function to set audio notification volume */
  setAudioVolume: (volume: number) => void;
  /** Function to set countdown display mode */
  setShowCountdown: (showCountdown: boolean) => void;
  /** Function to start the timer */
  startTimer: () => void;
  /** Function to stop the timer with course index */
  stopTimer: (courseId: string) => void;
  /** Function to reset the timer */
  resetTimer: () => void;
}

/**
 * Custom hook for managing study timer functionality using background script
 * @param onSessionComplete - Callback function called when a study session is completed
 * @param selectedCourseId - The currently selected course ID for timer operations
 */
export default function useStudyTimer(
  onSessionComplete: (session: StudySession) => void,
  selectedCourseId?: string
): StudyTimer {
  const [timerState, setTimerState] = useState<BackgroundTimerState>({
    running: false,
    elapsed: 0,
    technique: 'pomodoro-25-5',
    moodStart: 3,
    moodEnd: 3,
    note: '',
    startTs: null,
    courseId: '',
    audioEnabled: true,
    audioVolume: 0.6,
    phase: 'studying',
    phaseElapsed: 0,
    phaseStartTs: null,
    showCountdown: false,
  });

  // Initialize timer state from background on mount
  useEffect(() => {
    const initializeTimer = async () => {
      await handleBackgroundResponse(
        sendBackgroundMessage({ type: 'timer.getState' }),
        'initialize timer state',
        response => response.state && setTimerState(response.state)
      );
    };

    initializeTimer();
  }, []);

  // Listen for timer state updates from background
  useEffect(() => {
    const handleMessage = (message: BackgroundMessage_Timer, sender: any, sendResponse: any) => {
      if (message.type === 'timer.broadcastState') {
        setTimerState(prevState => {
          // If we have an optimistic note update, preserve the local note value
          return message.state;
        });
      }
    };

    let timerManagerListener: any = null;

    if (studySessionTimerManager) {
      timerManagerListener = (message: BackgroundMessage_Timer, sender: any, sendResponse: any) => {
        return studySessionTimerManager.handleMessage(message, sendResponse);
      };
      browserRuntimeStub.onMessage.addListener(timerManagerListener);
    }
    browserRuntime.onMessage.addListener(handleMessage);

    return () => {
      if (timerManagerListener) {
        browserRuntimeStub.onMessage.removeListener(timerManagerListener);
      }
      browserRuntime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const startTimer = useCallback(async (): Promise<void> => {
    // Use the provided selectedCourseId or fall back to stored courseId
    const courseId = selectedCourseId || timerState.courseId || 'default';

    await handleBackgroundResponse(
      sendBackgroundMessage({ type: 'timer.start', courseId }),
      'start timer',
      response => response.state && setTimerState(response.state)
    );
  }, [selectedCourseId, timerState.courseId]);

  const stopTimer = useCallback(
    async (selectedCourseId: string): Promise<void> => {
      await handleBackgroundResponse(sendBackgroundMessage({ type: 'timer.stop' }), 'stop timer', response => {
        if (response.state) {
          setTimerState(response.state);
        }
        if (response.session && onSessionComplete) {
          onSessionComplete(response.session);
        }
      });
    },
    [onSessionComplete]
  );

  const resetTimer = useCallback(async (): Promise<void> => {
    await handleBackgroundResponse(
      sendBackgroundMessage({ type: 'timer.reset' }),
      'reset timer',
      response => response.state && setTimerState(response.state)
    );
  }, []);

  const setTechnique = useCallback(async (technique: string): Promise<void> => {
    await handleBackgroundResponse(
      sendBackgroundMessage({ type: 'timer.updateState', technique }),
      'update technique',
      response => response.state && setTimerState(response.state)
    );
  }, []);

  const setNote = useCallback(async (note: string): Promise<void> => {
    // Optimistic update - update local state immediately to prevent cursor jumping
    setTimerState(prev => ({ ...prev, note }));

    // Then sync with background
    await handleBackgroundResponse(sendBackgroundMessage({ type: 'timer.updateState', note }), 'update note');
  }, []);

  // Local state setters for mood - these need to be synced to background immediately
  const setMoodStart = useCallback((mood: number): void => {
    handleBackgroundResponse(sendBackgroundMessage({ type: 'timer.updateState', moodStart: mood }), 'update moodStart');
  }, []);

  const setMoodEnd = useCallback((mood: number): void => {
    handleBackgroundResponse(sendBackgroundMessage({ type: 'timer.updateState', moodEnd: mood }), 'update moodEnd');
  }, []);

  const setAudioEnabled = useCallback((enabled: boolean): void => {
    handleBackgroundResponse(
      sendBackgroundMessage({ type: 'timer.updateState', audioEnabled: enabled }),
      'update audioEnabled'
    );
  }, []);

  const setAudioVolume = useCallback((volume: number): void => {
    handleBackgroundResponse(
      sendBackgroundMessage({ type: 'timer.updateState', audioVolume: volume }),
      'update audioVolume'
    );
  }, []);

  const setShowCountdown = useCallback((showCountdown: boolean): void => {
    handleBackgroundResponse(
      sendBackgroundMessage({ type: 'timer.updateState', showCountdown }),
      'update showCountdown'
    );
  }, []);

  return {
    // State
    timerState,

    // Setters
    setTechnique,
    setMoodStart,
    setMoodEnd,
    setNote,
    setAudioEnabled,
    setAudioVolume,
    setShowCountdown,

    // Actions
    startTimer,
    resetTimer,
    stopTimer,
  };
}
