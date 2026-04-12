# Shared trust policy for all Lambda roles
data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# ── MAIN ──
resource "aws_iam_role" "lambda_main" {
  name               = "${local.prefix}-lambda-main-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "main_basic" {
  role       = aws_iam_role.lambda_main.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "main_invoke" {
  name = "invoke-child-lambdas"
  role = aws_iam_role.lambda_main.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "lambda:InvokeFunction"
      Resource = [
        aws_lambda_function.this["draw"].arn,
        aws_lambda_function.this["canvas"].arn,
        aws_lambda_function.this["session"].arn,
        aws_lambda_function.this["snapshot"].arn,
      ]
    }]
  })
}

# ── DRAW ──
resource "aws_iam_role" "lambda_draw" {
  name               = "${local.prefix}-lambda-draw-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "draw_basic" {
  role       = aws_iam_role.lambda_draw.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "draw_dynamodb" {
  name = "dynamodb-access"
  role = aws_iam_role.lambda_draw.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:UpdateItem",
      ]
      Resource = [
        aws_dynamodb_table.sessions.arn,
        aws_dynamodb_table.canvas_pixels.arn,
        aws_dynamodb_table.rate_limits.arn,
      ]
    }]
  })
}

# ── CANVAS ──
resource "aws_iam_role" "lambda_canvas" {
  name               = "${local.prefix}-lambda-canvas-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "canvas_basic" {
  role       = aws_iam_role.lambda_canvas.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "canvas_dynamodb" {
  name = "dynamodb-access"
  role = aws_iam_role.lambda_canvas.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["dynamodb:Scan", "dynamodb:GetItem", "dynamodb:Query"]
      Resource = [aws_dynamodb_table.sessions.arn]
    }]
  })
}

# ── SESSION ──
resource "aws_iam_role" "lambda_session" {
  name               = "${local.prefix}-lambda-session-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "session_basic" {
  role       = aws_iam_role.lambda_session.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "session_dynamodb" {
  name = "dynamodb-access"
  role = aws_iam_role.lambda_session.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:BatchWriteItem",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:UpdateItem",
      ]
      Resource = [
        aws_dynamodb_table.sessions.arn,
        aws_dynamodb_table.canvas_pixels.arn,
      ]
    }]
  })
}

# ── SNAPSHOT ──
resource "aws_iam_role" "lambda_snapshot" {
  name               = "${local.prefix}-lambda-snapshot-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "snapshot_basic" {
  role       = aws_iam_role.lambda_snapshot.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "snapshot_dynamodb_s3" {
  name = "dynamodb-s3-access"
  role = aws_iam_role.lambda_snapshot.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:UpdateItem",
        ]
        Resource = [
          aws_dynamodb_table.sessions.arn,
          aws_dynamodb_table.canvas_pixels.arn,
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject"]
        Resource = ["${aws_s3_bucket.snapshots.arn}/*"]
      },
    ]
  })
}

# ── WS (shared by ws-connect and ws-disconnect) ──
resource "aws_iam_role" "lambda_ws" {
  name               = "${local.prefix}-lambda-ws-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "ws_basic" {
  role       = aws_iam_role.lambda_ws.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "ws_dynamodb" {
  name = "dynamodb-access"
  role = aws_iam_role.lambda_ws.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["dynamodb:DeleteItem", "dynamodb:PutItem"]
      Resource = [aws_dynamodb_table.ws_connections.arn]
    }]
  })
}

# ── BROADCAST ──
resource "aws_iam_role" "lambda_broadcast" {
  name               = "${local.prefix}-lambda-broadcast-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "broadcast_basic" {
  role       = aws_iam_role.lambda_broadcast.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "broadcast_all" {
  name = "dynamodb-streams-apigw"
  role = aws_iam_role.lambda_broadcast.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:DeleteItem", "dynamodb:Query"]
        Resource = [aws_dynamodb_table.ws_connections.arn]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:DescribeStream",
          "dynamodb:GetRecords",
          "dynamodb:GetShardIterator",
          "dynamodb:ListStreams",
        ]
        Resource = [
          aws_dynamodb_table.sessions.stream_arn,
          aws_dynamodb_table.canvas_pixels.stream_arn,
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["execute-api:ManageConnections"]
        Resource = ["arn:aws:execute-api:${local.region}:${local.account_id}:${aws_apigatewayv2_api.ws.id}/*"]
      },
    ]
  })
}

# ── AMPLIFY COMPUTE (SSR) ──
resource "aws_iam_role" "amplify_compute" {
  name               = "${local.prefix}-amplify-compute-role"
  assume_role_policy = data.aws_iam_policy_document.amplify_assume_role.json
}

data "aws_iam_policy_document" "amplify_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["amplify.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy_attachment" "amplify_compute_basic" {
  role       = aws_iam_role.amplify_compute.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "amplify_compute_dynamodb" {
  name = "dynamodb-access"
  role = aws_iam_role.amplify_compute.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
      ]
      Resource = [
        aws_dynamodb_table.sessions.arn,
        aws_dynamodb_table.canvas_pixels.arn,
        aws_dynamodb_table.rate_limits.arn,
      ]
    }]
  })
}
