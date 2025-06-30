# Production environment configuration (the-rakugaki-map)
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
    prefix = "rakugaki-map/prod"
  }
}

# Variables
variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "the-rakugaki-map"
}

variable "region" {
  description = "Default region for resources"
  type        = string
  default     = "asia-northeast1"
}

variable "billing_account" {
  description = "Billing account ID"
  type        = string
  default     = "019580-0463A4-90F093"
  sensitive   = true
}

variable "allowed_domains" {
  description = "List of allowed domains for API key restrictions"
  type        = list(string)
  default     = [
    "the-rakugaki-map.web.app",
    "https://the-rakugaki-map.web.app",
    "the-rakugaki-map.firebaseapp.com",
    "https://the-rakugaki-map.firebaseapp.com",
    "the-rakugaki-map--*.web.app",
    "https://the-rakugaki-map--*.web.app",
    "the-rakugaki-map-*.web.app",
    "https://the-rakugaki-map-*.web.app"
  ]
}

# Firebase variables
variable "firebase_api_key" {
  description = "Firebase API Key"
  type        = string
  sensitive   = true
  default     = "placeholder"
}

variable "firebase_auth_domain" {
  description = "Firebase Auth Domain"
  type        = string
  sensitive   = true
  default     = "placeholder"
}

variable "firebase_storage_bucket" {
  description = "Firebase Storage Bucket"
  type        = string
  sensitive   = true
  default     = "placeholder"
}

variable "firebase_messaging_sender_id" {
  description = "Firebase Messaging Sender ID"
  type        = string
  sensitive   = true
  default     = "placeholder"
}

variable "firebase_app_id" {
  description = "Firebase App ID"
  type        = string
  sensitive   = true
  default     = "placeholder"
}

variable "firebase_ci_token" {
  description = "Firebase CI Token for deployments"
  type        = string
  sensitive   = true
  default     = "placeholder"
}

# Use the main module (core infrastructure only)
module "rakugaki_map" {
  source = "../../"

  project_id      = var.project_id
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
