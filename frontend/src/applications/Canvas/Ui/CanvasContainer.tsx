"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/applications/Auth/Api/useAuth";
import { createAppConfig } from "@/lib/config/createAppConfig";
import { useCanvas } from "../Api/useCanvas";
import { usePixelInfo } from "../Api/usePixelInfo";
import { usePixelPlacement } from "../Api/usePixelPlacement";
import { CanvasGrid } from "./CanvasGrid";
import { CanvasLoading } from "./CanvasStates";
import { COLORS, ColorPalette } from "./ColorPalette";
import { CooldownIndicator } from "./CooldownIndicator";
import { PixelInfo } from "./PixelInfo";
import { PlacementStatus } from "./PlacementStatus";
import { Toolbar } from "./Toolbar";

const { canvasCooldownMs } = createAppConfig();

export function CanvasContainer() {
  const { pixels, isLoading, loadChunksForViewport } = useCanvas();
  const placement = usePixelPlacement();
  const pixelInfo = usePixelInfo();
  const { isAuthenticated } = useAuth();
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  const handlePixelClick = useCallback(
    (x: number, y: number) => {
      if (!isAuthenticated) {
        pixelInfo.selectPixel(x, y);
        return;
      }
      const isSame =
        pixelInfo.selectedPixel?.coordinate.x === x && pixelInfo.selectedPixel?.coordinate.y === y;
      if (isSame) {
        placement.placePixel(x, y, selectedColor);
      } else {
        pixelInfo.selectPixel(x, y);
      }
    },
    [isAuthenticated, pixelInfo, selectedColor, placement],
  );

  if (isLoading) return <CanvasLoading />;

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex-1">
        <CanvasGrid
          pixels={pixels}
          selectedColor={selectedColor}
          onPixelClick={handlePixelClick}
          onViewportChange={loadChunksForViewport}
        />
      </div>
      <Toolbar>
        <ColorPalette
          selectedColor={selectedColor}
          onSelectColor={setSelectedColor}
          disabled={!isAuthenticated}
        />
        <div className="flex flex-wrap items-center gap-3">
          <PlacementStatus
            isPlacing={placement.isPlacing}
            error={placement.error}
            isAuthenticated={isAuthenticated}
          />
          <CooldownIndicator lastPlacedAt={placement.lastPlacedAt} cooldownMs={canvasCooldownMs} />
          <PixelInfo pixel={pixelInfo.selectedPixel} onClose={pixelInfo.clearSelection} />
        </div>
      </Toolbar>
    </div>
  );
}
