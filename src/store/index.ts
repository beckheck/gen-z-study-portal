import { uid } from '@/lib/utils';
import i18next from 'i18next';
import { proxy, snapshot, subscribe } from 'valtio';
import { DataTransfer } from '../lib/data-transfer';
import { hybridStorage } from '../lib/indexeddb-storage';
import type { AppState, DegreePlan, MoodEmojis, WeatherLocation } from '../types';

// Translation helper for store loading messages
const tLoadingScreen = (key: string, options?: { adapter?: string }) => {
  return i18next.t(`common:loadingScreen.${key}`, options);
};

// Default values
const DEFAULT_COURSES = [
  'Calculus',
  'Chemistry',
  'Linear Algebra',
  'Economics',
  'Programming',
  'Elective',
  'Optional Course',
].map(c => ({
  id: uid(),
  title: c,
}));

const DEFAULT_MOOD_EMOJIS: MoodEmojis = {
  angry: { emoji: '😠', color: '#ff6b6b', word: 'Angry' },
  sad: { emoji: '😔', color: '#ff9f43', word: 'Sad' },
  neutral: { emoji: '😐', color: '#f7dc6f', word: 'Neutral' },
  happy: { emoji: '🙂', color: '#45b7d1', word: 'Happy' },
  excited: { emoji: '😁', color: '#10ac84', word: 'Excited' },
};

const DEFAULT_DEGREE_PLAN: DegreePlan = {
  name: 'Degree Plan',
  semesters: [],
  completedCourses: [],
};

const DEFAULT_WEATHER_LOCATION: WeatherLocation = {
  useGeolocation: true,
  city: '',
};

// Create the initial state with proper defaults
function createInitialState(): AppState {
  // Detect system preference for dark mode
  const prefersDark =
    typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  return {
    // Core data
    sessions: [],
    exams: [],
    examGrades: [],
    tasks: [],
    schedule: [],
    timetableEvents: [],
    regularEvents: [],
    sessionTasks: [],
    weeklyGoals: [],
    courses: [...DEFAULT_COURSES],
    selectedCourseId: DEFAULT_COURSES[0]?.id,

    // Theme configuration
    theme: {
      darkMode: prefersDark,
      bgImage: '',
      accentColor: { light: '#7c3aed', dark: '#8b5cf6' },
      cardOpacity: { light: 0.8, dark: 0.25 },
      gradientEnabled: true,
      gradientStart: { light: '#ffd2e9', dark: '#18181b' },
      gradientMiddle: { light: '#bae6fd', dark: '#0f172a' },
      gradientEnd: { light: '#a7f3d0', dark: '#1e293b' },
    },

    // External services
    soundtrack: {
      embed: '',
      position: 'dashboard',
    },
    weather: {
      apiKey: '',
      location: { ...DEFAULT_WEATHER_LOCATION },
    },

    // Academic planning
    degreePlan: { ...DEFAULT_DEGREE_PLAN },

    // Wellness tracking
    wellness: {
      water: 0,
      gratitude: '',
      moodPercentages: {},
      hasInteracted: false,
      monthlyMoods: {},
      showWords: true,
      moodEmojis: { ...DEFAULT_MOOD_EMOJIS },
    },
  };
}

