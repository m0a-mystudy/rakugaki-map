# Create a GCS bucket for Terraform state storage
# This should be created BEFORE enabling the backend configuration

resource "google_storage_bucket" "terraform_state" {
  name          = "${var.project_id}-terraform-state"
  location      = var.region
  force_destroy = false  # Prevent accidental deletion
  
  uniform_bucket_level_access = true
  
  versioning {
    enabled = true  # Keep history of state files
  }
  
  lifecycle_rule {
    condition {
      num_newer_versions = 10  # Keep last 10 versions
    }
    action {
      type = "Delete"
    }
  }
  
  # Enable encryption with Google-managed keys
  encryption {
    default_kms_key_name = null  # Uses Google-managed encryption
  }
}

output "state_bucket_name" {
  value = google_storage_bucket.terraform_state.name
  description = "Name of the GCS bucket for Terraform state"
}

output "state_bucket_setup_command" {
  value = "terraform init -backend-config=\"bucket=${google_storage_bucket.terraform_state.name}\" -migrate-state"
  description = "Command to migrate to remote state"
}