# Optional: Create a GCS bucket for Terraform state storage
# Run this separately first if you want to use remote state

# resource "google_storage_bucket" "terraform_state" {
#   name          = "${var.project_id}-terraform-state"
#   location      = var.region
#   force_destroy = false
#   
#   uniform_bucket_level_access = true
#   
#   versioning {
#     enabled = true
#   }
#   
#   lifecycle_rule {
#     condition {
#       num_newer_versions = 3
#     }
#     action {
#       type = "Delete"
#     }
#   }
# }
# 
# output "state_bucket_name" {
#   value = google_storage_bucket.terraform_state.name
#   description = "Name of the GCS bucket for Terraform state"
# }