# Terraform Infrastructure Setup

This directory contains Terraform configurations for the Rakugaki Map application infrastructure.

## Required GitHub Secrets

Only these 2 secrets are required in your GitHub repository:

1. **`FIREBASE_CI_TOKEN`**: Firebase CLI token for deployments
   - Get it by running: `firebase login:ci`

2. **`BILLING_ACCOUNT_ID`**: Your GCP billing account ID
   - Get it by running: `gcloud billing accounts list`

All Firebase configuration (API keys, auth domain, storage bucket, etc.) is automatically retrieved from your Firebase project during CI/CD.

## Setup Process

### 1. One-time Firebase Setup

If you haven't already set up Firebase for your project:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and initialize
firebase login
firebase init hosting

# Get CI token for GitHub Actions
firebase login:ci
# Copy the token to GitHub Secrets as FIREBASE_CI_TOKEN
```

### 2. Local Development

```bash
# Copy and edit the local config file
cp terraform/environments/dev/terraform.tfvars terraform/environments/dev/terraform.tfvars.local
# Edit terraform.tfvars.local with your actual values

# Apply Terraform with local config
cd terraform/environments/dev
terraform init -backend-config="bucket=rakugakimap-dev-terraform-state"
terraform plan -var-file="terraform.tfvars.local"
terraform apply -var-file="terraform.tfvars.local"
```

### 3. CI/CD Setup

1. Add required GitHub Secrets:
   - `FIREBASE_CI_TOKEN`: Your Firebase CI token
   - `BILLING_ACCOUNT_ID`: Your GCP billing account ID

2. Add required GitHub Variables:
   - `FIREBASE_PROJECT_ID_DEV`: Your dev project ID (e.g., `rakugakimap-dev`)
   - `FIREBASE_PROJECT_ID_PROD`: Your prod project ID (e.g., `rakugakimap-prod`)

3. After first successful Terraform apply, add these GitHub Variables:
   - `WIF_PROVIDER`: Workload Identity Provider (from Terraform output)
   - `WIF_SERVICE_ACCOUNT`: Service account email (from Terraform output)

## Architecture

- **Firebase Configuration**: Auto-detected from Firebase CLI during CI/CD
- **Workload Identity Federation**: Secure, keyless authentication for GitHub Actions
- **Secret Manager**: Stores all sensitive values for application runtime
- **Multi-environment**: Separate dev/prod configurations

## Benefits

- ✅ **Secure**: No hardcoded API keys in repository
- ✅ **Automated**: Firebase config auto-detected during CI/CD
- ✅ **Minimal Secrets**: Only 2 GitHub Secrets required
- ✅ **Scalable**: Multi-environment support
- ✅ **Maintainable**: Infrastructure as Code with Terraform
