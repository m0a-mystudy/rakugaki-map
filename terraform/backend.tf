# Remote state configuration (optional)
# Uncomment and configure this block to use remote state

# terraform {
#   backend "gcs" {
#     bucket  = "your-terraform-state-bucket"
#     prefix  = "rakugaki-map"
#   }
# }

# To migrate from local to remote state:
# 1. Create a GCS bucket for state storage
# 2. Uncomment the backend configuration above
# 3. Run: terraform init -migrate-state
# 4. Confirm the migration when prompted