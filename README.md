# 落書きマップ (Rakugaki Map)

地図上に描画して友人と共有できるWebアプリケーションです。

## 機能

- 🗺️ Google Maps上での描画
- ✏️ 複数の描画ツール（ペン、直線、四角形、円）
- 🎨 カラーパレット（8色）
- 📏 線の太さ調整
- 💾 描画データの保存（Firebase Firestore）
- 🔗 共有リンク生成
- 📱 レスポンシブデザイン
- 🔒 セキュアなアクセス制御（読み取り全員、編集は認証済みユーザーのみ）

## セットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd rakugaki-map
npm install
```

### 2. Google Cloud Platform (GCP) 設定

#### 自動セットアップ（Terraform使用 - 推奨）

1. **前提条件**
   - [Terraform](https://www.terraform.io/downloads) のインストール
   - [gcloud CLI](https://cloud.google.com/sdk/docs/install) のインストール
   - GCPプロジェクトの作成と請求先アカウントの設定

2. **環境別セットアップ**

**開発環境:**
```bash
# 認証
gcloud auth application-default login

# 開発環境設定
cd terraform/environments/dev
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars を編集してproject_idを設定

# 実行
terraform init
terraform apply

# APIキーの取得
terraform output -raw api_key
```

**本番環境:**
```bash
# 本番環境設定
cd terraform/environments/prod
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars を編集（project_id, allowed_domains）

# State設定
terraform init -backend-config="bucket=your-prod-terraform-state"
terraform apply

# 本番APIキーの取得
terraform output -raw api_key_prod
```

詳細は [terraform/README.md](terraform/README.md) を参照

**インフラ管理について**: このプロジェクトはTerraformとマニュアル管理の**ハイブリッドアプローチ**を採用しています。APIサービス、Firestore、認証設定など14個のリソースをTerraformで管理し、セキュリティ基盤（WIF、Secret Manager、State Bucket）は手動管理しています。詳細は [terraform/INFRASTRUCTURE_MANAGEMENT.md](terraform/INFRASTRUCTURE_MANAGEMENT.md) を参照してください。

#### 手動セットアップ

1. **プロジェクトの作成**
   - [Google Cloud Console](https://console.cloud.google.com/) にアクセス
   - 新しいプロジェクトを作成するか、既存のプロジェクトを選択

2. **Google Maps JavaScript API の有効化**
   - 「APIとサービス」→「ライブラリ」→ "Maps JavaScript API" を検索して有効化

3. **APIキーの作成と制限**
   - 「APIとサービス」→「認証情報」→「APIキー」を作成
   - HTTPリファラー制限: `localhost:*` (開発用)
   - API制限: Maps JavaScript API のみ許可

### 3. Firebase設定

#### 3.1 Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. 先ほど作成したGCPプロジェクトを選択するか、新規作成
4. Googleアナリティクスの設定（任意）

#### 3.2 Webアプリの追加

1. Firebase Console でプロジェクトを選択
2. 「アプリを追加」→ウェブアイコン（</>）をクリック
3. アプリ名を入力（例: "rakugaki-map"）
4. Firebase Hostingは一旦スキップ
5. 設定情報が表示されるのでコピーしておく

#### 3.3 Firestore Database の設定

**Terraformでセットアップ済みの場合**: Firestoreは自動作成されています

**手動セットアップの場合**:
1. Firebase Console で「Firestore Database」を選択
2. 「データベースの作成」をクリック
3. データベースの場所を選択（asia-northeast1 推奨）
4. セキュリティルール：開発は「テストモード」、本番は以下を設定

```javascript
// Firestore Security Rules (本番環境用)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /drawings/{documentId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

#### 3.4 Authentication の設定

**Terraformでセットアップ済みの場合**: 匿名認証が自動で有効化されています

**手動セットアップの場合**:
1. Firebase Console で「Authentication」を選択
2. 「始める」をクリック
3. 「Sign-in method」タブで「匿名」を有効化（必須）
4. その他の認証方式も必要に応じて有効化
   - Google
   - メール/パスワード
   - など

### 4. 環境変数の設定

`.env.local` ファイルを作成し、以下の値を設定：

