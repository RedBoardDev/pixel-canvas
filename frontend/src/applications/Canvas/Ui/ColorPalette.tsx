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
}

export function ColorPalette({ selectedColor, onSelectColor }: ColorPaletteProps) {
  return (
    <div className="grid grid-cols-8 gap-[3px]">
      {COLORS.map((color) => {
        const isSelected = selectedColor === color;
        return (
          <button
            key={color}
            type="button"
            onClick={() => onSelectColor(color)}
            className={`h-[22px] w-[22px] rounded-[4px] border transition-transform sm:h-[26px] sm:w-[26px] ${
              isSelected
                ? "z-10 scale-[1.2] border-accent shadow-[0_0_8px_rgba(57,255,133,0.4)]"
                : "border-white/[0.06] hover:scale-110 hover:border-white/20"
            }`}
            style={{ backgroundColor: color }}
            aria-label={`Color ${color}`}
            aria-pressed={isSelected}
          />
        );
      })}
    </div>
  );
}
