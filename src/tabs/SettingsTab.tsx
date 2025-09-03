import StorageInfoCard from '@/components/StorageInfoCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ColorPicker from '@/components/ui/color-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAppContext } from '@/contexts/AppContext';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { SettingsDialog, useSettingsDialog } from '@/hooks/useSettingsDialog';
import { useTheme } from '@/hooks/useStore';
import { dataTransfer, persistStore } from '@/stores/app';
import { Brush, Download, Github, Image, Info, Layers, MousePointer, Palette } from 'lucide-react';
import { ChangeEvent, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export default function SettingsTab() {
  const { isExtension } = useAppContext();

  // Translation hooks
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');

  // Settings dialog hook
  const { settingsDialogs } = useSettingsDialog();
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

  // Hash navigation for settings sections
  const parseHashSection = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash;
    const parts = hash.split('/');
    return parts.length > 1 ? parts[1] : null;
  }, []);

  // Map menu items to their refs for scroll-to functionality
  const refMap = {
    courses: useRef<HTMLDivElement>(null),
    about: useRef<HTMLDivElement>(null),
    focusTimer: useRef<HTMLDivElement>(null),
    soundtrack: useRef<HTMLDivElement>(null),
    background: useRef<HTMLDivElement>(null),
    customCursor: useRef<HTMLDivElement>(null),
    accentColor: useRef<HTMLDivElement>(null),
    cardOpacity: useRef<HTMLDivElement>(null),
    backgroundGradient: useRef<HTMLDivElement>(null),
    hydration: useRef<HTMLDivElement>(null),
    weatherApi: useRef<HTMLDivElement>(null),
  };

  // Scroll to section function
  const scrollToSection = useCallback(
    (menuId: string) => {
      // Update URL hash for deep linking
      const parts = window.location.hash.split('/');
      const mainRoute = parts[0];
      const newHash = menuItems[0].id === menuId ? mainRoute : `${mainRoute}/${menuId}`;
      // const newHash = mainRoute
      if (window.location.hash !== newHash) {
        window.history.replaceState(null, '', newHash);
      }

      const ref = refMap[menuId as keyof typeof refMap];
      if (ref?.current) {
        const el = ref.current as HTMLDivElement;

        if (menuItems[0].id === menuId) {
          scrollToTop();
        } else {
          el.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }

        el.tabIndex = -1; // Make it focusable for screen readers
        el.focus({ preventScroll: true });
      }
    },
    [scrollToTop]
  );

  // Handle initial hash navigation and hash changes
  useEffect(() => {
    const handleHashNavigation = () => {
      const sectionId = parseHashSection();
      if (sectionId) {
        // Small delay to ensure DOM is ready
        setTimeout(() => scrollToSection(sectionId), 100);
      }
    };

    // Handle initial load
    handleHashNavigation();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashNavigation);
    return () => window.removeEventListener('hashchange', handleHashNavigation);
  }, [parseHashSection, scrollToSection]);

  // Render functions for each settings card
  const renderAboutCard = () => (
    <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
      <div className="scroll-mt-section" />
      {/* GitHub Corner Ribbon */}
      <a
        href="https://github.com/beckheck/gen-z-study-portal"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute -top-3 -right-3 z-20 group"
        aria-label={t('about.viewSourceOnGitHub')}
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
          <p>{t(isExtension ? 'about.proTipExtension' : 'about.proTip')}</p>
        </div>
        <div className="grid gap-2 lg:grid-cols-3 lg:gap-3">
          <Button variant="outline" onClick={() => dataTransfer.exportFile()} className="w-full rounded-xl">
            <Download className="w-4 h-4 mr-2" />
            {t('about.exportData')}
          </Button>
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
          <BuyMeACoffeeButton id="" />
        </div>
        <StorageInfoCard />
      </CardContent>
    </Card>
  );

  const renderBackgroundCard = () => (
    <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
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
      <CardHeader>
        <CardTitle>{t('cardOpacity.title')}</CardTitle>
        <CardDescription>{t('cardOpacity.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>
            {t('cardOpacity.mode', {
              mode: theme.darkMode ? t('accentColor.dark') : t('accentColor.light'),
              value: theme.darkMode ? theme.cardOpacity.dark : theme.cardOpacity.light,
            })}
          </Label>
          <input
            type="range"
            min={theme.darkMode ? '5' : '10'}
            max="100"
            value={theme.darkMode ? theme.cardOpacity.dark : theme.cardOpacity.light}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const newCardOpacity = {
                ...theme.cardOpacity,
                [theme.darkMode ? 'dark' : 'light']: parseInt(e.target.value),
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
            const newCardOpacity = {
              ...theme.cardOpacity,
              [theme.darkMode ? 'dark' : 'light']: theme.darkMode ? 25 : 80,
            };
            setCardOpacity(newCardOpacity);
          }}
        >
          {t('cardOpacity.reset')}
        </Button>
      </CardContent>
    </Card>
  );

  const renderBackgroundGradientCard = () => (
    <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
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

  type MenuItem = {
    id: string;
    title: string;
    icon: (props: any) => any;
    render: () => any;
  };

  const soundtrackDialog = settingsDialogs.soundtrack;
  const coursesDialog = settingsDialogs.courses;
  const focusTimerDialog = settingsDialogs.focusTimer;
  const hydrationDialog = settingsDialogs.hydration;
  const weatherApiDialog = settingsDialogs.weatherApi;

  // Menu items configuration
  const menuItems: MenuItem[] = [
    { id: 'about', title: t('about.title'), icon: Info, render: renderAboutCard },
    {
      id: 'courses',
      title: coursesDialog.title,
      icon: coursesDialog.Icon,
      render: () => <SettingsDialogCard dialog={coursesDialog} />,
    },
    {
      id: 'focusTimer',
      title: focusTimerDialog.title,
      icon: focusTimerDialog.Icon,
      render: () => <SettingsDialogCard dialog={focusTimerDialog} />,
    },
    {
      id: 'soundtrack',
      title: soundtrackDialog.title,
      icon: soundtrackDialog.Icon,
      render: () => <SettingsDialogCard dialog={soundtrackDialog} />,
    },
    { id: 'background', title: t('background.title'), icon: Image, render: renderBackgroundCard },
    { id: 'customCursor', title: t('customCursor.title'), icon: MousePointer, render: renderCustomCursorCard },
    { id: 'accentColor', title: t('accentColor.title'), icon: Palette, render: renderAccentColorCard },
    { id: 'cardOpacity', title: t('cardOpacity.title'), icon: Layers, render: renderCardOpacityCard },
    {
      id: 'backgroundGradient',
      title: t('backgroundGradient.title'),
      icon: Brush,
      render: renderBackgroundGradientCard,
    },
    {
      id: 'hydration',
      title: hydrationDialog.title,
      icon: hydrationDialog.Icon,
      render: () => <SettingsDialogCard dialog={hydrationDialog} />,
    },
    {
      id: 'weatherApi',
      title: weatherApiDialog.title,
      icon: weatherApiDialog.Icon,
      render: () => <SettingsDialogCard dialog={weatherApiDialog} />,
    },
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
                    <span className="font-medium">{item.title}</span>
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
          {menuItems.map(({ id, render }) => (
            <div key={id} ref={refMap[id]} className="scroll-mt-section">
              {render()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BuyMeACoffeeButton({ id }: { id: string }) {
  const { i18n, t } = useTranslation('settings');
  const primaryLanguageCode = i18n.language.split('-')[0];
  return (
    <a
      className="buy-me-a-coffee-button"
      target="_blank"
      href={`https://buymeacoffee.com/${id}?l=${primaryLanguageCode}`}
      rel="noreferrer"
    >
      <img src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg" alt={t('about.buyMeACoffee')} />
      <span>{t('about.buyMeACoffee')}</span>
    </a>
  );
}

function SettingsDialogCard({ dialog }: { dialog: SettingsDialog }) {
  const { title, subtitle, Body } = dialog;

  return (
    <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <Body />
      </CardContent>
    </Card>
  );
}
