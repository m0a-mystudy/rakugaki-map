# Infrastructure Management Overview

This document explains the current infrastructure management approach for the Rakugaki Map project, including what resources are managed by Terraform vs. manual management.

## Management Philosophy

The project uses a **hybrid approach** that separates security-critical foundational resources from application infrastructure:

- **Manual Management**: Security foundations and circular dependencies
- **Terraform Management**: Application infrastructure and configuration

## Resource Inventory

### 🔒 Manually Managed Resources (Security Foundations)

#### State Storage
- **GCS Buckets for Terraform State**
  - `rakugakimap-dev-terraform-state` (dev environment)
  - `the-rakugaki-map-terraform-state` (prod environment)
- **Reason**: Circular dependency - state bucket cannot store its own creation state
- **Documentation**: [STATE_BUCKET_MANAGEMENT.md](./STATE_BUCKET_MANAGEMENT.md)

#### Workload Identity Federation (WIF)
- `google_iam_workload_identity_pool`
- `google_iam_workload_identity_pool_provider`
- `google_service_account` (github-actions-wif)
- WIF-related IAM role bindings
- **Reason**: Security - CI/CD service accounts should not manage their own authentication infrastructure
- **Management**: Manual via gcloud commands

#### Secret Manager Resources
- **Development Secrets** (7 secrets in `rakugakimap-dev`):
  - `firebase-api-key-dev`
  - `firebase-auth-domain-dev`
  - `firebase-storage-bucket-dev`
  - `firebase-messaging-sender-id-dev`
  - `firebase-app-id-dev`
  - `firebase-ci-token-dev`
  - `google-maps-api-key-dev`
- **Production Secrets** (7 secrets in `the-rakugaki-map`):
  - `firebase-api-key-prod`
  - `firebase-auth-domain-prod`
  - `firebase-storage-bucket-prod`
  - `firebase-messaging-sender-id-prod`
  - `firebase-app-id-prod`
  - `firebase-ci-token-prod`
  - `google-maps-api-key-prod`
- **Reason**: Security - prevents sensitive values in Terraform state; simpler updates
- **Documentation**: [SECRET_MANAGEMENT.md](./SECRET_MANAGEMENT.md)

### ⚙️ Terraform Managed Resources (Application Infrastructure)

The following **14 resources** are currently managed by Terraform in `main.tf`:

#### API Services (6 resources)
1. `google_project_service.apikeys` - API Keys API
2. `google_project_service.maps_api` - Maps Backend API
3. `google_project_service.maps_js_api` - Maps Embed API
4. `google_project_service.places_api` - Places API
5. `google_project_service.firebase_auth` - Firebase Authentication API
6. `google_project_service.firebase_hosting` - Firebase Hosting API
7. `google_project_service.identity_toolkit` - Identity Toolkit API
8. `google_project_service.firestore` - Firestore API
9. `google_project_service.firebase_management` - Firebase Management API

#### API Keys (1 resource)
10. `google_apikeys_key.maps_api_key` - Google Maps JavaScript API key with domain restrictions

#### Database & Security (4 resources)
11. `google_firestore_database.database` - Firestore database instance
12. `google_firebaserules_ruleset.firestore` - Firestore security rules
13. `google_firebaserules_release.firestore` - Firestore rules deployment
14. `google_identity_platform_config.auth_config` - Firebase Authentication configuration (anonymous auth enabled)

## Architecture Benefits

### Security
- **Separation of Concerns**: Authentication infrastructure isolated from application infrastructure
- **Reduced Attack Surface**: CI/CD cannot modify its own security foundations
- **Secret Protection**: Sensitive values never stored in Terraform state

### Operational
- **Clear Boundaries**: Obvious separation between manual and automated management
- **Safe CI/CD**: Terraform only manages non-critical application resources
- **Recovery**: Manual resources can be recreated independently if needed

### Development
- **Predictable**: Developers know exactly what Terraform manages
- **Debuggable**: Clear responsibility boundaries for troubleshooting
- **Maintainable**: Simple, focused Terraform configurations

## Current State

### Environment Status
- **Development (`rakugakimap-dev`)**: ✅ Fully operational
  - State: `gs://rakugakimap-dev-terraform-state/rakugaki-map/dev/default.tfstate`
  - Resources: 14 Terraform-managed resources deployed
  - Secrets: 7 manually managed secrets

- **Production (`the-rakugaki-map`)**: ✅ Fully operational
  - State: `gs://the-rakugaki-map-terraform-state/rakugaki-map/prod/default.tfstate`
  - Resources: 14 Terraform-managed resources deployed
  - Secrets: 7 manually managed secrets

### CI/CD Integration
- **GitHub Actions**: Uses WIF for keyless authentication
- **Secret Access**: Direct access via `gcloud secrets versions access`
- **Deployment**: Automated for both dev and prod environments
- **Security**: All credentials managed via Secret Manager (no GitHub Secrets)

## Resource References

### Terraform Outputs
```bash
# Get API key
terraform output -raw api_key

# Get project info
terraform output project_id
terraform output firestore_database
terraform output hosting_url
```

### Secret Manager Access
```bash
# Development secrets
gcloud secrets versions access latest --secret="google-maps-api-key-dev" --project=rakugakimap-dev  # pragma: allowlist secret

# Production secrets
gcloud secrets versions access latest --secret="google-maps-api-key-prod" --project=the-rakugaki-map  # pragma: allowlist secret
```

### State Management
```bash
# Development
cd terraform/environments/dev
terraform init  # Uses rakugakimap-dev-terraform-state bucket

# Production
cd terraform/environments/prod
terraform init  # Uses the-rakugaki-map-terraform-state bucket
```

## Migration History

This hybrid approach resulted from fixing dev environment inconsistencies where resources were created both manually and via Terraform:

1. **State Migration**: Unified naming from `dev-clean` to `dev`
2. **Resource Import**: Imported existing manually-created resources
3. **Management Separation**: Moved secrets and WIF to manual management
4. **CI/CD Migration**: Switched from GitHub Secrets to Secret Manager

The current approach provides a clean, secure, and maintainable infrastructure management strategy.

## Related Documentation

- [STATE_BUCKET_MANAGEMENT.md](./STATE_BUCKET_MANAGEMENT.md) - State bucket manual management
- [SECRET_MANAGEMENT.md](./SECRET_MANAGEMENT.md) - Secret Manager manual management
- [README.md](./README.md) - Terraform setup and usage (needs update)
- [/README.md](../README.md) - Main project documentation
