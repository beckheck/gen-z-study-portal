import { useCallback } from 'react';
import { useSnapshot } from 'valtio';
import { uid } from '../lib/utils';
import { store } from '../store';
import type {
  DegreePlan,
  ExamGrade,
  ExamInput,
  RegularEventInput,
  ScheduleEvent,
  Session,
  SessionTask,
  SoundtrackPosition,
  Task,
  TaskInput,
  TimetableEvent,
  TimetableEventInput,
  WeatherLocation,
} from '../types';

/**
 * Main hook to access the entire app state snapshot
 */
export function useAppState() {
  return useSnapshot(store);
}

/**
 * Hook to access and modify courses
 */
export function useCourses() {
  const state = useSnapshot(store);

  return {
    courses: state.courses,
    selectedCourse: state.selectedCourse,
    setSelectedCourse: (index: number) => {
      store.selectedCourse = index;
    },
    renameCourse: (index: number, name: string) => {
      store.courses[index] = name || `Course ${index + 1}`;
    },
  };
}

/**
 * Hook to access and modify tasks
 */
export function useTasks() {
  const tasks = useSnapshot(store.tasks);

  return {
    tasks,
    addTask: useCallback((task: TaskInput) => {
      store.tasks.unshift({ ...task, id: uid(), done: false });
    }, []),
    toggleTask: useCallback((id: string) => {
      const taskIndex = store.tasks.findIndex(t => t.id === id);
      if (taskIndex !== -1) {
        store.tasks[taskIndex].done = !store.tasks[taskIndex].done;
      }
    }, []),
    deleteTask: useCallback((id: string) => {
      const taskIndex = store.tasks.findIndex(t => t.id === id);
      if (taskIndex !== -1) {
        store.tasks.splice(taskIndex, 1);
      }
    }, []),
    setTasks: useCallback((tasks: Task[]) => {
      store.tasks = tasks;
    }, []),
  };
}

/**
 * Hook to access and modify exams
 */
export function useExams() {
  const exams = useSnapshot(store.exams);
  const examGrades = useSnapshot(store.examGrades);

  return {
    exams,
    examGrades,
    addExam: useCallback((exam: ExamInput) => {
      store.exams.unshift({ ...exam, id: uid() });
    }, []),
    updateExam: useCallback((id: string, updatedExam: ExamInput) => {
      const examIndex = store.exams.findIndex(e => e.id === id);
      if (examIndex !== -1) {
        store.exams[examIndex] = { ...updatedExam, id };
      }
    }, []),
    deleteExam: useCallback((id: string) => {
      // Remove exam
      const examIndex = store.exams.findIndex(e => e.id === id);
      if (examIndex !== -1) {
        store.exams.splice(examIndex, 1);
      }
      // Remove associated grades
      const gradeIndices = [];
      for (let i = store.examGrades.length - 1; i >= 0; i--) {
        if (store.examGrades[i].examId === id) {
          gradeIndices.push(i);
        }
      }
      gradeIndices.forEach(index => store.examGrades.splice(index, 1));
    }, []),
    setExamGrades: useCallback((grades: ExamGrade[]) => {
      store.examGrades = grades;
    }, []),
  };
}

/**
 * Hook to access and modify regular events
 */
export function useRegularEvents() {
  const state = useSnapshot(store);

  return {
    regularEvents: state.regularEvents,
    addRegularEvent: (event: RegularEventInput) => {
      store.regularEvents.unshift({ ...event, id: uid() });
    },
    deleteRegularEvent: (id: string) => {
      const eventIndex = store.regularEvents.findIndex(e => e.id === id);
      if (eventIndex !== -1) {
        store.regularEvents.splice(eventIndex, 1);
      }
    },
  };
}

/**
 * Hook to access and modify timetable events
 */
export function useTimetable() {
  const state = useSnapshot(store);

  return {
    timetableEvents: state.timetableEvents,
    setTimetableEvents: (events: TimetableEvent[]) => {
      store.timetableEvents = events;
    },
    addTimetableEvent: (event: TimetableEventInput) => {
      store.timetableEvents.push({ ...event, id: uid() });
    },
    deleteTimetableEvent: (id: string) => {
      const eventIndex = store.timetableEvents.findIndex(e => e.id === id);
      if (eventIndex !== -1) {
        store.timetableEvents.splice(eventIndex, 1);
      }
    },
  };
}

/**
 * Hook to access and modify schedule events
 */
