import { Button } from '@/components/ui/button';
import ColorPicker from '@/components/ui/color-picker';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { SimpleSelect } from '@/components/ui/simple-select';
import { EventForm } from '@/hooks/useEventDialog';
import { useCourses } from '@/hooks/useStore';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarDays, ListTodo, NotebookPen, Trash2 } from 'lucide-react';
import { Dispatch, SetStateAction, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

interface FormErrorProps {
  message?: string;
}

function FormError({ message }: FormErrorProps) {
  if (!message) return null;

  return <p className="text-sm text-red-600 dark:text-red-400 mt-1">{message}</p>;
}

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingEvent: any | null;
  form: EventForm;
  setForm?: Dispatch<SetStateAction<EventForm>>; // Keep for backwards compatibility
  onSave: (data?: EventFormData) => void;
  onDelete: () => void;
  disableEventCategory?: boolean; // Make event category readonly
  disableCourse?: boolean; // Make course selection readonly
}

export function EventDialog({
  open,
  onOpenChange,
  editingEvent,
  form,
  setForm,
  onSave,
  onDelete,
  disableEventCategory = false,
  disableCourse = false,
}: EventDialogProps) {
  const { t } = useTranslation('planner');
  const { t: tCommon } = useTranslation('common');
  const { courses } = useCourses();

  // Initialize React Hook Form with Zod validation
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema(t)),
    defaultValues: {
      eventCategory: 'regular',
      courseId: 'none', // Use "none" instead of empty string for Select compatibility
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
    },
  });

  const watchedEventCategory = watch('eventCategory');
  const watchedNotes = watch('notes');

  // Reset form when dialog opens/closes or form prop changes
  useEffect(() => {
    if (open) {
      reset({
        eventCategory: form.eventCategory as EventFormData['eventCategory'],
        courseId: form.courseId || 'none', // Convert empty string to "none" for Select
        type: form.type,
        title: form.title,
        startDate: form.startDate,
        endDate: form.endDate,
        day: form.day,
        start: form.start,
        end: form.end,
        location: form.location,
        weight: form.weight,
        priority: form.priority as EventFormData['priority'],
        notes: form.notes,
        color: form.color,
      });
    }
  }, [open, form, reset]);

  const onSubmit = (data: EventFormData) => {
    // Convert "none" courseId back to empty string for compatibility
    const processedData = {
      ...data,
      courseId: data.courseId === 'none' ? '' : data.courseId,
    };
    onSave(processedData);
  };

  // Keep backwards compatibility for components that still use setForm
  const handleFormChange = (field: keyof EventForm, value: any) => {
    if (setForm) {
      setForm(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`rounded-2xl ${
          watchedNotes?.trim() ? 'max-w-lg lg:max-w-4xl' : 'max-w-lg'
        } max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600`}
      >
        <DialogHeader className="">
          <DialogTitle className="text-gray-900 dark:text-gray-100">
            {editingEvent
              ? watchedEventCategory === 'exam'
                ? t('events.editExam')
                : watchedEventCategory === 'task'
                ? t('events.editTask')
                : t('events.editEvent')
              : watchedEventCategory === 'exam'
              ? t('events.addExam')
              : watchedEventCategory === 'task'
              ? t('events.addTask')
              : t('events.addEvent')}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            {editingEvent
              ? watchedEventCategory === 'exam'
                ? t('messages.modifyExamDetails')
                : watchedEventCategory === 'task'
                ? t('messages.modifyTaskDetails')
                : t('messages.modifyEventDetails')
              : watchedEventCategory === 'exam'
              ? t('messages.createExamDescription')
              : watchedEventCategory === 'task'
              ? t('messages.createTaskDescription')
              : t('messages.createEventDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={`grid gap-4 lg:gap-6 ${watchedNotes?.trim() ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
            <div className="space-y-4 lg:col-span-1">
              {!disableEventCategory && (
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">{t('forms.eventCategory')} *</Label>
                  <Controller
                    name="eventCategory"
                    control={control}
                    render={({ field }) => (
                      <SimpleSelect
                        value={field.value}
                        onValueChange={value => {
                          field.onChange(value);
                          // Also update the legacy form state if setForm is available
                          handleFormChange('eventCategory', value);
                        }}
                        placeholder={t('selectCategory')}
                        className="rounded-xl"
                        options={[
                          {
                            value: 'regular',
                            label: (
                              <div className="inline-flex items-center gap-2">
                                <CalendarDays size={16} />
                                {t('eventTypes.regular')}
                              </div>
                            ),
                          },
                          {
                            value: 'exam',
                            label: (
                              <div className="inline-flex items-center gap-2">
                                <NotebookPen size={16} />
                                {t('eventTypes.exam')}
                              </div>
                            ),
                          },
                          {
                            value: 'task',
                            label: (
                              <div className="inline-flex items-center gap-2">
                                <ListTodo size={16} />
                                {t('eventTypes.task')}
                              </div>
                            ),
                          },
                        ]}
                      />
                    )}
                  />
                  <FormError message={errors.eventCategory?.message} />
                </div>
              )}

              {!disableCourse && (
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">{t('forms.courseOptional')}</Label>
                  <Controller
                    name="courseId"
                    control={control}
                    render={({ field }) => (
                      <SimpleSelect
                        value={field.value}
                        onValueChange={value => {
                          field.onChange(value);
                          handleFormChange('courseId', value);
                        }}
                        placeholder={t('forms.courseOptional')}
                        className="rounded-xl"
                        options={[
                          { value: 'none', label: tCommon('common.none') },
                          ...courses.map(c => ({
                            value: c.id,
                            label: c.title,
                          })),
                        ]}
                      />
                    )}
                  />
                  <FormError message={errors.courseId?.message} />
                </div>
              )}

              <div>
                <Label className="text-gray-700 dark:text-gray-300">{t('forms.title')} *</Label>
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      className="rounded-xl"
                      onChange={e => {
                        field.onChange(e);
                        handleFormChange('title', e.target.value);
                      }}
                      placeholder={
                        watchedEventCategory === 'regular'
                          ? t('placeholders.regularEventTitle')
                          : watchedEventCategory === 'exam'
                          ? t('placeholders.examTitle')
                          : t('placeholders.taskTitle')
                      }
                    />
                  )}
                />
                <FormError message={errors.title?.message} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">
                    {watchedEventCategory === 'regular'
                      ? t('forms.startDate')
                      : watchedEventCategory === 'exam'
                      ? t('forms.startDate')
                      : t('forms.startDate')}{' '}
                    *
                  </Label>
                  <Controller
                    name="startDate"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="date"
                        className="rounded-xl"
                        onChange={e => {
                          field.onChange(e);
                          handleFormChange('startDate', e.target.value);
                        }}
                      />
                    )}
                  />
                  <FormError message={errors.startDate?.message} />
                </div>
                {watchedEventCategory === 'regular' && (
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">{t('forms.endDate')}</Label>
                    <Controller
                      name="endDate"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="date"
                          className="rounded-xl"
                          min={watch('startDate')}
                          onChange={e => {
                            field.onChange(e);
                            handleFormChange('endDate', e.target.value);
                          }}
                        />
                      )}
                    />
                    <FormError message={errors.endDate?.message} />
                  </div>
                )}
              </div>

              {watchedEventCategory === 'regular' && (
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">{t('forms.location')}</Label>
                  <Controller
                    name="location"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        className="rounded-xl"
                        placeholder={t('placeholders.locationExample')}
                        onChange={e => {
                          field.onChange(e);
                          handleFormChange('location', e.target.value);
                        }}
                      />
                    )}
                  />
                  <FormError message={errors.location?.message} />
                </div>
              )}

              {watchedEventCategory === 'regular' && (
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">{t('forms.color')}</Label>
                  <Controller
                    name="color"
                    control={control}
                    render={({ field }) => (
                      <ColorPicker
                        label=""
                        value={field.value}
                        onChange={color => {
                          field.onChange(color);
                          handleFormChange('color', color);
                        }}
                      />
                    )}
                  />
                  <FormError message={errors.color?.message} />
                </div>
              )}

              {watchedEventCategory === 'exam' && (
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">{t('forms.weight')} *</Label>
                  <Controller
                    name="weight"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="number"
                        className="rounded-xl"
                        min="0"
                        max="100"
                        onChange={e => {
                          const value = Number(e.target.value);
                          field.onChange(value);
                          handleFormChange('weight', value);
                        }}
                      />
                    )}
                  />
                  <FormError message={errors.weight?.message} />
                </div>
              )}

              {watchedEventCategory === 'task' && (
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">{t('forms.priority')} *</Label>
                  <Controller
                    name="priority"
                    control={control}
                    render={({ field }) => (
                      <SimpleSelect
                        value={field.value}
                        onValueChange={value => {
                          field.onChange(value);
                          handleFormChange('priority', value);
                        }}
                        placeholder={t('forms.priority')}
                        className="rounded-xl"
                        options={[
                          { value: 'low', label: <>🟡 &nbsp;&nbsp;{tCommon('priorities.low')}</> },
                          { value: 'normal', label: <>🟠 &nbsp;&nbsp;{tCommon('priorities.normal')}</> },
                          { value: 'high', label: <>🔴 &nbsp;&nbsp;{tCommon('priorities.high')}</> },
                        ]}
                      />
                    )}
                  />
                  <FormError message={errors.priority?.message} />
                </div>
              )}
            </div>

            {/* Notes section - single instance that moves between columns */}
            <div className={`space-y-4 ${watchedNotes?.trim() ? 'lg:col-span-2' : 'lg:col-span-1 lg:-mt-4'}`}>
              <div>
                <Label className="text-gray-700 dark:text-gray-300">{t('forms.notes')}</Label>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <RichTextEditor
                      content={field.value || ''}
                      onChange={content => {
                        field.onChange(content);
                        handleFormChange('notes', content);
                      }}
                      placeholder={
                        watchedEventCategory === 'regular'
                          ? t('messages.eventDetailsAgenda')
                          : watchedEventCategory === 'exam'
                          ? t('messages.examTopicsChapters')
                          : t('messages.taskDetails')
                      }
                      className="mt-1"
                      toolsWhenEmpty={['checkbox', 'attachment']}
                    />
                  )}
                />
                <FormError message={errors.notes?.message} />
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button type="submit" className="rounded-xl flex-1">
              {tCommon('actions.save')}
            </Button>
            {editingEvent && (
              <Button type="button" variant="destructive" onClick={onDelete} className="rounded-xl px-4">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export const eventFormSchema = (t: (key: string) => string) =>
  z
    .object({
      eventCategory: z.enum(['regular', 'exam', 'task']),
      courseId: z.string().optional(),
      type: z.string(),
      title: z.string().min(1, t('validation.titleRequired')).max(200, t('validation.titleTooLong')),
      startDate: z.string().min(1, t('validation.startDateRequired')),
      endDate: z.string(),
      day: z.string(),
      start: z.string(),
      end: z.string(),
      location: z.string().refine(val => {
        if (val && val.length > 500) {
          return false;
        }
        return true;
      }, t('validation.locationTooLong')),
      weight: z.number().min(0, t('validation.weightMin')).max(100, t('validation.weightMax')),
      priority: z.enum(['low', 'normal', 'high']),
      notes: z.string(),
      color: z.string().regex(/^#[0-9A-F]{6}$/i, t('validation.invalidColorFormat')),
    })
    .refine(
      data => {
        // If endDate is provided and we're dealing with a regular event, it should be after or equal to startDate
        if (data.eventCategory === 'regular' && data.endDate && data.startDate) {
          return new Date(data.endDate) >= new Date(data.startDate);
        }
        return true;
      },
      {
        message: t('validation.endDateAfterStart'),
        path: ['endDate'],
      }
    );

export type EventFormData = z.infer<ReturnType<typeof eventFormSchema>>;
