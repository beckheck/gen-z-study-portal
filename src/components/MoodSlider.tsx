import { Label } from '@/components/ui/label';
import React from 'react';

interface MoodSliderProps {
  /** Label text for the mood slider */
  label: string;
  /** Current mood value (1-5) */
  value: number;
  /** Callback function when value changes */
  onChange: (value: number) => void;
}

/**
 * Mood Slider Component
 * Displays a slider with emoji faces representing mood levels
 */
export default function MoodSlider({ label, value, onChange }: MoodSliderProps): React.ReactElement {
  const faces: string[] = ['💀', '😕', '😐', '🙂', '🔥'];
  return (
    <div>
      <Label>
        {label} <span className="ml-2">{faces[value - 1]}</span>
      </Label>
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-zinc-500">
        <span>low</span>
        <span>high</span>
      </div>
    </div>
  );
}
