"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/applications/Auth/Api/useAuth";
import { createAppConfig } from "@/lib/config/createAppConfig";
import { useCanvas } from "../Api/useCanvas";
import { usePixelPlacement } from "../Api/usePixelPlacement";
import { CanvasGrid } from "./CanvasGrid";
import { CanvasLoading } from "./CanvasStates";
import { COLORS, ColorPalette } from "./ColorPalette";
import { CooldownIndicator } from "./CooldownIndicator";
import { useCanvasMode } from "./hooks/useCanvasMode";
import { ModeToggle } from "./ModeToggle";
import { PlacementStatus } from "./PlacementStatus";
import { Toolbar } from "./Toolbar";

const { canvasCooldownMs } = createAppConfig();

export function CanvasContainer() {
  const { pixels, isLoading, loadChunksForViewport } = useCanvas();
  const placement = usePixelPlacement();
  const { isAuthenticated } = useAuth();
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const { mode, toggleMode, canToggle } = useCanvasMode({ isAuthenticated });

  const handlePixelClick = useCallback(
    (x: number, y: number) => {
      if (mode !== "edit") return;
      placement.placePixel(x, y, selectedColor);
    },
    [mode, selectedColor, placement],
  );

  if (isLoading) return <CanvasLoading />;

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex-1">
        <CanvasGrid
          pixels={pixels}
          selectedColor={selectedColor}
          mode={mode}
          onPixelClick={handlePixelClick}
          onViewportChange={loadChunksForViewport}
        />
      </div>
      <Toolbar>
        <div className="flex items-center gap-3">
          <ColorPalette
            selectedColor={selectedColor}
            onSelectColor={setSelectedColor}
            disabled={mode !== "edit"}
          />
          <ModeToggle mode={mode} onToggle={toggleMode} canToggle={canToggle} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PlacementStatus
            isPlacing={placement.isPlacing}
            error={placement.error}
            isAuthenticated={isAuthenticated}
            mode={mode}
          />
          <CooldownIndicator lastPlacedAt={placement.lastPlacedAt} cooldownMs={canvasCooldownMs} />
        </div>
      </Toolbar>
    </div>
  );
}
