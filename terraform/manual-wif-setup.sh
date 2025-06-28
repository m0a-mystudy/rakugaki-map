#!/bin/bash

# Manual Workload Identity Federation setup script
# This script creates the WIF provider that Terraform couldn't create due to API issues

set -e

PROJECT_ID="rakugakimap-dev"
POOL_ID="github-actions-pool"
PROVIDER_ID="github-provider"
REPO="m0a-mystudy/rakugaki-map"

echo "🔧 Creating Workload Identity Provider manually..."

# Try creating the provider with minimal configuration
gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
  --location="global" \
  --workload-identity-pool="$POOL_ID" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --project="$PROJECT_ID" || {
    echo "⚠️  Provider creation failed, checking if it already exists..."
    if gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
      --location="global" \
      --workload-identity-pool="$POOL_ID" \
      --project="$PROJECT_ID" &>/dev/null; then
      echo "✅ Provider already exists"
    else
      echo "❌ Provider creation failed and doesn't exist"
      exit 1
    fi
  }

# Get the provider resource name
PROVIDER_NAME=$(gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --location="global" \
  --workload-identity-pool="$POOL_ID" \
  --project="$PROJECT_ID" \
  --format="value(name)")

echo "✅ Workload Identity Provider created: $PROVIDER_NAME"

# Get service account email
SERVICE_ACCOUNT="github-actions-wif@$PROJECT_ID.iam.gserviceaccount.com"

echo "🔧 Updating Terraform to import the provider..."

# Import the provider into Terraform state
cd terraform/environments/dev
terraform import "module.rakugaki_map.google_iam_workload_identity_pool_provider.github_provider" "$PROVIDER_NAME" || {
  echo "⚠️  Import failed, provider might already be in state"
}

echo "✅ Setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Add these GitHub Repository Variables:"
echo "   WIF_PROVIDER: $PROVIDER_NAME"
echo "   WIF_SERVICE_ACCOUNT: $SERVICE_ACCOUNT"
echo ""
echo "2. Add these GitHub Repository Secrets:"
echo "   FIREBASE_CI_TOKEN: (get from 'firebase login:ci')"
echo "   BILLING_ACCOUNT_ID: (get from 'gcloud billing accounts list')"
echo ""
echo "3. Test the CI/CD pipeline by pushing changes or running workflow manually"
