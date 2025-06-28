# Workload Identity Federation for GitHub Actions
# This enables keyless authentication from GitHub Actions to GCP

# Enable required APIs
resource "google_project_service" "iam_credentials" {
  service = "iamcredentials.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "sts" {
  service = "sts.googleapis.com"
  disable_on_destroy = false
}

# Create Workload Identity Pool
resource "google_iam_workload_identity_pool" "github_pool" {
  workload_identity_pool_id = "github-actions-pool"
  display_name              = "GitHub Actions Pool"
  description              = "Workload Identity Pool for GitHub Actions CI/CD"

  depends_on = [
    google_project_service.iam_credentials,
    google_project_service.sts
  ]
}

# Create Workload Identity Provider for GitHub
resource "google_iam_workload_identity_pool_provider" "github_provider" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_pool.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Provider"
  description                        = "OIDC provider for GitHub Actions"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  attribute_condition = "attribute.repository=='m0a-mystudy/rakugaki-map'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# Service account for GitHub Actions
resource "google_service_account" "github_actions_wif" {
  account_id   = "github-actions-wif"
  display_name = "GitHub Actions WIF Service Account"
  description  = "Service account for GitHub Actions with Workload Identity"
}

# Grant necessary permissions to the service account
resource "google_project_iam_member" "github_actions_permissions" {
  for_each = toset([
    "roles/secretmanager.secretAccessor",  # Access secrets
    "roles/firebasehosting.admin",          # Deploy to Firebase Hosting
    "roles/firebaseauth.admin",             # Manage Firebase Auth
    "roles/datastore.user",                 # Access Firestore
    "roles/editor",                         # Terraform infrastructure management
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.github_actions_wif.email}"
}

# Allow GitHub Actions to impersonate the service account
resource "google_service_account_iam_member" "github_actions_binding" {
  service_account_id = google_service_account.github_actions_wif.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_pool.name}/attribute.repository/m0a-mystudy/rakugaki-map"
}

# Outputs for GitHub Actions configuration
output "workload_identity_provider" {
  value       = google_iam_workload_identity_pool_provider.github_provider.name
  description = "Workload Identity Provider resource name for GitHub Actions"
}

output "service_account_email" {
  value       = google_service_account.github_actions_wif.email
  description = "Service account email for GitHub Actions"
}

# Helper output to show the full configuration
output "github_actions_wif_config" {
  value = {
    workload_identity_provider = google_iam_workload_identity_pool_provider.github_provider.name
    service_account           = google_service_account.github_actions_wif.email
    project_id               = var.project_id
  }
  description = "Complete configuration for GitHub Actions Workload Identity"
}