// Migration map for localStorage keys
const MIGRATION_MAP = {
  // Core data
  'sp:courses': (value: any) => ({ courses: value }),
  'sp:schedule': (value: any) => ({ schedule: value }),
  'sp:timetableEvents': (value: any) => ({ timetableEvents: value }),
  'sp:tasks': (value: any) => ({ tasks: value }),
  'sp:exams': (value: any) => ({ exams: value }),
  'sp:examGrades': (value: any) => ({ examGrades: value }),
  'sp:regularEvents': (value: any) => ({ regularEvents: value }),
  'sp:sessions': (value: any) => ({ sessions: value }),
  'sp:sessionTasks': (value: any) => ({ sessionTasks: value }),
  'sp:selectedCourse': (value: any) => ({ selectedCourse: value }),
  'sp:degreePlan': (value: any) => ({ degreePlan: value }),

  // Theme settings
  'sp:dark': (value: any) => ({ theme: { darkMode: value } }),
  'sp:bgImage': (value: any) => ({ theme: { bgImage: value } }),
  'sp:accentColor': (value: any) => ({ theme: { accentColor: value } }),
  'sp:cardOpacity': (value: any) => ({ theme: { cardOpacity: value } }),
  'sp:gradientEnabled': (value: any) => ({ theme: { gradientEnabled: value } }),
  'sp:gradientStart': (value: any) => ({ theme: { gradientStart: value } }),
  'sp:gradientMiddle': (value: any) => ({ theme: { gradientMiddle: value } }),
  'sp:gradientEnd': (value: any) => ({ theme: { gradientEnd: value } }),

  // External services
  'sp:soundtrackEmbed': (value: any) => ({ soundtrack: { embed: value, position: 'dashboard' } }),
  'sp:weatherApiKey': (value: any) => ({ weatherApiKey: value }),
  'sp:weatherLocation': (value: any) => ({ weatherLocation: value }),

  // Wellness data
  'sp:water': (value: any) => ({ wellness: { water: value } }),
  'sp:gratitude': (value: any) => ({ wellness: { gratitude: value } }),
  'sp:moodPercentages': (value: any) => ({ wellness: { moodPercentages: value } }),
  'sp:moodInteracted': (value: any) => ({ wellness: { hasInteracted: value } }),
  'sp:monthlyMoods': (value: any) => ({ wellness: { monthlyMoods: value } }),
  'sp:showMoodWords': (value: any) => ({ wellness: { showWords: value } }),
  'sp:moodEmojis': (value: any) => ({ wellness: { moodEmojis: value } }),
};

// Load and migrate existing localStorage data
function migrateFromLocalStorage(): Partial<AppState> {
  const migratedState: any = {};

  // Migrate each localStorage key
  Object.entries(MIGRATION_MAP).forEach(([key, migrator]) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        const value = JSON.parse(raw);
        const migrated = migrator(value);

        // Deep merge the migrated data
        Object.keys(migrated).forEach(stateKey => {
          if (stateKey === 'wellness' && migratedState.wellness) {
            migratedState.wellness = { ...migratedState.wellness, ...migrated[stateKey] };
          } else if (stateKey === 'theme' && migratedState.theme) {
            migratedState.theme = { ...migratedState.theme, ...migrated[stateKey] };
          } else {
            migratedState[stateKey] = migrated[stateKey];
          }
        });
      }
    } catch (error) {
      console.warn(`Failed to migrate localStorage key ${key}:`, error);
    }
  });

  return migratedState;
}

// Loading state for UI (needs to be declared before loadState)
export const storeLoadingState = proxy<{
  isLoading: boolean;
  error: string | null;
  status: string;
}>({
  isLoading: true,
  error: null,
  status: tLoadingScreen('initializingStorage'),
});

