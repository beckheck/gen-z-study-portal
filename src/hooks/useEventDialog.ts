import { useExams, useRegularEvents, useTasks } from '@/hooks/useStore';
import { Exam, RegularEvent, Task } from '@/types';
import { useState } from 'react';

export interface EventForm {
  eventCategory: 'regular' | 'exam' | 'task';
  courseId?: string;
  type: string;
  title: string;
  startDate: string;
  endDate: string;
  day: string;
  start: string;
  end: string;
  location: string;
  weight: number;
  priority: string;
  notes: string;
  color: string;
}

export const DEFAULT_EVENT_FORM: EventForm = {
  eventCategory: 'regular',
  courseId: undefined,
  type: 'class',
  title: '',
  startDate: '',
  endDate: '',
  day: 'Mon',
  start: '10:00',
  end: '11:30',
  location: '',
  weight: 20,
  priority: 'normal',
  notes: '',
  color: '#6366f1',
};

export function useEventDialog() {
  const [open, setOpen] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [form, setForm] = useState<EventForm>(DEFAULT_EVENT_FORM);

  // Import store hooks
  const { addTask, updateTask, deleteTask } = useTasks();

  const { addExam, updateExam, deleteExam } = useExams();
  const { addRegularEvent, updateRegularEvent, deleteRegularEvent } = useRegularEvents();

  const openDialog = (initialData?: Partial<EventForm>) => {
    setForm({
      ...DEFAULT_EVENT_FORM,
      ...initialData,
    });
    setEditingEvent(null);
    setOpen(true);
  };

  const openEditRegularDialog = (event: RegularEvent) => {
    setEditingEvent({ ...event, eventType: 'regular' });
    setForm({
      eventCategory: 'regular',
      courseId: event.courseId,
      title: event.title || '',
      startDate: event.startDate ? new Date(event.startDate).toISOString().split('T')[0] : '',
      endDate: event.endDate ? new Date(event.endDate).toISOString().split('T')[0] : '',
      location: event.location || '',
      notes: event.notes || '',
      color: event.color || '#6366f1',
      type: 'class',
      day: 'Mon',
      start: '10:00',
      end: '11:30',
      weight: 20,
      priority: 'normal',
    });
    setOpen(true);
  };

  const openEditExamDialog = (event: Exam) => {
    setEditingEvent({ ...event, eventType: 'exam' });
    setForm({
      eventCategory: 'exam',
      courseId: event.courseId,
      title: event.title || '',
      startDate: event.date ? new Date(event.date).toISOString().split('T')[0] : '',
      weight: event.weight || 20,
      notes: event.notes || '',
      color: '#ef4444', // Red for exams
      endDate: '',
      location: '',
      type: 'class',
      day: 'Mon',
      start: '10:00',
      end: '11:30',
      priority: 'normal',
    });
    setOpen(true);
  };

  const openEditTaskDialog = (event: Task) => {
    setEditingEvent({ ...event, eventType: 'task' });
    setForm({
      eventCategory: 'task',
      courseId: event.courseId,
      title: event.title || '',
      startDate: event.due ? new Date(event.due).toISOString().split('T')[0] : '',
      priority: event.priority || 'normal',
      notes: event.notes || '',
      color: '#f59e0b', // Amber for tasks
      endDate: '',
      location: '',
      type: 'class',
      day: 'Mon',
      start: '10:00',
      end: '11:30',
      weight: 20,
    });
    setOpen(true);
  };

  const openEditDialog = (event: any) => {
    if (event.eventType === 'regular') {
      openEditRegularDialog(event);
    } else if (event.eventType === 'exam') {
      openEditExamDialog(event);
    } else if (event.eventType === 'task') {
      openEditTaskDialog(event);
    }
  };

  const closeDialog = () => {
    setEditingEvent(null);
    setForm(DEFAULT_EVENT_FORM);
    setOpen(false);
  };

  const handleSave = (validatedData?: any) => {
    const dataToSave = validatedData || form;
    handleSaveEvent(dataToSave, editingEvent);
    closeDialog();
  };

  const handleDelete = () => {
    if (editingEvent) {
      handleDeleteEvent(editingEvent);
      closeDialog();
    }
  };

  // Built-in event handlers
  const handleSaveEvent = (formData: EventForm, editingEvent: any | null) => {
    if (!formData.title) return;

    // If editing an existing event and the category has changed, delete the old event first
    if (editingEvent && editingEvent.eventType !== formData.eventCategory) {
      handleDeleteEvent(editingEvent);
      // Set editingEvent to null so we create a new event instead of updating
      editingEvent = null;
    }

    if (formData.eventCategory === 'regular') {
      const eventData: any = {
        courseId: formData.courseId,
        title: formData.title,
        startDate: formData.startDate,
        location: formData.location,
        notes: formData.notes,
        color: formData.color,
      };

      // Only add endDate if user explicitly provided one that's different from startDate
      if (formData.endDate && formData.endDate !== formData.startDate) {
        eventData.endDate = formData.endDate;
        eventData.isMultiDay = true;
      } else {
        eventData.isMultiDay = false;
      }

      if (editingEvent && editingEvent.eventType === 'regular') {
        // Update existing regular event
        updateRegularEvent(editingEvent.id, eventData);
      } else {
        // Add new regular event
        addRegularEvent(eventData);
      }
    } else if (formData.eventCategory === 'exam') {
      const examData = {
        courseId: formData.courseId,
        title: formData.title,
        date: formData.startDate,
        weight: formData.weight,
        notes: formData.notes,
      };

      if (editingEvent && editingEvent.eventType === 'exam') {
        // Update existing exam (preserves ID and associated grades)
        updateExam(editingEvent.id, examData);
      } else {
        // Add new exam
        addExam(examData);
      }
    } else if (formData.eventCategory === 'task') {
      const taskData = {
        courseId: formData.courseId,
        title: formData.title,
        due: formData.startDate,
        priority: formData.priority,
        notes: formData.notes,
      };

      if (editingEvent && editingEvent.eventType === 'task') {
        // Update existing task
        updateTask(editingEvent.id, taskData);
      } else {
        // Add new task
        addTask(taskData);
      }
    }
  };

  const handleDeleteEvent = (event: any) => {
    if (event.eventType === 'regular') {
      deleteRegularEvent(event.id);
    } else if (event.eventType === 'exam') {
      deleteExam(event.id);
    } else if (event.eventType === 'task') {
      deleteTask(event.id);
    }
  };

  return {
    // State
    open,
    editingEvent,
    form,
    setForm,

    // Actions
    openDialog,
    openEditDialog,
    openEditRegularDialog,
    openEditExamDialog,
    openEditTaskDialog,
    closeDialog,
    handleSave,
    handleDelete,
    handleSaveEvent,
    handleDeleteEvent,

    // Dialog handlers
    onOpenChange: (open: boolean) => {
      if (!open) {
        closeDialog();
      } else {
        setOpen(open);
      }
    },
  };
}
