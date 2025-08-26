# Study Timer Background Implementation

## Overview

The study timer has been updated to run in the extension's background service worker, ensuring that:

1. **Timer persistence**: The timer continues running even when popup/side panel is closed
2. **Cross-mode synchronization**: Timer state is synchronized between popup, side panel, and tab modes
3. **Data persistence**: Timer state is saved in browser storage and restored on extension restart

## Changes Made

### 1. Background Script Updates (`src/entrypoints/background.ts`)

- Added timer state management in the background service worker
- Implemented message handlers for timer operations:
  - `timer.start`: Start the timer with a course ID
  - `timer.stop`: Stop the timer and create a study session
  - `timer.reset`: Reset the timer elapsed time
  - `timer.getState`: Get current timer state
  - `timer.updateState`: Update timer settings (technique, notes)
- Added timer state persistence using `browser.storage.local`
- Implemented timer state broadcasting to all open extension instances
- Added automatic timer restoration on background script restart

### 2. Study Timer Hook Updates (`src/hooks/useStudyTimer.ts`)

- Completely refactored to communicate with background script instead of managing timer locally
- Uses message passing to communicate with background service worker
- Listens for timer state updates from background
- Maintains the same API for components, ensuring no breaking changes

### 3. Component Updates (`src/components/StudyTrackerTab.tsx`)

- Updated to pass `selectedCourseId` to the `useStudyTimer` hook
- No other changes needed due to maintained API compatibility

## Technical Details

### Timer State Structure

```typescript
interface BackgroundTimerState {
  running: boolean;        // Whether timer is currently running
  elapsed: number;         // Elapsed seconds
  technique: string;       // Study technique (e.g., "Pomodoro 25/5")
  moodStart: number;       // Starting mood (1-10)
  moodEnd: number;         // Ending mood (1-10)
  note: string;           // Session notes
  startTs?: number; // Start timestamp for accurate time calculation
  courseId: string;       // Associated course ID
}
```

### Message Types

The following message types are used for timer communication:

- `timer.start`: Start timer with course ID
- `timer.stop`: Stop timer and return session data
- `timer.reset`: Reset elapsed time
- `timer.getState`: Retrieve current timer state
- `timer.updateState`: Update technique or notes
- `timer.broadcastState`: Broadcast timer state changes to UI

### Storage

Timer state is automatically saved to `browser.storage.local` under the key `backgroundTimerState` and restored when the background script initializes.

## Usage

The timer usage remains exactly the same from the component perspective:

```typescript
const studyTimer = useStudyTimer(onSessionComplete, selectedCourseId);

// Start timer
studyTimer.startTimer();

// Stop timer
studyTimer.stopTimer(courseId);

// Access timer state
const { running, elapsed, technique } = studyTimer;
```

## Benefits

1. **Persistence**: Timer continues running when popup/side panel is closed
2. **Synchronization**: All extension views show the same timer state in real-time
3. **Reliability**: Timer state is preserved across browser restarts
4. **Performance**: Centralized timer management reduces resource usage
5. **Consistency**: Same timer experience across all extension interfaces