// Load state from hybrid storage (IndexedDB or localStorage) or create initial state
async function loadState(): Promise<AppState> {
  try {
    // Initialize hybrid storage and handle migration
    storeLoadingState.status = tLoadingScreen('checkingStorageCompatibility');
    await hybridStorage.initialize();

    storeLoadingState.status = tLoadingScreen('loadingFromStorage', { adapter: hybridStorage.getCurrentAdapter() });
    const exchangeDataString =
      localStorage.getItem('sp:appStateExchange') || (await hybridStorage.getItem('sp:appStateExchange'));
    if (exchangeDataString) {
      const exchangeData = JSON.parse(exchangeDataString);
      let state = createInitialState();
      const dataTransfer: DataTransfer = new DataTransfer(
        () => state,
        newState => {
          state = { ...state, ...newState };
        }
      );
      storeLoadingState.status = tLoadingScreen('restoringData');
      dataTransfer.importData(exchangeData);
      return state;
    }

    // Fallback: try to load from the old centralized localStorage key
    storeLoadingState.status = tLoadingScreen('checkingLegacyStorage');
    const centralizedRaw = localStorage.getItem('sp:appState');
    if (centralizedRaw) {
      const parsed = JSON.parse(centralizedRaw);
      const oldWeather = {
        apiKey: parsed.weatherApiKey || '',
        location: parsed.weatherLocation || { ...DEFAULT_WEATHER_LOCATION },
      };

      // Ensure all required fields exist by merging with defaults
      const initialState = createInitialState();
      const mergedState = {
        ...initialState,
        ...parsed,
        // Deep merge theme and wellness objects to preserve default values
        theme: { ...initialState.theme, ...parsed.theme },
        soundtrack: { ...initialState.soundtrack, ...parsed.soundtrack },
        weather: { ...initialState.weather, ...oldWeather, ...parsed.weather },
        wellness: { ...initialState.wellness, ...parsed.wellness },
        weeklyGoals: parsed.weeklyGoals || [],
        degreePlan: { ...initialState.degreePlan, ...parsed.degreePlan },
      };

      if (mergedState.soundtrack?.position === 'hidden') {
        mergedState.soundtrack.position = 'dashboard';
      }

      return mergedState;
    }

    // Final fallback: try to migrate from old localStorage keys
    storeLoadingState.status = tLoadingScreen('migratingLegacyData');
    const migratedState = migrateFromLocalStorage();
    const initialState = createInitialState();

    const mergedState = {
      ...initialState,
      ...migratedState,
      // Deep merge theme, soundtrack, and wellness objects to preserve default values
      theme: { ...initialState.theme, ...migratedState.theme },
      soundtrack: { ...initialState.soundtrack, ...migratedState.soundtrack },
      weather: { ...initialState.weather, ...migratedState.weather },
      wellness: { ...initialState.wellness, ...migratedState.wellness },
      weeklyGoals: migratedState.weeklyGoals || [],
      degreePlan: { ...initialState.degreePlan, ...migratedState.degreePlan },
    };

    // If we migrated data, save it to the new storage and clean up old keys
    if (Object.keys(migratedState).length > 0) {
      removeDeprecatedLocalStorageItems();
      // Save migrated data to hybrid storage
      const exchangeData = new DataTransfer(
        () => mergedState,
        () => {}
      ).exportData();
      await hybridStorage.setItem('sp:appStateExchange', JSON.stringify(exchangeData));
    }

    return mergedState;
  } catch (error) {
    console.error('Failed to load state from storage:', error);
    const fallbackState = createInitialState();
    return fallbackState;
  }
}

// Create the Valtio store
const initialState = createInitialState();
export const store = proxy<AppState>(initialState);

// Load state asynchronously and update store
storeLoadingState.status = tLoadingScreen('loadingHybridStorage');
loadState()
  .then(loadedState => {
    storeLoadingState.status = tLoadingScreen('updatingApplicationState');
    isApplyingFromStorage = true; // Prevent persistence during initial load
    updateProxyFromState(store, loadedState, false);
    isApplyingFromStorage = false;

    storeLoadingState.isLoading = false;
    storeLoadingState.status = tLoadingScreen('ready');
    storeLoadingState.error = null;

    // Mark store as ready to enable persistence
    isStoreReady = true;

    // Do initial persistence to ensure data is saved in hybrid storage
    persistStore().catch(error => {
      console.error('Failed to persist initial state:', error);
    });
  })
  .catch(error => {
    console.error('Failed to load initial state:', error);
    storeLoadingState.isLoading = false;
    storeLoadingState.error = error.message || 'Failed to load application data';
    storeLoadingState.status = tLoadingScreen('errorOccurred');

    // Even on error, mark store as ready to enable persistence of fallback state
    isStoreReady = true;
  });

// Function to update the store state (for data import)
export const patchStoreState = (newState: Partial<AppState>) => {
  updateProxyFromState(store, newState, true);
};

// Data transfer instance for import/export
export const dataTransfer: DataTransfer = new DataTransfer(
  // Get state callback - return the current state snapshot
  () => snapshot(store) as any,
  // Set state callback - update the entire store state using patchStoreState
  newState => {
    patchStoreState(newState);
  }
);

// Flag to track if we're currently applying changes from storage
let isApplyingFromStorage = false;
let isStoreReady = false;

