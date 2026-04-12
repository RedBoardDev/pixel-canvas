# Architecture

This document describes the system architecture of Pixel Canvas — a real-time collaborative pixel canvas built on a fully serverless AWS stack.

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              PIXEL CANVAS ARCHITECTURE                          │
│                                                                                 │
│  ┌──────────┐     ┌──────────────────┐     ┌──────────────┐                    │
│  │ Discord  │────▶│ HTTP API Gateway │────▶│    Main      │                    │
│  │  Users   │     │ POST /discord/   │     │ (Dispatcher) │                    │
│  └──────────┘     │   interactions   │     └──────┬───────┘                    │
│                   └──────────────────┘            │                             │
│                          ┌────────────────────────┼────────────────┐            │
│                          ▼            ▼           ▼                ▼            │
│                     ┌────────┐  ┌─────────┐ ┌─────────┐    ┌──────────┐        │
│                     │  Draw  │  │ Canvas  │ │ Session │    │ Snapshot │        │
│                     └───┬────┘  └────┬────┘ └────┬────┘    └────┬─────┘        │
│                         │            │           │               │              │
│                         ▼            ▼           ▼               ▼              │
│                   ┌─────────────────────────────────────┐  ┌──────────┐        │
│                   │            DynamoDB                  │  │    S3    │        │
│                   │  sessions │ canvas_pixels │ rate_    │  │ snapshots│        │
│                   │           │               │ limits   │  └──────────┘        │
│                   └──────────────┬──────────────────────┘                       │
│                                  │                                              │
│                          DynamoDB Streams                                       │
│                                  │                                              │
│                                  ▼                                              │
│                          ┌───────────────┐                                      │
│                          │   Broadcast   │                                      │
│                          └───────┬───────┘                                      │
│                                  │                                              │
│                                  ▼                                              │
│  ┌──────────┐     ┌──────────────────────┐     ┌──────────────┐                │
│  │ Browser  │◀───▶│ WebSocket API Gateway│◀────│ws_connections│                │
│  │ Clients  │     └──────────────────────┘     │  (DynamoDB)  │                │
│  └────┬─────┘                                  └──────────────┘                │
│       │                                                                         │
│       ▼                                                                         │
│  ┌──────────────────┐                                                           │
│  │  AWS Amplify     │                                                           │
│  │  (Next.js SSR)   │                                                           │
│  └──────────────────┘                                                           │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Cloud Services

| Service              | Resource              | Purpose                                      |
| -------------------- | --------------------- | -------------------------------------------- |
| **Lambda**           | 8 functions (arm64)   | All compute — dispatcher, commands, WebSocket, broadcast |
| **DynamoDB**         | 4 tables              | Sessions, pixels, rate limits, WS connections |
| **API Gateway**      | HTTP API              | Discord interaction webhook endpoint          |
| **API Gateway**      | WebSocket API         | Real-time bidirectional client communication  |
| **S3**               | 1 bucket              | Canvas snapshot PNG storage                   |
| **Amplify Hosting**  | 1 app (WEB_COMPUTE)   | Next.js SSR frontend                          |
| **DynamoDB Streams** | 2 event source mappings| Trigger broadcast on data changes             |
| **IAM**              | 8 roles               | Least-privilege per Lambda + Amplify compute  |

## Data Flow

### Pixel Placement (via Discord)

```
Discord User
    │
    ▼  POST /discord/interactions
HTTP API Gateway
    │
    ▼  Verify Ed25519 signature
Main Lambda (dispatcher)
    │
    ▼  Async invoke
Draw Lambda
    │
    ├──▶ Read session from DynamoDB (sessions table)
    ├──▶ Check rate limit (rate_limits table, 20 px/min TTL-based)
    ├──▶ Write pixel (canvas_pixels table: PK=SESSION#{id}, SK=PIXEL#{x}#{y})
    │
    ▼  DynamoDB Stream (NEW_IMAGE)
Broadcast Lambda
    │
    ├──▶ Query all connections (ws_connections table)
    │
    ▼  POST to each connection
WebSocket API Gateway ──▶ All connected browser clients
```

### Pixel Placement (via Web UI)

```
Browser Client
    │
    ▼  POST /api/canvas/pixel
Next.js API Route (Amplify SSR)
    │
    ▼  Direct DynamoDB write (AWS SDK)
canvas_pixels table
    │
    ▼  DynamoDB Stream (NEW_IMAGE)
Broadcast Lambda
    │
    ▼  Fan-out to WebSocket clients
All connected browsers receive update
```

### Real-Time Event Broadcasting

```
DynamoDB Tables (sessions, canvas_pixels)
    │
    │  Stream: NEW_AND_OLD_IMAGES (sessions)
    │  Stream: NEW_IMAGE (canvas_pixels)
    │
    ▼
Broadcast Lambda
    │
    ├── Detect event type:
    │   ├── Pixel INSERT/MODIFY  ──▶  { type: "pixel.updated", payload: { x, y, color, userId, ... } }
    │   ├── Canvas version change ──▶  { type: "canvas.reset",  payload: { sessionId, canvasVersion } }
    │   └── Status change         ──▶  { type: "session.state_changed", payload: { status, ... } }
    │
    ├── Query ws_connections (PK=ROOM#public)
    │
    ▼  For each connection:
    POST via API Gateway Management API
    │
    ├── Success ──▶ Message delivered
    └── 410 Gone ──▶ Delete stale connection from ws_connections
```

### WebSocket Connection Lifecycle

