terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "Default region for resources"
  type        = string
  default     = "asia-northeast1"
}

variable "billing_account" {
  description = "Billing account ID (required only if creating new project)"
  type        = string
  default     = ""

  # Format: 01234A-567890-BCDEF1
  # Find yours: gcloud billing accounts list
}

variable "allowed_domains" {
  description = "List of allowed domains for API key restrictions"
  type        = list(string)
  default     = [
    "localhost:*",
    "localhost",
    "127.0.0.1:*",
    "127.0.0.1"
  ]
}

# Firebase variables (for secrets management)
variable "firebase_api_key" {
  description = "Firebase API Key"
  type        = string
  sensitive   = true
  default     = "placeholder"
}

variable "firebase_auth_domain" {
  description = "Firebase Auth Domain"
  type        = string
  sensitive   = true
  default     = "placeholder"
}

variable "firebase_storage_bucket" {
  description = "Firebase Storage Bucket"
  type        = string
  sensitive   = true
  default     = "placeholder"
}

variable "firebase_messaging_sender_id" {
  description = "Firebase Messaging Sender ID"
  type        = string
  sensitive   = true
  default     = "placeholder"
}

variable "firebase_app_id" {
  description = "Firebase App ID"
  type        = string
  sensitive   = true
  default     = "placeholder"
}

variable "firebase_ci_token" {
  description = "Firebase CI Token for deployments"
  type        = string
  sensitive   = true
  default     = "placeholder"
}

provider "google" {
  project               = var.project_id
  region                = var.region
  user_project_override = true
}

# Enable required APIs
resource "google_project_service" "apikeys" {
  service = "apikeys.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "maps_api" {
  service = "maps-backend.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "maps_js_api" {
  service = "maps-embed-backend.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "places_api" {
  service = "places-backend.googleapis.com"

  disable_on_destroy = false
}

# Firebase Authentication API
resource "google_project_service" "firebase_auth" {
  service = "firebase.googleapis.com"

  disable_on_destroy = false
}

# Firebase Hosting API
resource "google_project_service" "firebase_hosting" {
  service = "firebasehosting.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "identity_toolkit" {
  service = "identitytoolkit.googleapis.com"

  disable_on_destroy = false
}

# Create API Key for Maps JavaScript API
resource "google_apikeys_key" "maps_api_key" {
  name         = "rakugaki-map-api-key"
  display_name = "Rakugaki Map API Key"

  restrictions {
    api_targets {
      service = "maps-backend.googleapis.com"
    }
    api_targets {
      service = "maps-embed-backend.googleapis.com"
    }
    api_targets {
      service = "places-backend.googleapis.com"
    }

    browser_key_restrictions {
      allowed_referrers = var.allowed_domains
    }
  }

  depends_on = [
    google_project_service.apikeys,
    google_project_service.maps_api,
    google_project_service.maps_js_api,
    google_project_service.places_api
  ]
}

# Firestore Database
resource "google_project_service" "firestore" {
  service = "firestore.googleapis.com"

  disable_on_destroy = false
}

resource "google_firestore_database" "database" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_project_service.firestore]
}

# Firestore Security Rules
resource "google_firebaserules_ruleset" "firestore" {
  source {
    files {
      name = "firestore.rules"
      content = file("${path.module}/firestore.rules")
    }
  }

  depends_on = [google_firestore_database.database]
}

resource "google_firebaserules_release" "firestore" {
  name         = "cloud.firestore"
  ruleset_name = google_firebaserules_ruleset.firestore.name

  depends_on = [google_firebaserules_ruleset.firestore]
}

# Firebase Authentication Config
resource "google_identity_platform_config" "auth_config" {
  project = var.project_id

  # 匿名認証を有効化
  sign_in {
    anonymous {
      enabled = true
    }
  }

  depends_on = [
    google_project_service.firebase_auth,
    google_project_service.identity_toolkit
  ]
}

# Firebase Management API
resource "google_project_service" "firebase_management" {
  service = "firebase.googleapis.com"

  disable_on_destroy = false
}

# Note: Firebase Web App and Hosting Site need to be created manually
# or via Firebase CLI due to Terraform provider limitations
# Use: firebase init hosting

# Outputs
output "api_key" {
  value       = google_apikeys_key.maps_api_key.key_string
  sensitive   = true
  description = "Google Maps API Key (use 'terraform output -raw api_key' to see the value)"
}

output "project_id" {
  value       = var.project_id
  description = "GCP Project ID"
}

output "firestore_database" {
  value       = google_firestore_database.database.name
  description = "Firestore Database Name"
}

output "hosting_url" {
  value       = "https://${var.project_id}.web.app"
  description = "Firebase Hosting URL (available after firebase init hosting)"
}
