export class DataTransfer {
  constructor(getState, setState) {
    this.getState = getState;
    this.setState = setState;
  }

  exportData() {
    const state = this.getState();
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
        location: e.location
      })),
      sessionTasks: state.sessionTasks,
      
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
        soundtrackEmbed: state.soundtrackEmbed
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
          soundtrackEmbed: data.settings.soundtrackEmbed
        });
      }

      // Then import data with proper course indices
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
        const schedule = data.schedule.map(e => ({
          id: crypto.randomUUID(),
          courseIndex: findCourseIndex(e.course, data.settings.courses),
          title: e.title,
          day: e.day,
          start: e.start,
          end: e.end,
          location: e.location
        }));
        this.setState({ schedule });
      }

      if (data.sessionTasks) {
        const sessionTasks = data.sessionTasks.map(t => ({
          ...t,
          id: crypto.randomUUID()
        }));
        this.setState({ sessionTasks });
      }

      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
}
