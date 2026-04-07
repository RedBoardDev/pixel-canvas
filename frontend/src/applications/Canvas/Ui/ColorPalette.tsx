"use client";

export const COLORS = [
  "#FF4500",
  "#FFA800",
  "#FFD635",
  "#00A368",
  "#7EED56",
  "#2450A4",
  "#3690EA",
  "#51E9F4",
  "#811E9F",
  "#B44AC0",
  "#FF99AA",
  "#9C6926",
  "#000000",
  "#898D90",
  "#D4D7D9",
  "#FFFFFF",
];

interface ColorPaletteProps {
  selectedColor: string;
  onSelectColor: (color: string) => void;
  disabled?: boolean;
}

export function ColorPalette({ selectedColor, onSelectColor, disabled }: ColorPaletteProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onSelectColor(color)}
          disabled={disabled}
          className={`h-7 w-7 rounded-md border-2 transition-all sm:h-8 sm:w-8 ${
            selectedColor === color
              ? "scale-110 border-white shadow-lg shadow-white/10"
              : "border-transparent hover:scale-105 hover:border-white/30"
          } ${disabled ? "opacity-40" : ""}`}
          style={{ backgroundColor: color }}
          aria-label={`Color ${color}`}
        />
      ))}
    </div>
  );
}
