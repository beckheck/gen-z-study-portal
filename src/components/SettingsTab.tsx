import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ColorPicker from '@/components/ui/color-picker';
import { DeferredInput } from '@/components/ui/deferred-input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useCourses, useSoundtrack, useTheme, useWeather } from '@/hooks/useStore';
import { dataTransfer, persistStore } from '@/stores/app';
import { Reorder } from 'framer-motion';
import {
  BookOpen,
  Brush,
  Cloud,
  Download,
  Github,
  GripVertical,
  Image,
  Info,
  Layers,
  MousePointer,
  Music,
  Palette,
  Plus,
  Trash2,
} from 'lucide-react';
import { ChangeEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import StorageInfoCard from './StorageInfoCard';

export default function SettingsTab() {
  // Translation hooks
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  const { courses, renameCourse, addCourse, removeCourse, setCourses } = useCourses();
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [courseToDelete, setCourseToDelete] = useState<{ id: string; title: string } | null>(null);

  // Course management functions
  const confirmRemoveCourse = () => {
    if (courseToDelete) {
      removeCourse(courseToDelete.id);
      setCourseToDelete(null);
    }
  };
  const { weather, setWeatherApiKey, setWeatherLocation } = useWeather();
  const { soundtrack, setSoundtrackEmbed, setSoundtrackPosition } = useSoundtrack();
  const {
    theme,
    setAccentColor,
    setBgImage,
    setCustomCursor,
    setCardOpacity,
    setGradientEnabled,
    setGradientEnd,
    setGradientMiddle,
    setGradientStart,
  } = useTheme();
  const { scrollToTop } = useScrollToTop();

  // Map menu items to their refs for scroll-to functionality
  const refMap = {
    courses: useRef<HTMLDivElement>(null),
    about: useRef<HTMLDivElement>(null),
    soundtrack: useRef<HTMLDivElement>(null),
    background: useRef<HTMLDivElement>(null),
    customCursor: useRef<HTMLDivElement>(null),
    accentColor: useRef<HTMLDivElement>(null),
    cardOpacity: useRef<HTMLDivElement>(null),
    backgroundGradient: useRef<HTMLDivElement>(null),
    weatherApi: useRef<HTMLDivElement>(null),
  };

  // Scroll to section function
  const scrollToSection = (menuId: string) => {
    if (menuItems[0].id === menuId) {
      scrollToTop();
      return;
    }
    const ref = refMap[menuId as keyof typeof refMap];
    if (ref?.current) {
      ref.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  // Render functions for each settings card
  const renderCoursesCard = () => {
    const handleAddCourse = () => {
      if (newCourseTitle.trim()) {
        addCourse(newCourseTitle.trim());
        setNewCourseTitle('');
      }
    };

    const handleRemoveCourse = (courseId: string) => {
      const courseToRemove = courses.find(c => c.id === courseId);
      if (!courseToRemove) return;

      if (courses.length <= 1) {
        // Could show a toast or notification here
        alert(t('courses.cannotRemoveLastCourse'));
        return;
      }

      // Show confirmation dialog
      setCourseToDelete(courseToRemove);
    };

    const handleReorder = (newOrder: typeof courses) => {
      setCourses([...newOrder]);
    };

    return (
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <div ref={refMap.courses} />
        <CardHeader>
          <CardTitle>{t('courses.title')}</CardTitle>
          <CardDescription>{t('courses.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new course input */}
          <div className="flex gap-2">
            <Input
              value={newCourseTitle}
              onChange={e => setNewCourseTitle(e.target.value)}
              placeholder={t('courses.newCoursePlaceholder')}
              className="rounded-xl"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleAddCourse();
                }
              }}
            />
            <Button onClick={handleAddCourse} size="sm" className="rounded-xl px-3" disabled={!newCourseTitle.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Reorderable course list */}
          <div className="space-y-2">
            <Reorder.Group values={courses} onReorder={handleReorder} className="space-y-2">
              {courses.map(course => (
                <Reorder.Item
                  key={course.id}
                  value={course}
                  className="flex items-center gap-3 p-3 bg-white/50 dark:bg-white/5 rounded-xl border border-white/20 dark:border-white/10 group hover:bg-white/70 dark:hover:bg-white/10 transition-colors"
                  whileDrag={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.8)' }}
                  dragMomentum={false}
                >
                  {/* Drag handle */}
                  <div className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {/* Course input */}
                  <div className="flex-1">
                    <DeferredInput
                      value={course.title}
                      onDeferredChange={value => renameCourse(course.id, value)}
                      className="rounded-lg border-none bg-transparent focus:bg-white/50 dark:focus:bg-white/10"
                    />
                  </div>

                  {/* Remove button */}
                  <Button
                    onClick={() => handleRemoveCourse(course.id)}
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                    disabled={courses.length <= 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>

          {courses.length > 0 && (
            <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center pt-2">
              {t('courses.dragToReorder')}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderAboutCard = () => (
    <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
      <div ref={refMap.about} />
      {/* GitHub Corner Ribbon */}
      <a
        href="https://github.com/beckheck/gen-z-study-portal"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute -top-3 -right-3 z-20 group"
        aria-label="View source on GitHub"
      >
        {/* Ribbon Background */}
        <div className="w-20 h-20 relative">
          <div className="absolute top-3 right-3 w-0 h-0 border-l-[70px] border-l-transparent border-t-[70px] border-t-gray-700 dark:border-t-gray-600 group-hover:border-t-gray-800 dark:group-hover:border-t-gray-500 transition-colors"></div>
          {/* GitHub Icon */}
          <div className="absolute top-6 right-6 transform rotate-45">
            <Github className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
          </div>
        </div>
      </a>
      <CardHeader>
        <CardTitle>{t('about.title')}</CardTitle>
        <CardDescription>{t('about.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
        <div className="space-y-2">
          <p>{t('about.localFirst')}</p>
          <p>{t('about.builtWith')}</p>
          <p>{t('about.proTip')}</p>
        </div>
        <div className="grid gap-2">
          <Button variant="outline" onClick={() => dataTransfer.exportFile()} className="w-full rounded-xl">
            <Download className="w-4 h-4 mr-2" />
            {t('about.exportData')}
          </Button>
          <div className="space-y-2">
            <div className="space-y-2">
              <Button variant="outline" asChild className="w-full rounded-xl">
                <label>
                  <Input
                    type="file"
                    accept=".json"
                    onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const success = await dataTransfer.importFile(file);
                          if (success) {
                            await persistStore();
                            setTimeout(() => {
                              alert(t('about.importSuccess'));
                              window.location.reload();
                            }, 100);
                          } else {
                            alert(t('about.importError'));
                          }
                        } catch (error) {
                          console.error('Import error:', error);
                          alert(t('about.importErrorGeneral'));
                        }
                        e.target.value = '';
                      }
                    }}
                    className="hidden"
                  />
                  <span className="flex items-center justify-center gap-2">
                    <Download className="w-4 h-4 rotate-180" />
                    {t('about.importData')}
                  </span>
                </label>
              </Button>
            </div>
          </div>
        </div>
        <StorageInfoCard />
      </CardContent>
    </Card>
  );

  const renderSoundtrackCard = () => (
    <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
      <div ref={refMap.soundtrack} />
      <CardHeader>
        <CardTitle>{t('soundtrack.title')}</CardTitle>
        <CardDescription>{t('soundtrack.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor="soundtrack-position">{t('soundtrack.position')}</Label>
          <Select value={soundtrack.position} onValueChange={setSoundtrackPosition}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder={t('soundtrack.selectPosition')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dashboard">{t('soundtrack.positions.dashboard')}</SelectItem>
              <SelectItem value="floating">{t('soundtrack.positions.floating')}</SelectItem>
              <SelectItem value="minimized">{t('soundtrack.positions.minimized')}</SelectItem>
              <SelectItem value="off">{t('soundtrack.positions.off')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Input
          value={soundtrack.embed}
          onChange={e => setSoundtrackEmbed(e.target.value)}
          placeholder={t('soundtrack.placeholder')}
          className="rounded-xl"
        />
        {soundtrack.embed && (
          <div className="rounded-2xl overflow-hidden">
            <div className="aspect-video">
              <iframe
                src={soundtrack.embed}
                className="w-full h-full"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                title={t('soundtrack.preview')}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderBackgroundCard = () => (
    <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
      <div ref={refMap.background} />
      <CardHeader>
        <CardTitle>{t('background.title')}</CardTitle>
        <CardDescription>{t('background.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept="image/*"
            className="rounded-xl"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const r = new FileReader();
              r.onload = () => {
                const result = r.result;
                if (typeof result === 'string') {
                  setBgImage(result);
                }
              };
              r.readAsDataURL(f);
            }}
          />
          <Button variant="outline" className="rounded-xl" onClick={() => setBgImage('')}>
            {t('background.clear')}
          </Button>
        </div>
        {theme.bgImage && (
          <img src={theme.bgImage} alt={t('background.preview')} className="rounded-xl max-h-40 w-full object-cover" />
        )}
      </CardContent>
    </Card>
  );

  const renderCustomCursorCard = () => (
    <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
      <div ref={refMap.customCursor} />
      <CardHeader>
        <CardTitle>{t('customCursor.title')}</CardTitle>
        <CardDescription>{t('customCursor.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept=".cur"
            className="rounded-xl"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const r = new FileReader();
              r.onload = () => {
                const result = r.result;
                if (typeof result === 'string') {
                  setCustomCursor(result);
                }
              };
              r.readAsDataURL(f);
            }}
          />
          <Button variant="outline" className="rounded-xl" onClick={() => setCustomCursor('')}>
            {t('customCursor.clear')}
          </Button>
        </div>
        {theme.customCursor && (
          <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
            <p className="text-green-800 dark:text-green-200 text-sm">{t('customCursor.preview')}</p>
          </div>
        )}
        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg text-sm">
          <p className="text-blue-700 dark:text-blue-300">
            {t('customCursor.note')}{' '}
            <a
              href="https://www.cursors-4u.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 underline"
            >
              {t('customCursor.linkText')}
            </a>
          </p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg text-sm">
          <p className="text-yellow-800 dark:text-yellow-200">{t('customCursor.animatedNote')}</p>
        </div>
      </CardContent>
    </Card>
  );

  const renderAccentColorCard = () => (
    <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
      <div ref={refMap.accentColor} />
      <CardHeader>
        <CardTitle>{t('accentColor.title')}</CardTitle>
        <CardDescription>{t('accentColor.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ColorPicker
          label={t('accentColor.mode', { mode: theme.darkMode ? t('accentColor.dark') : t('accentColor.light') })}
          value={theme.darkMode ? theme.accentColor.dark : theme.accentColor.light}
          onChange={color => {
            const newAccentColor = {
              ...theme.accentColor,
              [theme.darkMode ? 'dark' : 'light']: color,
            };
            setAccentColor(newAccentColor);
          }}
          htmlFor="accent-color"
        />
        <Button
          variant="outline"
          className="rounded-xl w-full"
          onClick={() => {
            const defaultAccentColor = {
              light: '#7c3aed',
              dark: '#8b5cf6',
            };
            setAccentColor(defaultAccentColor);
          }}
        >
          {t('accentColor.reset')}
        </Button>
      </CardContent>
    </Card>
  );

  const renderCardOpacityCard = () => (
    <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
      <div ref={refMap.cardOpacity} />
      <CardHeader>
        <CardTitle>{t('cardOpacity.title')}</CardTitle>
        <CardDescription>{t('cardOpacity.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>{t('cardOpacity.lightMode', { value: theme.cardOpacity.light })}</Label>
          <input
            type="range"
            min="10"
            max="100"
            value={theme.cardOpacity.light}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const newCardOpacity = {
                ...theme.cardOpacity,
                light: parseInt(e.target.value),
              };
              setCardOpacity(newCardOpacity);
            }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 mt-2"
          />
        </div>
        <div>
          <Label>{t('cardOpacity.darkMode', { value: theme.cardOpacity.dark })}</Label>
          <input
            type="range"
            min="5"
            max="100"
            value={theme.cardOpacity.dark}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const newCardOpacity = {
                ...theme.cardOpacity,
                dark: parseInt(e.target.value),
              };
              setCardOpacity(newCardOpacity);
            }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 mt-2"
          />
        </div>
        <Button
          variant="outline"
          className="rounded-xl w-full"
          onClick={() => {
            setCardOpacity({
              light: 80,
              dark: 25,
            });
          }}
        >
          {t('cardOpacity.reset')}
        </Button>
      </CardContent>
    </Card>
  );

  const renderBackgroundGradientCard = () => (
    <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
      <div ref={refMap.backgroundGradient} />
      <CardHeader>
        <CardTitle>{t('backgroundGradient.title')}</CardTitle>
        <CardDescription>{t('backgroundGradient.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 pb-2">
          <Switch checked={theme.gradientEnabled} onCheckedChange={setGradientEnabled} />
          <Label>{t('backgroundGradient.enable')}</Label>
        </div>

        <div className={theme.gradientEnabled ? '' : 'opacity-50 pointer-events-none'}>
          <ColorPicker
            label={t('backgroundGradient.startColor', {
              mode: theme.darkMode ? t('accentColor.dark') : t('accentColor.light'),
            })}
            value={theme.darkMode ? theme.gradientStart.dark : theme.gradientStart.light}
            onChange={color => {
              const newGradientStart = {
                ...theme.gradientStart,
                [theme.darkMode ? 'dark' : 'light']: color,
              };
              setGradientStart(newGradientStart);
            }}
            htmlFor="gradient-start-color"
          />
          <ColorPicker
            label={t('backgroundGradient.middleColor', {
              mode: theme.darkMode ? t('accentColor.dark') : t('accentColor.light'),
            })}
            value={theme.darkMode ? theme.gradientMiddle.dark : theme.gradientMiddle.light}
            onChange={color => {
              const newGradientMiddle = {
                ...theme.gradientMiddle,
                [theme.darkMode ? 'dark' : 'light']: color,
              };
              setGradientMiddle(newGradientMiddle);
            }}
            htmlFor="gradient-middle-color"
          />
          <ColorPicker
            label={t('backgroundGradient.endColor', {
              mode: theme.darkMode ? t('accentColor.dark') : t('accentColor.light'),
            })}
            value={theme.darkMode ? theme.gradientEnd.dark : theme.gradientEnd.light}
            onChange={color => {
              const newGradientEnd = {
                ...theme.gradientEnd,
                [theme.darkMode ? 'dark' : 'light']: color,
              };
              setGradientEnd(newGradientEnd);
            }}
            htmlFor="gradient-end-color"
          />
          <Button
            variant="outline"
            className="rounded-xl w-full mt-4"
            onClick={() => {
              if (theme.darkMode) {
                setGradientStart({ ...theme.gradientStart, dark: '#18181b' });
                setGradientMiddle({ ...theme.gradientMiddle, dark: '#0f172a' });
                setGradientEnd({ ...theme.gradientEnd, dark: '#1e293b' });
              } else {
                setGradientStart({ ...theme.gradientStart, light: '#ffd2e9' });
                setGradientMiddle({ ...theme.gradientMiddle, light: '#bae6fd' });
                setGradientEnd({ ...theme.gradientEnd, light: '#a7f3d0' });
              }
            }}
          >
            {t('backgroundGradient.reset')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderWeatherApiCard = () => (
    <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
      <div ref={refMap.weatherApi} />
      <CardHeader>
        <CardTitle>{t('weatherApi.title')}</CardTitle>
        <CardDescription>{t('weatherApi.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="weather-api-key">{t('weatherApi.apiKeyLabel')}</Label>
          <Input
            id="weather-api-key"
            type="password"
            placeholder={t('weatherApi.placeholder')}
            value={weather.apiKey}
            onChange={e => setWeatherApiKey(e.target.value)}
            className="mt-2"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
            {t('weatherApi.note')}{' '}
            <a
              href="https://openweathermap.org/api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 underline"
            >
              {t('weatherApi.linkText')}
            </a>
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg text-sm">
          <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">{t('weatherApi.instructions.title')}</p>
          <ol className="text-blue-700 dark:text-blue-300 text-xs space-y-1 ml-4 list-decimal">
            <li>
              {t('weatherApi.instructions.step1')} <span className="font-mono">openweathermap.org</span>
            </li>
            <li>{t('weatherApi.instructions.step2')}</li>
            <li>{t('weatherApi.instructions.step3')}</li>
            <li>{t('weatherApi.instructions.step4')}</li>
            <li>
              <strong>{t('weatherApi.instructions.important')}</strong> {t('weatherApi.instructions.step5')}
            </li>
          </ol>
        </div>
        {weather.apiKey && (
          <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
            <p className="text-green-800 dark:text-green-200 text-sm">{t('weatherApi.configured')}</p>
          </div>
        )}

        <div className="mt-6 border-t pt-4 border-zinc-200 dark:border-zinc-800">
          <h3 className="text-md font-medium mb-2">{t('weatherApi.location.title')}</h3>
          <div className="flex items-center justify-between mb-3">
            <Label htmlFor="use-geolocation">{t('weatherApi.location.useDevice')}</Label>
            <Switch
              id="use-geolocation"
              checked={weather.location.useGeolocation}
              onCheckedChange={checked =>
                setWeatherLocation({
                  ...weather.location,
                  useGeolocation: checked,
                })
              }
            />
          </div>

          <div className={weather.location.useGeolocation ? 'opacity-50' : ''}>
            <Label htmlFor="city-name">{t('weatherApi.location.cityLabel')}</Label>
            <Input
              id="city-name"
              type="text"
              placeholder={t('weatherApi.location.cityPlaceholder')}
              value={weather.location.city}
              onChange={e =>
                setWeatherLocation({
                  ...weather.location,
                  city: e.target.value,
                })
              }
              disabled={weather.location.useGeolocation}
              className="mt-2"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
              {weather.location.useGeolocation
                ? t('weatherApi.location.deviceLocationNote')
                : t('weatherApi.location.manualLocationNote')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Menu items configuration
  const menuItems = [
    { id: 'about', label: t('about.title'), icon: Info, render: renderAboutCard },
    { id: 'courses', label: t('courses.title'), icon: BookOpen, render: renderCoursesCard },
    { id: 'soundtrack', label: t('soundtrack.title'), icon: Music, render: renderSoundtrackCard },
    { id: 'background', label: t('background.title'), icon: Image, render: renderBackgroundCard },
    { id: 'customCursor', label: t('customCursor.title'), icon: MousePointer, render: renderCustomCursorCard },
    { id: 'accentColor', label: t('accentColor.title'), icon: Palette, render: renderAccentColorCard },
    { id: 'cardOpacity', label: t('cardOpacity.title'), icon: Layers, render: renderCardOpacityCard },
    {
      id: 'backgroundGradient',
      label: t('backgroundGradient.title'),
      icon: Brush,
      render: renderBackgroundGradientCard,
    },
    { id: 'weatherApi', label: t('weatherApi.title'), icon: Cloud, render: renderWeatherApiCard },
  ];

  return (
    <div className="flex h-full gap-6">
      {/* Left Sidebar Menu */}
      <div className="w-80 flex-shrink-0 hidden md:block">
        <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur h-fit sticky top-6">
          <CardHeader>
            <CardTitle className="text-xl">{t('title')}</CardTitle>
            <CardDescription>{t('sidebar.description')}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <nav className="space-y-1">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                const isLast = index === menuItems.length - 1;
                return (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all duration-200 hover:bg-white/20 dark:hover:bg-white/10 ${
                      isLast ? 'rounded-b-2xl' : ''
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>
      </div>

      {/* Right Content Area */}
      <div className="flex-1">
        <div className="space-y-6 pb-24 md:pb-6">
          {menuItems.map(item => (
            <div key={item.id}>{item.render()}</div>
          ))}
        </div>
      </div>

      {/* Course Deletion Confirmation Dialog */}
      <Dialog open={!!courseToDelete} onOpenChange={() => setCourseToDelete(null)}>
        <DialogContent className="rounded-xl bg-white dark:bg-zinc-950 border-none shadow-xl backdrop-blur">
          <DialogHeader className="">
            <DialogTitle className="text-red-600 dark:text-red-400">
              {t('courses.deleteConfirmation.title')}
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <p>{t('courses.deleteConfirmation.description', { courseName: courseToDelete?.title })}</p>
              <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200 dark:border-red-900/30">
                <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                  {t('courses.deleteConfirmation.warning')}
                </p>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 ml-4 list-disc">
                  <li>{t('courses.deleteConfirmation.consequences.tasks')}</li>
                  <li>{t('courses.deleteConfirmation.consequences.exams')}</li>
                  <li>{t('courses.deleteConfirmation.consequences.grades')}</li>
                  <li>{t('courses.deleteConfirmation.consequences.timetable')}</li>
                  <li>{t('courses.deleteConfirmation.consequences.sessions')}</li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setCourseToDelete(null)}>
              {tCommon('actions.cancel')}
            </Button>
            <Button
              onClick={confirmRemoveCourse}
              className="sp-red-button bg-red-600 hover:bg-red-700 text-white border-0 shadow-sm"
            >
              {t('courses.deleteConfirmation.confirmDelete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
