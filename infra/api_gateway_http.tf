resource "aws_apigatewayv2_api" "http" {
  name          = "${local.prefix}-discord-http"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "main" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.this["main"].invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "discord_interactions" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /discord/interactions"
  target    = "integrations/${aws_apigatewayv2_integration.main.id}"
}

resource "aws_apigatewayv2_stage" "http" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = var.http_stage
  auto_deploy = true
}

resource "aws_lambda_permission" "http_api_main" {
  statement_id  = "${local.prefix}-http-invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this["main"].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/POST/discord/interactions"
}
