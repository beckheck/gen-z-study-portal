import { Exam, SoundtrackPosition, Task, WeatherLocation } from '@/types';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import CurrentDateTime from './CurrentDateTime';
import SoundtrackCard from './SoundtrackCard';
import TipsRow from './TipsRow';
import Upcoming from './Upcoming';
import WeatherWidget from './WeatherWidget';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface DashboardTabProps {
  weatherApiKey: string;
  weatherLocation: WeatherLocation;
  exams: Exam[];
  tasks: Task[];
  courses: string[];
  setTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void;
  setSelectedCourse: (courseIndex: number) => void;
  onTabChange: (tab: string) => void;
  soundtrackEmbed: string;
  soundtrackPosition: SoundtrackPosition;
  setSoundtrackPosition: (position: SoundtrackPosition) => void;
}

/**
 * Dashboard Tab Component
 */
export default function DashboardTab({
  weatherApiKey,
  weatherLocation,
  exams,
  tasks,
  courses,
  setTasks,
  setSelectedCourse,
  onTabChange,
  soundtrackEmbed,
  soundtrackPosition,
  setSoundtrackPosition,
}: DashboardTabProps) {
  const [nextUpExpanded, setNextUpExpanded] = useState<number>(0); // Number of additional "pages" shown (0 = collapsed)
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start mb-4">
        <WeatherWidget apiKey={weatherApiKey} location={weatherLocation} />
        <CurrentDateTime />
      </div>
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Next Up
          </CardTitle>
          <CardDescription>Upcoming exams & tasks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Upcoming
            exams={exams}
            tasks={tasks}
            courses={courses}
            expanded={nextUpExpanded}
            onTaskComplete={taskId => setTasks(s => s.map(t => (t.id === taskId ? { ...t, done: true } : t)))}
            onTabChange={onTabChange}
            onCourseSelect={setSelectedCourse}
            onTaskClick={task => {
              setSelectedCourse(task.courseIndex);
            }}
          />
        </CardContent>
        {(() => {
          // Calculate if there are more items to show
          const allExams = exams.slice().sort((a, b) => a.date.localeCompare(b.date));
          const allTasks = tasks
            .slice()
            .filter(t => !t.done)
            .sort((a, b) => a.due.localeCompare(b.due));

          const currentExamCount = 3 + nextUpExpanded * 3;
          const currentTaskCount = 5 + nextUpExpanded * 3;

          const hasMoreExams = allExams.length > currentExamCount;
          const hasMoreTasks = allTasks.length > currentTaskCount;
          const hasMore = hasMoreExams || hasMoreTasks;

          // Show button if there are more items OR if currently expanded (to allow collapse)
          const showButton = hasMore || nextUpExpanded > 0;

          if (!showButton) return null;

          return (
            <div className="flex justify-center pb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (hasMore) {
                    // Show 3 more items
                    setNextUpExpanded(nextUpExpanded + 1);
                  } else {
                    // Collapse to original state
                    setNextUpExpanded(0);
                  }
                }}
                className="h-8 w-8 p-0 hover:bg-white/20 rounded-full transition-all duration-300 ease-in-out"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-all duration-500 ease-in-out transform ${
                    !hasMore && nextUpExpanded > 0 ? 'rotate-180' : 'rotate-0'
                  }`}
                />
              </Button>
            </div>
          );
        })()}
      </Card>

      <SoundtrackCard embed={soundtrackEmbed} position={soundtrackPosition} onPositionChange={setSoundtrackPosition} />
      <TipsRow />
    </div>
  );
}
