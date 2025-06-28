# Secret Management

Secret Manager resources are **manually managed** to maintain security and simplicity.

## Current Secrets

### Development Environment (`rakugakimap-dev`)
- `firebase-api-key-dev`
- `firebase-auth-domain-dev`
- `firebase-storage-bucket-dev`
- `firebase-messaging-sender-id-dev`
- `firebase-app-id-dev`
- `firebase-ci-token-dev`
- `google-maps-api-key-dev`

### Production Environment (`the-rakugaki-map`)
- `firebase-api-key-prod`
- `firebase-auth-domain-prod`
- `firebase-storage-bucket-prod`
- `firebase-messaging-sender-id-prod`
- `firebase-app-id-prod`
- `firebase-ci-token-prod`
- `google-maps-api-key-prod`

## Why Manual Management?

1. **Security**: Prevents sensitive values from appearing in Terraform state
2. **Simplicity**: Easier to update values without Terraform complexity
3. **Separation of Concerns**: Infrastructure vs. Configuration data
4. **CI/CD Integration**: Direct access via WIF without state management

## Creating Secrets

```bash
# Create a new secret
gcloud secrets create SECRET_NAME --project=PROJECT_ID

# Add a secret version
echo "SECRET_VALUE" | gcloud secrets versions add SECRET_NAME --data-file=- --project=PROJECT_ID
```

## Updating Secret Values

```bash
# Update secret value
echo "NEW_VALUE" | gcloud secrets versions add SECRET_NAME --data-file=- --project=PROJECT_ID
```

## CI/CD Access

GitHub Actions accesses secrets via Workload Identity Federation:

```yaml
- name: Get secret value
  run: |
    SECRET_VALUE=$(gcloud secrets versions access latest --secret="SECRET_NAME")  # gitleaks:allow
    echo "VARIABLE_NAME=$SECRET_VALUE" >> $GITHUB_ENV
```

## Permissions

Service accounts need the following IAM roles:
- `roles/secretmanager.secretAccessor` - Read secret values
- `roles/secretmanager.viewer` - List secrets (optional)

## Important Notes

- 🚫 **Never** include secrets in Terraform configuration
- ✅ **Always** use Secret Manager for sensitive configuration
- 🔒 **Ensure** proper IAM permissions for service accounts
- 💾 **Monitor** secret access logs for security
