import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ColorPicker from '@/components/ui/color-picker';
import { DeferredInput } from '@/components/ui/deferred-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCourses, useSoundtrack, useTheme, useWeather } from '@/hooks/useStore';
import { dataTransfer, persistStore } from '@/store';
import { Download } from 'lucide-react';
import { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import StorageInfoCard from './StorageInfoCard';

export default function SettingsTab() {
  // Translation hooks
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');

  const { courses, renameCourse } = useCourses();
  const { weather, setWeatherApiKey, setWeatherLocation } = useWeather();
  const { soundtrack, setSoundtrackEmbed, setSoundtrackPosition } = useSoundtrack();
  const {
    theme,
    setAccentColor,
    setBgImage,
    setCardOpacity,
    setGradientEnabled,
    setGradientEnd,
    setGradientMiddle,
    setGradientStart,
  } = useTheme();

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle>{t('courses.title')}</CardTitle>
          <CardDescription>{t('courses.description')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {courses.map((c, i) => (
            <div key={c.id} className="grid grid-cols-[100px_1fr] items-center gap-3">
              <Label>{t('courses.courseLabel', { number: i + 1 })}</Label>
              <DeferredInput
                value={c.title}
                onDeferredChange={value => renameCourse(c.id, value)}
                className="rounded-xl"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
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
                              // Wait for the data to be persisted before reloading
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
                          e.target.value = ''; // Reset input
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

      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
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
                <SelectItem value="hidden">{t('soundtrack.positions.hidden')}</SelectItem>
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
            <img
              src={theme.bgImage}
              alt={t('background.preview')}
              className="rounded-xl max-h-40 w-full object-cover"
            />
          )}
        </CardContent>
      </Card>

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

      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
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

      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
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
    </div>
  );
}