// Subscribe to changes and persist to localStorage (only after store is ready)
subscribe(store, () => {
  // Skip persistence if this change came from a storage event or store is not ready yet
  if (isApplyingFromStorage || !isStoreReady) {
    return;
  }
  persistStore().catch(error => {
    console.error('Failed to persist store changes:', error);
  });
});

export function persistStore(): Promise<void> {
  if (!isStoreReady) {
    return Promise.reject(new Error('Store not ready yet'));
  }
  return new Promise((resolve, reject) => {
    try {
      const exchangeData = dataTransfer.exportData();
      const exchangeDataString = JSON.stringify(exchangeData);
      removeDeprecatedLocalStorageItems();

      // Use hybrid storage (IndexedDB with localStorage fallback)
      hybridStorage
        .setItem('sp:appStateExchange', exchangeDataString)
        .then(() => {
          notifyOtherTabs();
          resolve();
        })
        .catch(error => {
          console.error('Failed to persist state to hybrid storage:', error);
          reject(error);
        });
    } catch (error) {
      console.error('Failed to persist state:', error);
      reject(error);
    }
  });
}

function removeDeprecatedLocalStorageItems() {
  Object.keys(MIGRATION_MAP).forEach(oldKey => {
    if (localStorage.getItem(oldKey) !== null) {
      localStorage.removeItem(oldKey);
    }
  });
  localStorage.removeItem('sp:appState');
  localStorage.removeItem('sp:appStateExchange');
}

// For IndexedDB, we need to implement custom cross-tab sync since IndexedDB doesn't have storage events
// We'll use localStorage as a signaling mechanism for IndexedDB changes
const SYNC_SIGNAL_KEY = 'sp:sync-signal';

// Helper function to notify other tabs of IndexedDB changes
function notifyOtherTabs() {
  try {
    // Use localStorage as a signaling mechanism
    const signal = {
      timestamp: Date.now(),
      action: 'indexeddb-updated',
    };
    localStorage.setItem(SYNC_SIGNAL_KEY, JSON.stringify(signal));
    // Don't clean up immediately - let the storage event fire first
    setTimeout(() => {
      try {
        localStorage.removeItem(SYNC_SIGNAL_KEY);
      } catch (error) {
        console.warn('Failed to clean up sync signal:', error);
      }
    }, 100);
  } catch (error) {
    console.warn('Failed to send sync signal:', error);
  }
}

// Listen for storage changes from other tabs (browser's native storage events only)
window.addEventListener('storage', e => {
  if (e.key === SYNC_SIGNAL_KEY && e.newValue && isStoreReady) {
    try {
      const signal = JSON.parse(e.newValue);
      if (signal.action === 'indexeddb-updated') {
        // Reload state from IndexedDB
        hybridStorage
          .getItem('sp:appStateExchange')
          .then(exchangeDataString => {
            if (exchangeDataString) {
              isApplyingFromStorage = true;
              const exchangeData = JSON.parse(exchangeDataString);
              // Use dataTransfer.importData to properly transform the versioned exchange format
              dataTransfer.importData(exchangeData);
            }
          })
          .catch(error => {
            console.error('Failed to sync state from IndexedDB:', error);
          })
          .finally(() => {
            setTimeout(() => {
              isApplyingFromStorage = false;
            }, 0);
          });
      }
    } catch (error) {
      console.error('Failed to handle IndexedDB sync signal:', error);
    }
  }
});

// Helper function to recursively update proxy properties
function updateProxyFromState(proxy: any, newState: any, patch = false) {
  if (!patch) {
    // Remove properties that don't exist in newState
    Object.keys(proxy).forEach(key => {
      if (!(key in newState)) {
        delete proxy[key];
      }
    });
  }

  // Update/add properties from newState
  Object.keys(newState).forEach(key => {
    const newValue = newState[key];
    const currentValue = proxy[key];

    if (newValue && typeof newValue === 'object' && !Array.isArray(newValue)) {
      // For nested objects, recursively update if current value is also an object
      if (currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue)) {
        updateProxyFromState(currentValue, newValue, patch);
      } else {
        // Replace with new object if current is not an object
        proxy[key] = newValue;
      }
    } else {
      // For primitive values and arrays, direct assignment
      proxy[key] = newValue;
    }
  });
}
