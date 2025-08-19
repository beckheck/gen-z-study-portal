import { Switch } from '@/components/ui/switch';

export default function MoonSunToggle({ checked, onCheckedChange }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs">🌞</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
      <span className="text-xs">🌚</span>
    </div>
  );
}
