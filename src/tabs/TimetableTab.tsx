import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ColorPicker from '@/components/ui/color-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocalization } from '@/hooks/useLocalization';
import { useCourses, useTimetable } from '@/hooks/useStore';
import type { TimeBlock, TimetableEvent, TimetableEventInput } from '@/types';
import { Plus, Trash2 } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function TimetableTab() {
  const { t } = useTranslation('timetable');
  const { t: tCommon } = useTranslation('common');
  const { getDayNames, getShortDayNames } = useLocalization();
  const { courses, getCourseTitle } = useCourses();
  const { timetableEvents, addTimetableEvent, updateTimetableEvent, deleteTimetableEvent } = useTimetable();
  const [showAddEvent, setShowAddEvent] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<TimetableEvent | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ day: string; block: string } | null>(null);
  const dragCounter = useRef(0);

  // Days of the week - use English as keys, translate for display
  const weekDays: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Get localized day and short day names using useLocalization
  const dayNames = getDayNames();
  const shortDayNames = getShortDayNames();

  // Helper function to convert to title case
  const toTitleCase = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // Helper function to get translated day name in title case
  const getTranslatedDayName = (englishDay: string): string => {
    const dayIndex = weekDays.indexOf(englishDay);
    return dayIndex !== -1 ? toTitleCase(dayNames[dayIndex]) : englishDay;
  };

  // Helper function to get translated short day name in title case
  const getTranslatedShortDayName = (englishDay: string): string => {
    const dayIndex = weekDays.indexOf(englishDay);
    return dayIndex !== -1 ? toTitleCase(shortDayNames[dayIndex]) : englishDay.slice(0, 3);
  };

  // Event types
  const activityTypesEnum = {
    catedra: 'Cátedra',
    ayudantia: 'Ayudantía',
    taller: 'Taller',
    laboratorio: 'Laboratorio',
  };
  const activityTypes: string[] = [
    activityTypesEnum.catedra,
    activityTypesEnum.ayudantia,
    activityTypesEnum.taller,
    activityTypesEnum.laboratorio,
  ];

  // Default timetable event input values to avoid redundancy
  const DEFAULT_TIMETABLE_EVENT_INPUT: TimetableEventInput = {
    courseId: courses[0].id,
    eventType: activityTypes[0],
    classroom: '',
    teacher: '',
    day: weekDays[0], // Use English day name as key
    block: '1',
    startTime: '8:20',
    endTime: '9:30',
    color: '#7c3aed',
  };

  // Reset event input to default values
  const resetEventInput = () => {
    setEventInput(DEFAULT_TIMETABLE_EVENT_INPUT);
  };

  const [eventInput, setEventInput] = useState<TimetableEventInput>(DEFAULT_TIMETABLE_EVENT_INPUT);

  // Time blocks with their start and end times
  const timeBlocks: TimeBlock[] = [
    { block: '1', time: '8:20 - 9:30' },
    { block: '2', time: '9:40 - 10:50' },
    { block: '3', time: '11:00 - 12:10' },
    { block: '4', time: '12:20 - 13:30' },
    { block: '5', time: '14:50 - 16:00' },
    { block: '6', time: '16:10 - 17:20' },
  ];

  // Handle block selection and set corresponding times
  const handleBlockChange = (value: string): void => {
    const selectedBlock = value;
    const blockInfo = timeBlocks.find(block => block.block === selectedBlock);

    if (blockInfo) {
      const [startTime, endTime] = blockInfo.time.split(' - ');
      setEventInput({
        ...eventInput,
        block: selectedBlock,
        startTime: startTime,
        endTime: endTime,
      });
    }
  };

  // Handle empty cell click to add new event
  const handleCellClick = (day: string, block: string): void => {
    // Find the time block info
    const blockInfo = timeBlocks.find(tb => tb.block === block);
    const [startTime, endTime] = blockInfo ? blockInfo.time.split(' - ') : ['8:20', '9:30'];

    // Pre-fill the form with the clicked cell's day and block
    setEventInput({
      ...DEFAULT_TIMETABLE_EVENT_INPUT,
      day: day,
      block: block,
      startTime: startTime,
      endTime: endTime,
    });

    // Reset editing state and show the form
    setIsEditing(false);
    setShowAddEvent(true);
  };

  // Add a new event or update existing one
  const addEvent = (): void => {
    if (isEditing && editingEventId) {
      // Update existing event
      updateTimetableEvent(editingEventId, eventInput);
    } else {
      // Add new event
      addTimetableEvent(eventInput);
    }

    setIsEditing(false);
    setEditingEventId(null);
    setShowAddEvent(false);
  };

  // Start editing an event
  const editEvent = (event: TimetableEvent): void => {
    // Remove the id field when setting eventInput since TimetableEventInput doesn't have id
    const { id, ...eventWithoutId } = event;
    setEventInput(eventWithoutId);
    setIsEditing(true);
    setEditingEventId(id);
    setShowAddEvent(true);
  };

  // Delete an event
  const deleteEvent = (id: string): void => {
    deleteTimetableEvent(id);
  };

  // Filter events for a specific day and block
  const getEventForDayAndBlock = (day: string, block: string): TimetableEvent[] => {
    return timetableEvents.filter(event => event.day === day && event.block === block);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, event: TimetableEvent) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', event.id);
  };

  const handleDragEnd = () => {
    setDraggedEvent(null);
    setDragOverCell(null);
    dragCounter.current = 0;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, day: string, block: string) => {
    e.preventDefault();
    dragCounter.current++;
    setDragOverCell({ day, block });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverCell(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetDay: string, targetBlock: string) => {
    e.preventDefault();

    if (!draggedEvent) return;

    // Check if the event is being dropped in a different cell
    if (draggedEvent.day !== targetDay || draggedEvent.block !== targetBlock) {
      // Find the time block info for the target
      const blockInfo = timeBlocks.find(tb => tb.block === targetBlock);
      const [startTime, endTime] = blockInfo ? blockInfo.time.split(' - ') : ['8:20', '9:30'];

      // Update the event with new day, block, and times
      const updatedEvent = {
        ...draggedEvent,
        day: targetDay,
        block: targetBlock,
        startTime: startTime,
        endTime: endTime,
      };

      // Remove the id field since updateTimetableEvent expects TimetableEventInput
      const { id, ...eventWithoutId } = updatedEvent;
      updateTimetableEvent(draggedEvent.id, eventWithoutId);
    }

    setDraggedEvent(null);
    setDragOverCell(null);
    dragCounter.current = 0;
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex justify-between items-center">
            <div>
              <span>{t('title')}</span>
              <CardDescription className="text-base font-normal mt-1 dark:text-zinc-100">
                {t('description')}
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                setShowAddEvent(!showAddEvent);
                if (!showAddEvent) {
                  setIsEditing(false);
                  setEditingEventId(null);
                  resetEventInput();
                }
              }}
              className="rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('addEvent')}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-2 mb-4">
            <div className="font-medium text-zinc-500 dark:text-zinc-400"></div>
            {weekDays.map((day, index) => (
              <div key={day} className="font-medium text-center text-zinc-800 dark:text-zinc-200">
                <span className="hidden sm:inline">{getTranslatedDayName(day)}</span>
                <span className="sm:hidden">{getTranslatedShortDayName(day)}</span>
              </div>
            ))}
          </div>

          {timeBlocks.map(({ block, time }) => (
            <div key={block} className="grid grid-cols-6 gap-2 mb-3">
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center">
                {t('timeBlocks.block')} {block}
                <br />
                {time}
              </div>

              {weekDays.map(day => {
                const eventsInCell = getEventForDayAndBlock(day, block);
                const isEmpty = eventsInCell.length === 0;
                const isDragOver = dragOverCell?.day === day && dragOverCell?.block === block;

                return (
                  <div
                    key={`${day}-${block}`}
                    className={`min-h-[70px] rounded-lg p-1 transition-all duration-200 ${
                      isEmpty
                        ? 'bg-white/30 dark:bg-white/5 hover:bg-white/50 dark:hover:bg-white/10 cursor-pointer'
                        : 'bg-white/50 dark:bg-white/5'
                    } ${
                      isDragOver
                        ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-600 border-dashed'
                        : ''
                    }`}
                    onClick={isEmpty ? () => handleCellClick(day, block) : undefined}
                    onDragOver={handleDragOver}
                    onDragEnter={e => handleDragEnter(e, day, block)}
                    onDragLeave={handleDragLeave}
                    onDrop={e => handleDrop(e, day, block)}
                  >
                    {eventsInCell.map(event => (
                      <div
                        key={event.id}
                        className={`relative group cursor-pointer rounded-md shadow-sm p-2 h-full transition-all duration-200 ${
                          draggedEvent?.id === event.id ? 'opacity-50 scale-95' : ''
                        }`}
                        style={{
                          backgroundColor: event.color ? `${event.color}20` : 'rgba(255, 255, 255, 0.9)',
                          borderLeft: `4px solid ${event.color || '#7c3aed'}`,
                          color: event.color ? undefined : undefined,
                        }}
                        draggable
                        onDragStart={e => handleDragStart(e, event)}
                        onDragEnd={handleDragEnd}
                        onClick={e => {
                          e.stopPropagation();
                          editEvent(event);
                        }}
                      >
                        <div className="text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200">
                          {getCourseTitle(event.courseId)}
                        </div>
                        <div className="text-xs sm:text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                          {event.eventType}
                        </div>

                        {/* Hover details popup */}
                        <div className="absolute left-0 bottom-full mb-2 w-56 bg-white dark:bg-zinc-800 shadow-lg rounded-lg p-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: event.color || '#7c3aed' }}
                            ></div>
                            <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                              {getCourseTitle(event.courseId)}
                            </div>
                          </div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                            <span className="font-medium">{t('hover.type')}</span> {event.eventType}
                          </div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                            <span className="font-medium">{t('hover.time')}</span> {event.startTime} - {event.endTime}
                          </div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                            <span className="font-medium">{t('hover.classroom')}</span> {event.classroom}
                          </div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400">
                            <span className="font-medium">
                              {event.eventType === activityTypesEnum.catedra ? t('hover.teacher') : t('hover.ta')}
                            </span>{' '}
                            {event.teacher}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Empty cell hint */}
                    {isEmpty && (
                      <div className="flex items-center justify-center h-full opacity-0 hover:opacity-50 transition-opacity duration-200">
                        <div className="text-center">
                          <div className="text-xl text-zinc-400 dark:text-zinc-600">+</div>
                          <div className="text-xs text-zinc-400 dark:text-zinc-600">
                            {isDragOver ? t('dropHere') : t('addEventHint')}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Add/Edit Event Dialog */}
      <Dialog
        open={showAddEvent}
        onOpenChange={open => {
          setShowAddEvent(open);
          if (!open) {
            setIsEditing(false);
            setEditingEventId(null);
          }
        }}
      >
        <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
          <DialogHeader className="">
            <DialogTitle className="text-gray-900 dark:text-gray-100">
              {isEditing ? t('editEvent') : t('addEvent')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="course" className="text-gray-700 dark:text-gray-300">
                {t('fields.course')}
              </Label>
              <Select
                value={eventInput.courseId}
                onValueChange={(value: string) => setEventInput({ ...eventInput, courseId: value })}
              >
                <SelectTrigger id="course" className="mt-1 rounded-xl">
                  <SelectValue placeholder={t('placeholders.selectCourse')} />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {getCourseTitle(c.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="eventType" className="text-gray-700 dark:text-gray-300">
                {t('fields.eventType')}
              </Label>
              <Select
                value={eventInput.eventType}
                onValueChange={(value: string) => setEventInput({ ...eventInput, eventType: value })}
              >
                <SelectTrigger id="eventType" className="mt-1 rounded-xl">
                  <SelectValue placeholder={t('placeholders.selectEventType')} />
                </SelectTrigger>
                <SelectContent>
                  {activityTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="day" className="text-gray-700 dark:text-gray-300">
                {t('fields.day')}
              </Label>
              <Select
                value={eventInput.day}
                onValueChange={(value: string) => setEventInput({ ...eventInput, day: value })}
              >
                <SelectTrigger id="day" className="mt-1 rounded-xl">
                  <SelectValue placeholder={t('placeholders.selectDay')} />
                </SelectTrigger>
                <SelectContent>
                  {weekDays.map(day => (
                    <SelectItem key={day} value={day}>
                      {getTranslatedDayName(day)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="block" className="text-gray-700 dark:text-gray-300">
                {t('fields.timeBlock')}
              </Label>
              <Select value={eventInput.block} onValueChange={handleBlockChange}>
                <SelectTrigger id="block" className="mt-1 rounded-xl">
                  <SelectValue placeholder={t('placeholders.selectTimeBlock')} />
                </SelectTrigger>
                <SelectContent>
                  {timeBlocks.map(block => (
                    <SelectItem key={block.block} value={block.block}>
                      {t('timeBlocks.block')} {block.block}: {block.time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="classroom" className="text-gray-700 dark:text-gray-300">
                {t('fields.classroom')}
              </Label>
              <Input
                id="classroom"
                value={eventInput.classroom}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEventInput({ ...eventInput, classroom: e.target.value })
                }
                placeholder={t('placeholders.classroom')}
                className="mt-1 rounded-xl"
              />
            </div>

            <div>
              <Label htmlFor="teacher" className="text-gray-700 dark:text-gray-300">
                {eventInput.eventType === activityTypesEnum.catedra ? t('fields.teacherName') : t('fields.taName')}
              </Label>
              <Input
                id="teacher"
                value={eventInput.teacher}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEventInput({ ...eventInput, teacher: e.target.value })
                }
                placeholder={
                  eventInput.eventType === activityTypesEnum.catedra
                    ? t('placeholders.teacherName')
                    : t('placeholders.taName')
                }
                className="mt-1 rounded-xl"
              />
            </div>

            <ColorPicker
              label={t('fields.eventColor')}
              value={eventInput.color}
              onChange={color => setEventInput({ ...eventInput, color })}
              htmlFor="event-color"
            />

            <div className="flex gap-2">
              <Button onClick={addEvent} className="flex-1 rounded-xl">
                {tCommon('actions.save')}
              </Button>
              {isEditing && editingEventId && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    deleteEvent(editingEventId);
                    setShowAddEvent(false);
                    setIsEditing(false);
                    setEditingEventId(null);
                  }}
                  className="rounded-xl px-4"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