```
Browser connects
    │
    ▼  $connect route
ws-connect Lambda
    │
    ▼  PUT { PK: "ROOM#public", SK: "CONNECTION#{id}", domain, stage, connected_at }
ws_connections table

    ... time passes, client receives events ...

Browser disconnects (or connection drops)
    │
    ▼  $disconnect route
ws-disconnect Lambda
    │
    ▼  DELETE { PK: "ROOM#public", SK: "CONNECTION#{id}" }
ws_connections table
```

### Canvas Snapshot Generation

```
Admin runs /snapshot
    │
    ▼
Snapshot Lambda (1024 MB, 120s timeout)
    │
    ├──▶ Query all pixels for active session
    ├──▶ Render PNG (max 800x800, auto-scaled)
    ├──▶ Upload to S3: snapshots/{sessionId}/{timestamp}.png
    ├──▶ Generate presigned URL (24h expiry)
    ├──▶ Update session metadata (last_snapshot_url, last_snapshot_at, ...)
    │
    ▼
Discord response with embedded image (or link for canvases > 800px)
```

### Authentication Flow

```
Browser ──▶ /auth/login ──▶ Discord OAuth2 authorize URL
    │
    ▼  User approves
Discord redirects to /auth/callback?code=...
    │
    ▼  Server-side
/api/auth/callback route (Amplify SSR)
    │
    ├──▶ Exchange code for access token (Discord API)
    ├──▶ Fetch user info (Discord API)
    │
    ▼
Browser receives user session
```

## DynamoDB Schema

### sessions

| Key | Attribute | Type | Description |
| --- | --------- | ---- | ----------- |
| PK  | `SESSION#{sessionId}` | S | Partition key |
| SK  | `METADATA` | S | Sort key (single item per session) |
|     | `status` | S | `active`, `paused`, or `ended` |
|     | `canvas_size` | S | `"WxH"` or `"Infinite"` |
|     | `canvas_width` / `canvas_height` | N | Dimensions (optional for infinite) |
|     | `canvas_version` | N | Incremented on reset |
|     | `created_by` | S | Discord user ID |
|     | `last_snapshot_url` | S | Presigned S3 URL |

Stream: `NEW_AND_OLD_IMAGES` → broadcast Lambda

### canvas_pixels

| Key | Attribute | Type | Description |
| --- | --------- | ---- | ----------- |
| PK  | `SESSION#{sessionId}` | S | Partition key |
| SK  | `PIXEL#{x}#{y}` | S | Sort key |
|     | `color` | S | Hex code (e.g., `#FF4500`) |
|     | `user_id` | S | Discord user ID |
|     | `username` | S | Discord username |
|     | `updated_at` | S | RFC3339 timestamp |

Stream: `NEW_IMAGE` → broadcast Lambda

### rate_limits

| Key | Attribute | Type | Description |
| --- | --------- | ---- | ----------- |
| PK  | `USER#{userId}` | S | Partition key |
| SK  | `SESSION#{sessionId}` | S | Sort key |
|     | `pixel_count` | N | Pixels placed in current window |
|     | `window_start` | S | RFC3339 (minute boundary) |
|     | `TTL` | N | Unix timestamp (auto-expire) |

TTL-based: entries expire after 1 minute.

### ws_connections

| Key | Attribute | Type | Description |
| --- | --------- | ---- | ----------- |
| PK  | `ROOM#public` | S | Partition key (single room) |
| SK  | `CONNECTION#{connectionId}` | S | Sort key |
|     | `connection_id` | S | WebSocket connection ID |
|     | `domain_name` | S | API Gateway domain |
|     | `stage` | S | API Gateway stage |
|     | `connected_at` | S | RFC3339 timestamp |

## WebSocket Event Format

All events sent to connected clients follow this structure:

```json
{
  "type": "pixel.updated" | "canvas.reset" | "session.state_changed",
  "payload": { ... }
}
```

### pixel.updated

```json
{
  "type": "pixel.updated",
  "payload": {
    "sessionId": "session-1712234567890",
    "canvasVersion": 1,
    "pixel": {
      "x": 10,
      "y": 20,
      "color": "#FF4500",
      "userId": "123456789",
      "username": "artist",
      "updatedAt": "2025-04-10T14:30:00Z"
    }
  }
}
```

### canvas.reset

```json
{
  "type": "canvas.reset",
  "payload": {
    "sessionId": "session-1712234567890",
    "canvasVersion": 2,
    "resetAt": "2025-04-10T15:00:00Z"
  }
}
```

### session.state_changed

```json
{
  "type": "session.state_changed",
  "payload": {
    "sessionId": "session-1712234567890",
    "status": "paused",
    "changedAt": "2025-04-10T15:30:00Z"
  }
}
```

## IAM Permissions Matrix

Each Lambda function has a dedicated IAM role with least-privilege permissions:

| Lambda       | sessions | canvas_pixels | rate_limits | ws_connections | S3  | Lambda Invoke | WS Manage |
| ------------ | -------- | ------------- | ----------- | -------------- | --- | ------------- | --------- |
| main         | —        | —             | —           | —              | —   | draw, canvas, session, snapshot | — |
| draw         | R        | RW            | RW          | —              | —   | —             | — |
| canvas       | R        | —             | —           | —              | —   | —             | — |
| session      | RW       | RW            | —           | —              | —   | —             | — |
| snapshot     | R        | R             | —           | —              | RW  | —             | — |
| ws-connect   | —        | —             | —           | W              | —   | —             | — |
| ws-disconnect| —        | —             | —           | D              | —   | —             | — |
| broadcast    | —        | —             | —           | RD             | —   | —             | Yes |

**Legend:** R = Read, W = Write, D = Delete, RW = Read/Write, RD = Read/Delete
