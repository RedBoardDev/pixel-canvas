resource "aws_amplify_app" "frontend" {
  name       = var.project_name
  repository = var.github_repository_url
  platform   = "WEB_COMPUTE"

  oauth_token          = var.github_access_token
  iam_service_role_arn = aws_iam_role.amplify_compute.arn
  compute_role_arn     = aws_iam_role.amplify_compute.arn

  build_spec = <<-YAML
    version: 1
    applications:
      - frontend:
          phases:
            preBuild:
              commands:
                - corepack enable
                - yarn install --immutable
            build:
              commands:
                - env | grep -e DISCORD_CLIENT_SECRET -e DISCORD_REDIRECT_URI -e SESSIONS_TABLE -e CANVAS_PIXELS_TABLE -e RATE_LIMITS_TABLE -e CUSTOM_AWS_REGION >> .env.production
                - env | grep -e NEXT_PUBLIC_ >> .env.production
                - yarn build
          artifacts:
            baseDirectory: .next
            files:
              - '**/*'
          cache:
            paths:
              - node_modules/**/*
              - .next/cache/**/*
        buildPath: /
        appRoot: frontend
  YAML

  environment_variables = {
    AMPLIFY_MONOREPO_APP_ROOT = "frontend"
  }
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.frontend.id
  branch_name = "main"

  framework = "Next.js - SSR"
  stage     = "PRODUCTION"

  enable_auto_build = true

  environment_variables = {
    NEXT_PUBLIC_API_BASE_URL         = "/api"
    NEXT_PUBLIC_WS_BASE_URL          = aws_apigatewayv2_stage.ws.invoke_url
    NEXT_PUBLIC_DISCORD_CLIENT_ID    = var.discord_client_id
    NEXT_PUBLIC_DISCORD_REDIRECT_URI = "https://${var.frontend_domain}/auth/callback"
    NEXT_PUBLIC_CANVAS_COOLDOWN_MS   = "3000"

    CUSTOM_AWS_REGION     = var.aws_region
    DISCORD_CLIENT_SECRET = var.discord_client_secret
    DISCORD_REDIRECT_URI  = "https://${var.frontend_domain}/auth/callback"

    SESSIONS_TABLE      = var.sessions_table_name
    CANVAS_PIXELS_TABLE = var.canvas_pixels_table_name
    RATE_LIMITS_TABLE   = var.rate_limits_table_name
  }
}

locals {
  amplify_default_domain = "main.${aws_amplify_app.frontend.default_domain}"
  frontend_url           = var.frontend_domain != "" ? "https://${var.frontend_domain}" : "https://${local.amplify_default_domain}"
}
