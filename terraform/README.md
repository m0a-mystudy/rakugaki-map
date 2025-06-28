# Terraform Configuration for Rakugaki Map

このディレクトリには、落書きマップに必要なGCPリソースを自動的にセットアップするTerraform設定が含まれています。

## セットアップされるリソース

- Google Maps JavaScript API の有効化
- API キーの作成（開発環境用の制限付き）
- Firestore Database の作成
- Firestore セキュリティルールの設定

## 前提条件

1. [Terraform](https://www.terraform.io/downloads) のインストール
2. [gcloud CLI](https://cloud.google.com/sdk/docs/install) のインストール
3. GCPプロジェクトの作成
4. 請求先アカウント（Billing Account）の設定

### Billing Account IDについて

Billing Account IDは、GCPの利用料金を管理するアカウントのIDです。

#### 確認方法
```bash
# CLIで確認
gcloud billing accounts list

# 出力例：
# ACCOUNT_ID            NAME                OPEN  MASTER_ACCOUNT_ID
# 01234A-567890-BCDEF1  My Billing Account  True
```

または、[Google Cloud Console](https://console.cloud.google.com/billing)で確認できます。

#### 必要な場面
- **既存プロジェクトを使用**: 不要（すでに紐付け済み）
- **新規プロジェクトをTerraformで作成**: 必須
- **無料トライアル中**: 自動的に作成されている

#### プロジェクトへの紐付け
```bash
# 手動で紐付ける場合
gcloud billing projects link PROJECT_ID --billing-account=BILLING_ACCOUNT_ID
```

## 使用方法

### 環境別セットアップ（推奨）

開発環境と本番環境で設定を分離する場合は、`environments/` ディレクトリを使用します。

```bash
# 開発環境
cd terraform/environments/dev
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars を編集
terraform init
terraform apply

# 本番環境
cd terraform/environments/prod
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars を編集（ドメイン制限も設定）
terraform init -backend-config="bucket=your-prod-state"
terraform apply
```

詳細は [environments/README.md](environments/README.md) を参照

### 単一環境セットアップ

1つの環境のみ使用する場合：

1. **認証設定**
```bash
gcloud auth application-default login
```

2. **変数ファイルの作成**
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

3. **terraform.tfvars を編集**
```hcl
project_id = "your-actual-project-id"
```

4. **Terraform初期化とState設定**
```bash
# Stateバケット作成
terraform init
terraform apply -target=google_storage_bucket.terraform_state

# backend.tf を編集してバケット名を設定
terraform init -migrate-state
```

5. **リソースの作成**
```bash
terraform apply
```

6. **API キーの取得**
```bash
terraform output -raw api_key
```

## セキュリティ注意事項

- 作成されるAPIキーは開発環境用です（localhost のみ許可）
- 本番環境では `main.tf` の `allowed_referrers` を本番ドメインに変更してください
- Firestoreルールも開発用です。本番環境では認証を追加してください

## リソースの削除

```bash
terraform destroy
```

## State管理（重要）

### 推奨設定：GCSリモートState

個人開発でもPCの故障やデータ損失を防ぐため、**GCSリモートStateの使用を強く推奨**します。

#### 初回セットアップ手順

1. **backend.tf の backend ブロックをコメントアウト**
```bash
# terraform ブロック全体をコメントアウトしてください
```

2. **State保存用のGCSバケット作成**
```bash
terraform apply -target=google_storage_bucket.terraform_state
```

3. **作成されたバケット名を確認**
```bash
terraform output state_bucket_name
```

4. **backend.tf を編集してバケット名を設定**
```hcl
terraform {
  backend "gcs" {
    bucket = "your-project-id-terraform-state"  # 実際のバケット名に置き換え
    prefix = "rakugaki-map"
  }
}
```

5. **リモートStateに移行**
```bash
terraform init -migrate-state
# "yes" と入力して移行を確認
```

### GCSリモートStateの利点
- **自動バックアップ**: Stateファイルの履歴を10世代保持
- **暗号化**: Google管理の暗号化で安全に保存
- **ロック機能**: 同時実行を防ぐ自動ロック
- **データ損失防止**: PCが壊れてもStateは安全

### State管理のベストプラクティス
- **すべての環境でGCSを使用**: 個人開発でもリモートState推奨
- **バケットの削除防止**: `force_destroy = false` で誤削除を防止
- **定期的なState確認**: `terraform show` でState内容を確認

## トラブルシューティング

### APIが有効化されない
- プロジェクトに請求先アカウントが設定されているか確認
- `terraform apply` を再実行

### Firestoreエラー
- 同じプロジェクトで既にFirestoreが有効な場合、手動で削除が必要

### State関連のエラー
- ローカルStateが壊れた場合: `terraform.tfstate.backup` から復元
- リモートStateへのアクセスエラー: GCS権限を確認