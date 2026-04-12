# Backend

Go Lambda functions powering the Pixel Canvas backend. All functions run on `provided.al2023` (arm64/Graviton) and are deployed via [Terraform](../infra/README.md).

## Tech Stack

- **Go 1.26** compiled for `linux/arm64`
- **AWS Lambda** with custom runtime (`provided.al2023`)
- **AWS SDK v2** (DynamoDB, S3, Lambda invoke, API Gateway Management)
- **Ed25519** signature verification for Discord interactions

## Lambda Functions

| Function       | Trigger                   | Timeout | Memory | Description                          |
| -------------- | ------------------------- | ------- | ------ | ------------------------------------ |
| `main`         | HTTP API Gateway          | 10s     | 128 MB | Dispatcher: signature verification + async routing |
| `draw`         | Invoked by main           | 30s     | 256 MB | Place pixel, enforce rate limit (20/min) |
| `canvas`       | Invoked by main           | 30s     | 128 MB | Return session info and snapshot     |
| `session`      | Invoked by main           | 60s     | 256 MB | Admin: start/pause/reset sessions    |
| `snapshot`     | Invoked by main           | 120s    | 1024 MB| Render canvas PNG, upload to S3      |
| `ws-connect`   | WebSocket `$connect`      | 10s     | 128 MB | Store connection in DynamoDB         |
| `ws-disconnect`| WebSocket `$disconnect`   | 10s     | 128 MB | Remove connection from DynamoDB      |
| `broadcast`    | DynamoDB Streams           | 30s     | 256 MB | Fan-out events to all WebSocket clients |

## Shared Package

`back/shared/` contains types and helpers used across multiple Lambdas:

- **`discord.go`** — Discord interaction request/response types, member permission checking (`IsAdmin` checks for `ADMINISTRATOR` flag `0x8`)
- **`response.go`** — Helpers to build Discord responses: `Respond()`, `RespondText()`, `RespondEphemeral()`
- **`realtime.go`** — WebSocket event types (`PixelUpdatedEvent`, `CanvasResetEvent`, `SessionStateEvent`) and DynamoDB stream record parsing

## Building

Lambda binaries are built automatically by Terraform when Go source files change. To build manually:

```bash
# Build all Lambdas (cross-compile for linux/arm64)
make build

# Or build individual functions for local testing
cd back
GOOS=linux GOARCH=arm64 go build -o bootstrap ./lambdas/draw/
```

The build script (`infra/scripts/build-lambdas.sh`) compiles each Lambda directory into a `bootstrap` binary and packages it as a `.zip` archive in `infra/.build/`.

## Register Discord Commands

After the first deployment, register slash commands with Discord:

```bash
cd back/commands/register
DISCORD_APP_ID=<your-app-id> DISCORD_BOT_TOKEN=<your-bot-token> go run .
```

See the [root README](../README.md) for the full list of Discord bot commands.

## Color Palette

The draw Lambda supports 16 colors:

| Name        | Hex       | Name        | Hex       |
| ----------- | --------- | ----------- | --------- |
| Black       | `#000000` | Orange      | `#FF8C00` |
| White       | `#FFFFFF` | Violet      | `#8B00FF` |
| Red         | `#FF0000` | Pink        | `#FF69B4` |
| Green       | `#00FF00` | Brown       | `#8B4513` |
| Blue        | `#0000FF` | Light Grey  | `#D3D3D3` |
| Yellow      | `#FFFF00` | Grey        | `#808080` |
| Magenta     | `#FF00FF` | Light Green | `#90EE90` |
| Cyan        | `#00FFFF` | Dark Blue   | `#00008B` |

## Environment Variables

Each Lambda receives its environment variables from Terraform. See [infra/README.md](../infra/README.md) for the full list.

| Variable              | Used By                        | Description                      |
| --------------------- | ------------------------------ | -------------------------------- |
| `DISCORD_APP_ID`      | main                           | Discord application ID           |
| `DISCORD_PUBLIC_KEY`  | main                           | Ed25519 key for signature verify |
| `SESSIONS_TABLE`      | draw, canvas, session, snapshot| DynamoDB sessions table name     |
| `CANVAS_PIXELS_TABLE` | draw, session, snapshot        | DynamoDB pixels table name       |
| `RATE_LIMITS_TABLE`   | draw                           | DynamoDB rate limits table name  |
| `WS_CONNECTIONS_TABLE`| ws-connect, ws-disconnect, broadcast | DynamoDB connections table |
| `S3_BUCKET`           | snapshot                       | S3 bucket for PNG snapshots      |
| `LAMBDA_DRAW`         | main                           | Draw function name (for invoke)  |
| `LAMBDA_CANVAS`       | main                           | Canvas function name             |
| `LAMBDA_SESSION`      | main                           | Session function name            |
| `LAMBDA_SNAPSHOT`     | main                           | Snapshot function name           |
