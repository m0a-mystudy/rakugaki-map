# Remote state configuration (RECOMMENDED)
# GCS backend provides state locking and versioning automatically

terraform {
  backend "gcs" {
    # bucket = "YOUR_PROJECT_ID-terraform-state"  # Replace with your bucket name
    prefix = "rakugaki-map"
  }
}

# To set up remote state:
# 1. First, comment out the backend block above
# 2. Run: terraform apply -target=google_storage_bucket.terraform_state
# 3. Uncomment the backend block and add your bucket name
# 4. Run: terraform init -migrate-state
# 5. Confirm the migration when prompted

# Benefits of GCS backend:
# - Automatic state locking (prevents concurrent modifications)
# - State versioning (can recover from corruption)
# - Secure storage (encrypted at rest)
# - No local state files to lose