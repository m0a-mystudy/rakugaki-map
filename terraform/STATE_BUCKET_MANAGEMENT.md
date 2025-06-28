# Terraform State Bucket Management

## Overview

Terraform state buckets are **manually managed** to avoid circular dependency issues.

## Current State Buckets

### Development Environment
- **Bucket**: `rakugakimap-dev-terraform-state`
- **Location**: `asia-northeast1`
- **State Path**: `rakugaki-map/dev/default.tfstate`

### Production Environment
- **Bucket**: `the-rakugaki-map-terraform-state`
- **Location**: `asia-northeast1`
- **State Path**: `rakugaki-map/prod/default.tfstate`

## Why Manual Management?

1. **Circular Dependency**: Terraform state bucket cannot store its own creation state
2. **Safety**: Prevents accidental deletion of critical infrastructure
3. **Simplicity**: Clear separation of concerns
4. **Best Practice**: Industry standard approach

## Bucket Configuration

All state buckets are configured with:
- ✅ Versioning enabled (keeps state history)
- ✅ Uniform bucket-level access
- ✅ Lifecycle rules (delete versions after 10 newer versions)
- ✅ Default encryption (Google-managed)

## Commands for Manual Setup

### Create New Environment Bucket
```bash
# For new environment (replace ENVIRONMENT and PROJECT_ID)
gcloud storage buckets create gs://PROJECT_ID-terraform-state \
  --location=asia-northeast1 \
  --uniform-bucket-level-access \
  --project=PROJECT_ID

# Enable versioning
gcloud storage buckets update gs://PROJECT_ID-terraform-state \
  --versioning \
  --project=PROJECT_ID
```

### Initialize Terraform with State Bucket
```bash
# In terraform/environments/ENVIRONMENT/
terraform init -backend-config="bucket=PROJECT_ID-terraform-state"
```

## Important Notes

- 🚫 **Never** include state buckets in Terraform configuration
- ✅ **Always** create buckets manually before Terraform init
- 🔒 **Ensure** proper IAM permissions for CI/CD service accounts
- 💾 **Monitor** bucket costs and lifecycle policies
