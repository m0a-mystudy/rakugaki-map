# Development environment configuration
# Copy this to terraform.tfvars and update with your values

# GCP Project ID for development
project_id = "rakugakimap-dev"

# Region
region = "asia-northeast1"

# Billing account (if creating new project)
billing_account = "019580-0463A4-90F093"

# Firebase Hosting domain restrictions
allowed_domains = [
  "rakugakimap-dev.web.app/*",
  "rakugakimap-dev.web.app",
  "localhost:*",
  "localhost",
  "127.0.0.1:*",
  "127.0.0.1"
]
