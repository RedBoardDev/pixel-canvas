"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/applications/Auth/Api/useAuth";
import { createAppConfig } from "@/lib/config/createAppConfig";
import { useCanvas } from "../Api/useCanvas";
import { usePixelPlacement } from "../Api/usePixelPlacement";
import { CanvasGrid } from "./CanvasGrid";
import { CanvasLoading } from "./CanvasStates";
import { COLORS, ColorPalette } from "./ColorPalette";
import { FloatingIsland, PaletteIsland } from "./FloatingToolbar";
import { useCanvasMode } from "./hooks/useCanvasMode";
import { ModeToggle } from "./ModeToggle";

const { canvasCooldownMs } = createAppConfig();

export function CanvasContainer() {
  const { pixels, isLoading, loadChunksForViewport } = useCanvas();
  const placement = usePixelPlacement();
  const { isAuthenticated } = useAuth();
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const { mode, toggleMode, canToggle } = useCanvasMode({ isAuthenticated });

  const [isCooldown, setIsCooldown] = useState(false);

  useEffect(() => {
    if (!placement.lastPlacedAt) return setIsCooldown(false);
    setIsCooldown(true);
    const remaining = canvasCooldownMs - (Date.now() - placement.lastPlacedAt.getTime());
    if (remaining <= 0) return setIsCooldown(false);
    const timer = setTimeout(() => setIsCooldown(false), remaining);
    return () => clearTimeout(timer);
  }, [placement.lastPlacedAt]);

  const handlePixelClick = useCallback(
    (x: number, y: number) => {
      if (mode !== "edit") return;
      placement.placePixel(x, y, selectedColor);
    },
    [mode, selectedColor, placement],
  );

  if (isLoading) return <CanvasLoading />;

  return (
    <div className="absolute inset-0">
      <CanvasGrid
        pixels={pixels}
        selectedColor={selectedColor}
        mode={mode}
        isCooldown={isCooldown}
        onPixelClick={handlePixelClick}
        onViewportChange={loadChunksForViewport}
      />

      <div className="animate-toolbar-enter pointer-events-auto fixed bottom-5 left-1/2 z-20 flex items-center gap-2">
        <FloatingIsland>
          <ModeToggle mode={mode} onToggle={toggleMode} canToggle={canToggle} />
        </FloatingIsland>

        {mode === "edit" && (
          <PaletteIsland>
            <ColorPalette selectedColor={selectedColor} onSelectColor={setSelectedColor} />
          </PaletteIsland>
        )}
      </div>
    </div>
  );
}
