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

## トラブルシューティング

### APIが有効化されない
- プロジェクトに請求先アカウントが設定されているか確認
- `terraform apply` を再実行

### Firestoreエラー
- 同じプロジェクトで既にFirestoreが有効な場合、手動で削除が必要