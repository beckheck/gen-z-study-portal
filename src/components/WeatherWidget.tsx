import { OpenWeatherMapResponse, Weather, WeatherCondition, WeatherLocation } from '@/types';
import { useEffect, useState } from 'react';

interface WeatherWidgetProps {
  apiKey?: string;
  location?: WeatherLocation;
}

export default function WeatherWidget({ apiKey, location }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<Weather>({
    condition: 'loading',
    temperature: '--',
    location: 'Getting location...',
    description: 'Loading...',
  });
  const [error, setError] = useState<string | null>(null);

  // OpenWeatherMap API integration
  useEffect(() => {
    const API_KEY = apiKey || 'demo_key'; // Use provided API key or demo

    const fetchWeatherByCity = async (city: string): Promise<void> => {
      try {
        if (!apiKey || apiKey.trim() === '') {
          throw new Error('No API key provided');
        }

        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`
        );

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Invalid API key or key not yet activated');
          } else if (response.status === 404) {
            throw new Error(`City "${city}" not found`);
          } else {
            throw new Error(`Weather API error: ${response.status}`);
          }
        }

        const data: OpenWeatherMapResponse = await response.json();

        // Map OpenWeatherMap icons to our emoji system
        const getWeatherIcon = (weatherMain: string, icon: string): string => {
          const iconMap: { [key: string]: string } = {
            Clear: '☀️',
            Clouds: icon.includes('01') ? '☀️' : icon.includes('02') ? '⛅' : '☁️',
            Rain: '🌧️',
            Drizzle: '🌦️',
            Thunderstorm: '⛈️',
            Snow: '❄️',
            Mist: '🌫️',
            Fog: '🌫️',
            Haze: '🌫️',
          };
          return iconMap[weatherMain] || '🌤️';
        };

        setWeather({
          condition: data.weather[0].main.toLowerCase(),
          temperature: Math.round(data.main.temp),
          location: data.name,
          description: data.weather[0].description,
          icon: getWeatherIcon(data.weather[0].main, data.weather[0].icon),
        });
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        console.log('Weather API failed:', errorMessage);
        setError(errorMessage);
        fallbackToSimulation();
      }
    };

    const fetchWeatherData = async (lat: number, lon: number): Promise<void> => {
      try {
        if (!apiKey || apiKey.trim() === '') {
          throw new Error('No API key provided');
        }

        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
        );

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Invalid API key or key not yet activated');
          } else {
            throw new Error(`Weather API error: ${response.status}`);
          }
        }

        const data: OpenWeatherMapResponse = await response.json();

        // Map OpenWeatherMap icons to our emoji system
        const getWeatherIcon = (weatherMain: string, icon: string): string => {
          const iconMap: { [key: string]: string } = {
            Clear: '☀️',
            Clouds: icon.includes('01') ? '☀️' : icon.includes('02') ? '⛅' : '☁️',
            Rain: '🌧️',
            Drizzle: '🌦️',
            Thunderstorm: '⛈️',
            Snow: '❄️',
            Mist: '🌫️',
            Fog: '🌫️',
            Haze: '🌫️',
          };
          return iconMap[weatherMain] || '🌤️';
        };

        setWeather({
          condition: data.weather[0].main.toLowerCase(),
          temperature: Math.round(data.main.temp),
          location: data.name,
          description: data.weather[0].description,
          icon: getWeatherIcon(data.weather[0].main, data.weather[0].icon),
        });
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        console.log('Weather API failed, falling back to simulation:', errorMessage);
        // Fallback to simulated weather if API fails
        fallbackToSimulation();
      }
    };

    const fallbackToSimulation = (): void => {
      const conditions: WeatherCondition[] = [
        { condition: 'sunny', temp: 28, icon: '☀️', desc: 'Clear sky' },
        { condition: 'cloudy', temp: 24, icon: '☁️', desc: 'Overcast clouds' },
        { condition: 'rainy', temp: 18, icon: '🌧️', desc: 'Light rain' },
        { condition: 'partly-cloudy', temp: 25, icon: '⛅', desc: 'Partly cloudy' },
      ];

      const hour = new Date().getHours();
      let weatherIndex = 0;

      if (hour >= 6 && hour < 12) weatherIndex = 0;
      else if (hour >= 12 && hour < 15) weatherIndex = 3;
      else if (hour >= 15 && hour < 18) weatherIndex = 1;
      else weatherIndex = 3;

      const selectedWeather = conditions[weatherIndex];
      setWeather({
        condition: selectedWeather.condition,
        temperature: selectedWeather.temp + Math.floor(Math.random() * 6 - 3),
        location: 'Simulated',
        description: selectedWeather.desc,
        icon: selectedWeather.icon,
      });
    };

    const getLocationAndWeather = (): void => {
      if (location && !location.useGeolocation && location.city) {
        // Use city name from settings
        fetchWeatherByCity(location.city);
      } else if (navigator.geolocation) {
        // Use geolocation
        navigator.geolocation.getCurrentPosition(
          (position: GeolocationPosition) => {
            const { latitude, longitude } = position.coords;
            fetchWeatherData(latitude, longitude);
          },
          (err: GeolocationPositionError) => {
            console.log('Geolocation failed:', err.message);
            setError('Location access denied');
            if (location && location.city) {
              // Try fallback to city if available
              fetchWeatherByCity(location.city);
            } else {
              fallbackToSimulation();
            }
          },
          { timeout: 10000, enableHighAccuracy: true }
        );
      } else {
        setError('Geolocation not supported');
        if (location && location.city) {
          // Try fallback to city if available
          fetchWeatherByCity(location.city);
        } else {
          fallbackToSimulation();
        }
      }
    };

    getLocationAndWeather();

    // Update weather every 10 minutes
    const interval = setInterval(getLocationAndWeather, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [apiKey, location]);

  const getWeatherDescription = (condition: string): string => {
    if (weather.description) {
      return weather.description.charAt(0).toUpperCase() + weather.description.slice(1);
    }

    const descriptions: { [key: string]: string } = {
      clear: 'Clear Sky',
      sunny: 'Sunny',
      clouds: 'Cloudy',
      rain: 'Rainy',
      drizzle: 'Drizzle',
      thunderstorm: 'Stormy',
      snow: 'Snowy',
      mist: 'Misty',
      fog: 'Foggy',
      'partly-cloudy': 'Partly Cloudy',
      loading: 'Loading...',
    };
    return descriptions[condition] || 'Clear';
  };

  return (
    <div className="text-left">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl weather-icon-3d cursor-pointer">
          {weather.condition === 'loading' ? '⏳' : weather.icon}
        </span>
        <div>
          <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {getWeatherDescription(weather.condition)}
          </div>
          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {weather.temperature === '--' ? '--' : `${weather.temperature}°C`}
          </div>
          {error && (
            <div className="text-xs text-orange-500 dark:text-orange-400">
              {error} {!error.includes('Invalid API key') && !error.includes('not found') ? '(simulated)' : ''}
            </div>
          )}
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{weather.location}</div>
        </div>
      </div>
    </div>
  );
}
