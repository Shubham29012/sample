import { Color } from '@/types';

export const QUICK_COLORS: Color[] = [
  { color: "#ffff00", name: "Yellow" },
  { color: "#0000ff", name: "Blue" },
  { color: "#ff69b4", name: "Pink" },
  { color: "#00ff00", name: "Green" },
];

export const OTHER_COLORS: Color[] = [
  { color: "#ffffff", name: "White" },
  { color: "#000000", name: "Black" },
  { color: "#ff0090", name: "Magenta" },
  { color: "#ff0000", name: "Red" },
  { color: "#00ffff", name: "Cyan" },
  { color: "#ff7700", name: "Orange" },
  { color: "#999999", name: "Gray" },
  { color: "#333333", name: "Charcoal" },
  { color: "#ff66cc", name: "Hot Pink" },
  { color: "#cc0000", name: "Crimson" },
  { color: "#00cc66", name: "Emerald" },
  { color: "#0066ff", name: "Azure" },
  { color: "#cc9900", name: "Mustard" },
  { color: "#9933ff", name: "Purple" },
  { color: "#66ffff", name: "Light Cyan" },
  { color: "#ff4444", name: "Coral" },
];

export const CANVAS_CONFIG = {
  DEFAULT_WIDTH: 700,
  DEFAULT_HEIGHT: 500,
  MIN_WIDTH: 300,
  BRUSH_SIZE_MIN: 6,
  BRUSH_SIZE_MAX: 20,
  TIMER_DURATION: 60,
};

export const ZONE_CONFIG = {
  PIXELS_PER_MM: 3.78,
  NEAR_DISTANCE_MM: 10,
};