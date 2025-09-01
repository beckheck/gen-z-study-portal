/// <reference types="vite/client" />

import React from 'react';

interface BackgroundMessage_Tab {
  type: 'openStudyPortalTab';
  activeTab: string;
}

interface BackgroundMessage_TextSelected {
  type: 'textSelected';
  text: string;
  url: string;
  title: string;
  timestamp: number;
}

interface BackgroundMessage_Timer_Start {
  type: 'timer.start';
  courseId: string;
}

interface BackgroundMessage_Timer_Stop {
  type: 'timer.stop';
}

interface BackgroundMessage_Timer_Reset {
  type: 'timer.reset';
}

interface BackgroundMessage_Timer_GetState {
  type: 'timer.getState';
}

interface BackgroundMessage_Timer_UpdateState {
  type: 'timer.updateState';
  courseId?: string;
  technique?: string;
  note?: string;
  moodStart?: number;
  moodEnd?: number;
  audioEnabled?: boolean;
  audioVolume?: number;
  showCountdown?: boolean;
}

interface BackgroundMessage_Timer_BroadcastState {
  type: 'timer.broadcastState';
  state: BackgroundTimerState;
}

export type BackgroundMessage_Timer =
  | BackgroundMessage_Timer_Start
  | BackgroundMessage_Timer_Stop
  | BackgroundMessage_Timer_Reset
  | BackgroundMessage_Timer_GetState
  | BackgroundMessage_Timer_UpdateState
  | BackgroundMessage_Timer_BroadcastState;

export type BackgroundMessage = BackgroundMessage_Tab | BackgroundMessage_TextSelected | BackgroundMessage_Timer;

export type StudyPhase = 'studying' | 'break' | 'longBreak';

export interface BackgroundTimerState {
  running: boolean;
  elapsed: number;
  technique: string;
  moodStart: number;
  moodEnd: number;
  note: string;
  startTs?: number;
  courseId: string;
  audioEnabled: boolean;
  audioVolume: number;
  phase: StudyPhase;
  phaseElapsed: number;
  phaseStartTs?: number;
  studyPhasesCompleted: number; // Counter for completed study phases
  showCountdown: boolean;
}

/**
 * Study session object representing a completed study session
 */
export interface StudySession {
  /** Unique identifier for the session */
  id: string;
  /** Id of the course in the courses array */
  courseId: string;
  /** Duration of the session in minutes */
  durationMin: number;
  /** Study technique used */
  technique: string;
  /** Start timestamp */
  startTs: number;
  /** End timestamp */
  endTs: number;
  /** Optional session notes */
  note?: string;
  /** Mood at the start of the session (1-5 scale) */
  moodStart?: number;
  /** Mood at the end of the session (1-5 scale) */
  moodEnd?: number;
}

/**
 * Session-specific task object for tracking tasks during a study session
 */
export interface StudySessionTask {
  /** Unique identifier for the task */
  id: string;
  /** Task title */
  title: string;
  /** Whether the task is completed */
  done: boolean;
  /** Creation timestamp */
  createdAt: number;
}

/**
 * Task object for course management
 */
export interface Task {
  /** Unique identifier for the task */
  id: string;
  /** Title of the task */
  title: string;
  /** Due date of the task */
  due: string;
  /** Priority level ('low', 'normal', 'high') */
  priority: string;
  /** Id of the course this task belongs to */
  courseId: string;
  /** Whether the task is completed */
  done: boolean;
  /** Additional notes about the task */
  notes?: string;
}

/**
 * Exam object for course management
 */
export interface Exam {
  /** Unique identifier for the exam */
  id: string;
  /** Title of the exam */
  title: string;
  /** Date of the exam */
  date: string;
  /** Weight percentage of the exam */
  weight: number;
  /** Additional notes about the exam */
  notes: string;
  /** Id of the course this exam belongs to */
  courseId: string;
  /** Whether the exam has been completed */
  completed?: boolean;
}

/**
 * Exam grade object for tracking grades
 */
