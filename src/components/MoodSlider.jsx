import { Label } from '@/components/ui/label';

export default function MoodSlider({ label, value, onChange }) {
  const faces = ['💀', '😕', '😐', '🙂', '🔥'];
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
