#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔧 Google Maps API Key制限更新スクリプト${NC}"
echo "==========================================="

# Check environment
ENVIRONMENT=${1:-dev}
HOSTING_URL=${2}

if [ -z "$HOSTING_URL" ]; then
    echo -e "${RED}❌ 使用方法: $0 <environment> <hosting-url>${NC}"
    echo "例: $0 dev https://rakugakimap-dev.web.app"
    exit 1
fi

echo -e "${YELLOW}📋 環境: $ENVIRONMENT${NC}"
echo -e "${YELLOW}🌐 ホスティングURL: $HOSTING_URL${NC}"

# Extract domain from URL
DOMAIN=$(echo $HOSTING_URL | sed 's|https://||' | sed 's|/.*||')
echo -e "${YELLOW}🏷️  ドメイン: $DOMAIN${NC}"

# Update Terraform variables
TERRAFORM_DIR="terraform/environments/$ENVIRONMENT"

if [ ! -d "$TERRAFORM_DIR" ]; then
    echo -e "${RED}❌ Terraform環境ディレクトリが見つかりません: $TERRAFORM_DIR${NC}"
    exit 1
fi

cd "$TERRAFORM_DIR"

# Check if allowed_domains variable exists in terraform.tfvars
if grep -q "allowed_domains" terraform.tfvars 2>/dev/null; then
    echo -e "${YELLOW}🔄 既存のallowed_domains設定を更新しています...${NC}"
    # Update existing
    sed -i.bak "s|allowed_domains = \[.*\]|allowed_domains = [\"${DOMAIN}/*\", \"${DOMAIN}\"]|" terraform.tfvars
else
    echo -e "${YELLOW}➕ allowed_domains設定を追加しています...${NC}"
    # Add new
    echo "" >> terraform.tfvars
    echo "# Firebase Hosting domain restrictions" >> terraform.tfvars
    echo "allowed_domains = [\"${DOMAIN}/*\", \"${DOMAIN}\"]" >> terraform.tfvars
fi

echo -e "${YELLOW}🚀 Terraformを適用しています...${NC}"

# Apply Terraform changes
terraform plan
read -p "上記の変更を適用しますか? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    terraform apply -auto-approve
    echo -e "${GREEN}✅ API Key制限が更新されました！${NC}"
    echo -e "${GREEN}🔒 新しい制限: $DOMAIN${NC}"
else
    echo -e "${YELLOW}⏸️  適用をキャンセルしました${NC}"
fi

cd - > /dev/null
