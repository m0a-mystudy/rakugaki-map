# Development environment configuration
# This demonstrates how to manage multiple environments

terraform {
  required_version = ">= 1.0"
}

module "rakugaki_map" {
  source = "../../"
  
  project_id = var.project_id
  region     = var.region
  
  # Environment-specific settings can be added here
}