```bash
# Google Maps API (Terraformで作成したキーを使用)
VITE_GOOGLE_MAPS_API_KEY=your_terraform_generated_api_key

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

**設定値の取得方法:**

1. **Google Maps API Key**:
   ```bash
   # 開発環境
   cd terraform/environments/dev
   terraform output -raw api_key

   # 本番環境
   cd terraform/environments/prod
   terraform output -raw api_key_prod
   ```

2. **Firebase設定**: Firebase Console → プロジェクト設定 → 「全般」タブ → 「マイアプリ」→「構成」

### 5. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:5173 でアプリケーションにアクセスできます。

### 6. 環境別デプロイ用APIキーの使い分け

- **開発環境**: `localhost` 制限のAPIキー（セキュアで開発に最適）
- **本番環境**: 指定ドメイン制限のAPIキー（本番サイト用）

```bash
# 本番デプロイ時の環境変数設定例
export VITE_GOOGLE_MAPS_API_KEY=$(cd terraform/environments/prod && terraform output -raw api_key_prod)
npm run build
```

## 本番デプロイ

### 🤖 CI/CD 自動デプロイ（推奨）

**GitHub Actions による自動デプロイ:**
- **mainブランチにプッシュ** → 自動で**開発環境**デプロイ
- **タグ作成 (v*.*.*)** → 自動で**本番環境**デプロイ
- **Pull Request作成** → 自動でプレビューデプロイ（7日間）

**初回セットアップ:**
```bash
# 開発環境CI/CDセットアップ
bash scripts/setup-cicd.sh dev

# 本番環境CI/CDセットアップ
bash scripts/setup-cicd.sh prod

# GitHub Secretsに表示された値を設定（_DEV/_PRODサフィックス付き）
# 詳細は CICD_SETUP.md を参照
```

**デプロイ方法:**
```bash
# 開発環境へデプロイ
git push origin main

# 本番環境へデプロイ
git tag v1.0.0
git push origin v1.0.0
```

### 🚀 手動デプロイ

**ワンコマンドデプロイ:**
```bash
# 開発環境へデプロイ
npm run deploy:dev

# 本番環境へデプロイ
npm run deploy:prod
```

デプロイスクリプトが以下を自動実行します：
- ✅ Firebase CLIログイン確認
- ✅ 環境変数チェック
- ✅ アプリケーションビルド
- ✅ Firebase Hostingデプロイ
- ✅ デプロイURL表示

### 🔧 手動セットアップ（初回のみ）

**Firebase CLI インストール:**
```bash
npm install -g firebase-tools
```

**Firebase初期化:**
```bash
firebase login
firebase init hosting
```

### 📊 デプロイ後の作業

**1. APIキー制限の更新:**
```bash
# デプロイURL取得
cd terraform/environments/dev
terraform output hosting_url

# API制限を本番URLに更新
npm run api:update-restrictions dev https://rakugakimap-dev.web.app
```

**2. 手動でのAPIキー制限更新:**
- [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → APIキー
- HTTPリファラー制限に本番ドメインを追加

### その他のホスティングサービス

1. ビルド実行:
```bash
npm run build
```

2. `dist/` フォルダの内容をホスティングサービスにアップロード

## セキュリティ仕様

このアプリケーションは以下のセキュリティモデルを採用しています：

### アクセス制御
- **読み取り**: 誰でも落書きマップを閲覧可能
- **書き込み**: 認証済みユーザーのみ編集可能
- **認証方式**: Firebase匿名認証（自動で認証される）

### Firestore セキュリティルール
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /drawings/{documentId} {
      allow read: if true;                    // 全員が読み取り可能
      allow write: if request.auth != null;  // 認証済みユーザーのみ書き込み可能
    }
  }
}
```

### 実装詳細
- 初回保存時に自動で匿名認証を実行
- 認証状態はセッション中保持される
- Terraformで一貫したセキュリティ設定を管理

## 🔐 Workload Identity Federation (WIF) 運用

### WIF管理方針

このプロジェクトでは、WIF (Workload Identity Federation) は**手動管理**を採用しています。これはCI/CDサービスアカウントが自身の認証基盤を変更することによるセキュリティリスクを回避するためです。

### 管理分離構造

#### 🔒 手動管理リソース（セキュリティ基盤）
- `google_iam_workload_identity_pool`
- `google_iam_workload_identity_pool_provider`
- `google_service_account` (github-actions-wif)
- WIF関連のIAM権限

#### ⚙️ Terraform管理リソース（アプリケーションインフラ）
- `google_apikeys_key` (Maps API)
- `google_firestore_database`
- `google_secret_manager_secret`
- `google_project_service` (API有効化)

