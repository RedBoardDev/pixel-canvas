# Pixel Canvas

A collaborative pixel canvas (r/place-style) powered by a 100% serverless AWS architecture. Users authenticate via Discord and place colored pixels on a shared canvas in real time through both a web interface and Discord bot commands.

## Features

- Real-time collaborative pixel canvas with WebSocket updates
- Discord OAuth2 authentication
- Discord bot with slash commands (`/draw`, `/canvas`, `/session`, `/snapshot`)
- Chunk-based canvas rendering (64x64) with viewport-aware loading
- Admin session management (start, pause, reset)
- Canvas snapshot export to S3
- Rate limiting per user
- Fully serverless -- scales to zero, costs near-zero at idle

## Architecture

```
Discord ──> HTTP API Gateway ──> Lambda (dispatcher) ──> Task Lambdas ──> DynamoDB
                                                                            |
                                                                      DynamoDB Streams
                                                                            |
                                                                      Broadcast Lambda
                                                                            |
Frontend (Next.js / Amplify) <── WebSocket API Gateway <────────────────────┘
```

The dispatcher Lambda verifies Discord interaction signatures, then invokes the appropriate task Lambda asynchronously. DynamoDB Streams trigger a broadcast Lambda that pushes updates to all connected WebSocket clients.

## Tech Stack

| Layer          | Technology                                  |
| -------------- | ------------------------------------------- |
| Frontend       | Next.js 16, React 19, TypeScript 5          |
| Styling        | Tailwind CSS 4                              |
| Backend        | Go 1.26, AWS Lambda (arm64/Graviton)        |
| Database       | DynamoDB (4 tables, PAY_PER_REQUEST)         |
| Real-time      | WebSocket API Gateway + DynamoDB Streams    |
| Auth           | Discord OAuth2                              |
| Storage        | S3 (canvas snapshots)                       |
| Hosting        | AWS Amplify (SSR)                           |
| IaC            | Terraform (~> 5.0 AWS provider)             |
| Linting        | Biome 2                                     |

## Prerequisites

