import { AuthTokenProvider } from "@/applications/Auth/Infrastructure/AuthTokenProvider";
import { BrowserTokenStorage } from "@/applications/Auth/Infrastructure/BrowserTokenStorage";
import { ApiPixelRepository } from "@/applications/Canvas/Infrastructure/ApiPixelRepository";
import { NoopCanvasGateway } from "@/applications/Canvas/Infrastructure/NoopCanvasGateway";
import { WebSocketCanvasGateway } from "@/applications/Canvas/Infrastructure/WebSocketCanvasGateway";
import { ApiClient } from "@/lib/api/apiClient";
import { createAppConfig } from "@/lib/config/createAppConfig";
import { CanvasService } from "./Canvas.service";

let canvasServiceInstance: CanvasService | null = null;

export function getCanvasService(): CanvasService {
  if (!canvasServiceInstance) {
    const config = createAppConfig();
    const tokenProvider = new AuthTokenProvider(new BrowserTokenStorage());
    const pixelRepo = new ApiPixelRepository(new ApiClient(config.apiBaseUrl), tokenProvider);
    const gateway = config.wsBaseUrl
      ? new WebSocketCanvasGateway(config.wsBaseUrl)
      : new NoopCanvasGateway();

    canvasServiceInstance = new CanvasService(pixelRepo, gateway);
  }
  return canvasServiceInstance;
}
