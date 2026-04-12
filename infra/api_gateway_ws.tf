resource "aws_apigatewayv2_api" "ws" {
  name                       = "${local.prefix}-realtime-ws"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"
}

resource "aws_apigatewayv2_integration" "ws_connect" {
  api_id             = aws_apigatewayv2_api.ws.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.this["ws-connect"].invoke_arn
  integration_method = "POST"
}

resource "aws_apigatewayv2_integration" "ws_disconnect" {
  api_id             = aws_apigatewayv2_api.ws.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.this["ws-disconnect"].invoke_arn
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "ws_connect" {
  api_id    = aws_apigatewayv2_api.ws.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.ws_connect.id}"
}

resource "aws_apigatewayv2_route" "ws_disconnect" {
  api_id    = aws_apigatewayv2_api.ws.id
  route_key = "$disconnect"
  target    = "integrations/${aws_apigatewayv2_integration.ws_disconnect.id}"
}

resource "aws_apigatewayv2_stage" "ws" {
  api_id      = aws_apigatewayv2_api.ws.id
  name        = var.ws_stage
  auto_deploy = true
}

resource "aws_lambda_permission" "ws_connect" {
  statement_id  = "${local.prefix}-ws-connect-invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this["ws-connect"].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.ws.execution_arn}/*/$connect"
}

resource "aws_lambda_permission" "ws_disconnect" {
  statement_id  = "${local.prefix}-ws-disconnect-invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this["ws-disconnect"].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.ws.execution_arn}/*/$disconnect"
}
