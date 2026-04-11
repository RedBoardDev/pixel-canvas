# Frontend

Next.js 16 application for the Pixel Canvas web interface. Built with React 19, TypeScript 5, and Tailwind CSS 4, following Domain-Driven Design principles.

## Setup

```bash
corepack enable
yarn install
cp .env.example .env.local
```

Edit `.env.local` with your configuration. Leave `NEXT_PUBLIC_API_BASE_URL` empty to run in **mock mode** (no backend required).

```bash
yarn dev        # http://localhost:3000
```

## Commands

| Command        | Description                          |
| -------------- | ------------------------------------ |
| `yarn dev`     | Start Next.js dev server (port 3000) |
| `yarn build`   | Production build                     |
| `yarn lint`    | Run Biome linter                     |
| `yarn format`  | Auto-fix formatting with Biome       |
| `yarn check`   | Biome check + auto-fix              |
| `yarn ci`      | CI mode (fails on errors, no writes) |

## Architecture

The frontend follows **Domain-Driven Design** with a layered structure per bounded context:

```
src/applications/<Feature>/
├── Domain/           # Entities, value objects, repository interfaces (ports), errors
├── Application/      # Services (use cases), mappers (DTO ↔ domain)
├── Infrastructure/   # Port implementations (API clients, WebSocket, mocks)
├── Api/              # React hooks exposing the feature to UI
└── Ui/               # React components and feature-specific hooks
```

### Bounded Contexts

- **Auth** — Discord OAuth2 login, user session, token management
- **Canvas** — Pixel grid, chunk loading, real-time updates, color palette

### Key Patterns

| Pattern | Description |
| ------- | ----------- |
| **Ports & Adapters** | Repository interfaces in `Domain/`, real + mock implementations in `Infrastructure/` |
| **Service Providers** | Singletons in `Application/Services/` that wire dependencies |
| **Result monad** | `Result.ok()` / `Result.fail()` instead of throwing exceptions |
| **Chunk rendering** | Canvas split into 64x64 chunks, loaded based on viewport |
| **LRU cache** | Max 50 chunks kept in memory |
| **WebSocket** | Reconnection with exponential backoff for real-time pixel updates |
| **Mock mode** | When `NEXT_PUBLIC_API_BASE_URL` is unset, mock providers with seeded data are used |

## DDD Base Classes

Located in `src/domain-driven-design/`:

| Class | Purpose |
| ----- | ------- |
| `Entity<T>` | Identity-bearing domain objects |
| `UniqueEntityId` | Typed wrapper for entity IDs |
| `ValueObject<T>` | Immutable objects with equality-by-value |
| `Result<T>` | Success/failure monad — use instead of exceptions |
| `DomainError` | Base error, extended by `ValidationError`, `AuthorizationError`, `InfrastructureError`, `NetworkError`, `ServerError` |

## Environment Variables

All client-side variables are prefixed with `NEXT_PUBLIC_`.

| Variable | Side | Default | Description |
| -------- | ---- | ------- | ----------- |
| `NEXT_PUBLIC_API_BASE_URL` | Client | `/api` | API base URL. Unset = mock mode |
| `NEXT_PUBLIC_WS_BASE_URL` | Client | — | WebSocket API Gateway URL |
| `NEXT_PUBLIC_DISCORD_CLIENT_ID` | Client | — | Discord OAuth2 client ID |
| `NEXT_PUBLIC_DISCORD_REDIRECT_URI` | Client | — | OAuth2 callback URL |
| `NEXT_PUBLIC_CANVAS_COOLDOWN_MS` | Client | `3000` | Pixel placement cooldown (ms) |
| `CUSTOM_AWS_REGION` | Server | — | AWS region for DynamoDB access |
| `DISCORD_CLIENT_SECRET` | Server | — | Discord OAuth2 client secret |
| `DISCORD_REDIRECT_URI` | Server | — | OAuth2 callback (server-side) |
| `SESSIONS_TABLE` | Server | `sessions` | DynamoDB sessions table name |
| `CANVAS_PIXELS_TABLE` | Server | `canvas_pixels` | DynamoDB pixels table name |
| `RATE_LIMITS_TABLE` | Server | `rate_limits` | DynamoDB rate limits table name |

## Deployment

Deployed via **AWS Amplify Hosting** (SSR). Auto-deploys on push to `main`. See [infra/README.md](../infra/README.md) for deployment and Amplify environment variable configuration.
