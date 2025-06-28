#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🤖 Workload Identity CI/CD セットアップスクリプト${NC}"
echo "=================================================="

# Check environment
ENVIRONMENT=${1:-dev}
if [ "$ENVIRONMENT" = "prod" ]; then
    PROJECT_ID=${2:-rakugakimap-prod}
else
    PROJECT_ID=${2:-rakugakimap-dev}
fi

GITHUB_REPO=${3:-m0a-mystudy/rakugaki-map}

echo -e "${YELLOW}📋 環境: $ENVIRONMENT${NC}"
echo -e "${YELLOW}📋 プロジェクト: $PROJECT_ID${NC}"
echo -e "${YELLOW}📋 GitHubリポジトリ: $GITHUB_REPO${NC}"

# Check if gcloud CLI is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI がインストールされていません${NC}"
    echo "インストール方法: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if terraform is available
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}❌ Terraform がインストールされていません${NC}"
    echo "インストール方法: https://www.terraform.io/downloads"
    exit 1
fi

echo -e "${BLUE}🔧 Terraformでインフラストラクチャを作成中...${NC}"

# Navigate to terraform directory
cd terraform/environments/$ENVIRONMENT

# Check if terraform.tfvars exists
if [ ! -f terraform.tfvars ]; then
    echo -e "${RED}❌ terraform.tfvars が見つかりません${NC}"
    echo "terraform.tfvars.example をコピーして設定してください"
    exit 1
fi

# Add environment variable to terraform.tfvars if not exists
if ! grep -q "environment" terraform.tfvars; then
    echo "" >> terraform.tfvars
    echo "# Environment for secrets" >> terraform.tfvars
    echo "environment = \"$ENVIRONMENT\"" >> terraform.tfvars
fi

# Get Firebase configuration values
echo -e "${BLUE}🔐 Firebase設定値の入力が必要です${NC}"
echo "以下の値を入力してください（Firebase Consoleまたは.env.localから取得）:"

# Read Firebase configuration
echo -n "Firebase API Key: "
read -s FIREBASE_API_KEY
echo ""

echo -n "Firebase Auth Domain (例: ${PROJECT_ID}.firebaseapp.com): "
read FIREBASE_AUTH_DOMAIN

echo -n "Firebase Storage Bucket (例: ${PROJECT_ID}.appspot.com): "
read FIREBASE_STORAGE_BUCKET

echo -n "Firebase Messaging Sender ID: "
read FIREBASE_MESSAGING_SENDER_ID

echo -n "Firebase App ID: "
read FIREBASE_APP_ID

echo -n "Firebase CI Token (firebase login:ciで取得): "
read -s FIREBASE_CI_TOKEN
echo ""

# Add Firebase configuration to terraform.tfvars
cat >> terraform.tfvars << EOF

# Firebase configuration for Secret Manager
firebase_api_key = "$FIREBASE_API_KEY"
firebase_auth_domain = "$FIREBASE_AUTH_DOMAIN"
firebase_storage_bucket = "$FIREBASE_STORAGE_BUCKET"
firebase_messaging_sender_id = "$FIREBASE_MESSAGING_SENDER_ID"
firebase_app_id = "$FIREBASE_APP_ID"
firebase_ci_token = "$FIREBASE_CI_TOKEN"
EOF

echo -e "${BLUE}🚀 Terraformを実行中...${NC}"

# Initialize and apply terraform
terraform init
terraform plan
echo -e "${YELLOW}⚠️  上記のプランを確認してください。続行しますか? (y/N): ${NC}"
read -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    terraform apply -auto-approve

    # Get outputs
    echo -e "${BLUE}📋 Workload Identity設定情報${NC}"
    echo "================================="

    WIF_PROVIDER=$(terraform output -raw workload_identity_provider)
    WIF_SERVICE_ACCOUNT=$(terraform output -raw service_account_email)

    echo -e "${GREEN}✅ Terraformの適用が完了しました${NC}"
    echo ""
    echo -e "${BLUE}GitHub Repository Variables に設定してください:${NC}"
    echo ""
    echo -e "${YELLOW}WIF_PROVIDER:${NC}"
    echo "$WIF_PROVIDER"
    echo ""
    echo -e "${YELLOW}WIF_SERVICE_ACCOUNT:${NC}"
    echo "$WIF_SERVICE_ACCOUNT"
    echo ""

    if [ "$ENVIRONMENT" = "prod" ]; then
        echo -e "${YELLOW}FIREBASE_PROJECT_ID_PROD:${NC}"
        echo "$PROJECT_ID"
    else
        echo -e "${YELLOW}FIREBASE_PROJECT_ID_DEV:${NC}"
        echo "$PROJECT_ID"
    fi
    echo ""

    echo -e "${BLUE}📖 設定手順:${NC}"
    echo "1. GitHubリポジトリの Settings → Secrets and variables → Actions"
    echo "2. Variables タブで上記の値を設定"
    echo "3. .github/workflows/deploy-wif.yml を使用してデプロイ"
    echo ""

    echo -e "${GREEN}🎉 Workload Identity セットアップ完了！${NC}"
    echo ""
    echo -e "${BLUE}ℹ️  従来のキーベース認証との違い:${NC}"
    echo "- ✅ サービスアカウントキーが不要"
    echo "- ✅ 自動的に短期間のトークンを使用"
    echo "- ✅ より安全な認証方式"
    echo "- ✅ GitHub Secretsの管理が簡素化"

else
    echo -e "${YELLOW}⏸️  セットアップをキャンセルしました${NC}"
fi

cd - > /dev/null

echo ""
echo -e "${BLUE}ℹ️  別環境のセットアップ:${NC}"
if [ "$ENVIRONMENT" = "dev" ]; then
    echo "本番環境: bash scripts/setup-wif.sh prod rakugakimap-prod"
else
    echo "開発環境: bash scripts/setup-wif.sh dev rakugakimap-dev"
fi