- [Go](https://go.dev/) >= 1.26
- [Node.js](https://nodejs.org/) >= 20 with [Corepack](https://nodejs.org/api/corepack.html) enabled (for Yarn 4)
- [Terraform](https://www.terraform.io/) >= 1.5
- [AWS CLI](https://aws.amazon.com/cli/) configured with appropriate credentials
- A [Discord application](https://discord.com/developers/applications) with bot and OAuth2 configured

## Quick Start

```bash
# Clone the repository
git clone https://github.com/RedBoardDev/pixel-canvas.git
cd pixel-canvas

# Configure secrets
cp infra/terraform.tfvars.example infra/terraform.tfvars
# Edit infra/terraform.tfvars with your Discord credentials and AWS settings

# Deploy infrastructure
make init
make deploy
```

This builds all Go Lambdas (cross-compiled for `linux/arm64`), provisions AWS resources via Terraform, and triggers an Amplify build for the frontend.

### Register Discord Bot Commands

After the first deploy, register slash commands with Discord:

```bash
cd back/commands/register
DISCORD_APP_ID=<your-app-id> DISCORD_BOT_TOKEN=<your-bot-token> go run .
```

## Project Structure

```
pixel-canvas/
├── back/
│   ├── lambdas/
│   │   ├── main/           # Dispatcher (signature verification + routing)
│   │   ├── draw/           # /draw command handler
│   │   ├── canvas/         # /canvas command handler
│   │   ├── session/        # /session command handler (admin)
│   │   ├── snapshot/       # /snapshot command handler (admin)
│   │   ├── broadcast/      # DynamoDB Streams → WebSocket fan-out
│   │   ├── ws-connect/     # WebSocket $connect route
│   │   └── ws-disconnect/  # WebSocket $disconnect route
│   ├── commands/register/  # One-off script to register Discord slash commands
│   └── shared/             # Shared Go types and helpers
├── frontend/
│   └── src/
│       ├── applications/
│       │   ├── Auth/       # Discord OAuth2 bounded context
│       │   └── Canvas/     # Pixel canvas bounded context
│       ├── domain-driven-design/  # DDD primitives (Entity, ValueObject, Result)
│       ├── lib/            # Shared utilities (API client, config, DynamoDB)
│       └── components/     # Shared UI components
├── infra/                  # Terraform configuration
│   ├── main.tf
│   ├── lambda.tf           # 8 Lambda functions
│   ├── dynamodb.tf         # 4 DynamoDB tables
│   ├── api_gateway_http.tf # HTTP API Gateway (Discord interactions)
│   ├── api_gateway_ws.tf   # WebSocket API Gateway (real-time)
│   ├── amplify.tf          # Amplify Hosting (Next.js SSR)
│   ├── s3.tf               # Snapshot bucket
│   ├── iam.tf              # 7 least-privilege IAM roles
│   └── scripts/            # Build scripts
└── Makefile
```

## Infrastructure

All infrastructure is defined in Terraform under `infra/`.

```bash
make init      # terraform init
make plan      # Preview changes
make deploy    # Apply backend infrastructure
make destroy   # Tear down all resources
make outputs   # Show deployment outputs (URLs, IDs)
```

### Backend (Terraform)

- **8 Lambda functions** -- Go binaries on `provided.al2023` (arm64)
- **4 DynamoDB tables** -- `sessions`, `canvas_pixels`, `rate_limits`, `ws_connections`
- **2 API Gateways** -- HTTP (Discord webhook) + WebSocket (real-time)
- **1 S3 bucket** -- Canvas snapshots
- **7 IAM roles** -- Least-privilege per Lambda function
- **2 DynamoDB Stream mappings** -- `sessions` and `canvas_pixels` to broadcast Lambda

Terraform automatically rebuilds Lambda binaries when Go source files change.

### Frontend (AWS Amplify)

The frontend is deployed via AWS Amplify Hosting (SSR / `WEB_COMPUTE`), configured through the AWS Console. Amplify auto-deploys on every push to the connected branch.

#### Setup

1. Open [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click **Create new app** > **GitHub** > Authorize and select `RedBoardDev/pixel-canvas`
3. Select the branch (`main`)
4. **Monorepo**: check "My app is a monorepo", set root to `frontend`
5. **Build settings**: Amplify auto-detects Next.js -- keep defaults
6. **Environment variables** (App settings > Environment variables):

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_BASE_URL` | `/api` |
| `NEXT_PUBLIC_DISCORD_CLIENT_ID` | Your Discord client ID |
| `NEXT_PUBLIC_DISCORD_REDIRECT_URI` | `https://<amplify-domain>/auth/callback` |
| `NEXT_PUBLIC_CANVAS_COOLDOWN_MS` | `3000` |
| `NEXT_PUBLIC_WS_BASE_URL` | WebSocket URL from `make outputs` |
| `CUSTOM_AWS_REGION` | Your AWS region (e.g. `eu-west-1`) |
| `DISCORD_CLIENT_SECRET` | Your Discord client secret |
| `DISCORD_REDIRECT_URI` | `https://<amplify-domain>/auth/callback` |
| `SESSIONS_TABLE` | `sessions` |
| `CANVAS_PIXELS_TABLE` | `canvas_pixels` |
| `RATE_LIMITS_TABLE` | `rate_limits` |

7. Deploy, then update `frontend_domain` in `terraform.tfvars` and the Discord Developer Portal OAuth2 redirects

## Development

### Frontend

```bash
cd frontend
corepack enable
yarn install
cp .env.example .env.local
# Edit .env.local with your API URLs and Discord client ID
yarn dev        # http://localhost:3000
```

| Command        | Description                          |
| -------------- | ------------------------------------ |
| `yarn dev`     | Start Next.js dev server             |
| `yarn build`   | Production build                     |
| `yarn lint`    | Run Biome linter                     |
| `yarn format`  | Auto-fix formatting                  |
| `yarn ci`      | CI mode (fails on errors, no writes) |

The frontend uses Domain-Driven Design with Ports & Adapters. Each bounded context (`Auth`, `Canvas`) has its own `Domain/`, `Application/`, `Infrastructure/`, `Api/`, and `Ui/` layers.

### Backend

Lambda functions are built via the Terraform build step. To test individually:

```bash
cd back
go build ./lambdas/draw/
go build ./lambdas/session/
# etc.
```

## Discord Bot Commands

| Command               | Description                                     | Access |
| --------------------- | ----------------------------------------------- | ------ |
| `/draw x y color`     | Place a pixel at (x, y) with the chosen color   | All    |
| `/canvas`             | Show current canvas state (pixel count, session) | All    |
| `/session start`      | Start a new drawing session                     | Admin  |
| `/session pause`      | Pause the current session                       | Admin  |
| `/session reset`      | Reset all pixels in the current session         | Admin  |
| `/snapshot`           | Generate and post a canvas snapshot image       | Admin  |

Available colors: Black, White, Red, Green, Blue, Yellow, Magenta, Cyan, Orange, Violet.

## Environment Variables

### Terraform (`infra/terraform.tfvars`)

| Variable                | Description                          | Required |
| ----------------------- | ------------------------------------ | -------- |
| `aws_region`            | AWS deployment region                | Yes      |
| `discord_app_id`        | Discord application ID               | Yes      |
| `discord_public_key`    | Discord interaction verification key | Yes      |
| `discord_bot_token`     | Discord bot token                    | Yes      |
| `discord_client_id`     | Discord OAuth2 client ID             | Yes      |
| `discord_client_secret` | Discord OAuth2 client secret         | Yes      |
| `frontend_domain`       | Public URL of the frontend           | Yes      |
| `github_repository_url` | Repo URL for Amplify auto-deploy     | No       |
| `github_access_token`   | GitHub PAT for Amplify               | No       |

### Frontend (`frontend/.env.local`)

| Variable                          | Description                      | Required |
| --------------------------------- | -------------------------------- | -------- |
| `NEXT_PUBLIC_API_BASE_URL`        | API base URL (default: `/api`)   | No       |
| `NEXT_PUBLIC_DISCORD_CLIENT_ID`   | Discord OAuth2 client ID         | Yes      |
| `NEXT_PUBLIC_DISCORD_REDIRECT_URI`| OAuth2 callback URL              | Yes      |
| `NEXT_PUBLIC_CANVAS_COOLDOWN_MS`  | Pixel placement cooldown (ms)    | No       |
| `AWS_REGION`                      | AWS region (server-side only)    | Yes      |
| `DISCORD_CLIENT_SECRET`           | Discord secret (server-side only)| Yes      |
| `DISCORD_REDIRECT_URI`            | OAuth2 callback (server-side)    | Yes      |

## Estimated Costs

All resources use on-demand/pay-per-request pricing. At low to moderate traffic:

| Resource              | Estimated Monthly Cost |
| --------------------- | ---------------------- |
| Lambda (8 functions)  | $0.00 - $1.00         |
| DynamoDB (4 tables)   | $0.00 - $2.00         |
| API Gateway (HTTP+WS) | $0.00 - $1.00         |
| S3 (snapshots)        | < $0.01               |
| Amplify Hosting       | $0.00 - $2.00         |
| **Total**             | **~$1 - $5/month**    |

Most resources fall within the AWS Free Tier for the first 12 months.

## License

This project is not yet licensed. A license will be added in a future release.
