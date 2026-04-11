import { AuthTokenProvider } from "@/applications/Auth/Infrastructure/AuthTokenProvider";
import { BrowserTokenStorage } from "@/applications/Auth/Infrastructure/BrowserTokenStorage";
import { ApiPixelRepository } from "@/applications/Canvas/Infrastructure/ApiPixelRepository";
import { NoopCanvasGateway } from "@/applications/Canvas/Infrastructure/NoopCanvasGateway";
import { WebSocketCanvasGateway } from "@/applications/Canvas/Infrastructure/WebSocketCanvasGateway";
import { ApiClient } from "@/lib/api/apiClient";
import { createAppConfig } from "@/lib/config/createAppConfig";
import { CanvasService } from "./Canvas.service";

export class CanvasServiceProvider {
  private static instance: CanvasService | null = null;

  static getService(): CanvasService {
    if (!CanvasServiceProvider.instance) {
      const config = createAppConfig();
      const tokenProvider = new AuthTokenProvider(new BrowserTokenStorage());
      const pixelRepo = new ApiPixelRepository(new ApiClient(config.apiBaseUrl), tokenProvider);
      const gateway = config.wsBaseUrl
        ? new WebSocketCanvasGateway(config.wsBaseUrl)
        : new NoopCanvasGateway();

      CanvasServiceProvider.instance = new CanvasService(
        pixelRepo,
        gateway,
        config.canvasCooldownMs,
      );
    }
    return CanvasServiceProvider.instance;
  }
}
