import React from 'react';

/**
 * Study timer object with state and methods for tracking study sessions
 */
export interface StudyTimer {
  /** Elapsed time in seconds */
  elapsed: number;
  /** Whether the timer is currently running */
  running: boolean;
  /** Study technique being used */
  technique: string;
  /** Function to set the study technique */
  setTechnique: (technique: string) => void;
  /** Starting mood rating (1-10) */
  moodStart: number;
  /** Function to set the starting mood */
  setMoodStart: (mood: number) => void;
  /** Ending mood rating (1-10) */
  moodEnd: number;
  /** Function to set the ending mood */
  setMoodEnd: (mood: number) => void;
  /** Session notes */
  note: string;
  /** Function to set session notes */
  setNote: (note: string) => void;
  /** Function to start the timer */
  startTimer: () => void;
  /** Function to stop the timer with course index */
  stopTimer: (courseIndex: number) => void;
  /** Function to reset the timer */
  resetTimer: () => void;
}

/**
 * Study session object representing a completed study session
 */
export interface Session {
  /** Unique identifier for the session */
  id: string;
  /** Index of the course in the courses array */
  courseIndex: number;
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
}

/**
 * Session-specific task object for tracking tasks during a study session
 */
export interface SessionTask {
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
  /** Index of the course this task belongs to */
  courseIndex: number;
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
  /** Index of the course this exam belongs to */
  courseIndex: number;
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
export type SoundtrackPosition = 'dashboard' | 'floating' | 'hidden';

/**
 * Regular event object for planner
 */
export interface RegularEvent {
  /** Unique identifier for the event */
  id: string;
  /** Index of the course this event belongs to */
  courseIndex: number;
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
  /** Index of the course this event belongs to */
  courseIndex: number;
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
  color: string;
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
export type Course = string | { title: string };

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
  courseIndex: number;
  title: string;
  day: string;
  start: string;
  end: string;
  location: string;
  color: string;
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
export interface AppState {
  sessions: Session[];
  exams: Exam[];
  examGrades: ExamGrade[];
  tasks: Task[];
  schedule: ScheduleEvent[];
  timetableEvents: TimetableEvent[];
  regularEvents: RegularEvent[];
  sessionTasks: SessionTask[];
  weeklyGoals: WeeklyGoal[];
  courses: string[];
  selectedCourse: number;
  theme: ThemeState;
  soundtrack: Soundtrack;
  weather: WeatherConfig;
  degreePlan: DegreePlan;
  wellness: Wellness;
}

export interface AppTab {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}
