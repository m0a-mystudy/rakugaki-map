# Optional: Create a new GCP project
# Uncomment this block if you want Terraform to create a new project

# resource "google_project" "rakugaki_map" {
#   name            = "Rakugaki Map"
#   project_id      = var.project_id
#   billing_account = var.billing_account
#   
#   # Enable this if you want to delete the project when running terraform destroy
#   # WARNING: This will delete ALL resources in the project
#   # skip_delete = false
# }
# 
# # Link billing account to project
# resource "google_billing_project_info" "project_billing" {
#   project         = google_project.rakugaki_map.project_id
#   billing_account = var.billing_account
# }

# Note: When creating a new project, you'll need to:
# 1. Set var.billing_account in terraform.tfvars
# 2. Ensure the project_id is globally unique
# 3. Have appropriate permissions to create projects