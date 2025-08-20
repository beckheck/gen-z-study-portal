import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCourses, useTimetable } from '@/hooks/useStore';
import { uid } from '@/lib/utils';
import React, { useEffect, useRef, useState } from 'react';
import type { Position, TimeBlock, TimetableEvent, TimetableEventInput } from '../types';

function TimetableTab() {
  const { courses } = useCourses();
  const { timetableEvents, setTimetableEvents, deleteTimetableEvent } = useTimetable();
  const [showAddEvent, setShowAddEvent] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<TimetableEvent | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showEventOptions, setShowEventOptions] = useState<boolean>(false);
  const [optionsPosition, setOptionsPosition] = useState<Position>({ x: 0, y: 0 });
  const eventOptionsRef = useRef<HTMLDivElement>(null);
  const [eventInput, setEventInput] = useState<TimetableEventInput>({
    courseIndex: 0,
    eventType: 'Cátedra', // Default event type
    classroom: '',
    teacher: '',
    day: 'Monday',
    block: '1',
    startTime: '8:20',
    endTime: '9:30',
    color: '#7c3aed', // Default purple color
  });

  // Helper function to get course name
  const getCourseTitle = (courseIndex: number): string => {
    return courses[courseIndex] || 'Unknown Course';
  };

  // Add useEffect to handle clicks outside the options menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (eventOptionsRef.current && !eventOptionsRef.current.contains(event.target as Node)) {
        setShowEventOptions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle event click
  const handleEventClick = (event: TimetableEvent, e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setSelectedEvent(event);

    const rect = e.currentTarget.getBoundingClientRect();
    setOptionsPosition({
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
    });

    setShowEventOptions(true);
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

  // Days of the week
  const weekDays: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const shortWeekDays: string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  // Event types
  const eventTypes: string[] = ['Cátedra', 'Ayudantía', 'Taller', 'Laboratorio'];

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

  // Add a new event or update existing one
  const addEvent = (): void => {
    if (isEditing && selectedEvent) {
      // Update existing event
      setTimetableEvents(
        timetableEvents.map(event => (event.id === selectedEvent.id ? { ...eventInput, id: selectedEvent.id } : event))
      );
      setIsEditing(false);
      setSelectedEvent(null);
    } else {
      // Add new event
      const eventWithId: TimetableEvent = {
        ...eventInput,
        id: uid(),
      };

      setTimetableEvents([...timetableEvents, eventWithId]);
    }

    // Reset form
    setEventInput({
      courseIndex: 0,
      eventType: 'Cátedra',
      classroom: '',
      teacher: '',
      day: 'Monday',
      block: '1',
      startTime: '8:20',
      endTime: '9:30',
      color: '#7c3aed',
    });

    setShowAddEvent(false);
  };

  // Start editing an event
  const editEvent = (event: TimetableEvent): void => {
    // Remove the id field when setting eventInput since TimetableEventInput doesn't have id
    const { id, ...eventWithoutId } = event;
    setEventInput(eventWithoutId);
    setSelectedEvent(event);
    setIsEditing(true);
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

  return (
    <div className="space-y-6">
      {/* Event Options Dialog */}
      {showEventOptions && selectedEvent && (
        <div
          ref={eventOptionsRef}
          className="fixed z-50 bg-white dark:bg-zinc-800 shadow-lg rounded-lg p-3 w-44"
          style={{
            top: `${optionsPosition.y + 20}px`,
            left: `${optionsPosition.x}px`,
          }}
        >
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-md mb-1"
            onClick={() => {
              editEvent(selectedEvent);
              setShowEventOptions(false);
            }}
          >
            Edit Event
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
            onClick={() => {
              deleteEvent(selectedEvent.id);
              setShowEventOptions(false);
            }}
          >
            Delete Event
          </button>
        </div>
      )}

      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">My Timetable</CardTitle>
          <CardDescription>Weekly schedule of your classes and activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-2 mb-4">
            <div className="font-medium text-zinc-500 dark:text-zinc-400"></div>
            {weekDays.map((day, index) => (
              <div key={day} className="font-medium text-center text-zinc-800 dark:text-zinc-200">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{shortWeekDays[index]}</span>
              </div>
            ))}
          </div>

          {timeBlocks.map(({ block, time }) => (
            <div key={block} className="grid grid-cols-6 gap-2 mb-3">
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center">
                Block {block}
                <br />
                {time}
              </div>

              {weekDays.map(day => (
                <div key={`${day}-${block}`} className="min-h-[70px] bg-white/50 dark:bg-white/5 rounded-lg p-1">
                  {getEventForDayAndBlock(day, block).map(event => (
                    <div
                      key={event.id}
                      className="relative group cursor-pointer rounded-md shadow-sm p-2 h-full"
                      style={{
                        backgroundColor: event.color ? `${event.color}20` : 'rgba(255, 255, 255, 0.9)',
                        borderLeft: `4px solid ${event.color || '#7c3aed'}`,
                        color: event.color ? undefined : undefined,
                      }}
                      onClick={e => handleEventClick(event, e)}
                    >
                      <div className="text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {getCourseTitle(event.courseIndex)}
                      </div>
                      <div className="text-xs sm:text-xs text-zinc-600 dark:text-zinc-400">{event.eventType}</div>

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
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>{isEditing ? 'Edit Event' : 'Add New Event'}</span>
            <Button
              onClick={() => {
                setShowAddEvent(!showAddEvent);
                if (!showAddEvent) {
                  setIsEditing(false);
                  setSelectedEvent(null);
                  setEventInput({
                    courseIndex: 0,
                    eventType: 'Cátedra',
                    classroom: '',
                    teacher: '',
                    day: 'Monday',
                    block: '1',
                    startTime: '8:20',
                    endTime: '9:30',
                    color: '#7c3aed',
                  });
                }
              }}
              variant="outline"
              size="sm"
              className="rounded-xl"
            >
              {showAddEvent ? 'Cancel' : '+ Add Event'}
            </Button>
          </CardTitle>
        </CardHeader>

        {showAddEvent && (
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="course">Course</Label>
                <Select
                  value={eventInput.courseIndex.toString()}
                  onValueChange={(value: string) => setEventInput({ ...eventInput, courseIndex: parseInt(value) })}
                >
                  <SelectTrigger id="course" className="mt-1">
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
                <Label htmlFor="eventType">Event Type</Label>
                <Select
                  value={eventInput.eventType}
                  onValueChange={(value: string) => setEventInput({ ...eventInput, eventType: value })}
                >
                  <SelectTrigger id="eventType" className="mt-1">
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
                <Label htmlFor="day">Day</Label>
                <Select
                  value={eventInput.day}
                  onValueChange={(value: string) => setEventInput({ ...eventInput, day: value })}
                >
                  <SelectTrigger id="day" className="mt-1">
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
                <Label htmlFor="block">Time Block</Label>
                <Select value={eventInput.block} onValueChange={handleBlockChange}>
                  <SelectTrigger id="block" className="mt-1">
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
                <Label htmlFor="classroom">Classroom</Label>
                <Input
                  id="classroom"
                  value={eventInput.classroom}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEventInput({ ...eventInput, classroom: e.target.value })
                  }
                  placeholder="e.g., A-101"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="teacher">{eventInput.eventType === 'Cátedra' ? 'Teacher Name' : 'TA Name'}</Label>
                <Input
                  id="teacher"
                  value={eventInput.teacher}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEventInput({ ...eventInput, teacher: e.target.value })
                  }
                  placeholder={eventInput.eventType === 'Cátedra' ? "Teacher's name" : "TA's name"}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="event-color">Event Color</Label>
                <div className="flex items-center gap-3 mt-1">
                  <div className="w-8 h-8 rounded-lg shadow-sm" style={{ backgroundColor: eventInput.color }}></div>
                  <Input
                    id="event-color"
                    type="color"
                    value={eventInput.color}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEventInput({ ...eventInput, color: e.target.value })
                    }
                    className="h-10 w-full"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="hex-color"
                    value={eventInput.color}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      // Validate hex color format
                      const hexValue = e.target.value;
                      // Only update if it's a valid hex color or empty
                      if (hexValue === '' || /^#([A-Fa-f0-9]{3}){1,2}$/.test(hexValue)) {
                        setEventInput({ ...eventInput, color: hexValue });
                      }
                    }}
                    placeholder="#7c3aed"
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Generate a random color
                      const randomColor =
                        '#' +
                        Math.floor(Math.random() * 16777215)
                          .toString(16)
                          .padStart(6, '0');
                      setEventInput({ ...eventInput, color: randomColor });
                    }}
                    className="whitespace-nowrap"
                  >
                    Random
                  </Button>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Choose a color or enter a HEX code to identify this event
                </p>
              </div>
            </div>

            <Button onClick={addEvent} className="mt-6 w-full rounded-xl">
              {isEditing ? 'Update Event' : 'Add to Timetable'}
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default TimetableTab;
