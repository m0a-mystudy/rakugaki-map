# Terraform Infrastructure Management

This directory contains Terraform configurations for the Rakugaki Map application infrastructure.

## Management Approach

This project uses a **hybrid management approach** that separates security foundations from application infrastructure:

- **Manual Management**: State buckets, Workload Identity Federation, Secret Manager
- **Terraform Management**: API services, API keys, Firestore, authentication config (14 resources)

For complete details, see [INFRASTRUCTURE_MANAGEMENT.md](./INFRASTRUCTURE_MANAGEMENT.md).

## Quick Start

### Development Environment

```bash
# Ensure prerequisites
cd terraform/environments/dev
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your project_id

# Deploy infrastructure
terraform init
terraform apply

# Get API key for local development
terraform output -raw api_key
```

### Production Environment

```bash
# Setup production environment
cd terraform/environments/prod
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with project_id and allowed_domains

# Deploy infrastructure
terraform init
terraform apply

# Get production API key
terraform output -raw api_key
```

## CI/CD Integration

The project uses **Workload Identity Federation** for secure, keyless authentication:

### Prerequisites (Manual Setup)

1. **State Buckets**: Created manually to avoid circular dependencies
   - Dev: `rakugakimap-dev-terraform-state`
   - Prod: `the-rakugaki-map-terraform-state`

2. **Workload Identity Federation**: Configured manually for security
   - WIF pools and providers for GitHub Actions authentication

3. **Secret Manager**: Stores Firebase configuration and API keys
   - All sensitive values accessed via `gcloud secrets versions access`

### GitHub Actions Variables

No GitHub Secrets required! All sensitive values are stored in Secret Manager:

- `FIREBASE_PROJECT_ID_DEV`: Development project ID
- `FIREBASE_PROJECT_ID_PROD`: Production project ID
- `WIF_PROVIDER_DEV`: Dev WIF provider
- `WIF_SERVICE_ACCOUNT_DEV`: Dev service account
- `WIF_PROVIDER_PROD`: Prod WIF provider
- `WIF_SERVICE_ACCOUNT_PROD`: Prod service account

## Terraform Resources

### Currently Managed (14 resources)

**API Services (9 resources):**
- Maps APIs, Firebase APIs, Identity Toolkit, Firestore

**Application Infrastructure (5 resources):**
- Google Maps API key with domain restrictions
- Firestore database and security rules
- Firebase Authentication configuration

### Not Managed by Terraform

**Manual Management (Security/Circular Dependencies):**
- Terraform state buckets
- Workload Identity Federation resources
- Secret Manager secrets and versions

## Environment Structure

```
terraform/
├── main.tf                          # Core infrastructure (14 resources)
├── firestore.rules                  # Firestore security rules
├── environments/
│   ├── dev/                         # Development environment
│   └── prod/                        # Production environment
└── docs/
    ├── INFRASTRUCTURE_MANAGEMENT.md  # Complete management overview
    ├── STATE_BUCKET_MANAGEMENT.md    # State bucket documentation
    └── SECRET_MANAGEMENT.md          # Secret Manager documentation
```

## Local Development

```bash
# Set up environment variables for local development
echo "VITE_GOOGLE_MAPS_API_KEY=$(terraform output -raw api_key)" > ../../.env.local
echo "VITE_FIREBASE_API_KEY=$(gcloud secrets versions access latest --secret='firebase-api-key-dev')" >> ../../.env.local  # pragma: allowlist secret
# Add other Firebase config variables...

# Start development server
cd ../../
npm run dev
```

## Deployment

### Automatic (Recommended)
- **Development**: Push to `main` branch
- **Production**: Create tag `v*.*.*`

### Manual
```bash
# Development
npm run deploy:dev

# Production
npm run deploy:prod
```

## Key Benefits

- ✅ **Secure**: No sensitive values in Terraform state or GitHub
- ✅ **Automated**: Full CI/CD with keyless authentication
- ✅ **Maintainable**: Clear separation of manual vs. automated resources
- ✅ **Scalable**: Multi-environment support with proper isolation
- ✅ **Debuggable**: Obvious boundaries between management approaches

## Getting Help

- **Infrastructure Management**: [INFRASTRUCTURE_MANAGEMENT.md](./INFRASTRUCTURE_MANAGEMENT.md)
- **State Management**: [STATE_BUCKET_MANAGEMENT.md](./STATE_BUCKET_MANAGEMENT.md)
- **Secret Management**: [SECRET_MANAGEMENT.md](./SECRET_MANAGEMENT.md)
- **Main Documentation**: [../README.md](../README.md)
