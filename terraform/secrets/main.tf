# Secret Manager for sensitive configuration
# Stores all sensitive values that GitHub Actions needs

# Enable Secret Manager API
resource "google_project_service" "secretmanager" {
  service = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

# Firebase configuration secrets (auto-detected from project when possible)
resource "google_secret_manager_secret" "firebase_api_key" {
  secret_id = "firebase-api-key-${var.environment}"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret_version" "firebase_api_key" {
  secret      = google_secret_manager_secret.firebase_api_key.id
  # Value provided via CI/CD or local tfvars
  secret_data = var.firebase_api_key
}

resource "google_secret_manager_secret" "firebase_auth_domain" {
  secret_id = "firebase-auth-domain-${var.environment}"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret_version" "firebase_auth_domain" {
  secret      = google_secret_manager_secret.firebase_auth_domain.id
  secret_data = var.firebase_auth_domain
}

resource "google_secret_manager_secret" "firebase_storage_bucket" {
  secret_id = "firebase-storage-bucket-${var.environment}"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret_version" "firebase_storage_bucket" {
  secret      = google_secret_manager_secret.firebase_storage_bucket.id
  secret_data = var.firebase_storage_bucket
}

resource "google_secret_manager_secret" "firebase_messaging_sender_id" {
  secret_id = "firebase-messaging-sender-id-${var.environment}"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret_version" "firebase_messaging_sender_id" {
  secret      = google_secret_manager_secret.firebase_messaging_sender_id.id
  secret_data = var.firebase_messaging_sender_id
}

resource "google_secret_manager_secret" "firebase_app_id" {
  secret_id = "firebase-app-id-${var.environment}"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret_version" "firebase_app_id" {
  secret      = google_secret_manager_secret.firebase_app_id.id
  secret_data = var.firebase_app_id
}

# Google Maps API Key
resource "google_secret_manager_secret" "google_maps_api_key" {
  secret_id = "google-maps-api-key-${var.environment}"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "google_maps_api_key" {
  secret      = google_secret_manager_secret.google_maps_api_key.id
  secret_data = var.maps_api_key_value
}

# Firebase CI Token (for Firebase CLI operations)
resource "google_secret_manager_secret" "firebase_token" {
  secret_id = "firebase-ci-token-${var.environment}"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "firebase_token" {
  secret      = google_secret_manager_secret.firebase_token.id
  secret_data = var.firebase_ci_token
}

# Variables for sensitive data
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "environment" {
  description = "Environment name (dev or prod)"
  type        = string
  default     = "dev"
}

variable "firebase_api_key" {
  description = "Firebase API Key"
  type        = string
  sensitive   = true
}

variable "firebase_auth_domain" {
  description = "Firebase Auth Domain"
  type        = string
  sensitive   = true
}

variable "firebase_storage_bucket" {
  description = "Firebase Storage Bucket"
  type        = string
  sensitive   = true
}

variable "firebase_messaging_sender_id" {
  description = "Firebase Messaging Sender ID"
  type        = string
  sensitive   = true
}

variable "firebase_app_id" {
  description = "Firebase App ID"
  type        = string
  sensitive   = true
}

variable "firebase_ci_token" {
  description = "Firebase CI Token for deployments"
  type        = string
  sensitive   = true
}

variable "maps_api_key_value" {
  description = "Google Maps API Key"
  type        = string
  sensitive   = true
}

# Output secret resource names for reference
output "secret_ids" {
  value = {
    firebase_api_key             = google_secret_manager_secret.firebase_api_key.secret_id
    firebase_auth_domain         = google_secret_manager_secret.firebase_auth_domain.secret_id
    firebase_storage_bucket      = google_secret_manager_secret.firebase_storage_bucket.secret_id
    firebase_messaging_sender_id = google_secret_manager_secret.firebase_messaging_sender_id.secret_id
    firebase_app_id             = google_secret_manager_secret.firebase_app_id.secret_id
    google_maps_api_key         = google_secret_manager_secret.google_maps_api_key.secret_id
    firebase_token              = google_secret_manager_secret.firebase_token.secret_id
  }
  description = "Secret Manager secret IDs for GitHub Actions"
}
