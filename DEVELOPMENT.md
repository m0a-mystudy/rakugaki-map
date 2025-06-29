# 開発環境セットアップ

このドキュメントでは、rakugaki-mapの開発環境セットアップ手順を説明します。

## 前提条件

- [Node.js](https://nodejs.org/) 18以上
- [npm](https://www.npmjs.com/)
- [Terraform](https://www.terraform.io/downloads) (推奨セットアップ)
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) (推奨セットアップ)

## 1. リポジトリのクローン

```bash
git clone <repository-url>
cd rakugaki-map
npm install
```

## 2. Google Cloud Platform (GCP) 設定

### 自動セットアップ（Terraform使用 - 推奨）

1. **前提条件**
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

**インフラ管理について**: このプロジェクトはTerraformとマニュアル管理の**ハイブリッドアプローチ**を採用しています。APIサービス、Firestore、認証設定など14個のリソースをTerraformで管理し、セキュリティ基盤（WIF、Secret Manager、State Bucket）は手動管理しています。詳細は [INFRASTRUCTURE.md](INFRASTRUCTURE.md) を参照してください。

### 手動セットアップ

1. **プロジェクトの作成**
   - [Google Cloud Console](https://console.cloud.google.com/) にアクセス
   - 新しいプロジェクトを作成するか、既存のプロジェクトを選択

2. **Google Maps JavaScript API の有効化**
   - 「APIとサービス」→「ライブラリ」→ "Maps JavaScript API" を検索して有効化

3. **APIキーの作成と制限**
   - 「APIとサービス」→「認証情報」→「APIキー」を作成
   - HTTPリファラー制限: `localhost:*` (開発用)
   - API制限: Maps JavaScript API のみ許可

## 3. Firebase設定

### 3.1 Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. 先ほど作成したGCPプロジェクトを選択するか、新規作成
4. Googleアナリティクスの設定（任意）

### 3.2 Webアプリの追加

1. Firebase Console でプロジェクトを選択
2. 「アプリを追加」→ウェブアイコン（</>）をクリック
3. アプリ名を入力（例: "rakugaki-map"）
4. Firebase Hostingは一旦スキップ
5. 設定情報が表示されるのでコピーしておく

### 3.3 Firestore Database の設定

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

### 3.4 Authentication の設定

**Terraformでセットアップ済みの場合**: 匿名認証が自動で有効化されています

**手動セットアップの場合**:
1. Firebase Console で「Authentication」を選択
2. 「始める」をクリック
3. 「Sign-in method」タブで「匿名」を有効化（必須）
4. その他の認証方式も必要に応じて有効化
   - Google
   - メール/パスワード
   - など

## 4. 環境変数の設定

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

## 5. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:5173 でアプリケーションにアクセスできます。

## 6. 環境別デプロイ用APIキーの使い分け

- **開発環境**: `localhost` 制限のAPIキー（セキュアで開発に最適）
- **本番環境**: 指定ドメイン制限のAPIキー（本番サイト用）

```bash
# 本番デプロイ時の環境変数設定例
export VITE_GOOGLE_MAPS_API_KEY=$(cd terraform/environments/prod && terraform output -raw api_key_prod)
npm run build
```

## 開発コマンド

```bash
npm run dev                # 開発サーバー起動
npm run dev:host           # 開発サーバー (ネットワークアクセス可能)
npm run dev:emulator       # Firestore emulator のみ起動
npm run dev:with-emulator  # 開発サーバー + Firestore emulator
npm run dev:emulator-host  # 開発サーバー + emulator (ネットワークアクセス可能)
npm run build              # TypeScript チェック + プロダクションビルド
npm run preview            # プロダクションビルドをローカルでプレビュー
```

## セキュリティコマンド

```bash
npm run security:scan       # detect-secrets スキャン実行
npm run security:gitleaks   # gitleaks でシークレット検出
npm run security:all        # 両方のセキュリティスキャンを実行
npm run precommit           # pre-commit フック全実行
npm run firestore:rules     # Firestore セキュリティルールのみデプロイ
```
