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
4. 請求先アカウントの設定

## 使用方法

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

4. **Terraform初期化**
```bash
terraform init
```

5. **プランの確認**
```bash
terraform plan
```

6. **リソースの作成**
```bash
terraform apply
```

7. **API キーの取得**
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

## State管理

### 現在の設定（ローカルState）
- デフォルトではStateファイルはローカル（`terraform.tfstate`）に保存されます
- `.gitignore`で除外されているため、Gitにはコミットされません
- **個人開発や検証環境向け**

### リモートState設定（推奨：チーム開発・本番環境）

1. **State保存用のGCSバケット作成**
```bash
# state-bucket.tf のコメントを解除してバケットを作成
terraform apply -target=google_storage_bucket.terraform_state
```

2. **backend.tf を編集**
```hcl
terraform {
  backend "gcs" {
    bucket  = "your-project-id-terraform-state"
    prefix  = "rakugaki-map"
  }
}
```

3. **Stateの移行**
```bash
terraform init -migrate-state
```

### State管理のベストプラクティス
- **開発環境**: ローカルStateでOK
- **本番環境**: 必ずリモートState（GCS）を使用
- **チーム開発**: リモートState + State Locking
- **複数環境**: workspaceまたは異なるprefixを使用

## トラブルシューティング

### APIが有効化されない
- プロジェクトに請求先アカウントが設定されているか確認
- `terraform apply` を再実行

### Firestoreエラー
- 同じプロジェクトで既にFirestoreが有効な場合、手動で削除が必要

### State関連のエラー
- ローカルStateが壊れた場合: `terraform.tfstate.backup` から復元
- リモートStateへのアクセスエラー: GCS権限を確認