import { AppState, SoundtrackPosition } from '@/types';
import { uid } from './utils';

type StateUpdater = (updates: Partial<AppState>) => void;

interface GenericEvent {
  id: string;
  [key: string]: any;
}

export class DataTransfer {
  private getState: () => AppState;
  private setState: StateUpdater;

  constructor(getState: () => AppState, setState: StateUpdater) {
    this.getState = getState;
    this.setState = setState;
  }

  exportData(): void {
    const state = this.getState();
    const data: ExchangeFormatV1 = {
      // Core data
      sessions: state.sessions.map(o => ({
        id: o.id,
        course: state.courses[o.courseIndex],
        startTs: new Date(o.startTs).toISOString(),
        endTs: new Date(o.endTs).toISOString(),
        durationMin: o.durationMin,
        technique: o.technique,
        moodStart: (o as any).moodStart,
        moodEnd: (o as any).moodEnd,
        note: (o.note || '').replace(/[\r\n]+/g, ' '),
      })),
      exams: state.exams.map(o => ({
        id: o.id,
        course: state.courses[o.courseIndex],
        title: o.title,
        date: o.date,
        weight: o.weight,
        notes: (o.notes || '').replace(/[\r\n]+/g, ' '),
      })),
      examGrades: state.examGrades || [],
      tasks: state.tasks.map(o => ({
        id: o.id,
        course: state.courses[o.courseIndex],
        title: o.title,
        due: o.due,
        priority: o.priority,
        done: o.done,
      })),
      schedule: state.schedule.map(o => ({
        id: o.id,
        course: state.courses[o.courseIndex],
        title: o.title,
        day: o.day,
        start: o.start,
        end: o.end,
        location: o.location,
        color: o.color,
      })),
      timetableEvents: state.timetableEvents.map(o => ({
        id: o.id,
        course: state.courses[o.courseIndex],
        eventType: o.eventType,
        classroom: o.classroom,
        teacher: o.teacher,
        day: o.day,
        startTime: o.startTime,
        endTime: o.endTime,
        block: o.block,
        color: o.color, // Export as 'color' not 'hexColor'
      })),
      regularEvents: state.regularEvents.map(o => ({
        id: o.id,
        course: state.courses[o.courseIndex],
        title: o.title,
        startDate: o.startDate,
        endDate: o.endDate,
        isMultiDay: o.isMultiDay,
        location: o.location,
        notes: o.notes,
        color: o.color,
      })),
      sessionTasks: state.sessionTasks,
      weeklyGoals: state.weeklyGoals,
      degreePlan: state.degreePlan,
      wellness: state.wellness,
      settings: {
        courses: state.courses,
        selectedCourse: state.selectedCourse,
        darkMode: state.theme.darkMode,
        gradient: {
          enabled: state.theme.gradientEnabled,
          start: state.theme.gradientStart,
          middle: state.theme.gradientMiddle,
          end: state.theme.gradientEnd,
        },
        soundtrackEmbed: state.soundtrack.embed,
        accentColor: state.theme.accentColor,
        cardOpacity: state.theme.cardOpacity,
        weatherApiKey: state.weather.apiKey,
        weatherLocation: state.weather.location,
        bgImage: state.theme.bgImage,
      },
    };

    try {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'study_portal_export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  }

  async importData(file: File): Promise<boolean> {
    try {
      const text = await file.text();
      const data: ExchangeFormatV1 = JSON.parse(text);

      if (data.version == null) {
        this.importDataV1(data);
      }

      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  private importDataV1(data: ExchangeFormatV1) {
    // Extract settings first
    if (data.settings) {
      console.log('DataTransfer - importing theme data:', {
        accentColor: data.settings.accentColor,
        cardOpacity: data.settings.cardOpacity,
      });

      const newState = {
        courses: data.settings.courses,
        selectedCourse: data.settings.selectedCourse,
        theme: {
          darkMode: data.settings.darkMode,
          bgImage: data.settings.bgImage,
          gradientEnabled: data.settings.gradient.enabled,
          gradientStart: data.settings.gradient.start,
          gradientMiddle: data.settings.gradient.middle,
          gradientEnd: data.settings.gradient.end,
          accentColor: data.settings.accentColor,
          cardOpacity: data.settings.cardOpacity,
        },
        soundtrack: {
          embed: data.settings.soundtrackEmbed,
          position: 'dashboard' as SoundtrackPosition,
        },
        weather: {
          apiKey: data.settings.weatherApiKey,
          location: data.settings.weatherLocation,
        },
        degreePlan: data.settings.degreePlan || { semesters: [], completedCourses: [] },
      };

      console.log('DataTransfer - calling setState with:', newState);
      this.setState(newState);
    }

    // Import degree plan data (for backward compatibility)
    if (data.degreePlan) {
      this.setState({ degreePlan: data.degreePlan });
    }

    // Then import data with proper course indices, preserving user customizations
    if (data.sessions) {
      const sessions = data.sessions.map((o: any) => ({
        id: o.id ?? uid(),
        courseIndex: findCourseIndex(o.course, data.settings.courses),
        startTs: new Date(o.startTs).getTime(),
        endTs: new Date(o.endTs).getTime(),
        durationMin: o.durationMin,
        technique: o.technique,
        moodStart: o.moodStart,
        moodEnd: o.moodEnd,
        note: o.note,
      }));
      this.setState({ sessions });
    }

    if (data.exams) {
      const exams = data.exams.map((o: any) => ({
        id: o.id ?? uid(),
        courseIndex: findCourseIndex(o.course, data.settings.courses),
        title: o.title,
        date: o.date,
        weight: o.weight,
        notes: o.notes,
      }));
      this.setState({ exams });
    }

    // Import exam grades
    if (data.examGrades) {
      this.setState({ examGrades: data.examGrades });
    }

    if (data.tasks) {
      const tasks = data.tasks.map((o: any) => ({
        id: o.id ?? uid(),
        courseIndex: findCourseIndex(o.course, data.settings.courses),
        title: o.title,
        due: o.due,
        priority: o.priority,
        done: o.done,
      }));
      this.setState({ tasks });
    }

    if (data.schedule) {
      const importedSchedule = data.schedule.map((o: any) => ({
        id: o.id ?? uid(),
        courseIndex: findCourseIndex(o.course, data.settings.courses),
        title: o.title,
        day: o.day,
        start: o.start,
        end: o.end,
        location: o.location,
        color: o.color,
      }));

      // Merge with existing schedule, preserving user-assigned colors
      const mergedSchedule = mergeEventsV1(
        this.getState().schedule || [],
        importedSchedule,
        ['title', 'day', 'start', 'end'], // Key fields to match events
        ['color'] // Fields to preserve from existing events
      );
      this.setState({ schedule: mergedSchedule });
    }

    if (data.timetableEvents) {
      const importedTimetableEvents = data.timetableEvents.map((o: any) => ({
        id: o.id ?? uid(),
        courseIndex: findCourseIndex(o.course, data.settings.courses),
        eventType: o.eventType,
        classroom: o.classroom,
        teacher: o.teacher,
        day: o.day,
        startTime: o.startTime,
        endTime: o.endTime,
        block: o.block,
        color: o.color || o.hexColor, // Support both color formats for backward compatibility
      }));

      // Merge with existing timetable events, preserving user-assigned colors
      const mergedTimetableEvents = mergeEventsV1(
        this.getState().timetableEvents || [],
        importedTimetableEvents,
        ['day', 'startTime', 'endTime', 'eventType'], // Key fields to match events
        ['color'] // Fields to preserve from existing events (changed from 'hexColor' to 'color')
      );
      this.setState({ timetableEvents: mergedTimetableEvents });
    }

    if (data.regularEvents) {
      const importedRegularEvents = data.regularEvents.map((o: any) => ({
        id: o.id ?? uid(),
        courseIndex: findCourseIndex(o.course, data.settings.courses),
        title: o.title,
        startDate: o.startDate,
        endDate: o.endDate,
        isMultiDay: o.isMultiDay,
        location: o.location,
        notes: o.notes,
        color: o.color || o.hexColor, // Support both color formats for backward compatibility
      }));

      // Merge with existing regular events, preserving user-assigned colors
      const mergedRegularEvents = mergeEventsV1(
        this.getState().regularEvents || [],
        importedRegularEvents,
        ['title', 'startDate'], // Key fields to match events
        ['color'] // Fields to preserve from existing events
      );
      this.setState({ regularEvents: mergedRegularEvents });
    }

    if (data.sessionTasks) {
      const sessionTasks = data.sessionTasks.map((o: any) => ({
        ...o,
        id: o.id ?? uid(),
      }));
      this.setState({ sessionTasks });
    }

    // Import weekly goals data
    if (data.weeklyGoals) {
      const weeklyGoals = data.weeklyGoals.map((o: any) => ({
        id: o.id ?? uid(),
        title: o.title,
        completed: o.completed,
        createdAt: o.createdAt,
        color: o.color,
      }));
      this.setState({ weeklyGoals });
    }

    // Import wellness data
    if (data.wellness) {
      this.setState({
        wellness: {
          water: data.wellness.water || 0,
          gratitude: data.wellness.gratitude || '',
          moodPercentages: data.wellness.moodPercentages || {},
          hasInteracted: data.wellness.hasInteracted || false,
          monthlyMoods: data.wellness.monthlyMoods || {},
          showWords: data.wellness.showWords !== undefined ? data.wellness.showWords : true,
          moodEmojis: data.wellness.moodEmojis || {
            angry: { emoji: '😠', color: '#ff6b6b', word: 'Angry' },
            sad: { emoji: '😔', color: '#ff9f43', word: 'Sad' },
            neutral: { emoji: '😐', color: '#f7dc6f', word: 'Neutral' },
            happy: { emoji: '🙂', color: '#45b7d1', word: 'Happy' },
            excited: { emoji: '😁', color: '#10ac84', word: 'Excited' },
          },
        },
      });
    }
  }
}

// Helper function to merge events preserving user customizations
function mergeEventsV1<T extends GenericEvent>(
  existingEvents: T[],
  importedEvents: T[],
  keyFields: string[] = ['title', 'day'],
  preserveFields: string[] = ['color', 'hexColor']
): T[] {
  const merged = [...existingEvents];

  importedEvents.forEach(importedEvent => {
    // Find existing event that matches the key fields
    const existingIndex = merged.findIndex(existing => {
      return keyFields.every(field => existing[field] === importedEvent[field]);
    });

    if (existingIndex >= 0) {
      // Event exists, merge while preserving user customizations
      const existing = merged[existingIndex];
      const mergedEvent = { ...importedEvent };

      // Preserve user customizations
      preserveFields.forEach(field => {
        if (existing[field] !== undefined && existing[field] !== null) {
          (mergedEvent as any)[field] = existing[field];
        }
      });

      // Keep the existing ID to maintain references
      mergedEvent.id = existing.id;

      merged[existingIndex] = mergedEvent as T;
    } else {
      // New event, add it
      merged.push(importedEvent);
    }
  });

  return merged;
}

function findCourseIndex(courseName: string, courses: string[]): number {
  const index = courses.indexOf(courseName);
  return index === -1 ? 0 : index; // fallback to first course if not found
}

interface ExchangeFormatV1 {
  version?: undefined;
  sessions?: Array<{
    id: string;
    course: string;
    startTs: string;
    endTs: string;
    durationMin: number;
    technique: string;
    moodStart?: number;
    moodEnd?: number;
    note?: string;
  }>;
  exams?: Array<{
    id: string;
    course: string;
    title: string;
    date: string;
    weight: number;
    notes?: string;
  }>;
  examGrades?: Array<{
    examId: string;
    grade: number;
  }>;
  tasks?: Array<{
    id: string;
    course: string;
    title: string;
    due: string;
    priority: string;
    done: boolean;
  }>;
  schedule?: Array<{
    id: string;
    course: string;
    title: string;
    day: string;
    start: string;
    end: string;
    location: string;
    color?: string;
  }>;
  timetableEvents?: Array<{
    id: string;
    course: string;
    eventType: string;
    classroom: string;
    teacher: string;
    day: string;
    startTime: string;
    endTime: string;
    block: string;
    color?: string;
    hexColor?: string; // for backward compatibility
  }>;
  regularEvents?: Array<{
    id: string;
    course: string;
    title: string;
    startDate: string;
    endDate: string;
    isMultiDay: boolean;
    location: string;
    notes: string;
    color?: string;
    hexColor?: string; // for backward compatibility
  }>;
  sessionTasks?: Array<{
    id: string;
    title: string;
    done: boolean;
    createdAt: number;
  }>;
  degreePlan?: ExchangeFormatV1_DegreePlan;
  wellness?: {
    water?: number;
    gratitude?: string;
    moodPercentages?: Record<string, number>;
    hasInteracted?: boolean;
    monthlyMoods?: Record<string, any>;
    showWords?: boolean;
    moodEmojis?: Record<
      string,
      {
        emoji: string;
        color: string;
        word: string;
      }
    >;
  };
  weeklyGoals?: Array<{
    id: string;
    title: string;
    completed: boolean;
    createdAt: number;
    color?: string;
  }>;
  settings?: {
    courses: string[];
    selectedCourse: number;
    darkMode: boolean;
    gradient: {
      enabled: boolean;
      start: {
        light: string;
        dark: string;
      };
      middle: {
        light: string;
        dark: string;
      };
      end: {
        light: string;
        dark: string;
      };
    };
    bgImage: string;
    accentColor: {
      light: string;
      dark: string;
    };
    cardOpacity: {
      light: number;
      dark: number;
    };
    soundtrackEmbed: string;
    weatherApiKey: string;
    weatherLocation: {
      useGeolocation: boolean;
      city: string;
    };
    degreePlan?: ExchangeFormatV1_DegreePlan;
  };
}

interface ExchangeFormatV1_DegreePlan {
  semesters: Array<{
    id: string | number;
    name?: string;
    number?: number;
    courses: Array<{
      id: string;
      acronym: string;
      name: string;
      credits: string;
      prerequisites?: string;
      corequisites?: string;
      completed: boolean;
    }>;
  }>;
  completedCourses: string[];
}
