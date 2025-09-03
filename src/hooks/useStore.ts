import { useSnapshot } from 'valtio';
import { uid } from '../lib/utils';
import { store, storeLoadingState } from '../stores/app';
import type {
  Course,
  DegreePlan,
  ExamGrade,
  ExamInput,
  RegularEventInput,
  StudySession,
  StudySessionTask,
  SoundtrackPosition,
  Task,
  TaskInput,
  TimetableEventInput,
  WeatherLocation,
  WeeklyGoal,
} from '../types';

// Hook for loading state
export function useStoreLoading() {
  const loadingState = useSnapshot(storeLoadingState);
  return loadingState;
}
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

  const clearCourseData = (courseId: string) => {
    // Clear tasks
    for (let i = store.tasks.length - 1; i >= 0; i--) {
      if (store.tasks[i].courseId === courseId) {
        store.tasks.splice(i, 1);
      }
    }

    // Clear exams and their grades
    const examIdsToDelete: string[] = [];
    for (let i = store.exams.length - 1; i >= 0; i--) {
      if (store.exams[i].courseId === courseId) {
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
      if (store.timetableEvents[i].courseId === courseId) {
        store.timetableEvents.splice(i, 1);
      }
    }

    // Clear regular events
    for (let i = store.regularEvents.length - 1; i >= 0; i--) {
      if (store.regularEvents[i].courseId === courseId) {
        store.regularEvents.splice(i, 1);
      }
    }

    // Clear study sessions
    for (let i = store.sessions.length - 1; i >= 0; i--) {
      if (store.sessions[i].courseId === courseId) {
        store.sessions.splice(i, 1);
      }
    }
  };

  return {
    courses: state.courses,
    selectedCourseId: state.selectedCourseId,
    getCourseById: (courseId: string) => {
      return state.courses.find(c => c.id === courseId);
    },
    getCourseTitle: (courseId: string) => {
      return state.courses.find(c => c.id === courseId)?.title || '';
    },
    setSelectedCourse: (courseId: string) => {
      store.selectedCourseId = courseId;
    },
    renameCourse: (courseId: string, title: string) => {
      const course = store.courses.find(c => c.id === courseId);
      if (course) {
        course.title = title;
      }
    },
    addCourse: (title: string) => {
      const newCourse = { id: uid(), title };
      store.courses.push(newCourse);
      // If this is the first course, select it
      if (store.courses.length === 1) {
        store.selectedCourseId = newCourse.id;
      }
      return newCourse;
    },
    /**
     * Clear all data related to a specific course
     */
    clearCourseData,
    removeCourse: (courseId: string) => {
      // Don't allow removing if it's the only course
      if (store.courses.length <= 1) {
        return false;
      }

      // Clear all data related to this course first
      clearCourseData(courseId);

      // Remove the course
      const courseIndex = store.courses.findIndex(c => c.id === courseId);
      if (courseIndex !== -1) {
        store.courses.splice(courseIndex, 1);

        // If the removed course was selected, select another one
        if (store.selectedCourseId === courseId) {
          store.selectedCourseId = store.courses[0]?.id || '';
        }
      }
      return true;
    },
    setCourses: (courses: Course[]) => {
      store.courses = courses;
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
    addTask: (task: TaskInput) => {
      store.tasks.unshift({ ...task, id: uid(), done: false });
    },
    updateTask: (id: string, updatedTask: TaskInput) => {
      const taskIndex = store.tasks.findIndex(t => t.id === id);
      if (taskIndex !== -1) {
        store.tasks[taskIndex] = { ...updatedTask, id, done: store.tasks[taskIndex].done };
      }
    },
    toggleTask: (id: string) => {
      const taskIndex = store.tasks.findIndex(t => t.id === id);
      if (taskIndex !== -1) {
        store.tasks[taskIndex].done = !store.tasks[taskIndex].done;
      }
    },
    deleteTask: (id: string) => {
      const taskIndex = store.tasks.findIndex(t => t.id === id);
      if (taskIndex !== -1) {
        store.tasks.splice(taskIndex, 1);
      }
    },
    setTasks: (tasks: Task[]) => {
      store.tasks = tasks;
    },
  };
}

/**
 * Hook to access and modify exams
 */
export function useExams() {
  const state = useSnapshot(store);

  return {
    exams: state.exams,
    examGrades: state.examGrades,
    addExam: (exam: ExamInput) => {
      store.exams.unshift({ ...exam, id: uid() });
    },
    updateExam: (id: string, updatedExam: ExamInput) => {
      const examIndex = store.exams.findIndex(e => e.id === id);
      if (examIndex !== -1) {
        store.exams[examIndex] = { ...updatedExam, id };
      }
    },
    deleteExam: (id: string) => {
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
    },
    toggleExamComplete: (id: string) => {
      const examIndex = store.exams.findIndex(e => e.id === id);
      if (examIndex !== -1) {
        store.exams[examIndex].completed = !store.exams[examIndex].completed;
      }
    },
    setExamGrades: (grades: ExamGrade[]) => {
      store.examGrades = grades;
    },
  };
}

/**
 * Hook to access and modify regular events
 */
export function useRegularEvents() {
  const regularEvents = useSnapshot(store.regularEvents);

  return {
    regularEvents,
    addRegularEvent: (event: RegularEventInput) => {
      store.regularEvents.unshift({ ...event, id: uid() });
    },
    updateRegularEvent: (id: string, updatedEvent: RegularEventInput) => {
      const eventIndex = store.regularEvents.findIndex(e => e.id === id);
      if (eventIndex !== -1) {
        store.regularEvents[eventIndex] = { ...updatedEvent, id };
      }
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
  const timetableEvents = useSnapshot(store.timetableEvents);

  return {
    timetableEvents,
    addTimetableEvent: (event: TimetableEventInput) => {
      store.timetableEvents.push({ ...event, id: uid() });
    },
    updateTimetableEvent: (id: string, updatedEvent: TimetableEventInput) => {
      const eventIndex = store.timetableEvents.findIndex(e => e.id === id);
      if (eventIndex !== -1) {
        store.timetableEvents[eventIndex] = { ...updatedEvent, id };
      }
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
 * Hook to access and modify study sessions
 */
export function useStudySessions() {
  const sessions = useSnapshot(store.sessions);
  const sessionTasks = useSnapshot(store.sessionTasks);

  return {
    sessions,
    sessionTasks,
    setSessions: (sessions: StudySession[]) => {
      store.sessions = sessions;
    },
    setSessionTasks: (tasks: StudySessionTask[]) => {
      store.sessionTasks = tasks;
    },
    addSession: (session: StudySession) => {
      store.sessions.unshift(session);
    },
    deleteSession: (id: string) => {
      const sessionIndex = store.sessions.findIndex(s => s.id === id);
      if (sessionIndex !== -1) {
        store.sessions.splice(sessionIndex, 1);
      }
    },
    addSessionTask: (title: string) => {
      const task = { id: uid(), title, done: false, createdAt: Date.now() };
      store.sessionTasks.unshift(task);
    },
    toggleSessionTask: (id: string) => {
      const taskIndex = store.sessionTasks.findIndex(t => t.id === id);
      if (taskIndex !== -1) {
        store.sessionTasks[taskIndex].done = !store.sessionTasks[taskIndex].done;
      }
    },
    deleteSessionTask: (id: string) => {
      const taskIndex = store.sessionTasks.findIndex(t => t.id === id);
      if (taskIndex !== -1) {
        store.sessionTasks.splice(taskIndex, 1);
      }
    },
    clearCompletedSessionTasks: () => {
      store.sessionTasks = store.sessionTasks.filter(t => !t.done);
    },
  };
}

/**
 * Hook to access and modify theme settings
 */
export function useTheme() {
  // Only subscribe to theme changes, not the entire store
  const theme = useSnapshot(store.theme);

  return {
    theme,
    setDarkMode: (darkMode: boolean) => {
      store.theme.darkMode = darkMode;
    },
    setBgImage: (bgImage: string) => {
      store.theme.bgImage = bgImage;
    },
    setCustomCursor: (customCursor: string) => {
      store.theme.customCursor = customCursor;
    },
    setAccentColor: (accentColor: typeof theme.accentColor) => {
      store.theme.accentColor = accentColor;
    },
    setCardOpacity: (cardOpacity: typeof theme.cardOpacity) => {
      store.theme.cardOpacity = cardOpacity;
    },
    setGradientEnabled: (gradientEnabled: boolean) => {
      store.theme.gradientEnabled = gradientEnabled;
    },
    setGradientStart: (gradientStart: typeof theme.gradientStart) => {
      store.theme.gradientStart = gradientStart;
    },
    setGradientMiddle: (gradientMiddle: typeof theme.gradientMiddle) => {
      store.theme.gradientMiddle = gradientMiddle;
    },
    setGradientEnd: (gradientEnd: typeof theme.gradientEnd) => {
      store.theme.gradientEnd = gradientEnd;
    },
  };
}

/**
 * Hook to access and modify weather settings
 */
export function useWeather() {
  const weather = useSnapshot(store.weather);

  return {
    weather,
    setWeatherApiKey: (key: string) => {
      store.weather.apiKey = key;
    },
    setWeatherLocation: (location: WeatherLocation) => {
      store.weather.location = location;
    },
  };
}

/**
 * Hook to access and modify soundtrack settings
 */
export function useSoundtrack() {
  const soundtrack = useSnapshot(store.soundtrack);

  return {
    soundtrack,
    setSoundtrackEmbed: (embed: string) => {
      store.soundtrack.embed = embed;
    },
    setSoundtrackPosition: (position: SoundtrackPosition) => {
      store.soundtrack.position = position;
    },
  };
}

/**
 * Hook to access and modify focus timer settings
 */
export function useFocusTimer() {
  const focusTimer = useSnapshot(store.focusTimer);

  return {
    focusTimer,
    setAudioEnabled: (audioEnabled: boolean) => {
      store.focusTimer.audioEnabled = audioEnabled;
    },
    setAudioVolume: (audioVolume: number) => {
      store.focusTimer.audioVolume = audioVolume;
    },
    setNotificationsEnabled: (notificationsEnabled: boolean) => {
      store.focusTimer.notificationsEnabled = notificationsEnabled;
    },
    setShowCountdown: (showCountdown: boolean) => {
      store.focusTimer.showCountdown = showCountdown;
    },
    setBlockingStrategy: (blockingStrategy: 'blacklist' | 'whitelist' | 'disabled') => {
      store.focusTimer.blockingStrategy = blockingStrategy;
    },
    setSites: (sites: string) => {
      store.focusTimer.sites = sites;
    },
  };
}

/**
 * Hook to access and modify degree plan
 */
export function useDegreePlan() {
  const degreePlan = useSnapshot(store.degreePlan);

  return {
    degreePlan,
    setDegreePlan: (degreePlanOrUpdater: DegreePlan | ((prev: DegreePlan) => DegreePlan)) => {
      if (typeof degreePlanOrUpdater === 'function') {
        const updater = degreePlanOrUpdater as (prev: DegreePlan) => DegreePlan;
        store.degreePlan = updater(store.degreePlan);
      } else {
        store.degreePlan = degreePlanOrUpdater;
      }
    },
    setDegreePlanName: (name: string) => {
      store.degreePlan.name = name;
    },
    setSemesters: (semesters: any[]) => {
      store.degreePlan.semesters = semesters;
    },
    setCompletedCourses: (completedCourses: string[]) => {
      store.degreePlan.completedCourses = completedCourses;
    },
    addCompletedCourse: (courseAcronym: string) => {
      if (!store.degreePlan.completedCourses.includes(courseAcronym)) {
        store.degreePlan.completedCourses.push(courseAcronym);
      }
    },
    removeCompletedCourse: (courseAcronym: string) => {
      const index = store.degreePlan.completedCourses.indexOf(courseAcronym);
      if (index > -1) {
        store.degreePlan.completedCourses.splice(index, 1);
      }
    },
    removeSemester: (semesterNumber: number) => {
      const semester = store.degreePlan.semesters.find(s => s.number === semesterNumber);
      if (!semester) return;

      // Remove the semester (now allows removing non-empty semesters with confirmation)
      const filteredSemesters = store.degreePlan.semesters.filter(s => s.number !== semesterNumber);

      // Renumber remaining semesters
      const renumberedSemesters = filteredSemesters.map((sem, index) => ({
        ...sem,
        number: index + 1,
      }));

      store.degreePlan.semesters = renumberedSemesters;
    },
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
    setHydrationSettings: (hydrationSettings: typeof wellness.hydrationSettings) => {
      store.wellness.hydrationSettings = hydrationSettings;
    },
    setDailyHydration: (dailyHydration: typeof wellness.dailyHydration) => {
      store.wellness.dailyHydration = dailyHydration;
    },
  };
}

/**
 * Hook to access and modify weekly goals
 */
export function useWeeklyGoals() {
  const weeklyGoals = useSnapshot(store.weeklyGoals);

  return {
    weeklyGoals,
    addGoal: (title: string) => {
      if (!title.trim()) return;
      const newGoal: WeeklyGoal = {
        id: uid(),
        title: title.trim(),
        completed: false,
        createdAt: Date.now(),
      };
      store.weeklyGoals.push(newGoal);
    },
    toggleGoal: (id: string) => {
      const goalIndex = store.weeklyGoals.findIndex(goal => goal.id === id);
      if (goalIndex !== -1) {
        const goal = store.weeklyGoals[goalIndex];
        const isBeingCompleted = !goal.completed;

        // Generate random color when completing (but keep existing color if uncompleting)
        const colors = [
          '#ff6b6b',
          '#4ecdc4',
          '#45b7d1',
          '#96ceb4',
          '#ffeaa7',
          '#dda0dd',
          '#98d8c8',
          '#f7dc6f',
          '#bb8fce',
          '#85c1e9',
          '#f8c471',
          '#82e0aa',
          '#f1948a',
          '#85c1e9',
          '#d7bde2',
          '#ff9ff3',
          '#54a0ff',
          '#5f27cd',
          '#00d2d3',
          '#ff9f43',
          '#10ac84',
          '#ee5a24',
          '#0984e3',
          '#6c5ce7',
          '#a29bfe',
        ];

        store.weeklyGoals[goalIndex] = {
          ...goal,
          completed: isBeingCompleted,
          color: isBeingCompleted ? goal.color || colors[Math.floor(Math.random() * colors.length)] : goal.color,
        };

        // Check if all goals are completed and return status
        return {
          allCompleted: store.weeklyGoals.every(g => g.completed) && store.weeklyGoals.length > 0,
        };
      }
      return { allCompleted: false };
    },
    deleteGoal: (id: string) => {
      const goalIndex = store.weeklyGoals.findIndex(goal => goal.id === id);
      if (goalIndex !== -1) {
        store.weeklyGoals.splice(goalIndex, 1);
      }
    },
    clearAllGoals: () => {
      store.weeklyGoals.length = 0;
    },
  };
}
