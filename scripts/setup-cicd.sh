#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🤖 CI/CD セットアップスクリプト${NC}"
echo "================================="

# Check environment
ENVIRONMENT=${1:-dev}
if [ "$ENVIRONMENT" = "prod" ]; then
    PROJECT_ID=${2:-rakugakimap-prod}
else
    PROJECT_ID=${2:-rakugakimap-dev}
fi

echo -e "${YELLOW}📋 環境: $ENVIRONMENT${NC}"
echo -e "${YELLOW}📋 プロジェクト: $PROJECT_ID${NC}"

# Check if gcloud CLI is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI がインストールされていません${NC}"
    echo "インストール方法: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI がインストールされていません${NC}"
    echo "インストール方法: npm install -g firebase-tools"
    exit 1
fi

echo -e "${BLUE}🔑 Firebase サービスアカウント作成中...${NC}"

# Create service account
SA_NAME="github-actions-$PROJECT_ID"
SA_EMAIL="$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"

# Check if service account exists
if gcloud iam service-accounts describe $SA_EMAIL --project=$PROJECT_ID &>/dev/null; then
    echo -e "${YELLOW}⚠️  サービスアカウント $SA_EMAIL は既に存在します${NC}"
else
    gcloud iam service-accounts create $SA_NAME \
        --project=$PROJECT_ID \
        --display-name="GitHub Actions CI/CD" \
        --description="Service account for GitHub Actions deployments"
    echo -e "${GREEN}✅ サービスアカウント作成完了${NC}"
fi

echo -e "${BLUE}🔐 IAM権限設定中...${NC}"

# Grant necessary roles
ROLES=(
    "roles/firebase.admin"
    "roles/firebasehosting.admin"
    "roles/iam.serviceAccountUser"
)

for ROLE in "${ROLES[@]}"; do
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SA_EMAIL" \
        --role="$ROLE" \
        --quiet
    echo -e "${GREEN}✅ ロール付与: $ROLE${NC}"
done

echo -e "${BLUE}🔑 サービスアカウントキー生成中...${NC}"

# Generate and download service account key
KEY_FILE="$SA_NAME-key.json"
gcloud iam service-accounts keys create $KEY_FILE \
    --iam-account=$SA_EMAIL \
    --project=$PROJECT_ID

echo -e "${GREEN}✅ サービスアカウントキー生成完了: $KEY_FILE${NC}"

echo -e "${BLUE}🎟️  Firebase CI Token生成中...${NC}"

# Generate Firebase CI token
echo -e "${YELLOW}ℹ️  ブラウザでFirebaseにログインしてください...${NC}"
FIREBASE_TOKEN=$(firebase login:ci)

echo -e "${GREEN}✅ Firebase CI Token生成完了${NC}"

echo -e "${BLUE}📋 GitHub Secrets設定情報 ($ENVIRONMENT)${NC}"
echo "================================="
echo -e "${YELLOW}以下の値をGitHub Secretsに設定してください:${NC}"
echo ""

ENV_SUFFIX=$(echo $ENVIRONMENT | tr '[:lower:]' '[:upper:]')

echo -e "${BLUE}🔑 FIREBASE_SERVICE_ACCOUNT_KEY_${ENV_SUFFIX}:${NC}"
echo "$(cat $KEY_FILE | base64 | tr -d '\n')"
echo ""

echo -e "${BLUE}🎟️  FIREBASE_TOKEN_${ENV_SUFFIX}:${NC}"
echo "$FIREBASE_TOKEN"
echo ""

echo -e "${BLUE}🆔 FIREBASE_PROJECT_ID_${ENV_SUFFIX}:${NC}"
echo "$PROJECT_ID"
echo ""

# Get Firebase config
echo -e "${BLUE}⚙️  Firebase設定値 ($ENVIRONMENT):${NC}"
echo "これらの値は環境別に設定してください:"
echo ""
echo "GOOGLE_MAPS_API_KEY_${ENV_SUFFIX}: (Terraformから取得)"
echo "FIREBASE_API_KEY_${ENV_SUFFIX}: (.env.localまたはFirebase Consoleから)"
echo "FIREBASE_AUTH_DOMAIN_${ENV_SUFFIX}: (.env.localまたはFirebase Consoleから)"
echo "FIREBASE_STORAGE_BUCKET_${ENV_SUFFIX}: (.env.localまたはFirebase Consoleから)"
echo "FIREBASE_MESSAGING_SENDER_ID_${ENV_SUFFIX}: (.env.localまたはFirebase Consoleから)"
echo "FIREBASE_APP_ID_${ENV_SUFFIX}: (.env.localまたはFirebase Consoleから)"
echo ""

# Cleanup
echo -e "${YELLOW}🧹 クリーンアップ中...${NC}"
rm -f $KEY_FILE
echo -e "${GREEN}✅ 一時ファイル削除完了${NC}"

echo ""
echo -e "${GREEN}🎉 CI/CDセットアップ完了！($ENVIRONMENT)${NC}"
echo "================================="
echo -e "${BLUE}次のステップ:${NC}"
echo "1. GitHub リポジトリの Settings → Secrets and variables → Actions"
echo "2. 上記の値をSecretとして追加（環境ごとに_DEVまたは_PRODサフィックス付き）"
echo "3. デプロイテスト:"
echo "   - 開発環境: mainブランチにプッシュ"
echo "   - 本番環境: タグを作成 (例: git tag v1.0.0 && git push origin v1.0.0)"
echo ""
echo -e "${YELLOW}📚 詳細な手順は CICD_SETUP.md を参照してください${NC}"
echo ""
echo -e "${BLUE}ℹ️  別環境のセットアップ:${NC}"
if [ "$ENVIRONMENT" = "dev" ]; then
    echo "本番環境: bash scripts/setup-cicd.sh prod rakugakimap-prod"
else
    echo "開発環境: bash scripts/setup-cicd.sh dev rakugakimap-dev"
fi