export function useSchedule() {
  const state = useSnapshot(store);

  return {
    schedule: state.schedule,
    addSchedule: (item: Omit<ScheduleEvent, 'id'>) => {
      store.schedule.push({ ...item, id: uid() });
    },
    removeSchedule: (id: string) => {
      const scheduleIndex = store.schedule.findIndex(s => s.id === id);
      if (scheduleIndex !== -1) {
        store.schedule.splice(scheduleIndex, 1);
      }
    },
    eventsForDay: (day: string) => {
      return state.schedule.filter(e => e.day === day).sort((a, b) => a.start.localeCompare(b.start));
    },
  };
}

/**
 * Hook to access and modify study sessions
 */
export function useSessions() {
  const state = useSnapshot(store);

  return {
    sessions: state.sessions,
    sessionTasks: state.sessionTasks,
    setSessions: (sessions: Session[]) => {
      store.sessions = sessions;
    },
    setSessionTasks: (tasks: SessionTask[]) => {
      store.sessionTasks = tasks;
    },
    addSession: (session: Session) => {
      store.sessions.unshift(session);
    },
    deleteSession: useCallback((id: string) => {
      const sessionIndex = store.sessions.findIndex(s => s.id === id);
      if (sessionIndex !== -1) {
        store.sessions.splice(sessionIndex, 1);
      }
    }, []),
    addSessionTask: useCallback((title: string) => {
      const task = { id: uid(), title, done: false, createdAt: Date.now() };
      store.sessionTasks.unshift(task);
    }, []),
    toggleSessionTask: useCallback((id: string) => {
      const taskIndex = store.sessionTasks.findIndex(t => t.id === id);
      if (taskIndex !== -1) {
        store.sessionTasks[taskIndex].done = !store.sessionTasks[taskIndex].done;
      }
    }, []),
    deleteSessionTask: useCallback((id: string) => {
      const taskIndex = store.sessionTasks.findIndex(t => t.id === id);
      if (taskIndex !== -1) {
        store.sessionTasks.splice(taskIndex, 1);
      }
    }, []),
    clearCompletedSessionTasks: useCallback(() => {
      store.sessionTasks = store.sessionTasks.filter(t => !t.done);
    }, []),
  };
}

/**
 * Hook to access and modify theme settings
 */
export function useThemeStore() {
  // Only subscribe to theme changes, not the entire store
  const theme = useSnapshot(store.theme);

  const setDarkMode = useCallback((darkMode: boolean) => {
    store.theme.darkMode = darkMode;
  }, []);

  const setBgImage = useCallback((bgImage: string) => {
    store.theme.bgImage = bgImage;
  }, []);

  const setAccentColor = useCallback((accentColor: typeof theme.accentColor) => {
    console.log('setAccentColor called with:', accentColor);
    store.theme.accentColor = accentColor;
    console.log('store.theme.accentColor updated to:', store.theme.accentColor);
  }, []);

  const setCardOpacity = useCallback((cardOpacity: typeof theme.cardOpacity) => {
    console.log('setCardOpacity called with:', cardOpacity);
    store.theme.cardOpacity = cardOpacity;
    console.log('store.theme.cardOpacity updated to:', store.theme.cardOpacity);
  }, []);

  const setGradientEnabled = useCallback((gradientEnabled: boolean) => {
    store.theme.gradientEnabled = gradientEnabled;
  }, []);

  const setGradientStart = useCallback((gradientStart: typeof theme.gradientStart) => {
    store.theme.gradientStart = gradientStart;
  }, []);

  const setGradientMiddle = useCallback((gradientMiddle: typeof theme.gradientMiddle) => {
    store.theme.gradientMiddle = gradientMiddle;
  }, []);

  const setGradientEnd = useCallback((gradientEnd: typeof theme.gradientEnd) => {
    store.theme.gradientEnd = gradientEnd;
  }, []);

  return {
    theme,
    setDarkMode,
    setBgImage,
    setAccentColor,
    setCardOpacity,
    setGradientEnabled,
    setGradientStart,
    setGradientMiddle,
    setGradientEnd,
  };
}

/**
 * Hook to access and modify external service settings
 */
export function useExternalServices() {
  const weather = useSnapshot(store.weather);

  return {
    weather,
    setWeatherApiKey: useCallback((key: string) => {
      store.weather.apiKey = key;
    }, []),
    setWeatherLocation: useCallback((location: WeatherLocation) => {
      store.weather.location = location;
    }, []),
  };
}

/**
 * Hook to access and modify soundtrack settings
 */
export function useSoundtrack() {
  const soundtrack = useSnapshot(store.soundtrack);

  return {
    soundtrack,
    setSoundtrackEmbed: useCallback((embed: string) => {
      store.soundtrack.embed = embed;
    }, []),
    setSoundtrackPosition: useCallback((position: SoundtrackPosition) => {
      store.soundtrack.position = position;
    }, []),
  };
}

/**
 * Hook to access and modify degree plan
 */
