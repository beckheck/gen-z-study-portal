export class DataTransfer {
  constructor(getState, setState) {
    this.getState = getState;
    this.setState = setState;
  }

  // Helper function to merge events preserving user customizations
  mergeEvents(existingEvents, importedEvents, keyFields = ['title', 'day'], preserveFields = ['color', 'hexColor']) {
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
            mergedEvent[field] = existing[field];
          }
        });
        
        // Keep the existing ID to maintain references
        mergedEvent.id = existing.id;
        
        merged[existingIndex] = mergedEvent;
      } else {
        // New event, add it
        merged.push(importedEvent);
      }
    });
    
    return merged;
  }

  exportData() {
    const state = this.getState();
    console.log("State for export:", {
      hasTimetableEvents: !!state.timetableEvents,
      timetableEventsCount: state.timetableEvents ? state.timetableEvents.length : 0,
      hasRegularEvents: !!state.regularEvents,
      regularEventsCount: state.regularEvents ? state.regularEvents.length : 0
    });
    
    const data = {
      // Core data
      sessions: state.sessions.map(s => ({
        type: "session",
        course: state.courses[s.courseIndex],
        startTs: new Date(s.startTs).toISOString(),
        endTs: new Date(s.endTs).toISOString(),
        durationMin: s.durationMin,
        technique: s.technique,
        moodStart: s.moodStart,
        moodEnd: s.moodEnd,
        note: (s.note || "").replace(/[\r\n]+/g, " ")
      })),
      exams: state.exams.map(e => ({
        type: "exam",
        course: state.courses[e.courseIndex],
        title: e.title,
        date: e.date,
        weight: e.weight,
        notes: (e.notes || "").replace(/[\r\n]+/g, " ")
      })),
      examGrades: state.examGrades || [],
      tasks: state.tasks.map(t => ({
        type: "task",
        course: state.courses[t.courseIndex],
        title: t.title,
        due: t.due,
        priority: t.priority,
        done: t.done
      })),
      schedule: state.schedule.map(e => ({
        type: "schedule",
        course: state.courses[e.courseIndex],
        title: e.title,
        day: e.day,
        start: e.start,
        end: e.end,
        location: e.location,
        color: e.color
      })),
      timetableEvents: state.timetableEvents.map(e => ({
        type: "timetableEvent",
        course: state.courses[e.courseIndex],
        eventType: e.eventType,
        classroom: e.classroom,
        teacher: e.teacher,
        day: e.day,
        startTime: e.startTime,
        endTime: e.endTime,
        block: e.block,
        color: e.color // Export as 'color' not 'hexColor'
      })),
      regularEvents: state.regularEvents.map(e => ({
        type: "regularEvent",
        course: state.courses[e.courseIndex],
        title: e.title,
        startDate: e.startDate,
        endDate: e.endDate,
        isMultiDay: e.isMultiDay,
        location: e.location,
        notes: e.notes,
        color: e.color
      })),
      sessionTasks: state.sessionTasks,
      
      // Degree Plan data
      degreePlan: state.degreePlan,
      
      // Wellness data
      wellness: {
        water: state.water,
        gratitude: state.gratitude,
        moodPercentages: state.moodPercentages,
        hasInteracted: state.hasInteracted,
        monthlyMoods: state.monthlyMoods,
        showWords: state.showWords,
        moodEmojis: state.moodEmojis
      },
      
      // Settings
      settings: {
        courses: state.courses,
        selectedCourse: state.selectedCourse,
        darkMode: state.darkMode,
        gradient: {
          enabled: state.gradientEnabled,
          start: state.gradientStart,
          middle: state.gradientMiddle,
          end: state.gradientEnd
        },
        bgImage: state.bgImage,
        soundtrackEmbed: state.soundtrackEmbed,
        accentColor: state.accentColor,
        cardOpacity: state.cardOpacity,
        weatherApiKey: state.weatherApiKey,
        weatherLocation: state.weatherLocation,
        degreePlan: state.degreePlan
      }
    };

    try {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: "application/json;charset=utf-8;" });
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

  async importData(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      console.log("Import data structure:", {
        hasSettings: !!data.settings,
        hasSessions: !!data.sessions,
        hasExams: !!data.exams,
        hasExamGrades: !!data.examGrades,
        hasTasks: !!data.tasks,
        hasSchedule: !!data.schedule,
        hasTimetableEvents: !!data.timetableEvents,
        hasRegularEvents: !!data.regularEvents,
        hasSessionTasks: !!data.sessionTasks
      });
      
      // Check for missing props in the timetable events
      if (data.timetableEvents && data.timetableEvents.length > 0) {
        const sampleEvent = data.timetableEvents[0];
        console.log("Sample timetable event:", sampleEvent);
      }
      
      // Helper to find course index
      const findCourseIndex = (courseName, courses) => {
        const index = courses.indexOf(courseName);
        return index === -1 ? 0 : index; // fallback to first course if not found
      };

      // Extract settings first
      if (data.settings) {
        this.setState({
          courses: data.settings.courses,
          selectedCourse: data.settings.selectedCourse,
          darkMode: data.settings.darkMode,
          gradientEnabled: data.settings.gradient.enabled,
          gradientStart: data.settings.gradient.start,
          gradientMiddle: data.settings.gradient.middle,
          gradientEnd: data.settings.gradient.end,
          bgImage: data.settings.bgImage,
          soundtrackEmbed: data.settings.soundtrackEmbed,
          accentColor: data.settings.accentColor,
          cardOpacity: data.settings.cardOpacity,
          weatherApiKey: data.settings.weatherApiKey,
          weatherLocation: data.settings.weatherLocation,
          degreePlan: data.settings.degreePlan || { semesters: [], totalSemesters: 0, completedCourses: [] }
        });
      }

      // Import degree plan data (for backward compatibility)
      if (data.degreePlan) {
        this.setState({ degreePlan: data.degreePlan });
      }

      // Get current state to preserve user customizations
      const currentState = this.getState();

      // Then import data with proper course indices, preserving user customizations
      if (data.sessions) {
        const sessions = data.sessions.map(s => ({
          id: crypto.randomUUID(),
          courseIndex: findCourseIndex(s.course, data.settings.courses),
          startTs: new Date(s.startTs).getTime(),
          endTs: new Date(s.endTs).getTime(),
          durationMin: s.durationMin,
          technique: s.technique,
          moodStart: s.moodStart,
          moodEnd: s.moodEnd,
          note: s.note
        }));
        this.setState({ sessions });
      }

      if (data.exams) {
        const exams = data.exams.map(e => ({
          id: crypto.randomUUID(),
          courseIndex: findCourseIndex(e.course, data.settings.courses),
          title: e.title,
          date: e.date,
          weight: e.weight,
          notes: e.notes
        }));
        this.setState({ exams });
      }

      // Import exam grades
      if (data.examGrades) {
        this.setState({ examGrades: data.examGrades });
      }

      if (data.tasks) {
        const tasks = data.tasks.map(t => ({
          id: crypto.randomUUID(),
          courseIndex: findCourseIndex(t.course, data.settings.courses),
          title: t.title,
          due: t.due,
          priority: t.priority,
          done: t.done
        }));
        this.setState({ tasks });
      }

      if (data.schedule) {
        const importedSchedule = data.schedule.map(e => ({
          id: crypto.randomUUID(),
          courseIndex: findCourseIndex(e.course, data.settings.courses),
          title: e.title,
          day: e.day,
          start: e.start,
          end: e.end,
          location: e.location,
          color: e.color
        }));
        
        // Merge with existing schedule, preserving user-assigned colors
        const mergedSchedule = this.mergeEvents(
          currentState.schedule || [], 
          importedSchedule, 
          ['title', 'day', 'start', 'end'], // Key fields to match events
          ['color'] // Fields to preserve from existing events
        );
        this.setState({ schedule: mergedSchedule });
      }

      if (data.timetableEvents) {
        const importedTimetableEvents = data.timetableEvents.map(e => ({
          id: crypto.randomUUID(),
          courseIndex: findCourseIndex(e.course, data.settings.courses),
          eventType: e.eventType,
          classroom: e.classroom,
          teacher: e.teacher,
          day: e.day,
          startTime: e.startTime,
          endTime: e.endTime,
          block: e.block,
          color: e.color || e.hexColor // Support both color formats for backward compatibility
        }));
        
        // Merge with existing timetable events, preserving user-assigned colors
        const mergedTimetableEvents = this.mergeEvents(
          currentState.timetableEvents || [], 
          importedTimetableEvents, 
          ['day', 'startTime', 'endTime', 'eventType'], // Key fields to match events
          ['color'] // Fields to preserve from existing events (changed from 'hexColor' to 'color')
        );
        console.log("Importing timetable events with preserved colors:", mergedTimetableEvents);
        this.setState({ timetableEvents: mergedTimetableEvents });
      } else {
        console.log("No timetable events found in import data");
      }

      if (data.regularEvents) {
        const importedRegularEvents = data.regularEvents.map(e => ({
          id: crypto.randomUUID(),
          courseIndex: findCourseIndex(e.course, data.settings.courses),
          title: e.title,
          startDate: e.startDate,
          endDate: e.endDate,
          isMultiDay: e.isMultiDay,
          location: e.location,
          notes: e.notes,
          color: e.color || e.hexColor // Support both color formats for backward compatibility
        }));
        
        // Merge with existing regular events, preserving user-assigned colors
        const mergedRegularEvents = this.mergeEvents(
          currentState.regularEvents || [], 
          importedRegularEvents, 
          ['title', 'startDate'], // Key fields to match events
          ['color'] // Fields to preserve from existing events
        );
        console.log("Importing regular events with preserved colors:", mergedRegularEvents);
        this.setState({ regularEvents: mergedRegularEvents });
      } else {
        console.log("No regular events found in import data");
      }

      if (data.sessionTasks) {
        const sessionTasks = data.sessionTasks.map(t => ({
          ...t,
          id: crypto.randomUUID()
        }));
        this.setState({ sessionTasks });
      }

      // Import wellness data
      if (data.wellness) {
        this.setState({
          water: data.wellness.water || 0,
          gratitude: data.wellness.gratitude || "",
          moodPercentages: data.wellness.moodPercentages || {},
          hasInteracted: data.wellness.hasInteracted || false,
          monthlyMoods: data.wellness.monthlyMoods || {},
          showWords: data.wellness.showWords !== undefined ? data.wellness.showWords : true,
          moodEmojis: data.wellness.moodEmojis || {
            angry: { emoji: "😠", color: "#ff6b6b", word: "Angry" },
            sad: { emoji: "😔", color: "#ff9f43", word: "Sad" },
            neutral: { emoji: "😐", color: "#f7dc6f", word: "Neutral" },
            happy: { emoji: "🙂", color: "#45b7d1", word: "Happy" },
            excited: { emoji: "😁", color: "#10ac84", word: "Excited" }
          }
        });
      }

      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
}