export interface ExamGrade {
  /** ID of the exam this grade belongs to */
  examId: string;
  /** Grade value (1-7 scale) */
  grade: number;
}

/**
 * Weather location configuration object
 */
export interface WeatherLocation {
  /** Whether to use geolocation for weather */
  useGeolocation: boolean;
  /** City name for weather when not using geolocation */
  city: string;
}

/**
 * Weather configuration object containing API settings and location
 */
export interface WeatherConfig {
  /** API key for weather service */
  apiKey: string;
  /** Location configuration for weather */
  location: WeatherLocation;
}

/**
 * Weather data object for displaying current weather information
 */
export interface Weather {
  condition: string;
  temperature: number | string;
  location: string;
  description: string;
  icon?: string;
}

/**
 * Weather condition object for fallback simulation
 */
export interface WeatherCondition {
  condition: string;
  temp: number;
  icon: string;
  desc: string;
}

/**
 * OpenWeatherMap API response structure
 */
export interface OpenWeatherMapResponse {
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  main: {
    temp: number;
  };
  name: string;
}

/**
 * Soundtrack position type
 */
export type SoundtrackPosition = 'dashboard' | 'floating' | 'minimized' | 'off';

/**
 * Regular event object for planner
 */
export interface RegularEvent {
  /** Unique identifier for the event */
  id: string;
  /** Id of the course this event belongs to */
  courseId: string;
  /** Title of the event */
  title: string;
  /** Start date of the event */
  startDate: string;
  /** End date of the event (optional for single-day events) */
  endDate?: string;
  /** Whether the event spans multiple days */
  isMultiDay?: boolean;
  /** Location of the event */
  location?: string;
  /** Additional notes about the event */
  notes?: string;
  /** Color for the event */
  color?: string;
}

/**
 * Input type for creating a new task (without ID)
 */
export type TaskInput = Omit<Task, 'id' | 'done'>;

/**
 * Input type for creating a new exam (without ID)
 */
export type ExamInput = Omit<Exam, 'id'>;

/**
 * Input type for creating a new regular event (without ID)
 */
export type RegularEventInput = Omit<RegularEvent, 'id'>;

/**
 * Input type for creating a new timetable event (without ID)
 */
export type TimetableEventInput = Omit<TimetableEvent, 'id'>;

/**
 * Generic position interface for UI elements
 */
export interface Position {
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
}

/**
 * Time block configuration for timetable scheduling
 */
export interface TimeBlock {
  /** Block identifier (e.g., '1', '2', '3') */
  block: string;
  /** Time range (e.g., '8:20 - 9:30') */
  time: string;
}

/**
 * Timetable event object for weekly schedule
 */
export interface TimetableEvent {
  /** Unique identifier for the timetable event */
  id: string;
  /** Id of the course this event belongs to */
  courseId: string;
  /** Type of the event (e.g., 'Cátedra', 'Ayudantía', 'Taller', 'Laboratorio') */
  eventType: string;
  /** Classroom location */
  classroom: string;
  /** Teacher or TA name */
  teacher: string;
  /** Day of the week */
  day: string;
  /** Time block identifier */
  block: string;
  /** Start time */
  startTime: string;
  /** End time */
  endTime: string;
  /** Color for the event display */
  color?: string;
}

/**
 * Course object for degree planning
 */
export interface DegreeCourse {
  id: string;
  acronym: string;
  name: string;
  credits: string;
  prerequisites?: string;
  corequisites?: string;
  completed: boolean;
}

/**
 * Course can be either a string or an object with a title
 */
export interface Course {
  id: string;
  title: string;
}

/**
 * Color theme for light and dark modes
 */
export interface ColorTheme {
  light: string;
  dark: string;
}

/**
 * Opacity theme for light and dark modes
 */
export interface OpacityTheme {
  light: number;
  dark: number;
}

/**
 * Theme-specific properties for application state
 */
