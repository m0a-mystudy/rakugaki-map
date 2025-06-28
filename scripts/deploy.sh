#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Rakugaki Map デプロイスクリプト${NC}"
echo "================================="

# Check environment
ENVIRONMENT=${1:-dev}
echo -e "${YELLOW}📋 環境: $ENVIRONMENT${NC}"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI がインストールされていません${NC}"
    echo "インストール方法: npm install -g firebase-tools"
    exit 1
fi

# Check if logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo -e "${YELLOW}🔐 Firebase にログインしています...${NC}"
    firebase login
fi

# Build the application
echo -e "${YELLOW}🔨 アプリケーションをビルドしています...${NC}"

# Check environment variables
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ .env.local ファイルが見つかりません${NC}"
    echo "Terraform出力からAPIキーを取得してください:"
    echo "cd terraform/environments/$ENVIRONMENT && terraform output -raw api_key"
    exit 1
fi

# Build
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ ビルドに失敗しました${NC}"
    exit 1
fi

echo -e "${GREEN}✅ ビルド完了${NC}"

# Deploy to Firebase Hosting
echo -e "${YELLOW}🌐 Firebase Hosting にデプロイしています...${NC}"

# Set the project
firebase use $ENVIRONMENT

# Deploy
firebase deploy --only hosting

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ デプロイ完了！${NC}"

    # Get hosting URL
    PROJECT_ID=$(firebase use --project-name)
    if [ "$ENVIRONMENT" = "dev" ]; then
        echo -e "${GREEN}🌐 アプリケーションURL: https://$PROJECT_ID.web.app${NC}"
    else
        echo -e "${GREEN}🌐 アプリケーションURL: https://$PROJECT_ID.web.app${NC}"
    fi
else
    echo -e "${RED}❌ デプロイに失敗しました${NC}"
    exit 1
fi
