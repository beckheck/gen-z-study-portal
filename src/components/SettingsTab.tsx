import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DataTransfer, Theme, WeatherLocation } from '@/types';
import { Download } from 'lucide-react';
import { ChangeEvent } from 'react';

interface SettingsTabProps {
  courses: string[];
  renameCourse: (index: number, name: string) => void;
  soundtrackEmbed: string;
  setSoundtrackEmbed: (value: string) => void;
  theme: Theme;
  weatherApiKey: string;
  setWeatherApiKey: (value: string) => void;
  weatherLocation: WeatherLocation;
  setWeatherLocation: (value: WeatherLocation) => void;
  dataTransfer: DataTransfer;
}

export default function SettingsTab({
  courses,
  renameCourse,
  soundtrackEmbed,
  setSoundtrackEmbed,
  theme,
  weatherApiKey,
  setWeatherApiKey,
  weatherLocation,
  setWeatherLocation,
  dataTransfer,
}: SettingsTabProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle>Courses</CardTitle>
          <CardDescription>Rename your 7 courses</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {courses.map((c, i) => (
            <div key={i} className="grid grid-cols-[100px_1fr] items-center gap-3">
              <Label>Course {i + 1}</Label>
              <Input defaultValue={c} onBlur={e => renameCourse(i, e.target.value)} className="rounded-xl" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle>About</CardTitle>
          <CardDescription>Local-first · Private · Cute af</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
          <div className="space-y-2">
            <p>Everything saves to your browser (localStorage).</p>
            <p>Built with Tailwind, shadcn/ui, lucide icons, framer‑motion, and Recharts.</p>
            <p>Pro tip: pin this tab and live your best study life ✨</p>
          </div>
          <div className="grid gap-2">
            <Button variant="outline" onClick={() => dataTransfer.exportData()} className="w-full rounded-xl">
              <Download className="w-4 h-4 mr-2" />
              Export Data
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
                            const success = await dataTransfer.importData(file);
                            if (success) {
                              alert('✨ Data imported successfully!');
                              window.location.reload(); // Refresh to ensure all components update
                            } else {
                              alert('❌ Failed to import data. Please check if the file is valid.');
                            }
                          } catch (error) {
                            alert('❌ Error importing data. Make sure this is a valid StudyHub export file.');
                          }
                          e.target.value = ''; // Reset input
                        }
                      }}
                      className="hidden"
                    />
                    <span className="flex items-center justify-center gap-2">
                      <Download className="w-4 h-4 rotate-180" />
                      Import Data
                    </span>
                  </label>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle>Soundtrack</CardTitle>
          <CardDescription>Paste an embed URL (Spotify/YouTube)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={soundtrackEmbed}
            onChange={e => setSoundtrackEmbed(e.target.value)}
            placeholder="https://open.spotify.com/embed/playlist/..."
            className="rounded-xl"
          />
          {soundtrackEmbed && (
            <div className="rounded-2xl overflow-hidden">
              <div className="aspect-video">
                <iframe
                  src={soundtrackEmbed}
                  className="w-full h-full"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  title="Soundtrack preview"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle>Background</CardTitle>
          <CardDescription>Upload a custom wallpaper</CardDescription>
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
                    theme.set.bgImage(result);
                  }
                };
                r.readAsDataURL(f);
              }}
            />
            <Button variant="outline" className="rounded-xl" onClick={() => theme.set.bgImage('')}>
              Clear
            </Button>
          </div>
          {theme.get.bgImage && (
            <img src={theme.get.bgImage} alt="Background preview" className="rounded-xl max-h-40 w-full object-cover" />
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle>Accent Color</CardTitle>
          <CardDescription>Customize the main theme color</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Accent Color {theme.get.darkMode ? '(Dark Mode)' : '(Light Mode)'}</Label>
            <div className="w-24 h-24 relative mt-2">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(
                    from 0deg,
                    hsl(0, 100%, 50%),
                    hsl(60, 100%, 50%),
                    hsl(120, 100%, 50%),
                    hsl(180, 100%, 50%),
                    hsl(240, 100%, 50%),
                    hsl(300, 100%, 50%),
                    hsl(360, 100%, 50%)
                  )`,
                }}
              />
              <div
                className="absolute inset-1 rounded-full border-4 border-white dark:border-zinc-800"
                style={{ backgroundColor: theme.get.darkMode ? theme.get.accentColor.dark : theme.get.accentColor.light }}
              />
              <label className="block absolute inset-0 rounded-full cursor-pointer">
                <input
                  type="color"
                  value={theme.get.darkMode ? theme.get.accentColor.dark : theme.get.accentColor.light}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    theme.set.accentColor(prev => ({
                      ...prev,
                      [theme.get.darkMode ? 'dark' : 'light']: e.target.value,
                    }))
                  }
                  className="sr-only"
                />
              </label>
            </div>
          </div>
          <Button
            variant="outline"
            className="rounded-xl w-full"
            onClick={() => {
              theme.set.accentColor({
                light: '#7c3aed',
                dark: '#8b5cf6',
              });
            }}
          >
            Reset to Default
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle>Card Opacity</CardTitle>
          <CardDescription>Adjust card transparency for better visibility</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Light Mode Opacity: {theme.get.cardOpacity.light}%</Label>
            <input
              type="range"
              min="10"
              max="100"
              value={theme.get.cardOpacity.light}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                theme.set.cardOpacity(prev => ({
                  ...prev,
                  light: parseInt(e.target.value),
                }))
              }
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 mt-2"
            />
          </div>
          <div>
            <Label>Dark Mode Opacity: {theme.get.cardOpacity.dark}%</Label>
            <input
              type="range"
              min="5"
              max="100"
              value={theme.get.cardOpacity.dark}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                theme.set.cardOpacity(prev => ({
                  ...prev,
                  dark: parseInt(e.target.value),
                }))
              }
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 mt-2"
            />
          </div>
          <Button
            variant="outline"
            className="rounded-xl w-full"
            onClick={() => {
              theme.set.cardOpacity({
                light: 80,
                dark: 25,
              });
            }}
          >
            Reset to Default
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle>Background Gradient</CardTitle>
          <CardDescription>Customize the background colors</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 pb-2">
            <Switch checked={theme.get.gradientEnabled} onCheckedChange={theme.set.gradientEnabled} />
            <Label>Enable gradient background</Label>
          </div>

          <div className={theme.get.gradientEnabled ? '' : 'opacity-50 pointer-events-none'}>
            <div>
              <Label>Start Color {theme.get.darkMode ? '(Dark Mode)' : '(Light Mode)'}</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <div
                  className="w-10 h-10 rounded-lg shadow-inner"
                  style={{ backgroundColor: theme.get.darkMode ? theme.get.gradientStart.dark : theme.get.gradientStart.light }}
                ></div>
                <Input
                  type="color"
                  value={theme.get.darkMode ? theme.get.gradientStart.dark : theme.get.gradientStart.light}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    theme.set.gradientStart(prev => ({ ...prev, [theme.get.darkMode ? 'dark' : 'light']: e.target.value }))
                  }
                  className="h-10 rounded-xl w-full"
                />
              </div>
            </div>
            <div>
              <Label>Middle Color {theme.get.darkMode ? '(Dark Mode)' : '(Light Mode)'}</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <div
                  className="w-10 h-10 rounded-lg shadow-inner"
                  style={{ backgroundColor: theme.get.darkMode ? theme.get.gradientMiddle.dark : theme.get.gradientMiddle.light }}
                ></div>
                <Input
                  type="color"
                  value={theme.get.darkMode ? theme.get.gradientMiddle.dark : theme.get.gradientMiddle.light}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    theme.set.gradientMiddle(prev => ({ ...prev, [theme.get.darkMode ? 'dark' : 'light']: e.target.value }))
                  }
                  className="h-10 rounded-xl w-full"
                />
              </div>
            </div>
            <div>
              <Label>End Color {theme.get.darkMode ? '(Dark Mode)' : '(Light Mode)'}</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <div
                  className="w-10 h-10 rounded-lg shadow-inner"
                  style={{ backgroundColor: theme.get.darkMode ? theme.get.gradientEnd.dark : theme.get.gradientEnd.light }}
                ></div>
                <Input
                  type="color"
                  value={theme.get.darkMode ? theme.get.gradientEnd.dark : theme.get.gradientEnd.light}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    theme.set.gradientEnd(prev => ({ ...prev, [theme.get.darkMode ? 'dark' : 'light']: e.target.value }))
                  }
                  className="h-10 rounded-xl w-full"
                />
              </div>
            </div>
            <Button
              variant="outline"
              className="rounded-xl w-full mt-4"
              onClick={() => {
                if (theme.get.darkMode) {
                  theme.set.gradientStart(prev => ({ ...prev, dark: '#18181b' }));
                  theme.set.gradientMiddle(prev => ({ ...prev, dark: '#0f172a' }));
                  theme.set.gradientEnd(prev => ({ ...prev, dark: '#1e293b' }));
                } else {
                  theme.set.gradientStart(prev => ({ ...prev, light: '#ffd2e9' }));
                  theme.set.gradientMiddle(prev => ({ ...prev, light: '#bae6fd' }));
                  theme.set.gradientEnd(prev => ({ ...prev, light: '#a7f3d0' }));
                }
              }}
            >
              Reset to Default
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle>🌤️ Weather API</CardTitle>
          <CardDescription>Get real weather data for your location</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="weather-api-key">OpenWeatherMap API Key</Label>
            <Input
              id="weather-api-key"
              type="password"
              placeholder="Enter your API key here..."
              value={weatherApiKey}
              onChange={e => setWeatherApiKey(e.target.value)}
              className="mt-2"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
              Without an API key, weather will be simulated. Get a free key from{' '}
              <a
                href="https://openweathermap.org/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 underline"
              >
                OpenWeatherMap
              </a>
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg text-sm">
            <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">📋 How to get an API key:</p>
            <ol className="text-blue-700 dark:text-blue-300 text-xs space-y-1 ml-4 list-decimal">
              <li>
                Visit <span className="font-mono">openweathermap.org</span>
              </li>
              <li>Sign up for a free account</li>
              <li>Go to "My API keys" in your account</li>
              <li>Copy your key and paste it above</li>
              <li>
                <strong>Important:</strong> New API keys may take 2-24 hours to activate!
              </li>
            </ol>
          </div>
          {weatherApiKey && (
            <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
              <p className="text-green-800 dark:text-green-200 text-sm">
                ✅ API key configured! Real weather data will be used.
              </p>
            </div>
          )}

          <div className="mt-6 border-t pt-4 border-zinc-200 dark:border-zinc-800">
            <h3 className="text-md font-medium mb-2">Weather Location Settings</h3>
            <div className="flex items-center justify-between mb-3">
              <Label htmlFor="use-geolocation">Use device location</Label>
              <Switch
                id="use-geolocation"
                checked={weatherLocation.useGeolocation}
                onCheckedChange={checked =>
                  setWeatherLocation({
                    ...weatherLocation,
                    useGeolocation: checked,
                  })
                }
              />
            </div>

            <div className={weatherLocation.useGeolocation ? 'opacity-50' : ''}>
              <Label htmlFor="city-name">City name</Label>
              <Input
                id="city-name"
                type="text"
                placeholder="Enter city name (e.g., London, Tokyo, New York)"
                value={weatherLocation.city}
                onChange={e =>
                  setWeatherLocation({
                    ...weatherLocation,
                    city: e.target.value,
                  })
                }
                disabled={weatherLocation.useGeolocation}
                className="mt-2"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                {weatherLocation.useGeolocation
                  ? 'Turn off device location to enter a city manually'
                  : 'Enter a city name to get weather for that location'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
