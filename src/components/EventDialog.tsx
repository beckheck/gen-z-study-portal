import { Button } from '@/components/ui/button';
import ColorPicker from '@/components/ui/color-picker';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { EventForm } from '@/hooks/useEventDialog';
import { useCourses } from '@/hooks/useStore';
import { Trash2 } from 'lucide-react';
import { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingEvent: any | null;
  form: EventForm;
  setForm: Dispatch<SetStateAction<EventForm>>;
  onSave: () => void;
  onDelete: () => void;
  namespace?: string; // Translation namespace (e.g., 'planner', 'tracker')
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
  namespace = 'planner',
  disableEventCategory = false,
  disableCourse = false,
}: EventDialogProps) {
  const { t } = useTranslation(namespace);
  const { t: tCommon } = useTranslation('common');
  const { courses } = useCourses();

  const handleFormChange = (field: keyof EventForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
        <DialogHeader className="">
          <DialogTitle className="text-gray-900 dark:text-gray-100">
            {editingEvent ? t('events.editEvent') : t('events.addEvent')}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            {editingEvent ? t('messages.modifyEventDetails') : t('messages.createEventDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label className="text-gray-700 dark:text-gray-300">{t('forms.eventCategory')}</Label>
            <Select
              value={form.eventCategory}
              onValueChange={v => handleFormChange('eventCategory', v)}
              disabled={disableEventCategory}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">{t('eventTypes.regular')}</SelectItem>
                <SelectItem value="exam">{t('eventTypes.exam')}</SelectItem>
                <SelectItem value="task">{t('eventTypes.task')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-700 dark:text-gray-300">{t('forms.courseOptional')}</Label>
            <Select
              value={form.courseId}
              onValueChange={v => handleFormChange('courseId', v)}
              disabled={disableCourse}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={undefined}>{tCommon('common.none')}</SelectItem>
                {courses.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-700 dark:text-gray-300">{t('forms.title')}</Label>
            <Input
              value={form.title}
              onChange={e => handleFormChange('title', e.target.value)}
              className="rounded-xl"
              placeholder={
                form.eventCategory === 'regular'
                  ? t('placeholders.regularEventTitle')
                  : form.eventCategory === 'exam'
                  ? t('placeholders.examTitle')
                  : t('placeholders.taskTitle')
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-700 dark:text-gray-300">
                {form.eventCategory === 'regular'
                  ? t('forms.startDate')
                  : form.eventCategory === 'exam'
                  ? t('forms.startDate')
                  : t('forms.startDate')}
              </Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={e => handleFormChange('startDate', e.target.value)}
                className="rounded-xl"
              />
            </div>
            {form.eventCategory === 'regular' && (
              <div>
                <Label className="text-gray-700 dark:text-gray-300">
                  {t('forms.endDate')} {tCommon('common.optional')}
                </Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={e => handleFormChange('endDate', e.target.value)}
                  className="rounded-xl"
                  min={form.startDate}
                />
              </div>
            )}
          </div>

          {form.eventCategory === 'regular' && (
            <div>
              <Label className="text-gray-700 dark:text-gray-300">
                {t('forms.location')} {tCommon('common.optional')}
              </Label>
              <Input
                value={form.location}
                onChange={e => handleFormChange('location', e.target.value)}
                className="rounded-xl"
                placeholder={t('placeholders.locationExample')}
              />
            </div>
          )}

          {form.eventCategory === 'regular' && (
            <ColorPicker
              label={t('forms.color')}
              value={form.color}
              onChange={color => handleFormChange('color', color)}
            />
          )}

          {form.eventCategory === 'exam' && (
            <div>
              <Label className="text-gray-700 dark:text-gray-300">{t('forms.weight')}</Label>
              <Input
                type="number"
                value={form.weight}
                onChange={e => handleFormChange('weight', Number(e.target.value))}
                className="rounded-xl"
                min="0"
                max="100"
              />
            </div>
          )}

          {form.eventCategory === 'task' && (
            <div>
              <Label className="text-gray-700 dark:text-gray-300">{t('forms.priority')}</Label>
              <Select value={form.priority} onValueChange={v => handleFormChange('priority', v)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{tCommon('priorities.low')}</SelectItem>
                  <SelectItem value="normal">{tCommon('priorities.normal')}</SelectItem>
                  <SelectItem value="high">{tCommon('priorities.high')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-gray-700 dark:text-gray-300">
              {t('forms.notes')} {tCommon('common.optional')}
            </Label>
            <Textarea
              value={form.notes}
              onChange={e => handleFormChange('notes', e.target.value)}
              className="rounded-xl"
              placeholder={
                form.eventCategory === 'regular'
                  ? t('messages.eventDetailsAgenda')
                  : form.eventCategory === 'exam'
                  ? t('messages.examTopicsChapters')
                  : t('messages.taskDetails')
              }
              rows={3}
            />
          </div>

          <div className="flex gap-2 mt-2">
            <Button onClick={onSave} className="rounded-xl flex-1">
              {tCommon('actions.save')}
            </Button>
            {editingEvent && (
              <Button variant="destructive" onClick={onDelete} className="rounded-xl px-4">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
