"use client";

import { PALETTE_COLORS } from "@/applications/Canvas/Domain/constants/canvas.constants";

interface ColorPaletteProps {
  selectedColor: string;
  onSelectColor: (color: string) => void;
}

export function ColorPalette({ selectedColor, onSelectColor }: ColorPaletteProps) {
  return (
    <div className="grid grid-cols-8 gap-[3px]">
      {PALETTE_COLORS.map((color) => {
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
