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

  exportData() {
    const state = this.getState();
    const data: ExchangeFormatV2 = {
      version: '2',
      courses: state.courses,
      sessions: state.sessions,
      exams: state.exams,
      examGrades: state.examGrades,
      tasks: state.tasks,
      schedule: state.schedule,
      timetableEvents: state.timetableEvents,
      regularEvents: state.regularEvents.map(
        o =>
          ({
            ...o,
            endDate: o.endDate,
            isMultiDay: o.isMultiDay,
            location: o.location,
            notes: o.notes,
          } satisfies ExchangeFormatV2['regularEvents'][number])
      ),
      sessionTasks: state.sessionTasks,
      weeklyGoals: state.weeklyGoals,
      degreePlan: {
        name: state.degreePlan.name,
        semesters: state.degreePlan.semesters,
        completedCourses: state.degreePlan.completedCourses,
      },
      wellness: state.wellness,
      settings: {
        selectedCourseId: state.selectedCourseId,
        soundtrackEmbed: state.soundtrack.embed,
        weather: state.weather,
        theme: {
          darkMode: state.theme.darkMode,
          gradient: {
            enabled: state.theme.gradientEnabled,
            start: state.theme.gradientStart,
            middle: state.theme.gradientMiddle,
            end: state.theme.gradientEnd,
          },
          customCursor: state.theme.customCursor,
          accentColor: state.theme.accentColor,
          cardOpacity: state.theme.cardOpacity,
          bgImage: state.theme.bgImage,
        },
      },
    };
    return data;
  }

  exportFile(): void {
    const data = this.exportData();
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

  async importFile(file: File): Promise<boolean> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      return this.importData(data);
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  importData(data: any): boolean {
    try {
      if (data.version === '2') {
        this.importDataV2(data);
      } else {
        this.importDataV1(data);
      }
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  private importDataV2(data: ExchangeFormatV2) {
    this.setState({
      courses: data.courses,
      degreePlan: {
        name: data.degreePlan.name || 'Degree Plan',
        ...data.degreePlan,
      },
      exams: data.exams,
      examGrades: data.examGrades,
      sessionTasks: data.sessionTasks,
      weeklyGoals: data.weeklyGoals,
      selectedCourseId: data.settings.selectedCourseId,
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
      soundtrack: {
        embed: data.settings.soundtrackEmbed,
        position: 'dashboard' as SoundtrackPosition,
      },
      weather: {
        apiKey: data.settings.weather.apiKey,
        location: data.settings.weather.location,
      },
      theme: {
        darkMode: data.settings.theme.darkMode,
        gradientEnabled: data.settings.theme.gradient.enabled,
        gradientStart: data.settings.theme.gradient.start,
        gradientMiddle: data.settings.theme.gradient.middle,
        gradientEnd: data.settings.theme.gradient.end,
        customCursor: data.settings.theme.customCursor,
        accentColor: data.settings.theme.accentColor,
        cardOpacity: data.settings.theme.cardOpacity,
        bgImage: data.settings.theme.bgImage,
      },
    });

    this.setState({
      sessions: data.sessions.map(o => ({
        ...o,
        startTs: new Date(o.startTs).getTime(),
        endTs: new Date(o.endTs).getTime(),
      })),
    });

    this.setState({
      tasks: data.tasks,
    });

    // Merge with existing schedule, preserving user-assigned colors
    const mergedSchedule = mergeEvents(
      this.getState().schedule || [],
      data.schedule,
      ['title', 'day', 'start', 'end'], // Key fields to match events
      ['color'] // Fields to preserve from existing events
    );
    this.setState({ schedule: mergedSchedule });

    // Merge with existing timetable events, preserving user-assigned colors
    const mergedTimetableEvents = mergeEvents(
      this.getState().timetableEvents || [],
      data.timetableEvents,
      ['day', 'startTime', 'endTime', 'eventType'], // Key fields to match events
      ['color'] // Fields to preserve from existing events (changed from 'hexColor' to 'color')
    );
    this.setState({ timetableEvents: mergedTimetableEvents });

    // Merge with existing regular events, preserving user-assigned colors
    const mergedRegularEvents = mergeEvents(
      this.getState().regularEvents || [],
      data.regularEvents,
      ['title', 'startDate'], // Key fields to match events
      ['color'] // Fields to preserve from existing events
    );
    this.setState({ regularEvents: mergedRegularEvents });
  }

  private importDataV1(data: ExchangeFormatV1) {
    const courses =
      data.settings?.courses.map(o => ({
        id: uid(),
        title: o,
      })) || [];

    // Extract settings first
    if (data.settings) {
      const newState = {
        courses,
        selectedCourseId: courses[data.settings.selectedCourse || 0]?.id || courses[0]?.id || '',
        theme: {
          darkMode: data.settings.darkMode,
          bgImage: data.settings.bgImage,
          gradientEnabled: data.settings.gradient.enabled,
          gradientStart: data.settings.gradient.start,
          gradientMiddle: data.settings.gradient.middle,
          gradientEnd: data.settings.gradient.end,
          accentColor: data.settings.accentColor,
          cardOpacity: data.settings.cardOpacity,
          customCursor: '',
        },
        soundtrack: {
          embed: data.settings.soundtrackEmbed,
          position: 'dashboard' as SoundtrackPosition,
        },
        weather: {
          apiKey: data.settings.weatherApiKey,
          location: data.settings.weatherLocation,
        },
        degreePlan: {
          name: data.settings.degreePlan?.name || 'Degree Plan',
          ...(data.settings.degreePlan || { semesters: [], completedCourses: [] }),
        },
      };

      this.setState(newState);
    }

    // Import degree plan data (for backward compatibility)
    if (data.degreePlan) {
      this.setState({
        degreePlan: {
          name: data.degreePlan.name || 'Degree Plan',
          ...data.degreePlan,
        },
      });
    }

    // Then import data with proper course indices, preserving user customizations
    if (data.sessions) {
      const sessions = data.sessions.map(o => ({
        id: o.id ?? uid(),
        courseId: findCourseId(o.course, courses),
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
      const exams = data.exams.map(o => ({
        id: o.id ?? uid(),
        courseId: findCourseId(o.course, courses),
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
      const tasks = data.tasks.map(o => ({
        id: o.id ?? uid(),
        courseId: findCourseId(o.course, courses),
        title: o.title,
        due: o.due,
        priority: o.priority,
        done: o.done,
      }));
      this.setState({ tasks });
    }

    if (data.schedule) {
      const importedSchedule = data.schedule.map(o => ({
        id: o.id ?? uid(),
        courseId: findCourseId(o.course, courses),
        title: o.title,
        day: o.day,
        start: o.start,
        end: o.end,
        location: o.location,
        color: o.color,
      }));

      // Merge with existing schedule, preserving user-assigned colors
      const mergedSchedule = mergeEvents(
        this.getState().schedule || [],
        importedSchedule,
        ['title', 'day', 'start', 'end'], // Key fields to match events
        ['color'] // Fields to preserve from existing events
      );
      this.setState({ schedule: mergedSchedule });
    }

    if (data.timetableEvents) {
      const importedTimetableEvents = data.timetableEvents.map(o => ({
        id: o.id ?? uid(),
        courseId: findCourseId(o.course, courses),
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
      const mergedTimetableEvents = mergeEvents(
        this.getState().timetableEvents || [],
        importedTimetableEvents,
        ['day', 'startTime', 'endTime', 'eventType'], // Key fields to match events
        ['color'] // Fields to preserve from existing events
      );
      this.setState({ timetableEvents: mergedTimetableEvents });
    }

    if (data.regularEvents) {
      const importedRegularEvents = data.regularEvents.map(o => ({
        id: o.id ?? uid(),
        courseId: findCourseId(o.course, courses),
        title: o.title,
        startDate: o.startDate,
        endDate: o.endDate,
        isMultiDay: o.isMultiDay,
        location: o.location,
        notes: o.notes,
        color: o.color || o.hexColor, // Support both color formats for backward compatibility
      }));

      // Merge with existing regular events, preserving user-assigned colors
      const mergedRegularEvents = mergeEvents(
        this.getState().regularEvents || [],
        importedRegularEvents,
        ['title', 'startDate'], // Key fields to match events
        ['color'] // Fields to preserve from existing events
      );
      this.setState({ regularEvents: mergedRegularEvents });
    }

    if (data.sessionTasks) {
      const sessionTasks = data.sessionTasks.map(o => ({
        ...o,
        id: o.id ?? uid(),
      }));
      this.setState({ sessionTasks });
    }

    // Import weekly goals data
    if (data.weeklyGoals) {
      const weeklyGoals = data.weeklyGoals.map(o => ({
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
function mergeEvents<T extends GenericEvent>(
  existingEvents: T[],
  importedEvents: T[],
  keyFields: (keyof T)[],
  preserveFields: (keyof T)[]
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

function findCourseId(courseName: string, courses: { id: string; title: string }[]) {
  return courses.find(c => c.title === courseName)?.id;
}

interface ExchangeFormatV2 {
  version: '2';
  courses: Array<{
    id: string;
    title: string;
  }>;
  sessions: Array<{
    id: string;
    courseId: string;
    startTs: number;
    endTs: number;
    durationMin: number;
    technique: string;
    moodStart?: number;
    moodEnd?: number;
    note?: string;
  }>;
  exams: Array<{
    id: string;
    courseId: string;
    title: string;
    date: string;
    weight: number;
    notes: string;
  }>;
  examGrades: Array<{
    examId: string;
    grade: number;
  }>;
  tasks: Array<{
    id: string;
    courseId: string;
    title: string;
    due: string;
    priority: string;
    done: boolean;
  }>;
  schedule: Array<{
    id: string;
    courseId: string;
    title: string;
    day: string;
    start: string;
    end: string;
    location: string;
    color?: string;
  }>;
  timetableEvents: Array<{
    id: string;
    courseId: string;
    eventType: string;
    classroom: string;
    teacher: string;
    day: string;
    startTime: string;
    endTime: string;
    block: string;
    color?: string;
  }>;
  regularEvents: Array<{
    id: string;
    courseId: string;
    title: string;
    startDate: string;
    endDate: string;
    isMultiDay: boolean;
    location: string;
    notes: string;
    color?: string;
  }>;
  sessionTasks: Array<{
    id: string;
    title: string;
    done: boolean;
    createdAt: number;
  }>;
  degreePlan: {
    name: string;
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
  };
  wellness: {
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
  weeklyGoals: Array<{
    id: string;
    title: string;
    completed: boolean;
    createdAt: number;
    color?: string;
  }>;
  settings: {
    selectedCourseId: string;
    soundtrackEmbed: string;
    weather: {
      apiKey: string;
      location: {
        useGeolocation: boolean;
        city: string;
      };
    };
    theme: {
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
      customCursor: string;
      accentColor: {
        light: string;
        dark: string;
      };
      cardOpacity: {
        light: number;
        dark: number;
      };
      bgImage: string;
    };
  };
}

interface ExchangeFormatV1 {
  version?: null;
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
  name?: string;
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
