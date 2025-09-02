import { browserRuntime } from '@/lib/browser-runtime-stub';
import { BrowserStorageAdapter, HybridStorage, LocalStorageAdapter } from '@/lib/hybrid-storage';
import { showNotification, requestNotificationPermission } from '@/lib/notifications';
import { getNextPhase, shouldTransitionPhase, getTechniqueConfig } from '@/lib/technique-utils';
import { getNotificationTranslationAsync } from '@/lib/translation-utils';
import { uid } from '@/lib/utils';
import { BackgroundMessage_Timer, BackgroundTimerState, StudySession } from '@/types';
import { AudioKey, playAudio } from './audio';

const STORAGE_KEY = 'sp:studySessionTimerState';

const storage = new HybridStorage([BrowserStorageAdapter, LocalStorageAdapter]);
// const storage = new InMemoryAdapter();

export class StudySessionTimerManager {
  private timerState: BackgroundTimerState = {
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
    notificationsEnabled: true,
    phase: 'studying',
    phaseElapsed: 0,
    phaseStartTs: null,
    studyPhasesCompleted: 0,
    showCountdown: false,
  };

  private timerInterval: NodeJS.Timeout | null = null;

  constructor(private readonly onStateChange?: (state: BackgroundTimerState) => void) {
    this.initializeTimerState();
  }

  private setStorageValue(newValue: any) {
    if (newValue) {
      this.timerState = { ...this.timerState, ...newValue };

      if (this.timerState.running && this.timerState.startTs) {
        this.startTimerInterval();
      }
    }
  }

  // Load timer state from storage on startup
  private async initializeTimerState() {
    try {
      const result = await storage.getItem(STORAGE_KEY);
      this.setStorageValue(result);

      // If notifications are enabled but we haven't checked permissions, check them now
      if (this.timerState.notificationsEnabled) {
        this.requestNotificationPermissionIfNeeded();
      }

      // Set up storage change listener
      const storageChangeListener = (key: string, newValue: any) => {
        if (key === STORAGE_KEY && newValue) {
          try {
            this.setStorageValue(newValue);
            this.broadcastTimerState();
          } catch (error) {
            console.error('Failed to handle storage change:', error);
          }
        }
      };

      storage.addChangeListener(storageChangeListener);
    } catch (error) {
      console.error('Failed to load timer state:', error);
    }
  }

