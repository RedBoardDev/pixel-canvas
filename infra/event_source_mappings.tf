resource "aws_lambda_event_source_mapping" "broadcast_sessions" {
  event_source_arn                   = aws_dynamodb_table.sessions.stream_arn
  function_name                      = aws_lambda_function.this["broadcast"].arn
  starting_position                  = "LATEST"
  batch_size                         = 10
  maximum_batching_window_in_seconds = 1
}

resource "aws_lambda_event_source_mapping" "broadcast_canvas_pixels" {
  event_source_arn                   = aws_dynamodb_table.canvas_pixels.stream_arn
  function_name                      = aws_lambda_function.this["broadcast"].arn
  starting_position                  = "LATEST"
  batch_size                         = 10
  maximum_batching_window_in_seconds = 1
}
