import type { Minutes } from '../domain/types';
import { formatMinutesWithPeriod } from '../domain/types';

interface TimeSelectProps {
  value: Minutes;
  onChange: (m: Minutes) => void;
  min: Minutes;
  max: Minutes;
  step?: number;
}

/** Dropdown of times in 5-minute increments within [min, max]. */
export function TimeSelect({ value, onChange, min, max, step = 5 }: TimeSelectProps) {
  const options: Minutes[] = [];
  for (let m = min; m <= max; m += step) options.push(m);
  if (!options.includes(value)) options.push(value);
  options.sort((a, b) => a - b);
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {options.map((m) => (
        <option key={m} value={m}>
          {formatMinutesWithPeriod(m)}
        </option>
      ))}
    </select>
  );
}