export interface ThemeState {
  darkMode: boolean;
  bgImage: string;
  customCursor: string;
  accentColor: ColorTheme;
  cardOpacity: OpacityTheme;
  gradientEnabled: boolean;
  gradientStart: ColorTheme;
  gradientMiddle: ColorTheme;
  gradientEnd: ColorTheme;
}

/**
 * Data transfer functionality for settings export/import
 */
export interface DataTransfer {
  exportData: () => void;
  importData: (file: File) => Promise<boolean>;
}

/**
 * Schedule event object for weekly schedule (different from TimetableEvent)
 */
export interface ScheduleEvent {
  id: string;
  courseId: string;
  title: string;
  day: string;
  start: string;
  end: string;
  location: string;
  color?: string;
}

/**
 * Mood emoji configuration object
 */
export interface MoodEmoji {
  emoji: string;
  color: string;
  word: string;
}

/**
 * Mood percentages for tracking daily mood breakdown
 */
export interface MoodPercentages {
  [key: string]: number;
}

/**
 * Monthly mood data for calendar tracking
 */
export interface MonthlyMood {
  percentages: MoodPercentages;
  gradient: string;
  totalPercentage: number;
  savedAt: number;
}

/**
 * Monthly moods collection organized by date
 */
export interface MonthlyMoods {
  [dateString: string]: MonthlyMood;
}

/**
 * Mood emojis collection for customization
 */
export interface MoodEmojis {
  [key: string]: MoodEmoji;
}

/**
 * Weekly goal object for planner week view
 */
export interface WeeklyGoal {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  color?: string;
}

/**
 * Hydration settings for water tracking
 */
export interface HydrationSettings {
  useCups: boolean;
  cupSizeML: number;
  cupSizeOZ: number;
  dailyGoalML: number;
  dailyGoalOZ: number;
  unit: 'metric' | 'imperial';
}

/**
 * Wellness data object for tracking user wellness metrics
 */
export interface Wellness {
  water: number;
  gratitude: string;
  moodPercentages: Record<string, number>;
  hasInteracted: boolean;
  monthlyMoods: MonthlyMoods;
  showWords: boolean;
  moodEmojis: MoodEmojis;
  hydrationSettings: HydrationSettings;
}

/**
 * Calendar view state for mood tracking
 */
export interface CalendarView {
  year: number;
  month: number;
}

/**
 * Semester object for degree planning
 */
export interface Semester {
  id: string | number;
  name?: string;
  number?: number;
  courses: DegreeCourse[];
}

/**
 * Degree plan object for tracking academic progress
 */
export interface DegreePlan {
  name: string;
  semesters: Semester[];
  completedCourses: string[];
}

/**
 * Soundtrack configuration object
 */
export interface Soundtrack {
  /** Embed URL for soundtrack (Spotify/YouTube) */
  embed: string;
  /** Position of the soundtrack player */
  position: SoundtrackPosition;
}

/**
 * Complete application state interface
 */
/**
 * File attachment metadata
 */
export interface FileAttachmentMetadata {
  id: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  uploadedAt: number;
}

/**
 * Stored file attachment with data
 */
export interface StoredFileAttachment extends FileAttachmentMetadata {
  fileData: string; // base64 data
}

/**
 * File attachment store structure
 */
export interface FileAttachmentStore {
  files: Record<string, StoredFileAttachment>;
  metadata: Record<string, FileAttachmentMetadata>;
}

export interface AppState {
  exams: Exam[];
  examGrades: ExamGrade[];
  sessions: StudySession[];
  sessionTasks: StudySessionTask[];
  tasks: Task[];
  schedule: ScheduleEvent[];
  timetableEvents: TimetableEvent[];
  regularEvents: RegularEvent[];
  weeklyGoals: WeeklyGoal[];
  courses: Course[];
  selectedCourseId: string;
  theme: ThemeState;
  soundtrack: Soundtrack;
  weather: WeatherConfig;
  degreePlan: DegreePlan;
  wellness: Wellness;
  fileAttachments: FileAttachmentStore;
  activeTabsByMode: Record<string, string>;
}

export interface AppTab {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}
