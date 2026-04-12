# Build trigger — recompiles when Go source changes
resource "null_resource" "build_lambdas" {
  triggers = {
    source_hash = sha256(join("", [
      for f in fileset("${path.module}/../back/lambdas", "**/*.go") :
      filesha256("${path.module}/../back/lambdas/${f}")
    ]))
    shared_hash = sha256(join("", [
      for f in fileset("${path.module}/../back/shared", "*.go") :
      filesha256("${path.module}/../back/shared/${f}")
    ]))
    go_mod_hash = filesha256("${path.module}/../back/go.mod")
    go_sum_hash = filesha256("${path.module}/../back/go.sum")
  }

  provisioner "local-exec" {
    command = "bash ${path.module}/scripts/build-lambdas.sh"
  }
}

# Lambda configurations
locals {
  lambda_configs = {
    main = {
      timeout = 10
      memory  = 128
      env = {
        DISCORD_PUBLIC_KEY = var.discord_public_key
        LAMBDA_DRAW        = "${local.prefix}-draw"
        LAMBDA_CANVAS      = "${local.prefix}-canvas"
        LAMBDA_SESSION     = "${local.prefix}-session"
        LAMBDA_SNAPSHOT    = "${local.prefix}-snapshot"
      }
      role = aws_iam_role.lambda_main.arn
    }
    draw = {
      timeout = 30
      memory  = 256
      env = {
        DISCORD_APP_ID      = var.discord_app_id
        SESSIONS_TABLE      = var.sessions_table_name
        CANVAS_PIXELS_TABLE = var.canvas_pixels_table_name
        RATE_LIMITS_TABLE   = var.rate_limits_table_name
      }
      role = aws_iam_role.lambda_draw.arn
    }
    canvas = {
      timeout = 30
      memory  = 128
      env = {
        DISCORD_APP_ID = var.discord_app_id
        SESSIONS_TABLE = var.sessions_table_name
      }
      role = aws_iam_role.lambda_canvas.arn
    }
    session = {
      timeout = 60
      memory  = 256
      env = {
        DISCORD_APP_ID      = var.discord_app_id
        SESSIONS_TABLE      = var.sessions_table_name
        CANVAS_PIXELS_TABLE = var.canvas_pixels_table_name
      }
      role = aws_iam_role.lambda_session.arn
    }
    snapshot = {
      timeout = 120
      memory  = 1024
      env = {
        DISCORD_APP_ID      = var.discord_app_id
        S3_BUCKET           = aws_s3_bucket.snapshots.id
        SESSIONS_TABLE      = var.sessions_table_name
        CANVAS_PIXELS_TABLE = var.canvas_pixels_table_name
      }
      role = aws_iam_role.lambda_snapshot.arn
    }
    ws-connect = {
      timeout = 10
      memory  = 128
      env = {
        WS_CONNECTIONS_TABLE = var.ws_connections_table_name
      }
      role = aws_iam_role.lambda_ws.arn
    }
    ws-disconnect = {
      timeout = 10
      memory  = 128
      env = {
        WS_CONNECTIONS_TABLE = var.ws_connections_table_name
      }
      role = aws_iam_role.lambda_ws.arn
    }
    broadcast = {
      timeout = 30
      memory  = 256
      env = {
        WS_CONNECTIONS_TABLE = var.ws_connections_table_name
      }
      role = aws_iam_role.lambda_broadcast.arn
    }
  }
}

data "archive_file" "lambda" {
  for_each = local.lambda_configs

  type        = "zip"
  source_file = "${path.module}/.build/${each.key}/bootstrap"
  output_path = "${path.module}/.build/${each.key}/function.zip"

  depends_on = [null_resource.build_lambdas]
}

resource "aws_lambda_function" "this" {
  for_each = local.lambda_configs

  function_name    = "${local.prefix}-${each.key}"
  filename         = data.archive_file.lambda[each.key].output_path
  source_code_hash = data.archive_file.lambda[each.key].output_base64sha256
  handler          = "bootstrap"
  runtime          = "provided.al2023"
  architectures    = ["arm64"]
  role             = each.value.role
  timeout          = each.value.timeout
  memory_size      = each.value.memory

  environment {
    variables = each.value.env
  }

  depends_on = [
    aws_iam_role.lambda_main,
    aws_iam_role.lambda_draw,
    aws_iam_role.lambda_canvas,
    aws_iam_role.lambda_session,
    aws_iam_role.lambda_snapshot,
    aws_iam_role.lambda_ws,
    aws_iam_role.lambda_broadcast,
  ]
}
