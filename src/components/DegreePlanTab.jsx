import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import useLocalState from '@/hooks/useLocalState';
import { uid } from '@/lib/utils';
import { ArrowLeft, ArrowRight, Check, Edit, GraduationCap, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';

export default function DegreePlanTab() {
  // State management
  const [degreePlan, setDegreePlan] = useLocalState('sp:degreePlan', {
    semesters: [],
    totalSemesters: 0,
    completedCourses: [], // Array of course acronyms that are completed
  });
  const [degreePlanDialog, setDegreePlanDialog] = useState(false);
  const [degreePlanStep, setDegreePlanStep] = useState('setup'); // 'setup', 'courses', 'view'
  const [currentSemester, setCurrentSemester] = useState(1);
  const [editingCourse, setEditingCourse] = useState(null); // Track course being edited
  const [resetConfirmDialog, setResetConfirmDialog] = useState(false); // Confirm reset dialog
  const [clearConfirmDialog, setClearConfirmDialog] = useState(false); // Confirm clear dialog
  const [draggedCourse, setDraggedCourse] = useState(null); // Track dragged course
  const [draggedFromSemester, setDraggedFromSemester] = useState(null); // Track source semester
  const [semesterForm, setSemesterForm] = useState({
    acronym: '',
    name: '',
    credits: '',
    prerequisites: '',
    corequisites: '',
  });

  // Degree Plan Management Functions
  function setupDegreePlan(totalSemesters) {
    const semesters = Array.from({ length: totalSemesters }, (_, i) => ({
      id: i + 1,
      number: i + 1,
      courses: [],
    }));

    setDegreePlan(prev => ({
      ...prev,
      semesters,
      totalSemesters,
    }));

    setDegreePlanStep('courses');
    setCurrentSemester(1);
  }

  function addCourseToSemester(semesterNumber, courseData) {
    setDegreePlan(prev => ({
      ...prev,
      semesters: prev.semesters.map(sem =>
        sem.number === semesterNumber
          ? {
              ...sem,
              courses: [
                ...sem.courses,
                {
                  id: uid(),
                  ...courseData,
                  completed: false,
                },
              ],
            }
          : sem
      ),
    }));
  }

  function toggleCourseCompletion(courseAcronym) {
    setDegreePlan(prev => {
      const isCompleted = prev.completedCourses.includes(courseAcronym);
      return {
        ...prev,
        completedCourses: isCompleted
          ? prev.completedCourses.filter(c => c !== courseAcronym)
          : [...prev.completedCourses, courseAcronym],
      };
    });
  }

  function checkPrerequisites(course, semester) {
    if (!course.prerequisites) return true;

    const prereqAcronyms = course.prerequisites.split(',').map(p => p.trim());
    const completedCourses = degreePlan.completedCourses;

    // Check if ALL prerequisites are completed
    return prereqAcronyms.every(prereq => completedCourses.includes(prereq));
  }

  function getCourseColor(course, semester) {
    const isCompleted = degreePlan.completedCourses.includes(course.acronym);
    const prerequisitesMet = checkPrerequisites(course, semester);

    if (isCompleted) {
      return '#10ac84'; // Green for completed
    } else if (prerequisitesMet) {
      return '#3b82f6'; // Blue for available
    } else {
      return 'transparent'; // No color for unavailable
    }
  }

  function resetDegreePlan() {
    setDegreePlan({
      semesters: [],
      totalSemesters: 0,
      completedCourses: [],
    });
    setDegreePlanStep('setup');
    setCurrentSemester(1);
    setEditingCourse(null);
    setSemesterForm({
      acronym: '',
      name: '',
      credits: '',
      prerequisites: '',
      corequisites: '',
    });
    setDegreePlanDialog(false);
  }

  // Drag and Drop Functions for Course Management
  function handleDragStart(course, sourceSemester) {
    setDraggedCourse(course);
    setDraggedFromSemester(sourceSemester);
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  function handleDrop(e, targetSemester) {
    e.preventDefault();

    if (!draggedCourse || !draggedFromSemester) return;

    // Don't allow dropping on the same semester
    if (draggedFromSemester === targetSemester) {
      setDraggedCourse(null);
      setDraggedFromSemester(null);
      return;
    }

    // Check if target semester has space (max 8 courses)
    const targetSemesterData = degreePlan.semesters.find(s => s.number === targetSemester);
    if (targetSemesterData && targetSemesterData.courses.length >= 8) {
      setDraggedCourse(null);
      setDraggedFromSemester(null);
      return;
    }

    // Move course from source to target semester
    setDegreePlan(prev => {
      const newPlan = { ...prev };

      // Remove course from source semester
      const sourceSemesterIndex = newPlan.semesters.findIndex(s => s.number === draggedFromSemester);
      if (sourceSemesterIndex >= 0) {
        newPlan.semesters[sourceSemesterIndex] = {
          ...newPlan.semesters[sourceSemesterIndex],
          courses: newPlan.semesters[sourceSemesterIndex].courses.filter(c => c.id !== draggedCourse.id),
        };
      }

      // Add course to target semester
      const targetSemesterIndex = newPlan.semesters.findIndex(s => s.number === targetSemester);
      if (targetSemesterIndex >= 0) {
        newPlan.semesters[targetSemesterIndex] = {
          ...newPlan.semesters[targetSemesterIndex],
          courses: [...newPlan.semesters[targetSemesterIndex].courses, draggedCourse],
        };
      }

      return newPlan;
    });

    // Clear drag state
    setDraggedCourse(null);
    setDraggedFromSemester(null);
  }

  // Credit calculation functions
  const getTotalCredits = () => {
    return degreePlan.semesters.reduce((total, semester) => {
      return (
        total +
        semester.courses.reduce((semesterTotal, course) => {
          return semesterTotal + parseInt(course.credits || 0);
        }, 0)
      );
    }, 0);
  };

  const getCompletedCredits = () => {
    return degreePlan.semesters.reduce((total, semester) => {
      return (
        total +
        semester.courses.reduce((semesterTotal, course) => {
          const isCompleted = degreePlan.completedCourses.includes(course.acronym);
          return semesterTotal + (isCompleted ? parseInt(course.credits || 0) : 0);
        }, 0)
      );
    }, 0);
  };

  // Add new semester function
  const addNewSemester = () => {
    const newSemesterNumber = degreePlan.semesters.length + 1;
    setDegreePlan(prev => ({
      ...prev,
      totalSemesters: prev.totalSemesters + 1,
      semesters: [
        ...prev.semesters,
        {
          id: Math.random().toString(36).slice(2, 10),
          number: newSemesterNumber,
          courses: [],
        },
      ],
    }));
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Degree Plan
              </CardTitle>
              <CardDescription>Plan your academic journey</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {degreePlan.totalSemesters > 0 && (
                <div className="text-right">
                  <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {getCompletedCredits()}/{getTotalCredits()} credits done ✨
                  </div>
                  <div className="text-xs text-zinc-500">
                    {getTotalCredits() > 0 ? Math.round((getCompletedCredits() / getTotalCredits()) * 100) : 0}%
                    complete
                  </div>
                </div>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl"
                onClick={() => {
                  // If degree plan already exists, go to view step, otherwise start setup
                  if (degreePlan.totalSemesters > 0) {
                    setDegreePlanStep('view');
                  } else {
                    setDegreePlanStep('setup');
                  }
                  setDegreePlanDialog(true);
                }}
                title="Customize Degree Plan"
              >
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {degreePlan.totalSemesters > 0 ? (
            <div className="space-y-6">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  💡 <strong>Tip:</strong> Drag and drop courses between semesters to reorganize your degree plan. Click
                  courses to mark as completed.
                </p>
              </div>
              <div
                className="grid gap-4 lg:gap-6"
                style={{
                  gridTemplateColumns:
                    degreePlan.totalSemesters <= 2
                      ? `repeat(${degreePlan.totalSemesters}, 1fr)`
                      : degreePlan.totalSemesters <= 4
                      ? `repeat(${Math.min(degreePlan.totalSemesters, 2)}, 1fr)`
                      : `repeat(3, 1fr)`,
                }}
              >
                {degreePlan.semesters.map(semester => (
                  <div key={semester.id} className="space-y-3">
                    <h3 className="font-semibold text-center text-sm px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                      {semester.number}° Semestre
                    </h3>
                    <div
                      className={`space-y-2 min-h-[200px] p-3 border-2 border-dashed rounded-lg transition-colors ${
                        draggedCourse && draggedFromSemester !== semester.number
                          ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/20 dark:border-blue-600'
                          : 'border-zinc-200 dark:border-zinc-700'
                      }`}
                      onDragOver={handleDragOver}
                      onDrop={e => handleDrop(e, semester.number)}
                    >
                      {semester.courses.map(course => {
                        const isCompleted = degreePlan.completedCourses.includes(course.acronym);
                        const prerequisitesMet = checkPrerequisites(course, semester);
                        const bgColor = getCourseColor(course, semester);

                        return (
                          <div
                            key={course.id}
                            draggable
                            onDragStart={() => handleDragStart(course, semester.number)}
                            className={`p-3 rounded-lg border-2 transition-all hover:shadow-md group ${
                              draggedCourse?.id === course.id ? 'opacity-50 cursor-grabbing' : 'cursor-grab'
                            } ${
                              isCompleted
                                ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-600'
                                : prerequisitesMet
                                ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-600'
                                : 'bg-gray-50 border-dashed border-gray-300 dark:bg-gray-800/50 dark:border-gray-500 opacity-60'
                            }`}
                            style={
                              bgColor !== 'transparent'
                                ? {
                                    backgroundColor: bgColor + '15',
                                    borderColor: bgColor + '60',
                                  }
                                : {}
                            }
                            title={`${
                              isCompleted
                                ? 'Click to mark as incomplete'
                                : prerequisitesMet
                                ? 'Click to mark as completed'
                                : 'Prerequisites not met'
                            } • Drag to move between semesters`}
                          >
                            <div className="flex items-start justify-between">
                              <div
                                className="flex-1"
                                onClick={() => prerequisitesMet && toggleCourseCompletion(course.acronym)}
                              >
                                <div
                                  className={`text-xs font-mono font-bold ${
                                    isCompleted
                                      ? 'line-through text-green-700 dark:text-green-400'
                                      : prerequisitesMet
                                      ? 'text-blue-700 dark:text-blue-400'
                                      : 'text-gray-500'
                                  }`}
                                >
                                  {course.acronym}
                                </div>
                                <div
                                  className={`text-xs mt-1 ${
                                    isCompleted
                                      ? 'line-through text-green-600 dark:text-green-300'
                                      : prerequisitesMet
                                      ? 'text-blue-600 dark:text-blue-300'
                                      : 'text-gray-400'
                                  }`}
                                >
                                  {course.name}
                                </div>
                                <div className="text-xs text-zinc-500 mt-1 flex items-center justify-between">
                                  <span>{course.credits} créditos</span>
                                  {isCompleted && <Check className="w-3 h-3 text-green-600" />}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={e => {
                                  e.stopPropagation();
                                  // Set up editing mode for this course
                                  setEditingCourse(course);
                                  setSemesterForm({
                                    acronym: course.acronym,
                                    name: course.name,
                                    credits: course.credits,
                                    prerequisites: course.prerequisites || '',
                                    corequisites: course.corequisites || '',
                                  });
                                  setCurrentSemester(semester.number);
                                  setDegreePlanStep('courses');
                                  setDegreePlanDialog(true);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                title="Edit course"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      {semester.courses.length === 0 && !draggedCourse && (
                        <div className="text-center text-zinc-400 py-8 text-sm">No courses added</div>
                      )}
                      {draggedCourse && draggedFromSemester !== semester.number && (
                        <div className="text-center text-blue-500 py-4 text-sm border-2 border-dashed border-blue-300 rounded-lg bg-blue-50/20 dark:bg-blue-900/10">
                          {semester.courses.length >= 8
                            ? 'Semester full (8/8 courses)'
                            : `Drop course here (${semester.courses.length}/8 courses)`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center border-t pt-4">
                <div className="text-sm text-zinc-500 mb-3">
                  Progress: {degreePlan.completedCourses.length} / {degreePlan.semesters.flatMap(s => s.courses).length}{' '}
                  courses completed
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setClearConfirmDialog(true)}
                  className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Degree Plan
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-500">Add your semesters and your courses here</div>
          )}
        </CardContent>
      </Card>

      {/* Degree Plan Dialog */}
      <Dialog open={degreePlanDialog} onOpenChange={setDegreePlanDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white dark:bg-black border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
              <GraduationCap className="w-5 h-5" />
              {degreePlanStep === 'setup' && 'Setup Degree Plan'}
              {degreePlanStep === 'courses' &&
                `Semester ${currentSemester} Courses${editingCourse ? ' - Editing' : ''}`}
              {degreePlanStep === 'view' && 'Degree Plan Overview'}
            </DialogTitle>
            <DialogDescription className="text-zinc-600 dark:text-zinc-400">
              {degreePlanStep === 'setup' && 'Set up your degree plan by specifying the number of semesters.'}
              {degreePlanStep === 'courses' &&
                (editingCourse
                  ? `Edit course "${editingCourse.acronym}" in semester ${currentSemester}.`
                  : `Add courses for semester ${currentSemester}. Maximum 8 courses per semester.`)}
              {degreePlanStep === 'view' && 'Review and manage your complete degree plan.'}
            </DialogDescription>
          </DialogHeader>

          {degreePlanStep === 'setup' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <Label className="text-zinc-900 dark:text-zinc-100">Number of Semesters in Your Degree</Label>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  placeholder="e.g., 8"
                  value={degreePlan.totalSemesters || ''}
                  onChange={e =>
                    setDegreePlan(prev => ({
                      ...prev,
                      totalSemesters: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setDegreePlanDialog(false)}
                  className="rounded-xl border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setupDegreePlan(degreePlan.totalSemesters)}
                  disabled={!degreePlan.totalSemesters || degreePlan.totalSemesters < 1}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {degreePlanStep === 'courses' && (
            <div className="space-y-6">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                Semester {currentSemester} of {degreePlan.totalSemesters}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                    {editingCourse ? 'Edit Course' : 'Add Course'}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-zinc-900 dark:text-zinc-100">Course Acronym</Label>
                      <Input
                        placeholder="e.g., MAT101"
                        value={semesterForm.acronym}
                        onChange={e =>
                          setSemesterForm(prev => ({
                            ...prev,
                            acronym: e.target.value,
                          }))
                        }
                        className="rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-900 dark:text-zinc-100">Course Name</Label>
                      <Input
                        placeholder="e.g., Calculus I"
                        value={semesterForm.name}
                        onChange={e =>
                          setSemesterForm(prev => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-900 dark:text-zinc-100">Credits</Label>
                      <Input
                        type="number"
                        min="1"
                        max="12"
                        placeholder="e.g., 4"
                        value={semesterForm.credits}
                        onChange={e =>
                          setSemesterForm(prev => ({
                            ...prev,
                            credits: e.target.value,
                          }))
                        }
                        className="rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-900 dark:text-zinc-100">Prerequisites (separate with commas)</Label>
                      <Input
                        placeholder="e.g., MAT100, PHY101"
                        value={semesterForm.prerequisites}
                        onChange={e =>
                          setSemesterForm(prev => ({
                            ...prev,
                            prerequisites: e.target.value,
                          }))
                        }
                        className="rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-900 dark:text-zinc-100">Co-requisites (separate with commas)</Label>
                      <Input
                        placeholder="e.g., LAB101"
                        value={semesterForm.corequisites}
                        onChange={e =>
                          setSemesterForm(prev => ({
                            ...prev,
                            corequisites: e.target.value,
                          }))
                        }
                        className="rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    {editingCourse && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingCourse(null);
                          setSemesterForm({
                            acronym: '',
                            name: '',
                            credits: '',
                            prerequisites: '',
                            corequisites: '',
                          });
                        }}
                        className="rounded-xl w-full border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 mb-2"
                      >
                        Cancel Editing
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        if (semesterForm.acronym && semesterForm.name && semesterForm.credits) {
                          const currentSemesterData = degreePlan.semesters.find(s => s.number === currentSemester);

                          if (editingCourse) {
                            // Update existing course
                            setDegreePlan(prev => ({
                              ...prev,
                              semesters: prev.semesters.map(sem =>
                                sem.number === currentSemester
                                  ? {
                                      ...sem,
                                      courses: sem.courses.map(c =>
                                        c.id === editingCourse.id ? { ...c, ...semesterForm } : c
                                      ),
                                    }
                                  : sem
                              ),
                            }));
                            setEditingCourse(null);
                          } else {
                            // Add new course
                            if (currentSemesterData && currentSemesterData.courses.length < 7) {
                              addCourseToSemester(currentSemester, semesterForm);
                            }
                          }

                          setSemesterForm({
                            acronym: '',
                            name: '',
                            credits: '',
                            prerequisites: '',
                            corequisites: '',
                          });
                        }
                      }}
                      disabled={
                        !semesterForm.acronym ||
                        !semesterForm.name ||
                        !semesterForm.credits ||
                        (!editingCourse &&
                          degreePlan.semesters.find(s => s.number === currentSemester)?.courses.length >= 8)
                      }
                      className="rounded-xl w-full bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {editingCourse ? 'Update Course' : 'Add Course'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                    Semester {currentSemester} Courses (
                    {degreePlan.semesters.find(s => s.number === currentSemester)?.courses.length || 0}
                    /7)
                  </h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {degreePlan.semesters
                      .find(s => s.number === currentSemester)
                      ?.courses.map(course => (
                        <div
                          key={course.id}
                          className="p-3 border rounded-lg bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                {course.acronym}
                              </div>
                              <div className="text-sm text-zinc-700 dark:text-zinc-300">{course.name}</div>
                              <div className="text-xs text-zinc-500 dark:text-zinc-400">{course.credits} credits</div>
                              {course.prerequisites && (
                                <div className="text-xs text-zinc-400 dark:text-zinc-500">
                                  Prereq: {course.prerequisites}
                                </div>
                              )}
                              {course.corequisites && (
                                <div className="text-xs text-zinc-400 dark:text-zinc-500">
                                  Co-req: {course.corequisites}
                                </div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setDegreePlan(prev => ({
                                  ...prev,
                                  semesters: prev.semesters.map(sem =>
                                    sem.number === currentSemester
                                      ? {
                                          ...sem,
                                          courses: sem.courses.filter(c => c.id !== course.id),
                                        }
                                      : sem
                                  ),
                                }));
                              }}
                              className="rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    {!degreePlan.semesters.find(s => s.number === currentSemester)?.courses.length && (
                      <div className="text-center text-zinc-500 dark:text-zinc-400 py-8">No courses added yet</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingCourse(null);
                    setSemesterForm({
                      acronym: '',
                      name: '',
                      credits: '',
                      prerequisites: '',
                      corequisites: '',
                    });
                    if (currentSemester > 1) {
                      setCurrentSemester(currentSemester - 1);
                    } else {
                      setDegreePlanStep('setup');
                    }
                  }}
                  className="rounded-xl border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {currentSemester > 1 ? 'Previous Semester' : 'Back to Setup'}
                </Button>

                {currentSemester < degreePlan.totalSemesters ? (
                  <Button
                    onClick={() => {
                      setEditingCourse(null);
                      setSemesterForm({
                        acronym: '',
                        name: '',
                        credits: '',
                        prerequisites: '',
                        corequisites: '',
                      });
                      setCurrentSemester(currentSemester + 1);
                    }}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    Next Semester <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setEditingCourse(null);
                      setSemesterForm({
                        acronym: '',
                        name: '',
                        credits: '',
                        prerequisites: '',
                        corequisites: '',
                      });
                      setDegreePlanStep('view');
                      setDegreePlanDialog(false);
                    }}
                    className="rounded-xl bg-green-600 hover:bg-green-700 text-white dark:bg-green-500 dark:hover:bg-green-600"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Finish Setup
                  </Button>
                )}
              </div>
            </div>
          )}

          {degreePlanStep === 'view' && (
            <div className="space-y-6">
              <div
                className="grid gap-4 lg:gap-6"
                style={{
                  gridTemplateColumns:
                    degreePlan.totalSemesters <= 2
                      ? `repeat(${degreePlan.totalSemesters}, 1fr)`
                      : degreePlan.totalSemesters <= 4
                      ? `repeat(2, 1fr)`
                      : `repeat(3, 1fr)`,
                }}
              >
                {degreePlan.semesters.map(semester => (
                  <div
                    key={semester.id}
                    className="space-y-3 border rounded-lg p-4 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Semester {semester.number}</h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingCourse(null);
                          setSemesterForm({
                            acronym: '',
                            name: '',
                            credits: '',
                            prerequisites: '',
                            corequisites: '',
                          });
                          setCurrentSemester(semester.number);
                          setDegreePlanStep('courses');
                        }}
                        className="rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {semester.courses.map(course => {
                        const isCompleted = degreePlan.completedCourses.includes(course.acronym);
                        const prerequisitesMet = checkPrerequisites(course, semester);

                        return (
                          <div
                            key={course.id}
                            className={`p-2 text-xs border rounded cursor-pointer transition-all hover:shadow-sm ${
                              isCompleted
                                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700'
                                : prerequisitesMet
                                ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'
                                : 'border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-zinc-800'
                            }`}
                            onClick={() => toggleCourseCompletion(course.acronym)}
                          >
                            <div
                              className={`font-mono font-bold flex items-center justify-between ${
                                isCompleted
                                  ? 'line-through text-green-700 dark:text-green-400'
                                  : prerequisitesMet
                                  ? 'text-blue-700 dark:text-blue-400'
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}
                            >
                              {course.acronym}
                              {isCompleted && <Check className="w-3 h-3" />}
                            </div>
                            <div
                              className={`${
                                isCompleted
                                  ? 'line-through text-green-600 dark:text-green-300'
                                  : prerequisitesMet
                                  ? 'text-blue-600 dark:text-blue-300'
                                  : 'text-gray-400 dark:text-gray-500'
                              }`}
                            >
                              {course.name}
                            </div>
                            <div className="text-zinc-500 dark:text-zinc-400 mt-1">{course.credits} credits</div>
                          </div>
                        );
                      })}
                      {semester.courses.length === 0 && (
                        <div className="text-center text-zinc-400 dark:text-zinc-500 py-4">No courses</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 border-zinc-200 dark:border-zinc-800">
                <div className="text-center text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  Overall Progress: {degreePlan.completedCourses.length} /{' '}
                  {degreePlan.semesters.flatMap(s => s.courses).length} courses completed (
                  {Math.round(
                    (degreePlan.completedCourses.length /
                      Math.max(1, degreePlan.semesters.flatMap(s => s.courses).length)) *
                      100
                  )}
                  %)
                </div>
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setResetConfirmDialog(true)}
                    className="rounded-xl border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Reset Plan
                  </Button>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={addNewSemester}
                      className="rounded-xl border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add New Semester
                    </Button>
                    <Button
                      onClick={() => setDegreePlanDialog(false)}
                      className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetConfirmDialog} onOpenChange={setResetConfirmDialog}>
        <DialogContent className="max-w-md bg-white dark:bg-black border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-zinc-100">Reset Degree Plan</DialogTitle>
            <DialogDescription className="text-zinc-600 dark:text-zinc-400">
              Are you sure you want to reset your entire degree plan? This will delete all semesters, courses, and
              progress. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setResetConfirmDialog(false)}
              className="rounded-xl border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                resetDegreePlan();
                setResetConfirmDialog(false);
              }}
              className="rounded-xl"
            >
              Reset Everything
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear Confirmation Dialog */}
      <Dialog open={clearConfirmDialog} onOpenChange={setClearConfirmDialog}>
        <DialogContent className="max-w-md bg-white dark:bg-black border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-zinc-100">Clear Degree Plan</DialogTitle>
            <DialogDescription className="text-zinc-600 dark:text-zinc-400">
              Are you sure you want to clear your entire degree plan? This will delete all semesters, courses, and
              progress. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setClearConfirmDialog(false)}
              className="rounded-xl border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                resetDegreePlan();
                setClearConfirmDialog(false);
              }}
              className="rounded-xl"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Everything
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
