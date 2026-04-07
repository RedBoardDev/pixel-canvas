import { ApiClient } from "@/lib/api/apiClient";
import { createAppConfig } from "@/lib/config/createAppConfig";
import { ApiPixelRepository } from "../../Infrastructure/ApiPixelRepository";
import { MockCanvasGateway } from "../../Infrastructure/MockCanvasGateway";
import { MockPixelRepository } from "../../Infrastructure/MockPixelRepository";
import { WebSocketCanvasGateway } from "../../Infrastructure/WebSocketCanvasGateway";
import { CanvasService } from "./Canvas.service";

export class CanvasServiceProvider {
  private static instance: CanvasService | null = null;

  static getService(): CanvasService {
    if (!CanvasServiceProvider.instance) {
      const config = createAppConfig();
      const pixelRepo = config.isMockMode
        ? new MockPixelRepository()
        : new ApiPixelRepository(new ApiClient(config.apiBaseUrl));
      const gateway = config.isMockMode
        ? new MockCanvasGateway()
        : new WebSocketCanvasGateway(config.wsBaseUrl);

      CanvasServiceProvider.instance = new CanvasService(
        pixelRepo,
        gateway,
        config.canvasCooldownMs,
      );
    }
    return CanvasServiceProvider.instance;
  }
}
