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

# Use the main module
module "rakugaki_map" {
  source = "../../"

  project_id      = var.project_id
  region          = var.region
  billing_account = var.billing_account
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
