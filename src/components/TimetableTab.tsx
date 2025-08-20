import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ColorPicker from '@/components/ui/color-picker';
import { ContextMenu, ContextMenuItem } from '@/components/ui/context-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useContextMenu } from '@/hooks/useContextMenu';
import { useCourses, useTimetable } from '@/hooks/useStore';
import { uid } from '@/lib/utils';
import { Plus } from 'lucide-react';
import React, { useState } from 'react';
import type { TimeBlock, TimetableEvent, TimetableEventInput } from '../types';

// Days of the week
const weekDays: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const shortWeekDays: string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

// Event types
const eventTypes: string[] = ['Cátedra', 'Ayudantía', 'Taller', 'Laboratorio'];

// Default timetable event input values to avoid redundancy
const DEFAULT_TIMETABLE_EVENT_INPUT: TimetableEventInput = {
  courseIndex: 0,
  eventType: eventTypes[0],
  classroom: '',
  teacher: '',
  day: 'Monday',
  block: '1',
  startTime: '8:20',
  endTime: '9:30',
  color: '#7c3aed',
};

export default function TimetableTab() {
  const { courses } = useCourses();
  const { timetableEvents, setTimetableEvents, deleteTimetableEvent } = useTimetable();
  const [showAddEvent, setShowAddEvent] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const contextMenu = useContextMenu<TimetableEvent>();

  // Reset event input to default values
  const resetEventInput = () => {
    setEventInput(DEFAULT_TIMETABLE_EVENT_INPUT);
  };

  const [eventInput, setEventInput] = useState<TimetableEventInput>(DEFAULT_TIMETABLE_EVENT_INPUT);

  // Helper function to get course name
  const getCourseTitle = (courseIndex: number): string => {
    return courses[courseIndex] || 'Unknown Course';
  };

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
    contextMenu.hideMenu();
  };

  // Add a new event or update existing one
  const addEvent = (): void => {
    if (isEditing && editingEventId) {
      // Update existing event
      setTimetableEvents(
        timetableEvents.map(event => (event.id === editingEventId ? { ...eventInput, id: editingEventId } : event))
      );
    } else {
      // Add new event
      const newEvent: TimetableEvent = { ...eventInput, id: uid() };
      setTimetableEvents([...timetableEvents, newEvent]);
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
    contextMenu.hideMenu();
  };

  // Delete an event
  const deleteEvent = (id: string): void => {
    deleteTimetableEvent(id);
    contextMenu.hideMenu();
  };

  // Filter events for a specific day and block
  const getEventForDayAndBlock = (day: string, block: string): TimetableEvent[] => {
    return timetableEvents.filter(event => event.day === day && event.block === block);
  };

  return (
    <div className="space-y-6">
      {/* Event Options Context Menu */}
      <ContextMenu show={contextMenu.showMenu} position={contextMenu.position} menuRef={contextMenu.menuRef}>
        {contextMenu.selectedItem && (
          <>
            <ContextMenuItem onClick={() => editEvent(contextMenu.selectedItem)}>Edit Event</ContextMenuItem>
            <ContextMenuItem variant="destructive" onClick={() => deleteEvent(contextMenu.selectedItem.id)}>
              Delete Event
            </ContextMenuItem>
          </>
        )}
      </ContextMenu>

      <Card className="rounded-2xl border-none shadow-xl bg-white/70 dark:bg-white/5 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex justify-between items-center">
            <div>
              <span>My Timetable</span>
              <CardDescription className="text-base font-normal mt-1 dark:text-zinc-100">
                Weekly schedule of your classes and activities
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                setShowAddEvent(!showAddEvent);
                if (!showAddEvent) {
                  setIsEditing(false);
                  setEditingEventId(null);
                  contextMenu.hideMenu();
                  resetEventInput();
                }
              }}
              className="rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-2 mb-4">
            <div className="font-medium text-zinc-500 dark:text-zinc-100"></div>
            {weekDays.map((day, index) => (
              <div key={day} className="font-medium text-center text-zinc-800 dark:text-zinc-200">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{shortWeekDays[index]}</span>
              </div>
            ))}
          </div>

          {timeBlocks.map(({ block, time }) => (
            <div key={block} className="grid grid-cols-6 gap-2 mb-3">
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-100 flex items-center">
                Block {block}
                <br />
                {time}
              </div>

              {weekDays.map(day => {
                const eventsInCell = getEventForDayAndBlock(day, block);
                const isEmpty = eventsInCell.length === 0;

                return (
                  <div
                    key={`${day}-${block}`}
                    className={`min-h-[70px] rounded-lg p-1 ${
                      isEmpty
                        ? 'bg-white/30 dark:bg-white/5 hover:bg-white/50 dark:hover:bg-white/10 cursor-pointer transition-colors duration-200'
                        : 'bg-white/50 dark:bg-white/5'
                    }`}
                    onClick={isEmpty ? () => handleCellClick(day, block) : undefined}
                  >
                    {eventsInCell.map(event => (
                      <div
                        key={event.id}
                        className="relative group cursor-pointer rounded-md shadow-sm p-2 h-full"
                        style={{
                          backgroundColor: event.color ? `${event.color}C0` : 'rgba(255, 255, 255, 0.9)',
                          borderLeft: `4px solid ${event.color || '#7c3aed'}`,
                          color: event.color ? undefined : undefined,
                        }}
                        onClick={e => contextMenu.showContextMenu(event, e)}
                      >
                        <div className="text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-900">
                          {getCourseTitle(event.courseIndex)}
                        </div>
                        <div className="text-xs sm:text-xs text-zinc-800 dark:text-zinc-900 font-medium">
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
                              {getCourseTitle(event.courseIndex)}
                            </div>
                          </div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                            <span className="font-medium">Type:</span> {event.eventType}
                          </div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                            <span className="font-medium">Time:</span> {event.startTime} - {event.endTime}
                          </div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                            <span className="font-medium">Classroom:</span> {event.classroom}
                          </div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400">
                            <span className="font-medium">{event.eventType === 'Cátedra' ? 'Teacher:' : 'TA:'}</span>{' '}
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
                          <div className="text-xs text-zinc-400 dark:text-zinc-600">Add event</div>
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
          }
        }}
      >
        <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
          <DialogHeader className="">
            <DialogTitle className="text-gray-900 dark:text-gray-100">
              {isEditing ? 'Edit Event' : 'Add Event'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="course" className="text-gray-700 dark:text-gray-300">
                Course
              </Label>
              <Select
                value={eventInput.courseIndex.toString()}
                onValueChange={(value: string) => setEventInput({ ...eventInput, courseIndex: parseInt(value) })}
              >
                <SelectTrigger id="course" className="mt-1 rounded-xl">
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((_, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>
                      {getCourseTitle(idx)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="eventType" className="text-gray-700 dark:text-gray-300">
                Event Type
              </Label>
              <Select
                value={eventInput.eventType}
                onValueChange={(value: string) => setEventInput({ ...eventInput, eventType: value })}
              >
                <SelectTrigger id="eventType" className="mt-1 rounded-xl">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="day" className="text-gray-700 dark:text-gray-300">
                Day
              </Label>
              <Select
                value={eventInput.day}
                onValueChange={(value: string) => setEventInput({ ...eventInput, day: value })}
              >
                <SelectTrigger id="day" className="mt-1 rounded-xl">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {weekDays.map(day => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="block" className="text-gray-700 dark:text-gray-300">
                Time Block
              </Label>
              <Select value={eventInput.block} onValueChange={handleBlockChange}>
                <SelectTrigger id="block" className="mt-1 rounded-xl">
                  <SelectValue placeholder="Select time block" />
                </SelectTrigger>
                <SelectContent>
                  {timeBlocks.map(block => (
                    <SelectItem key={block.block} value={block.block}>
                      Block {block.block}: {block.time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="classroom" className="text-gray-700 dark:text-gray-300">
                Classroom
              </Label>
              <Input
                id="classroom"
                value={eventInput.classroom}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEventInput({ ...eventInput, classroom: e.target.value })
                }
                placeholder="e.g., A-101"
                className="mt-1 rounded-xl"
              />
            </div>

            <div>
              <Label htmlFor="teacher" className="text-gray-700 dark:text-gray-300">
                {eventInput.eventType === 'Cátedra' ? 'Teacher Name' : 'TA Name'}
              </Label>
              <Input
                id="teacher"
                value={eventInput.teacher}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEventInput({ ...eventInput, teacher: e.target.value })
                }
                placeholder={eventInput.eventType === 'Cátedra' ? "Teacher's name" : "TA's name"}
                className="mt-1 rounded-xl"
              />
            </div>

            <ColorPicker
              label="Event Color"
              value={eventInput.color}
              onChange={color => setEventInput({ ...eventInput, color })}
              htmlFor="event-color"
            />

            <Button onClick={addEvent} className="w-full rounded-xl">
              {isEditing ? 'Update Event' : 'Add to Timetable'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
