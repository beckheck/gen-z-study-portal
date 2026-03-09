import CurrentDateTime from '@/components/CurrentDateTime';
import MiniCalendar from '@/components/MiniCalendar';
import SoundtrackCard from '@/components/SoundtrackCard';
import TipsRow from '@/components/TipsRow';
import TodaySchedule from '@/components/TodaySchedule';
import Upcoming from '@/components/Upcoming';
import WeatherWidget from '@/components/WeatherWidget';
import { useSettingsDialogContext } from '@/components/settings/SettingsDialogProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useCourses, useItems, useSoundtrack, useWeather } from '@/hooks/useStore';
import { ItemTask } from '@/items/task/modelSchema';
import { ItemExam } from '@/items/exam/modelSchema';
import { isDateAfterOrEqual, isDateBefore, compareDates } from '@/lib/date-utils';
import { AlertTriangle, CalendarDays, ChevronDown, ChevronRight } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DashboardTabProps {
  onTabChange: (tab: string) => void;
}

/**
 * Dashboard Tab Component
 */
export default function DashboardTab({ onTabChange }: DashboardTabProps) {
  const { t } = useTranslation('common');
  const { setSelectedCourse } = useCourses();
  const { getItemsByType, updateItem } = useItems();
  
  // Get items by type
  const tasks = getItemsByType('task') as ItemTask[];
  const exams = getItemsByType('exam') as ItemExam[];
  
  const { weather } = useWeather();
  const { soundtrack, setSoundtrackPosition } = useSoundtrack();
  const { openDialog } = useSettingsDialogContext();

  // Helper functions for item updates
  const toggleTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      updateItem(taskId, { isCompleted: !task.isCompleted } as any);
    }
  };

  const toggleExamComplete = (examId: string) => {
    const exam = exams.find(e => e.id === examId);
    if (exam) {
      updateItem(examId, { isCompleted: !exam.isCompleted } as any);
    }
  };

  const [nextUpExpanded, setNextUpExpanded] = useState<number>(0); // Number of additional "pages" shown (0 = collapsed)
  const [isAnimating, setIsAnimating] = useState(false);
  const [hidePending, setHidePending] = useState(false);
  const [pendingExpanded, setPendingExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const animateToExpanded = (newValue: number) => {
    setIsAnimating(true);
    setTimeout(() => {
      setNextUpExpanded(newValue);
      setTimeout(() => setIsAnimating(false), 300);
    }, 50);
  };

  const animateToCollapsed = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setNextUpExpanded(0);
      setTimeout(() => setIsAnimating(false), 300);
    }, 50);
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start mb-4">
        <WeatherWidget
          apiKey={weather.apiKey}
          location={weather.location}
          onWeatherClick={() => openDialog('weatherApi')}
        />
        <CurrentDateTime />
      </div>

      {/* Today's Schedule - Horizontal Timeline */}
      <TodaySchedule onTabChange={onTabChange} />

      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                {t('dashboard.nextUp')}
              </CardTitle>
              <CardDescription>{t('dashboard.upcomingExamsAndTasks')}</CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-zinc-600 dark:text-zinc-400">Hide Pending</span>
              <Switch
                checked={hidePending}
                onCheckedChange={setHidePending}
                className="data-[state=checked]:bg-amber-600"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pending Items Collapsed Section */}
          {hidePending && (
            <div className="border-b border-zinc-200 dark:border-zinc-700 pb-4">
              <Button
                variant="ghost"
                onClick={() => setPendingExpanded(!pendingExpanded)}
                className="w-full justify-start p-2 h-auto hover:bg-white/50 dark:hover:bg-white/5 rounded-xl"
              >
                <div className="flex items-center gap-2">
                  {pendingExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="font-medium">Pending Items</span>
                  <span className="text-xs text-zinc-500 ml-2">
                    (
                    {(() => {
                      const today = new Date();

                      const overdueExams = exams.filter(e => {
                        if (e.isCompleted) return false;
                        const examDate = new Date(e.startsAt);
                        return isDateBefore(examDate, today);
                      }).length;

                      const overdueTasks = tasks.filter(t => {
                        if (t.isCompleted || !t.dueAt) return false;
                        const taskDate = new Date(t.dueAt);
                        return isDateBefore(taskDate, today);
                      }).length;

                      return overdueExams + overdueTasks;
                    })()}
                    )
                  </span>
                </div>
              </Button>

              {pendingExpanded && (
                <div className="mt-3">
                  <Upcoming
                    expanded={0}
                    hidePending={false}
                    showOnlyPending={true}
                    onTaskComplete={toggleTask}
                    onExamComplete={toggleExamComplete}
                    onTabChange={onTabChange}
                    onCourseSelect={setSelectedCourse}
                    onTaskClick={task => {
                      setSelectedCourse(task.courseId);
                      onTabChange('courses');
                    }}
                  />
                </div>
              )}
            </div>
          )}

          <div
            ref={contentRef}
            className={`transition-all duration-300 ease-in-out ${isAnimating ? 'opacity-80' : 'opacity-100'}`}
            style={{
              transform: isAnimating ? 'translateY(-2px)' : 'translateY(0)',
            }}
          >
            <Upcoming
              expanded={nextUpExpanded}
              hidePending={hidePending}
              showOnlyPending={false}
              onTaskComplete={toggleTask}
              onExamComplete={toggleExamComplete}
              onTabChange={onTabChange}
              onCourseSelect={setSelectedCourse}
              onTaskClick={task => {
                setSelectedCourse(task.courseId);
                onTabChange('courses');
              }}
            />
          </div>
        </CardContent>
        {(() => {
          // Calculate if there are more items to show
          const today = new Date();

          let filteredExams = exams.slice().filter(e => !e.isCompleted);
          let filteredTasks = tasks.slice().filter(t => !t.isCompleted);

          // Filter out pending items if hidePending is true
          if (hidePending) {
            filteredExams = filteredExams.filter(e => {
              const examDate = new Date(e.startsAt);
              return isDateAfterOrEqual(examDate, today);
            });

            filteredTasks = filteredTasks.filter(t => {
              if (!t.dueAt) return true;
              const taskDate = new Date(t.dueAt);
              return isDateAfterOrEqual(taskDate, today);
            });
          }

          const allExams = filteredExams.sort((a, b) => compareDates(a.startsAt, b.startsAt));
          const allTasks = filteredTasks.sort((a, b) => compareDates(a.dueAt, b.dueAt));

          const currentExamCount = 5 + nextUpExpanded * 3; // Changed from 3 to 5 to match tasks
          const currentTaskCount = 5 + nextUpExpanded * 3;

          const hasMoreExams = allExams.length > currentExamCount;
          const hasMoreTasks = allTasks.length > currentTaskCount;
          const hasMore = hasMoreExams || hasMoreTasks;

          // Show button if there are more items OR if currently expanded (to allow collapse)
          const showButton = hasMore || nextUpExpanded > 0;

          if (!showButton) return null;

          return (
            <div className="flex justify-center pb-4 gap-2">
              {/* Collapse button - shown when expanded */}
              {nextUpExpanded > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => animateToCollapsed()}
                  disabled={isAnimating}
                  className="h-8 w-8 p-0 hover:bg-white/20 rounded-full transition-all duration-300 ease-in-out disabled:opacity-50"
                  title="Collapse"
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-all duration-300 ease-in-out transform rotate-180 ${
                      isAnimating ? 'scale-90' : 'scale-100'
                    }`}
                  />
                </Button>
              )}

              {/* Expand button - shown when there are more items */}
              {hasMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => animateToExpanded(nextUpExpanded + 1)}
                  disabled={isAnimating}
                  className="h-8 w-8 p-0 hover:bg-white/20 rounded-full transition-all duration-300 ease-in-out disabled:opacity-50"
                  title="Show more"
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-all duration-300 ease-in-out ${
                      isAnimating ? 'scale-90' : 'scale-100'
                    }`}
                  />
                </Button>
              )}
            </div>
          );
        })()}
      </Card>

      {/* Calendar and Soundtrack Section */}
      <div className="grid grid-cols-1 gap-6">
        {soundtrack.position === 'dashboard' ? (
          /* Both calendar and soundtrack visible */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MiniCalendar 
              onTabChange={onTabChange}
              onCourseSelect={setSelectedCourse}
              isExpanded={false}
            />
            <SoundtrackCard
              visible={true}
              embed={soundtrack.embed}
              position={'dashboard'}
              onPositionChange={setSoundtrackPosition}
            />
          </div>
        ) : (
          /* Only calendar visible, expanded to use available space */
          <MiniCalendar 
            onTabChange={onTabChange}
            onCourseSelect={setSelectedCourse}
            isExpanded={true}
          />
        )}
      </div>

      <TipsRow />
    </div>
  );
}
