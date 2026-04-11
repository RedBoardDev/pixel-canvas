# Infrastructure

Terraform configuration for provisioning all AWS resources required by Pixel Canvas. Everything is defined as Infrastructure as Code — no manual AWS Console setup needed (except Amplify environment variables).

## Tech Stack

- **Terraform** >= 1.5.0
- **AWS Provider** >= 5.0, < 6.0
- **Archive Provider** >= 2.0 (Lambda zip packaging)

## Setup

### 1. Initialize Terraform

```bash
make init
```

### 2. Configure variables

```bash
cp infra/terraform.tfvars.example infra/terraform.tfvars
```

Edit `infra/terraform.tfvars`:

| Variable                 | Description                                | Required |
| ------------------------ | ------------------------------------------ | -------- |
| `aws_region`             | AWS deployment region (e.g., `eu-west-3`)  | Yes      |
| `project_name`           | Resource name prefix                       | Yes      |
| `discord_app_id`         | Discord application ID                     | Yes      |
| `discord_public_key`     | Ed25519 key for interaction verification   | Yes      |
| `discord_bot_token`      | Discord bot token                          | Yes      |
| `discord_client_id`      | Discord OAuth2 client ID                   | Yes      |
| `discord_client_secret`  | Discord OAuth2 client secret               | Yes      |
| `github_access_token`    | GitHub PAT for Amplify auto-deploy         | No       |
| `github_repository_url`  | GitHub repo URL for Amplify                | No       |
| `frontend_domain`        | Amplify domain (set after first deploy)    | Yes      |
| `http_stage`             | HTTP API Gateway stage                     | No       |
| `ws_stage`               | WebSocket API Gateway stage                | No       |

### 3. Deploy

```bash
make plan     # Preview changes
make deploy   # Apply infrastructure + trigger Amplify build
```

### 4. Post-deploy

After the first deploy:

1. Copy the Amplify domain from `make outputs`
2. Set `frontend_domain` in `terraform.tfvars`
3. Configure Discord OAuth2 redirect URLs in the Developer Portal
4. Run `make deploy` again

## AWS Resources

### Lambda Functions (8)

All functions use `provided.al2023` runtime with `arm64` architecture. Binaries are cross-compiled from Go source by `infra/scripts/build-lambdas.sh`.

| Function       | Memory | Timeout | Trigger                   |
| -------------- | ------ | ------- | ------------------------- |
| main           | 128 MB | 10s     | HTTP API Gateway          |
| draw           | 256 MB | 30s     | Invoked by main           |
| canvas         | 128 MB | 30s     | Invoked by main           |
| session        | 256 MB | 60s     | Invoked by main           |
| snapshot       | 1024 MB| 120s    | Invoked by main           |
| ws-connect     | 128 MB | 10s     | WebSocket `$connect`      |
| ws-disconnect  | 128 MB | 10s     | WebSocket `$disconnect`   |
| broadcast      | 256 MB | 30s     | DynamoDB Streams           |

### DynamoDB Tables (4)

All tables use `PAY_PER_REQUEST` billing mode.

| Table            | PK                     | SK                      | Streams            | TTL     |
| ---------------- | ---------------------- | ----------------------- | ------------------ | ------- |
| sessions         | `SESSION#{sessionId}`  | `METADATA`              | NEW_AND_OLD_IMAGES | `TTL`   |
| canvas_pixels    | `SESSION#{sessionId}`  | `PIXEL#{x}#{y}`         | NEW_IMAGE          | —       |
| rate_limits      | `USER#{userId}`        | `SESSION#{sessionId}`   | —                  | `TTL`   |
| ws_connections   | `ROOM#public`          | `CONNECTION#{connId}`   | —                  | —       |

### API Gateways (2)

- **HTTP API** — `POST /discord/interactions` → main Lambda
- **WebSocket API** — `$connect` → ws-connect, `$disconnect` → ws-disconnect

### S3 (1 bucket)

- Private bucket (all public access blocked)
- Stores canvas snapshot PNGs
- Presigned URLs with 24-hour expiry

### Amplify Hosting (1 app)

- Platform: `WEB_COMPUTE` (Next.js SSR)
- Auto-deploy from GitHub `main` branch
- Build spec: [`amplify.yml`](../amplify.yml)

### IAM Roles (8)

Each Lambda and Amplify compute have a dedicated least-privilege role. See [ARCHITECTURE.md](../ARCHITECTURE.md) for the full permissions matrix.

## Terraform Files

| File                   | Resources                                   |
| ---------------------- | ------------------------------------------- |
| `main.tf`              | Provider config, variables, outputs         |
| `lambda.tf`            | Lambda functions, build triggers, archives  |
| `dynamodb.tf`          | DynamoDB tables, stream event mappings      |
| `api_gateway_http.tf`  | HTTP API Gateway, routes, integration       |
| `api_gateway_ws.tf`    | WebSocket API Gateway, routes, integrations |
| `amplify.tf`           | Amplify app, branch, environment variables  |
| `s3.tf`                | Snapshot S3 bucket, public access block     |
| `iam.tf`               | IAM roles and policies for all services     |

## Commands

| Command             | Description                              |
| ------------------- | ---------------------------------------- |
| `make init`         | `terraform init -upgrade`                |
| `make plan`         | Build Lambdas + `terraform plan`         |
| `make deploy`       | Build + apply + trigger Amplify build    |
| `make deploy-backend` | Build + apply (skip Amplify)           |
| `make deploy-frontend`| Trigger Amplify build only             |
| `make outputs`      | Show Terraform outputs                   |
| `make build`        | Build Go Lambda binaries only            |
| `make clean`        | Remove `infra/.build/` artifacts         |
| `make destroy`      | Destroy all AWS resources                |

## Build Pipeline

Terraform watches Go source files in `back/lambdas/` and `back/shared/`. When changes are detected:

```
Go source files changed
    │
    ▼  null_resource trigger
infra/scripts/build-lambdas.sh
    │
    ▼  For each Lambda directory:
    GOOS=linux GOARCH=arm64 go build -o bootstrap
    zip bootstrap → infra/.build/{name}.zip
    │
    ▼  archive_file data source
Lambda function updated via Terraform
```
