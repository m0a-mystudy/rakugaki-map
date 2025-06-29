# インフラストラクチャ管理

このドキュメントでは、rakugaki-mapのインフラ管理アプローチとWorkload Identity Federation (WIF) の運用について説明します。

## インフラ管理アプローチ

### ハイブリッド管理構造

このプロジェクトでは、**ハイブリッドインフラ管理アプローチ**を採用しています：

#### 🔒 手動管理リソース（セキュリティ基盤）
- Terraform state buckets (circular dependency avoidance)
- Workload Identity Federation resources (security separation)
- Secret Manager secrets and versions (security)

#### ⚙️ Terraform管理リソース（アプリケーションインフラ）
- API services (Maps, Firebase, Firestore, Identity Toolkit)
- Google Maps API key with domain restrictions
- Firestore database and security rules
- Firebase Authentication configuration

### 管理分離の理由

- **Security**: Authentication infrastructure isolated from application infrastructure
- **Safety**: CI/CD cannot modify its own security foundations
- **Maintainability**: Clear separation of automated vs. manual management
- **Debugging**: Obvious responsibility boundaries

## Terraform操作

### インフラデプロイメント

```bash
# 開発環境
cd terraform/environments/dev
terraform init && terraform apply

# 本番環境
cd terraform/environments/prod
terraform init && terraform apply
```

### 環境変数取得

```bash
# APIキー取得
terraform output -raw api_key

# Firebase設定取得
gcloud secrets versions access latest --secret="firebase-api-key-dev"  # pragma: allowlist secret
```

### インフラ変更フロー

**Terraform Resources (Application Infrastructure)**:
```bash
# 1. 開発環境でテスト
cd terraform/environments/dev
terraform plan && terraform apply

# 2. 変更をコミット
git add terraform/ && git commit -m "feat: update infrastructure"

# 3. 本番環境に適用
cd terraform/environments/prod
terraform plan && terraform apply
```

**Manual Resources (Security Foundations)**:
- State buckets: Manual GCS operations
- WIF: Manual gcloud commands with careful testing
- Secrets: Manual Secret Manager operations
- See detailed docs in terraform/ directory

## 🔐 Workload Identity Federation (WIF) 運用

### WIF管理方針

このプロジェクトでは、WIF (Workload Identity Federation) は**手動管理**を採用しています。これはCI/CDサービスアカウントが自身の認証基盤を変更することによるセキュリティリスクを回避するためです。

### WIF操作手順

#### 新しいリポジトリの追加

1. **現在の設定確認**
```bash
gcloud iam workload-identity-pools providers describe github-provider \\
    --location=global \\
    --workload-identity-pool=github-actions-pool \\
    --project=rakugakimap-dev
```

2. **リポジトリ条件の更新**
```bash
# 複数リポジトリを許可する場合
gcloud iam workload-identity-pools providers update github-provider \\
    --location=global \\
    --workload-identity-pool=github-actions-pool \\
    --attribute-condition="attribute.repository=='m0a-mystudy/rakugaki-map' || attribute.repository=='m0a-mystudy/new-repo'" \\
    --project=rakugakimap-dev
```

#### 権限の調整

1. **現在の権限確認**
```bash
gcloud projects get-iam-policy rakugakimap-dev \\
    --flatten="bindings[].members" \\
    --filter="bindings.members:github-actions-wif@rakugakimap-dev.iam.gserviceaccount.com"
```

2. **不要な権限の削除**
```bash
gcloud projects remove-iam-policy-binding rakugakimap-dev \\
    --member="serviceAccount:github-actions-wif@rakugakimap-dev.iam.gserviceaccount.com" \\
    --role="roles/unnecessary-role"
```

3. **必要な権限の追加**
```bash
gcloud projects add-iam-policy-binding rakugakimap-dev \\
    --member="serviceAccount:github-actions-wif@rakugakimap-dev.iam.gserviceaccount.com" \\
    --role="roles/secretmanager.admin"
```

#### 新環境（prod）の追加

1. **Workload Identity Pool作成**
```bash
gcloud iam workload-identity-pools create github-actions-pool-prod \\
    --location=global \\
    --display-name="GitHub Actions Pool - Production" \\
    --description="Workload Identity Pool for GitHub Actions (Production)" \\
    --project=rakugakimap-prod
```

