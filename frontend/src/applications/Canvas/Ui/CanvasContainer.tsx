"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/applications/Auth/Api/useAuth";
import { useCanvas } from "@/applications/Canvas/Api/useCanvas";
import { usePixelPlacement } from "@/applications/Canvas/Api/usePixelPlacement";
import { useSessionState } from "@/applications/Canvas/Api/useSessionState";
import { PALETTE_COLORS } from "@/applications/Canvas/Domain/constants/canvas.constants";
import { CanvasGrid } from "./CanvasGrid";
import { CanvasLoading } from "./CanvasStates";
import { ColorPalette } from "./ColorPalette";
import { FloatingIsland, PaletteIsland } from "./FloatingToolbar";
import { useCanvasMode } from "./hooks/useCanvasMode";
import { ModeToggle } from "./ModeToggle";
import { SessionBanner } from "./SessionBanner";

export function CanvasContainer() {
  const {
    status: sessionStatus,
    isActive: isSessionActive,
    initializeFromChunk,
  } = useSessionState();
  const { pixels, isLoading, canvasBounds, loadChunksForViewport, injectPixel } = useCanvas({
    onSessionInitialized: initializeFromChunk,
  });
  const { placePixel, isCooldown } = usePixelPlacement();
  const { isAuthenticated } = useAuth();
  const [selectedColor, setSelectedColor] = useState<string>(PALETTE_COLORS[0]);
  const { mode, toggleMode, canToggle } = useCanvasMode({
    isAuthenticated,
    isSessionActive,
  });

  const handlePixelClick = useCallback(
    (x: number, y: number) => {
      if (mode !== "edit") return;
      if (canvasBounds && !canvasBounds.containsPixel(x, y)) return;
      void placePixel(x, y, selectedColor).then((pixel) => {
        if (pixel) {
          injectPixel(pixel.pixel);
        }
      });
    },
    [mode, selectedColor, placePixel, injectPixel, canvasBounds],
  );

  if (isLoading) return <CanvasLoading />;

  return (
    <div className="absolute inset-0">
      <SessionBanner status={sessionStatus} />

      <CanvasGrid
        pixels={pixels}
        selectedColor={selectedColor}
        mode={mode}
        isCooldown={isCooldown}
        canvasBounds={canvasBounds}
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
