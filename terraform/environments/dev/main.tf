# Development environment configuration

terraform {
  required_version = ">= 1.0"

  # Development uses GCS backend for CI/CD compatibility
  backend "gcs" {
    # bucket will be specified via -backend-config during init
    prefix = "rakugaki-map/dev"
  }
}

# Variables
variable "project_id" {
  description = "GCP Project ID for development"
  type        = string
}

variable "region" {
  description = "Default region"
  type        = string
  default     = "asia-northeast1"
}

variable "billing_account" {
  description = "Billing account ID"
  type        = string
  default     = ""
}

variable "allowed_domains" {
  description = "List of allowed domains for API key restrictions"
  type        = list(string)
  default     = ["localhost:*", "localhost", "127.0.0.1:*", "127.0.0.1"]
}

# Use the main module
module "rakugaki_map" {
  source = "../../"

  project_id      = var.project_id
  region          = var.region
  billing_account = var.billing_account
  allowed_domains = var.allowed_domains
  environment     = "dev"
}

# Outputs
output "api_key" {
  value       = module.rakugaki_map.api_key
  sensitive   = true
  description = "Google Maps API Key"
}

output "project_id" {
  value       = module.rakugaki_map.project_id
  description = "GCP Project ID"
}

# WIF outputs (only available if WIF resources are created)
output "workload_identity_provider" {
  value       = try(module.rakugaki_map.workload_identity_provider, null)
  description = "Workload Identity Provider resource name"
}

output "service_account_email" {
  value       = try(module.rakugaki_map.service_account_email, null)
  description = "Service account email for GitHub Actions"
}
