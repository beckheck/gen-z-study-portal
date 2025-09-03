import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useFocusTimer } from '@/hooks/useStore';
import { Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function FocusTimerSettings() {
  const { t } = useTranslation('settings');
  const { focusTimer, setAudioEnabled, setAudioVolume, setNotificationsEnabled, setShowCountdown } = useFocusTimer();

  return (
    <div className="space-y-6">
      {/* Notifications Settings Section */}
      <div className="space-y-4">
        {/* OS Notifications Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {focusTimer.notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            <Label className="text-sm font-medium">{t('focusTimer.notifications.desktop')}</Label>
          </div>
          <Switch checked={focusTimer.notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
        </div>
      </div>

      {/* Audio Settings Section */}
      <div className="space-y-4">
        {/* Audio Notifications Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {focusTimer.audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <Label className="text-sm font-medium">{t('focusTimer.audio.notifications')}</Label>
          </div>
          <Switch checked={focusTimer.audioEnabled} onCheckedChange={setAudioEnabled} />
        </div>

        {/* Volume Control */}
        {focusTimer.audioEnabled && (
          <div className="space-y-3">
            <Label className="text-xs text-zinc-500 uppercase tracking-wide">{t('focusTimer.audio.volume')}</Label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={focusTimer.audioVolume}
                onChange={e => setAudioVolume(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-white/70 dark:bg-white/10 rounded-lg appearance-none slider"
              />
              <span className="text-sm text-zinc-500 min-w-[3rem]">{Math.round(focusTimer.audioVolume * 100)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* 
        Future Focus Timer settings sections can be added here:
        
        - Timer Display Settings (countdown vs elapsed, time format)
        - Default Technique Preferences 
        - Notification Behavior (browser notifications, visual cues)
        - Session Management (auto-start breaks, session notes requirements)
        - Mood Tracking Settings (default values, scale customization)
        
        Each section should follow the same pattern:
        <div className="space-y-4">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Section Title
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Section description
            </p>
          </div>
          // Settings controls here...
        </div>
      */}
    </div>
  );
}
