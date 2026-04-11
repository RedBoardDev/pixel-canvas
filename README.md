# Pixel Canvas

A collaborative pixel canvas (r/place-style) powered by a fully serverless AWS architecture. Users authenticate via Discord and place colored pixels on a shared canvas in real time through both a web interface and Discord bot commands.

## Features

- Real-time collaborative pixel canvas with WebSocket updates
- Discord OAuth2 authentication and bot slash commands
- Chunk-based canvas rendering (64x64) with viewport-aware loading
- Admin session management (start, pause, reset) and snapshot export
- Rate limiting per user (20 pixels/minute)
- 100% serverless — scales to zero, costs near-zero at idle

## Tech Stack

| Layer     | Technology                               |
| --------- | ---------------------------------------- |
| Frontend  | Next.js 16, React 19, TypeScript 5       |
| Styling   | Tailwind CSS 4                           |
| Backend   | Go 1.26, AWS Lambda (arm64/Graviton)     |
| Database  | DynamoDB (4 tables, PAY_PER_REQUEST)     |
| Real-time | WebSocket API Gateway + DynamoDB Streams |
| Auth      | Discord OAuth2                           |
| Storage   | S3 (canvas snapshots)                    |
| Hosting   | AWS Amplify (SSR)                        |
| IaC       | Terraform (~> 5.0 AWS provider)          |
| Linting   | Biome 2                                  |

## Documentation

| Document                            | Description                                        |
| ----------------------------------- | -------------------------------------------------- |
| [Architecture](ARCHITECTURE.md)     | System design, cloud services, data flow diagrams  |
| [Backend](back/README.md)           | Go Lambda functions, structure, build instructions  |
| [Frontend](frontend/README.md)      | Next.js app, DDD architecture, development setup   |
| [Infrastructure](infra/README.md)   | Terraform resources, deployment, costs              |

## Prerequisites

- [Go](https://go.dev/) >= 1.26
- [Node.js](https://nodejs.org/) >= 22 with [Corepack](https://nodejs.org/api/corepack.html) enabled (for Yarn 4)
- [Terraform](https://www.terraform.io/) >= 1.5
- [AWS CLI](https://aws.amazon.com/cli/) configured with appropriate credentials
- A [Discord application](https://discord.com/developers/applications) with bot and OAuth2 configured

## Quick Start

### 1. Configure secrets

```bash
cp infra/terraform.tfvars.example infra/terraform.tfvars
```

Edit `infra/terraform.tfvars` with your Discord credentials and AWS settings. See [infra/README.md](infra/README.md) for details on each variable.

### 2. Deploy infrastructure

```bash
make init       # Initialize Terraform
make deploy     # Build Lambdas + apply Terraform + trigger Amplify build
```

This cross-compiles all Go Lambdas for `linux/arm64`, provisions AWS resources, and triggers a frontend build on Amplify.

### 3. Register Discord bot commands

```bash
cd back/commands/register
DISCORD_APP_ID=<your-app-id> DISCORD_BOT_TOKEN=<your-bot-token> go run .
```

### 4. Finalize frontend

After the first Amplify deploy, copy the generated domain and update:

1. `frontend_domain` in `infra/terraform.tfvars`
2. OAuth2 redirect URLs in the [Discord Developer Portal](https://discord.com/developers/applications)

Then redeploy:

```bash
make deploy
```

### 5. Frontend local development (optional)

```bash
cd frontend
corepack enable && yarn install
cp .env.example .env.local
# Edit .env.local — leave NEXT_PUBLIC_API_BASE_URL empty for mock mode
yarn dev
```

See [frontend/README.md](frontend/README.md) for full development setup.

## Make Commands

| Command              | Description                                  |
| -------------------- | -------------------------------------------- |
| `make init`          | Initialize Terraform                         |
| `make plan`          | Preview infrastructure changes               |
| `make deploy`        | Deploy backend + trigger frontend rebuild    |
| `make deploy-backend`| Deploy only backend infrastructure           |
| `make deploy-frontend`| Trigger only Amplify frontend build         |
| `make build`         | Build Go Lambda binaries                     |
| `make outputs`       | Show deployment outputs (URLs, IDs)          |
| `make clean`         | Remove build artifacts                       |
| `make destroy`       | Tear down all AWS resources                  |

## Discord Bot Commands

| Command           | Description                                   | Access |
| ----------------- | --------------------------------------------- | ------ |
| `/draw x y color` | Place a pixel at (x, y) with the chosen color | All    |
| `/canvas`         | Show current canvas state and snapshot         | All    |
| `/session start`  | Start a new drawing session                   | Admin  |
| `/session pause`  | Pause the current session                     | Admin  |
| `/session reset`  | Reset all pixels in the current session        | Admin  |
| `/snapshot`       | Generate and post a canvas snapshot image      | Admin  |

16 colors available — see [back/README.md](back/README.md) for the full palette.

## License

This project is not yet licensed. A license will be added in a future release.
