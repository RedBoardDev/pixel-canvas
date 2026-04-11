import type {
  CanvasPixelUpdateEvent,
  CanvasResetEvent,
  SessionStateEvent,
  SessionStatus,
} from "@/applications/Canvas/Domain/types/canvas.types";
import type {
  CanvasRealtimeEventDto,
  CanvasResetEventDto,
  PixelUpdatedEventDto,
  SessionStateEventDto,
} from "./pixel.mapper";
import { pixelMapper } from "./pixel.mapper";

export const realtimeMapper = {
  isPixelUpdatedEvent(event: CanvasRealtimeEventDto): event is PixelUpdatedEventDto {
    return event.type === "pixel.updated";
  },

  toPixelUpdatedEvent(dto: PixelUpdatedEventDto): CanvasPixelUpdateEvent {
    return {
      sessionId: dto.payload.sessionId,
      canvasVersion: dto.payload.canvasVersion,
      pixel: pixelMapper.toDomain(dto.payload.pixel),
    };
  },

  toCanvasResetEvent(dto: CanvasResetEventDto): CanvasResetEvent {
    return {
      sessionId: dto.payload.sessionId,
      canvasVersion: dto.payload.canvasVersion,
      resetAt: new Date(dto.payload.resetAt),
    };
  },

  isSessionStateEvent(event: CanvasRealtimeEventDto): event is SessionStateEventDto {
    return event.type === "session.state_changed";
  },

  toSessionStateEvent(dto: SessionStateEventDto): SessionStateEvent {
    return {
      sessionId: dto.payload.sessionId,
      canvasVersion: dto.payload.canvasVersion,
      status: dto.payload.status as SessionStatus,
      changedAt: new Date(dto.payload.changedAt),
    };
  },
};
