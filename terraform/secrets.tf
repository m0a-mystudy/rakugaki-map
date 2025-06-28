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
  # Placeholder value - will be updated by application deployment
  secret_data = "placeholder" # pragma: allowlist secret # pragma: allowlist secret
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
  secret_data = "placeholder" # pragma: allowlist secret
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
  secret_data = "placeholder" # pragma: allowlist secret
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
  secret_data = "placeholder" # pragma: allowlist secret
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
  secret_data = "placeholder" # pragma: allowlist secret
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
  secret_data = google_apikeys_key.maps_api_key.key_string
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
  secret_data = "placeholder" # pragma: allowlist secret
}

# Variables for sensitive data
variable "environment" {
  description = "Environment name (dev or prod)"
  type        = string
  default     = "dev"
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