  private startTimerInterval() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerInterval = setInterval(() => {
      if (this.timerState.running && this.timerState.startTs && this.timerState.phaseStartTs) {
        const now = Date.now();
        this.timerState.elapsed = Math.floor((now - this.timerState.startTs) / 1000);
        this.timerState.phaseElapsed = Math.floor((now - this.timerState.phaseStartTs) / 1000);

        // Check if we need to transition to the next phase
        if (shouldTransitionPhase(this.timerState.technique, this.timerState.phase, this.timerState.phaseElapsed)) {
          this.transitionToNextPhase();
        } else {
          this.saveTimerState();
        }
      }
    }, 1000);
  }

  private stopTimerInterval() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private async transitionToNextPhase() {
    const currentPhase = this.timerState.phase;
    const nextPhase = getNextPhase(currentPhase, this.timerState.technique, this.timerState.studyPhasesCompleted);
    const now = Date.now();

    // Increment study phases counter when completing a studying phase
    if (currentPhase === 'studying') {
      this.timerState.studyPhasesCompleted++;
    }

    // Play sound when transitioning phases
    if (this.timerState.audioEnabled) {
      if (nextPhase === 'break' || nextPhase === 'longBreak') {
        await playNotificationSound('break', this.timerState.audioVolume);
      } else if (nextPhase === 'studying') {
        await playNotificationSound('start', this.timerState.audioVolume);
      }
    }

    // Show OS notification when transitioning phases
    await this.showPhaseTransitionNotification(currentPhase, nextPhase);

    // Update phase
    this.timerState.phase = nextPhase;
    this.timerState.phaseElapsed = 0;
    this.timerState.phaseStartTs = now;

    this.saveTimerState();
  }

  private async showPhaseTransitionNotification(currentPhase: string, nextPhase: string) {
    // Don't show notifications if disabled
    if (!this.timerState.notificationsEnabled) {
      return;
    }

    try {
      let title: string;
      let message: string;

      if (nextPhase === 'break') {
        const config = getTechniqueConfig(this.timerState.technique);
        title = await getNotificationTranslationAsync('timer.break');
        message = await getNotificationTranslationAsync('timer.breakMessage', { duration: config.breakMinutes });
      } else if (nextPhase === 'longBreak') {
        const config = getTechniqueConfig(this.timerState.technique);
        const longBreakDuration = config.longBreakMinutes || config.breakMinutes;
        title = await getNotificationTranslationAsync('timer.longBreak');
        message = await getNotificationTranslationAsync('timer.longBreakMessage', { duration: longBreakDuration });
      } else if (nextPhase === 'studying') {
        if (currentPhase === 'break' || currentPhase === 'longBreak') {
          title = await getNotificationTranslationAsync('timer.backToStudy');
          message = await getNotificationTranslationAsync('timer.backToStudyMessage');
        } else {
          title = await getNotificationTranslationAsync('timer.sessionStart');
          message = await getNotificationTranslationAsync('timer.sessionStartMessage');
        }
      } else {
        // Fallback for any other phase transitions
        title = await getNotificationTranslationAsync('timer.timerUpdate');
        message = await getNotificationTranslationAsync('timer.phaseTransition', {
          currentPhase,
          nextPhase,
        });
      }

      await showNotification({
        title,
        message,
        icon: '/hearticon.png',
        requireInteraction: false,
        silent: !this.timerState.audioEnabled, // Respect audio settings for notification sound
      });
    } catch (error) {
      console.error('Failed to show phase transition notification:', error);
    }
  }

  private async saveTimerState() {
    await storage.setItem(STORAGE_KEY, this.timerState);
    this.broadcastTimerState();
  }

  private broadcastTimerState() {
    this.onStateChange?.(this.timerState);

    // Send message to other extension contexts (popup, sidepanel, etc.)
    sendBackgroundMessage({
      type: 'timer.broadcastState',
      state: this.timerState,
    });
  }

  public async startTimer(courseId: string) {
    const now = Date.now();

    this.timerState.running = true;
    this.timerState.elapsed = 0;
    this.timerState.startTs = now;
    this.timerState.courseId = courseId;
    this.timerState.phase = 'studying';
    this.timerState.phaseElapsed = 0;
    this.timerState.phaseStartTs = now;

    // Play start sound if audio is enabled
    if (this.timerState.audioEnabled) {
      await playNotificationSound('start', this.timerState.audioVolume);
    }

    // Show start notification if enabled (permissions should already be handled)
    if (this.timerState.notificationsEnabled) {
      await showNotification({
        title: await getNotificationTranslationAsync('timer.started'),
        message: await getNotificationTranslationAsync('timer.startedMessage'),
        icon: '/hearticon.png',
        requireInteraction: false,
        silent: !this.timerState.audioEnabled,
      });
    }

    this.startTimerInterval();
    this.saveTimerState();
  }

  public async stopTimer(): Promise<{ session: any } | null> {
    if (!this.timerState.running || !this.timerState.startTs) {
      return null;
    }

    const endTs = Date.now();
    const durationMin = Math.max(1, Math.round(this.timerState.elapsed / 60));

    // No completion sound when manually stopping - only play break sound during phase transitions

    const session: StudySession = {
      id: uid(),
      courseId: this.timerState.courseId,
      startTs: this.timerState.startTs,
      endTs,
      durationMin,
      technique: this.timerState.technique,
      note: this.timerState.note,
      moodStart: this.timerState.moodStart,
      moodEnd: this.timerState.moodEnd,
    };

    // Reset timer state
    this.timerState.running = false;
    this.timerState.elapsed = 0;
    this.timerState.startTs = null;
    this.timerState.note = '';
    this.timerState.phase = 'studying';
    this.timerState.phaseElapsed = 0;
    this.timerState.phaseStartTs = null;
    this.timerState.studyPhasesCompleted = 0;
    this.timerState.moodStart = 3;
    this.timerState.moodEnd = 3;

    this.stopTimerInterval();
    await this.saveTimerState();

    return { session };
  }

  public async resetTimer() {
    const now = Date.now();
    this.timerState.elapsed = 0;
    this.timerState.phaseElapsed = 0;
    this.timerState.phase = 'studying';
    this.timerState.studyPhasesCompleted = 0;

    if (this.timerState.running && this.timerState.startTs) {
      this.timerState.startTs = now;
      this.timerState.phaseStartTs = now;
    }
    await this.saveTimerState();
  }

  public updateTimerSettings(settings: Partial<BackgroundTimerState>) {
    this.timerState = { ...this.timerState, ...settings };

    // If notifications were just enabled, request permission immediately
    if (settings.notificationsEnabled === true) {
      this.requestNotificationPermissionIfNeeded();
    }

    this.saveTimerState();
  }

  private async requestNotificationPermissionIfNeeded() {
    try {
      const permission = await requestNotificationPermission();
      if (permission === 'denied') {
        console.warn('Notification permissions denied - disabling notifications');
        // Automatically disable notifications if permission is denied
        this.timerState.notificationsEnabled = false;
        this.saveTimerState();
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    }
  }

  public getTimerState(): BackgroundTimerState {
    return { ...this.timerState };
  }

  // Handle timer-related messages from background script
  public handleMessage(message: BackgroundMessage_Timer, sendResponse: (response: any) => void) {
    switch (message.type) {
      case 'timer.start':
        this.startTimer(message.courseId).then(() => {
          sendResponse({ success: true, state: this.getTimerState() });
        });
        break;

      case 'timer.stop':
        this.stopTimer().then(result => {
          sendResponse({ success: true, state: this.getTimerState(), session: result?.session });
        });
        break;

      case 'timer.reset':
        this.resetTimer().then(() => {
          sendResponse({ success: true, state: this.getTimerState() });
        });
        break;

      case 'timer.getState':
        sendResponse({ success: true, state: this.getTimerState() });
        break;

      case 'timer.updateState':
        const {
          technique,
          note,
          moodStart,
          moodEnd,
          audioEnabled,
          audioVolume,
          notificationsEnabled,
          showCountdown,
          courseId,
        } = message;
        this.updateTimerSettings({
          ...(courseId !== undefined && { courseId }),
          ...(technique && { technique }),
          ...(note !== undefined && { note }),
          ...(moodStart !== undefined && { moodStart }),
          ...(moodEnd !== undefined && { moodEnd }),
          ...(audioEnabled !== undefined && { audioEnabled }),
          ...(audioVolume !== undefined && { audioVolume }),
          ...(notificationsEnabled !== undefined && { notificationsEnabled }),
          ...(showCountdown !== undefined && { showCountdown }),
        });
        sendResponse({ success: true, state: this.getTimerState() });
        break;

      default:
        // Not a timer message, return false to indicate it wasn't handled
        return false;
    }

    // Return true to indicate the message was handled
    return true;
  }
}

/**
 * Play audio notification - works in both extension and web contexts
 */
async function playNotificationSound(soundType: AudioKey, volume: number = 0.6): Promise<void> {
  try {
    await playAudio(soundType, volume);
  } catch (error) {
    console.error(`[Audio] Failed to play ${soundType}:`, error);
  }
}

/**
 * Helper function to safely broadcast messages, ignoring errors when no listeners are active
 */
function sendBackgroundMessage(message: BackgroundMessage_Timer): void {
  try {
    browserRuntime.sendMessage(message).catch(() => {
      // Ignore errors if no listeners are active
    });
  } catch (error) {
    // Runtime not available, ignore
  }
}
