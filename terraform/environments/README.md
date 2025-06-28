# 環境別Terraform設定

このディレクトリには開発環境と本番環境の設定が分離されています。

## ディレクトリ構造

```
environments/
├── dev/                    # 開発環境
│   ├── main.tf            # 開発環境の設定
│   ├── terraform.tfvars.example  # 変数ファイルの例
│   └── .gitignore         # tfvarsを除外
└── prod/                   # 本番環境
    ├── main.tf            # 本番環境の設定（厳格な制限）
    ├── terraform.tfvars.example  # 変数ファイルの例
    └── .gitignore         # tfvarsを除外
```

## 使用方法

### 開発環境

```bash
cd terraform/environments/dev

# 設定ファイルを作成
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars を編集

# 初期化と実行
terraform init
terraform plan
terraform apply

# APIキーの取得
terraform output -raw api_key
```

### 本番環境

```bash
cd terraform/environments/prod

# 設定ファイルを作成
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars を編集（ドメイン制限を設定）

# State用バケットを設定後、初期化
terraform init -backend-config="bucket=your-prod-terraform-state"
terraform plan
terraform apply

# 本番用APIキーの取得
terraform output -raw api_key_prod
```

## 環境別の違い

### 開発環境（dev）
- APIキー制限: localhost のみ
- State管理: ローカル（オプションでGCS）
- セキュリティ: 緩い設定

### 本番環境（prod）
- APIキー制限: 指定ドメインのみ
- State管理: GCS必須
- セキュリティ: 厳格な設定
- 追加のAPIキー: 本番専用キーを作成

## terraform.tfvars の管理

各環境で独立した `terraform.tfvars` を持つことで：

1. **環境の分離**: 開発と本番の設定が混在しない
2. **安全性**: 本番の設定を誤って開発に使用しない
3. **柔軟性**: 環境ごとに異なるプロジェクトID、リージョン、制限を設定

## ベストプラクティス

1. **tfvarsファイルはGitにコミットしない**（.gitignoreで除外済み）
2. **本番環境は必ずGCS Stateを使用**
3. **APIキーは環境変数経由で使用**:
   ```bash
   export GOOGLE_MAPS_API_KEY=$(terraform output -raw api_key)
   ```
4. **定期的なState確認**:
   ```bash
   terraform state list
   terraform state show <resource>
   ```
