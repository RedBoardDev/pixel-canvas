variable "aws_region" {
  type    = string
  default = "eu-west-1"
}

variable "project_name" {
  type    = string
  default = "pixel-canvas"
}

variable "discord_app_id" {
  type      = string
  sensitive = true
}

variable "discord_public_key" {
  type      = string
  sensitive = true
}

variable "discord_bot_token" {
  type      = string
  sensitive = true
  default   = ""
}

variable "discord_client_id" {
  type = string
}

variable "discord_client_secret" {
  type      = string
  sensitive = true
}

variable "frontend_domain" {
  type        = string
  description = "Public domain for the frontend (used for Discord redirect URI). Set after first Amplify deploy."
  default     = ""
}

variable "github_access_token" {
  type        = string
  sensitive   = true
  description = "GitHub personal access token for Amplify to access the repository"
}

variable "github_repository_url" {
  type        = string
  description = "GitHub repository URL for Amplify"
  default     = "https://github.com/RedBoardDev/pixel-canvas"
}

variable "http_stage" {
  type    = string
  default = "prod"
}

variable "ws_stage" {
  type    = string
  default = "prod"
}

variable "sessions_table_name" {
  type    = string
  default = "sessions"
}

variable "canvas_pixels_table_name" {
  type    = string
  default = "canvas_pixels"
}

variable "rate_limits_table_name" {
  type    = string
  default = "rate_limits"
}

variable "ws_connections_table_name" {
  type    = string
  default = "ws_connections"
}
