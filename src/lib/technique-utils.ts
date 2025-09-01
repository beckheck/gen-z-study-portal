/**
 * Utility functions for handling study techniques and phase management
 */

import { StudyPhase } from '../types';

export interface TechniqueConfig {
  id: string;
  name: string; // Translation key
  studyMinutes: number;
  breakMinutes: number;
  longBreakMinutes?: number; // Optional long break duration
  longBreakInterval?: number; // Number of study phases before long break
}

/**
 * Available study techniques
 */
export const STUDY_TECHNIQUES: TechniqueConfig[] = [
  {
    id: 'pomodoro-25-5',
    name: 'focusTimer.techniques.pomodoro',
    studyMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: 30,
    longBreakInterval: 4,
  },
  {
    id: 'deep-work-50-10',
    name: 'focusTimer.techniques.deepWork',
    studyMinutes: 50,
    breakMinutes: 10,
  },
  {
    id: 'flow',
    name: 'focusTimer.techniques.flow',
    studyMinutes: Infinity,
    breakMinutes: 0,
  },
  {
    id: 'test',
    name: 'focusTimer.techniques.pomodoro',
    studyMinutes: 0.1,
    breakMinutes: 0.1,
    longBreakMinutes: 0.2,
    longBreakInterval: 3,
  },
];

/**
 * Get technique configuration by ID
 * @param techniqueId - Technique ID
 * @returns Configuration object with study/break durations
 */
export function getTechniqueConfig(techniqueId: string): TechniqueConfig {
  const technique = STUDY_TECHNIQUES.find(t => t.id === techniqueId);

  if (!technique) {
    // Fallback to flow technique for unknown IDs
    return STUDY_TECHNIQUES.find(t => t.id === 'flow')!;
  }

  return technique;
}

/**
 * Get the duration in seconds for the current phase
 * @param techniqueId - Technique ID
 * @param phase - Current phase ('studying', 'break', or 'longBreak')
 * @returns Duration in seconds, or Infinity for continuous flow
 */
export function getPhaseDurationSeconds(techniqueId: string, phase: StudyPhase): number {
  const config = getTechniqueConfig(techniqueId);

  if (config.breakMinutes === 0) {
    return Infinity; // Flow technique - no time limit
  }

  let minutes: number;
  if (phase === 'studying') {
    minutes = config.studyMinutes;
  } else if (phase === 'longBreak') {
    minutes = config.longBreakMinutes || config.breakMinutes;
  } else {
    minutes = config.breakMinutes;
  }

  return minutes * 60; // Convert to seconds
}

/**
 * Determine if a phase should transition to the next phase
 * @param techniqueId - Technique ID
 * @param phase - Current phase
 * @param phaseElapsed - Seconds elapsed in current phase
 * @returns Whether the phase should transition
 */
export function shouldTransitionPhase(techniqueId: string, phase: StudyPhase, phaseElapsed: number): boolean {
  const config = getTechniqueConfig(techniqueId);

  if (config.breakMinutes === 0) {
    return false; // Flow technique never auto-transitions
  }

  const phaseDuration = getPhaseDurationSeconds(techniqueId, phase);
  return phaseElapsed >= phaseDuration;
}

/**
 * Get the next phase in the cycle based on technique and study phases completed
 * @param currentPhase - Current phase
 * @param techniqueId - Technique ID
 * @param studyPhasesCompleted - Number of study phases completed
 * @returns Next phase
 */
export function getNextPhase(currentPhase: StudyPhase, techniqueId: string, studyPhasesCompleted: number): StudyPhase {
  const config = getTechniqueConfig(techniqueId);

  if (currentPhase === 'studying') {
    // After studying, determine if it's time for a long break
    if (config.longBreakInterval && config.longBreakMinutes) {
      const completedAfterThis = studyPhasesCompleted + 1;
      if (completedAfterThis % config.longBreakInterval === 0) {
        return 'longBreak';
      }
    }
    return 'break';
  }

  // After any break (short or long), return to studying
  return 'studying';
}
