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

# Firebase variables (fallback values for CI/CD)
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

  project_id                     = var.project_id
  region                        = var.region
  billing_account               = var.billing_account
  allowed_domains               = var.allowed_domains
  firebase_api_key             = var.firebase_api_key
  firebase_auth_domain         = var.firebase_auth_domain
  firebase_storage_bucket      = var.firebase_storage_bucket
  firebase_messaging_sender_id = var.firebase_messaging_sender_id
  firebase_app_id              = var.firebase_app_id
  firebase_ci_token            = var.firebase_ci_token
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

# WIF outputs are not available since WIF resources are managed manually