export function useDegreePlan() {
  const state = useSnapshot(store);

  return {
    degreePlan: state.degreePlan,
    setDegreePlan: useCallback((degreePlanOrUpdater: DegreePlan | ((prev: DegreePlan) => DegreePlan)) => {
      if (typeof degreePlanOrUpdater === 'function') {
        const updater = degreePlanOrUpdater as (prev: DegreePlan) => DegreePlan;
        store.degreePlan = updater(store.degreePlan);
      } else {
        store.degreePlan = degreePlanOrUpdater;
      }
    }, []),
    setSemesters: useCallback((semesters: any[]) => {
      store.degreePlan.semesters = semesters;
    }, []),
    setCompletedCourses: useCallback((completedCourses: string[]) => {
      store.degreePlan.completedCourses = completedCourses;
    }, []),
    addCompletedCourse: useCallback((courseAcronym: string) => {
      if (!store.degreePlan.completedCourses.includes(courseAcronym)) {
        store.degreePlan.completedCourses.push(courseAcronym);
      }
    }, []),
    removeCompletedCourse: useCallback((courseAcronym: string) => {
      const index = store.degreePlan.completedCourses.indexOf(courseAcronym);
      if (index > -1) {
        store.degreePlan.completedCourses.splice(index, 1);
      }
    }, []),
    removeSemester: useCallback((semesterNumber: number) => {
      const semester = store.degreePlan.semesters.find(s => s.number === semesterNumber);
      if (!semester || semester.courses.length > 0) return;

      // Remove the semester
      const filteredSemesters = store.degreePlan.semesters.filter(s => s.number !== semesterNumber);
      
      // Renumber remaining semesters
      const renumberedSemesters = filteredSemesters.map((sem, index) => ({
        ...sem,
        number: index + 1,
      }));

      store.degreePlan.semesters = renumberedSemesters;
    }, []),
  };
}

/**
 * Hook to access and modify wellness data
 */
export function useWellness() {
  const wellness = useSnapshot(store.wellness);

  return {
    wellness,
    setWater: (water: number) => {
      store.wellness.water = water;
    },
    setGratitude: (gratitude: string) => {
      store.wellness.gratitude = gratitude;
    },
    setMoodPercentages: (percentages: Record<string, number>) => {
      store.wellness.moodPercentages = percentages;
    },
    setHasInteracted: (hasInteracted: boolean) => {
      store.wellness.hasInteracted = hasInteracted;
    },
    setMonthlyMoods: (monthlyMoods: typeof wellness.monthlyMoods) => {
      store.wellness.monthlyMoods = monthlyMoods;
    },
    setShowWords: (showWords: boolean) => {
      store.wellness.showWords = showWords;
    },
    setMoodEmojis: (moodEmojis: typeof wellness.moodEmojis) => {
      store.wellness.moodEmojis = moodEmojis;
    },
  };
}

/**
 * Hook for course-related data operations
 */
export function useCourseData() {
  const state = useSnapshot(store);

  return {
    /**
     * Clear all data related to a specific course
     */
    clearCourseData: (courseIndex: number) => {
      // Clear tasks
      for (let i = store.tasks.length - 1; i >= 0; i--) {
        if (store.tasks[i].courseIndex === courseIndex) {
          store.tasks.splice(i, 1);
        }
      }

      // Clear exams and their grades
      const examIdsToDelete: string[] = [];
      for (let i = store.exams.length - 1; i >= 0; i--) {
        if (store.exams[i].courseIndex === courseIndex) {
          examIdsToDelete.push(store.exams[i].id);
          store.exams.splice(i, 1);
        }
      }

      // Clear exam grades for deleted exams
      for (let i = store.examGrades.length - 1; i >= 0; i--) {
        if (examIdsToDelete.includes(store.examGrades[i].examId)) {
          store.examGrades.splice(i, 1);
        }
      }

      // Clear timetable events
      for (let i = store.timetableEvents.length - 1; i >= 0; i--) {
        if (store.timetableEvents[i].courseIndex === courseIndex) {
          store.timetableEvents.splice(i, 1);
        }
      }

      // Clear regular events
      for (let i = store.regularEvents.length - 1; i >= 0; i--) {
        if (store.regularEvents[i].courseIndex === courseIndex) {
          store.regularEvents.splice(i, 1);
        }
      }

      // Clear schedule entries
      for (let i = store.schedule.length - 1; i >= 0; i--) {
        if (store.schedule[i].courseIndex === courseIndex) {
          store.schedule.splice(i, 1);
        }
      }

      // Clear study sessions
      for (let i = store.sessions.length - 1; i >= 0; i--) {
        if (store.sessions[i].courseIndex === courseIndex) {
          store.sessions.splice(i, 1);
        }
      }
    },
  };
}
