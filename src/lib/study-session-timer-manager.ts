import { browserRuntime } from '@/lib/browser-runtime-stub';
import { BrowserStorageAdapter, HybridStorage, InMemoryAdapter, LocalStorageAdapter } from '@/lib/hybrid-storage';
import { uid } from '@/lib/utils';
import { BackgroundMessage_Timer, BackgroundTimerState, StudySession } from '@/types';
import { AudioKey, playAudio } from './audio';

const STORAGE_KEY = 'sp:studySessionTimerState';

// const storage = new HybridStorage([BrowserStorageAdapter, LocalStorageAdapter]);
const storage = new InMemoryAdapter();

export class StudySessionTimerManager {
  private timerState: BackgroundTimerState = {
    running: false,
    elapsed: 0,
    technique: 'Pomodoro 25/5',
    moodStart: 3,
    moodEnd: 3,
    note: '',
    startTs: null,
    courseId: '',
    audioEnabled: true,
    audioVolume: 0.6,
  };

  private timerInterval: NodeJS.Timeout | null = null;

  constructor() {
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
      if (this.timerState.running && this.timerState.startTs) {
        this.timerState.elapsed = Math.floor((Date.now() - this.timerState.startTs) / 1000);
        this.saveTimerState();
      }
    }, 1000);
  }

  private stopTimerInterval() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private async saveTimerState() {
    await storage.setItem(STORAGE_KEY, this.timerState);
    this.broadcastTimerState();
  }

  private broadcastTimerState() {
    sendBackgroundMessage({
      type: 'timer.broadcastState',
      state: this.timerState,
    });
  }

  public async startTimer(courseId: string) {
    this.timerState.running = true;
    this.timerState.elapsed = 0;
    this.timerState.startTs = Date.now();
    this.timerState.courseId = courseId;

    // Play start sound if audio is enabled
    if (this.timerState.audioEnabled) {
      await playNotificationSound('start', this.timerState.audioVolume);
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

    // Play completion sound if audio is enabled
    if (this.timerState.audioEnabled) {
      await playNotificationSound('complete', this.timerState.audioVolume);
    }

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

    this.stopTimerInterval();
    this.saveTimerState();

    return { session };
  }

  public resetTimer() {
    this.timerState.elapsed = 0;
    if (this.timerState.running && this.timerState.startTs) {
      this.timerState.startTs = Date.now();
    }
    this.saveTimerState();
  }

  public updateTimerSettings(settings: Partial<BackgroundTimerState>) {
    this.timerState = { ...this.timerState, ...settings };
    this.saveTimerState();
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
        this.resetTimer();
        sendResponse({ success: true, state: this.getTimerState() });
        break;

      case 'timer.getState':
        sendResponse({ success: true, state: this.getTimerState() });
        break;

      case 'timer.updateState':
        const { technique, note, moodStart, moodEnd, audioEnabled, audioVolume } = message;
        this.updateTimerSettings({
          ...(technique && { technique }),
          ...(note !== undefined && { note }),
          ...(moodStart !== undefined && { moodStart }),
          ...(moodEnd !== undefined && { moodEnd }),
          ...(audioEnabled !== undefined && { audioEnabled }),
          ...(audioVolume !== undefined && { audioVolume }),
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
