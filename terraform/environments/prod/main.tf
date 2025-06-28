# Production environment configuration

terraform {
  required_version = ">= 1.0"
  
  # Production MUST use remote state
  backend "gcs" {
    # bucket = "your-prod-terraform-state"  # Set this!
    prefix = "rakugaki-map/prod"
  }
}

# Variables
variable "project_id" {
  description = "GCP Project ID for production"
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
  description = "Allowed domains for API key restrictions"
  type        = list(string)
  default     = []
}

# Use the main module with production overrides
module "rakugaki_map" {
  source = "../../"
  
  project_id      = var.project_id
  region          = var.region
  billing_account = var.billing_account
  
  # Production-specific overrides can be added here
  # For example, you might want to create a separate module
  # for production API keys with stricter restrictions
}

# Production-specific API key with domain restrictions
resource "google_apikeys_key" "maps_api_key_prod" {
  name         = "rakugaki-map-api-key-prod"
  display_name = "Rakugaki Map API Key (Production)"
  
  restrictions {
    api_targets {
      service = "maps-backend.googleapis.com"
    }
    api_targets {
      service = "maps-embed-backend.googleapis.com"
    }
    api_targets {
      service = "places-backend.googleapis.com"
    }
    
    browser_key_restrictions {
      # Production domains only
      allowed_referrers = var.allowed_domains
    }
  }
}

# Outputs
output "api_key_dev" {
  value       = module.rakugaki_map.api_key
  sensitive   = true
  description = "Development API Key (localhost only)"
}

output "api_key_prod" {
  value       = google_apikeys_key.maps_api_key_prod.key_string
  sensitive   = true
  description = "Production API Key (restricted domains)"
}

output "project_id" {
  value       = module.rakugaki_map.project_id
  description = "GCP Project ID"
}