### WIF操作手順

#### 新しいリポジトリの追加

1. **現在の設定確認**
```bash
gcloud iam workload-identity-pools providers describe github-provider \
    --location=global \
    --workload-identity-pool=github-actions-pool \
    --project=rakugakimap-dev
```

2. **リポジトリ条件の更新**
```bash
# 複数リポジトリを許可する場合
gcloud iam workload-identity-pools providers update github-provider \
    --location=global \
    --workload-identity-pool=github-actions-pool \
    --attribute-condition="attribute.repository=='m0a-mystudy/rakugaki-map' || attribute.repository=='m0a-mystudy/new-repo'" \
    --project=rakugakimap-dev
```

#### 権限の調整

1. **現在の権限確認**
```bash
gcloud projects get-iam-policy rakugakimap-dev \
    --flatten="bindings[].members" \
    --filter="bindings.members:github-actions-wif@rakugakimap-dev.iam.gserviceaccount.com"
```

2. **不要な権限の削除**
```bash
gcloud projects remove-iam-policy-binding rakugakimap-dev \
    --member="serviceAccount:github-actions-wif@rakugakimap-dev.iam.gserviceaccount.com" \
    --role="roles/unnecessary-role"
```

3. **必要な権限の追加**
```bash
gcloud projects add-iam-policy-binding rakugakimap-dev \
    --member="serviceAccount:github-actions-wif@rakugakimap-dev.iam.gserviceaccount.com" \
    --role="roles/secretmanager.admin"
```

#### 新環境（prod）の追加

1. **Workload Identity Pool作成**
```bash
gcloud iam workload-identity-pools create github-actions-pool-prod \
    --location=global \
    --display-name="GitHub Actions Pool - Production" \
    --description="Workload Identity Pool for GitHub Actions (Production)" \
    --project=rakugakimap-prod
```

2. **GitHub Provider作成**
```bash
gcloud iam workload-identity-pools providers create-oidc github-provider-prod \
    --location=global \
    --workload-identity-pool=github-actions-pool-prod \
    --display-name="GitHub Provider - Production" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition="attribute.repository=='m0a-mystudy/rakugaki-map' && attribute.ref=='refs/heads/main'" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
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
gcloud projects add-iam-policy-binding rakugakimap-dev \
    --member="user:your-email@example.com" \
    --role="roles/owner"

# 2. 問題解決後の権限削除
gcloud projects remove-iam-policy-binding rakugakimap-dev \
    --member="user:your-email@example.com" \
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

## 料金について

### Google Maps API
- 月28,500リクエストまで無料
- 超過分は1,000リクエストあたり$2

### Firebase
- **Firestore**: 1日あたり50,000読み取り、20,000書き込み、1GBまで無料
- **Hosting**: 月10GBまで無料
- **Authentication**: 月50,000認証まで無料

## トラブルシューティング

### 地図が表示されない
- Google Maps APIキーが正しく設定されているか確認
- APIキーの制限設定を確認
- ブラウザの開発者ツールでエラーメッセージを確認

### 保存機能が動作しない（permission-denied エラー）
- **Terraformユーザー**: 全ての設定が自動で完了しているはずです
- **手動セットアップユーザー**: [Firestore設定手順](./FIRESTORE_SETUP.md) を確認してセキュリティルールを設定
- Firebase Authentication で匿名認証が有効になっているか確認
- Firestore Database が作成されているか確認
- ブラウザの開発者ツールでネットワークエラーを確認

### CORS エラーが発生する
- Firebase Hosting を使用するか、適切なCORS設定を行う

## 開発

### 🛠️ 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# プレビュー
npm run preview

# デプロイ
npm run deploy:dev
```

### 🚀 デプロイコマンド

```bash
# 開発環境デプロイ
npm run deploy:dev

# 本番環境デプロイ
npm run deploy:prod

# ホスティングのみデプロイ
npm run hosting:deploy

# APIキー制限更新
npm run api:update-restrictions dev https://your-domain.web.app

# CI/CD セットアップ
bash scripts/setup-cicd.sh
```

### 🤖 CI/CD ワークフロー

**利用可能なワークフロー:**
- `.github/workflows/deploy.yml`: メイン自動デプロイ
- `.github/workflows/security.yml`: セキュリティチェック

**ワークフロー状況確認:**
- GitHub Actions タブでデプロイ状況を確認
- エラー時は詳細ログを確認

## ライセンス

MIT License
