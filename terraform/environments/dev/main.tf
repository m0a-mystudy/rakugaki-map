# Core infrastructure environment (dev) - WIF-free version
# This version does not include WIF resources which are managed manually

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    # bucket will be specified via -backend-config during init
    prefix = "rakugaki-map/dev"
  }
}

# Variables
variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "rakugakimap-dev"
}

variable "region" {
  description = "Default region for resources"
  type        = string
  default     = "asia-northeast1"
}

variable "billing_account" {
  description = "Billing account ID"
  type        = string
  default     = ""
  sensitive   = true
}

variable "allowed_domains" {
  description = "List of allowed domains for API key restrictions"
  type        = list(string)
  default     = [
    "localhost:*",
    "localhost",
    "127.0.0.1:*",
    "127.0.0.1",
    "rakugakimap-dev.web.app",
    "rakugakimap-dev.firebaseapp.com"
  ]
}

# Firebase configuration managed via Secret Manager (manual)

# Use the main module (core infrastructure only)
module "rakugaki_map" {
  source = "../../"

  project_id       = var.project_id
  region          = var.region
  billing_account = var.billing_account
  allowed_domains = var.allowed_domains
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

# WIF resources are managed manually and not tracked here