2. **GitHub Provider作成**
```bash
gcloud iam workload-identity-pools providers create-oidc github-provider-prod \\
    --location=global \\
    --workload-identity-pool=github-actions-pool-prod \\
    --display-name="GitHub Provider - Production" \\
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \\
    --attribute-condition="attribute.repository=='m0a-mystudy/rakugaki-map' && attribute.ref=='refs/heads/main'" \\
    --issuer-uri="https://token.actions.githubusercontent.com" \\
    --project=rakugakimap-prod
```

### WIF運用のベストプラクティス

#### ✅ DO
- **事前バックアップ**: 変更前に設定をエクスポート
- **最小権限**: 必要最小限の権限のみ付与
- **段階的変更**: 一度に大量の変更を避ける
- **動作確認**: 変更後は必ずGitHub Actionsで動作テスト

#### ❌ DON'T
- **権限の過剰付与**: editorやownerなど強力な権限の付与
- **テストなし変更**: 本番環境での直接変更
- **バックアップなし**: 設定の事前保存を怠る
- **一括変更**: 複数の設定を同時に変更

### 緊急時対応

#### 認証エラー発生時
```bash
# 1. 一時的権限付与（緊急時のみ）
gcloud projects add-iam-policy-binding rakugakimap-dev \\
    --member="user:your-email@example.com" \\
    --role="roles/owner"

# 2. 問題解決後の権限削除
gcloud projects remove-iam-policy-binding rakugakimap-dev \\
    --member="user:your-email@example.com" \\
    --role="roles/owner"
```

### 定期メンテナンス

#### 簡単な監査（推奨）
```bash
# 現在の設定確認
./scripts/wif-management.sh show-config -p rakugakimap-dev -e dev

# 不要な権限の確認
./scripts/wif-management.sh list-permissions -p rakugakimap-dev -e dev
```

> **バックアップについて**: WIF設定はシンプルな文字列設定のため、バックアップは不要です。設定は常にGCPコンソールで確認でき、手動で復旧可能です。

### WIF管理スクリプト

よく使用されるWIF操作については、安全性を確保したスクリプトを提供しています：

#### 基本的な使用方法

```bash
# スクリプトに実行権限を付与
chmod +x scripts/wif-management.sh

# ヘルプを表示
./scripts/wif-management.sh --help
```

#### 主要なコマンド

```bash
# 1. 許可されているリポジトリの確認
./scripts/wif-management.sh list-repos -p rakugakimap-dev -e dev

# 2. 新しいリポジトリの追加（まずドライランで確認）
./scripts/wif-management.sh add-repo -p rakugakimap-dev -e dev -r m0a-mystudy/new-repo --dry-run

# 3. 新しいリポジトリの追加（実際の実行）
./scripts/wif-management.sh add-repo -p rakugakimap-dev -e dev -r m0a-mystudy/new-repo

# 4. サービスアカウントの権限確認
./scripts/wif-management.sh list-permissions -p rakugakimap-dev -e dev

# 5. 現在のWIF設定全体を表示
./scripts/wif-management.sh show-config -p rakugakimap-dev -e dev
```

#### スクリプトの安全機能

- **ドライランモード**: 実際の変更前にテスト実行
- **入力検証**: 不正な形式の入力を防止
- **確認プロンプト**: 重要な変更時に明示的な確認
- **設定確認**: 現在の状態を簡単に表示
- **即座復旧**: GCPコンソールで設定確認・復旧可能

> **シンプル性重視**: WIF設定は文字列1行程度のシンプルな設定なので、バックアップ機能は提供していません。設定はいつでもGCPコンソールで確認でき、手動復旧も容易です。

### 参考ファイル

WIF設定の詳細は以下のファイルに保管されています：
- `terraform/workload-identity.tf.manual`: WIFリソースの定義（参考用）
- `terraform/main-with-wif.tf.backup`: WIF含む完全な構成（バックアップ）
- `scripts/wif-management.sh`: WIF操作用スクリプト

> **重要**: これらのファイル中、`.manual`と`.backup`ファイルはTerraformでは実行されません。WIF設定の参考およびバックアップ目的で保管されています。

## Manual Resource Management

### State Bucket Operations
See `terraform/STATE_BUCKET_MANAGEMENT.md` for state bucket operations

### Secret Operations
See `terraform/SECRET_MANAGEMENT.md` for secret operations

### Complete Infrastructure Overview
See `terraform/INFRASTRUCTURE_MANAGEMENT.md` for complete overview
