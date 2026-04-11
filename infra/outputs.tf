output "discord_interactions_url" {
  description = "URL to set as Discord Interactions Endpoint"
  value       = "${aws_apigatewayv2_stage.http.invoke_url}/discord/interactions"
}

output "websocket_url" {
  description = "WebSocket URL for real-time updates"
  value       = aws_apigatewayv2_stage.ws.invoke_url
}

output "s3_bucket" {
  description = "S3 bucket name for snapshots"
  value       = aws_s3_bucket.snapshots.id
}

output "http_api_id" {
  value = aws_apigatewayv2_api.http.id
}

output "ws_api_id" {
  value = aws_apigatewayv2_api.ws.id
}

output "frontend_url" {
  description = "Frontend URL (Amplify)"
  value       = local.frontend_url
}

output "amplify_app_id" {
  description = "Amplify App ID"
  value       = aws_amplify_app.frontend.id
}
