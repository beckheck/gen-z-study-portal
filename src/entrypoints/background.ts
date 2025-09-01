import { StudySessionTimerManager } from '@/lib/study-session-timer-manager';
import { getPhaseDurationSeconds } from '@/lib/technique-utils';
import { BackgroundMessage, BackgroundTimerState } from '@/types';
import { browser } from 'wxt/browser';

declare function defineBackground(fn: () => void): any;

export default defineBackground(() => {
  // Initialize timer manager with state update callback
  const timerManager = new StudySessionTimerManager(updateBadgeFromTimerState);

  // Check if we're in the extension environment
  if (browser.runtime.onInstalled) {
    // Handle extension installation
    browser.runtime.onInstalled.addListener(() => {
      // Create context menus
      browser.contextMenus.create({
        id: 'saveToStudyPortal',
        title: 'Save to StudyHub ✨',
        contexts: ['selection'],
      });

      browser.contextMenus.create({
        id: 'openStudyPortal',
        title: 'Open StudyHub ✨',
        contexts: ['all'],
      });

      browser.contextMenus.create({
        id: 'openStudyPortalSidePanel',
        title: 'Open StudyHub ✨ in Side Panel',
        contexts: ['all'],
      });

      browser.contextMenus.create({
        id: 'openStudyPortalTab',
        title: 'Open StudyHub ✨ in New Tab',
        contexts: ['all'],
      });
    });

    // Handle context menu clicks
    browser.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === 'saveToStudyPortal') {
        // Send selected text to content script
        if (tab?.id && info.selectionText) {
          sendCaptureSelectionMessage(tab.id, info.selectionText);
        }
      } else if (info.menuItemId === 'openStudyPortal') {
        openStudyPortalPopup();
      } else if (info.menuItemId === 'openStudyPortalSidePanel' && tab?.id) {
        openStudyPortalSidePanel(tab.id);
      } else if (info.menuItemId === 'openStudyPortalTab') {
        openStudyPortalTab();
      }
    });

    // Handle messages from content script and popup/sidepanel
    browser.runtime.onMessage.addListener((message: BackgroundMessage, sender, sendResponse) => {
      if (message.type === 'textSelected') {
        saveSelectedText(message.text, message.url, message.title, message.timestamp);
        sendResponse({ success: true });
        return false; // Synchronous response
      } else if (message.type === 'openStudyPortalTab') {
        openStudyPortalTab(message.activeTab);
        sendResponse({ success: true });
        return false; // Synchronous response
      } else {
        // Timer messages are handled asynchronously
        const result = timerManager.handleMessage(message, sendResponse);
        return result; // Return true for async messages, false for unhandled messages
      }
    });

    // Handle keyboard shortcuts (if defined in manifest)
    if (browser.commands) {
      browser.commands.onCommand.addListener((command: string) => {
        if (command === 'toggle-study-portal') {
          // Toggle side panel or popup
          toggleOverlay();
        } else if (command === 'open-in-tab') {
          // Open in new tab
          openStudyPortalTab();
        }
      });
    }
  } else {
    console.error('Browser APIs not available - running in build/test environment');
  }
});

// Open in new tab
const openStudyPortalTab = (activeTab?: string) => {
  const url = activeTab ? `tab.html#${activeTab}` : 'tab.html';
  browser.tabs.create({ url });
};

// Open popup - this might not work in all contexts
const openStudyPortalPopup = () => {
  try {
    browser.action.openPopup();
  } catch (e) {
    console.error('Could not open popup:', e);
  }
};

// Open side panel (Chrome 114+)
const openStudyPortalSidePanel = (tabId: number) => {
  try {
    browser.sidePanel.open({ tabId });
  } catch (e) {
    console.error('Could not open side panel:', e);
  }
};

// Store selected text for the StudyHub ✨
const saveSelectedText = (text: string, url: string, title: string, timestamp: number) => {
  browser.storage.local.set({
    lastSelection: {
      text,
      url,
      title,
      timestamp,
    },
  });
};

const sendCaptureSelectionMessage = (tabId: number, selectedText: string) => {
  browser.tabs.sendMessage(tabId, {
    action: 'captureSelection',
    selectedText,
  });
};

const toggleOverlay = () => {
  browser.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]?.id) {
      browser.tabs.sendMessage(tabs[0].id, { action: 'toggleOverlay' });
    }
  });
};

// Badge management functions
const updateExtensionBadge = (text: string, color: string) => {
  try {
    browser.action.setBadgeText({ text });
    browser.action.setBadgeBackgroundColor({ color });
  } catch (error) {
    console.error('[Background] Failed to update extension badge:', error);
  }
};

const clearExtensionBadge = () => {
  try {
    browser.action.setBadgeText({ text: '' });
  } catch (error) {
    console.error('[Background] Failed to clear extension badge:', error);
  }
};

// Update badge based on timer state
const updateBadgeFromTimerState = (timerState: BackgroundTimerState) => {
  if (timerState.running) {
    const remainingTime = getRemainingTimeForCurrentPhase(timerState);
    const badgeText = formatBadgeText(remainingTime, timerState.phase, timerState.technique);
    const badgeColor = getBadgeColor(timerState.phase);
    updateExtensionBadge(badgeText, badgeColor);
  } else {
    clearExtensionBadge();
  }
};

// Helper functions for badge formatting
const getRemainingTimeForCurrentPhase = (timerState: BackgroundTimerState): number => {
  const phaseDuration = getPhaseDurationSeconds(timerState.technique, timerState.phase);

  if (phaseDuration === Infinity) {
    // For flow technique, return elapsed time instead
    return timerState.phaseElapsed;
  }

  return Math.max(0, phaseDuration - timerState.phaseElapsed);
};

const formatBadgeText = (timeInSeconds: number, phase: string, technique: string): string => {
  // For flow technique, show elapsed time with "F" prefix
  if (getPhaseDurationSeconds(technique, phase as any) === Infinity) {
    const minutes = Math.floor(timeInSeconds / 60);
    if (minutes < 100) {
      return `⏰${minutes}`;
    } else {
      const hours = Math.floor(minutes / 60);
      return `⏰${hours}h`;
    }
  }

  // For timed techniques, show remaining time
  const minutes = Math.ceil(timeInSeconds / 60);
  const phasePrefix = phase === 'studying' ? '🧠' : phase === 'longBreak' ? '💤' : '⏸️';

  if (minutes < 100) {
    return `${phasePrefix}${minutes}`;
  } else {
    const hours = Math.floor(minutes / 60);
    return `${phasePrefix}${hours}h`;
  }
};

const getBadgeColor = (phase: string): string => {
  switch (phase) {
    case 'studying':
      return '#4CAF50'; // Green for study
    case 'break':
      return '#FF9800'; // Orange for break
    case 'longBreak':
      return '#2196F3'; // Blue for long break
    default:
      return '#757575'; // Gray default
  }
};
