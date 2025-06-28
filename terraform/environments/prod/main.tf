# Production environment configuration
# This demonstrates how to manage multiple environments

terraform {
  required_version = ">= 1.0"
  
  # Production should use remote state
  backend "gcs" {
    bucket  = "your-prod-terraform-state"
    prefix  = "rakugaki-map/prod"
  }
}

module "rakugaki_map" {
  source = "../../"
  
  project_id = var.project_id
  region     = var.region
  
  # Production-specific settings
  # e.g., different API key restrictions, stricter Firestore rules, etc.
}