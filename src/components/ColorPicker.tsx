import { Color } from '@/types';
import { QUICK_COLORS, OTHER_COLORS } from '@/lib/constants';

interface ColorPickerProps {
  brushColor: string;
  onColorChange: (color: string) => void;
}

export default function ColorPicker({ brushColor, onColorChange }: ColorPickerProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <div className="text-sm font-medium text-gray-700 mb-2">Quick colors:</div>
        <div className="flex flex-wrap gap-2">
          {QUICK_COLORS.map((c: Color) => (
            <button
              key={c.color}
              onClick={() => onColorChange(c.color)}
              title={c.name}
              className={`w-10 h-10 rounded-full border-2 hover:scale-110 transition-transform ${
                brushColor === c.color ? "border-gray-800 border-4" : "border-gray-400"
              }`}
              style={{ backgroundColor: c.color }}
              aria-label={`Select ${c.name}`}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">More colors:</label>
        <select
          value={brushColor}
          onChange={(e) => onColorChange(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="" disabled>Pick a color…</option>
          <optgroup label="Quick Colors">
            {QUICK_COLORS.map((c: Color) => (
              <option key={c.color} value={c.color}>{c.name}</option>
            ))}
          </optgroup>
          <optgroup label="Other Colors">
            {OTHER_COLORS.map((c: Color) => (
              <option key={c.color} value={c.color}>{c.name}</option>
            ))}
          </optgroup>
        </select>
      </div>
    </div>
  );
}