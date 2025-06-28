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

2. **Terraformでのセットアップ**
```bash
# 認証
gcloud auth application-default login

# Terraform設定
cd terraform
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars を編集してproject_idを設定

# リソース作成
terraform init
terraform apply

# APIキーの取得
terraform output -raw api_key
```

詳細は [terraform/README.md](terraform/README.md) を参照

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

#### 3.4 Authentication の設定（将来の拡張用）

1. Firebase Console で「Authentication」を選択
2. 「始める」をクリック
3. 「Sign-in method」タブで必要な認証方式を有効化
   - Google
   - メール/パスワード
   - など

### 4. 環境変数の設定

`.env.local` ファイルを作成し、以下の値を設定：

```bash
# Google Maps API
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

**設定値の取得方法:**
- Firebase Console → プロジェクト設定 → 「全般」タブ
- 「マイアプリ」セクションでWebアプリを選択
- 「構成」に表示される値をコピー

### 5. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:5173 でアプリケーションにアクセスできます。

## 本番デプロイ

### Firebase Hosting を使用する場合

1. Firebase CLI のインストール:
```bash
npm install -g firebase-tools
```

2. Firebase にログイン:
```bash
firebase login
```

3. Firebase プロジェクトの初期化:
```bash
firebase init hosting
```

4. ビルドとデプロイ:
```bash
npm run build
firebase deploy
```

### その他のホスティングサービス

1. ビルド実行:
```bash
npm run build
```

2. `dist/` フォルダの内容をホスティングサービスにアップロード

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

### 保存機能が動作しない
- Firebase設定が正しいか確認
- Firestore Database が作成されているか確認
- ブラウザの開発者ツールでネットワークエラーを確認

### CORS エラーが発生する
- Firebase Hosting を使用するか、適切なCORS設定を行う

## 開発

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# プレビュー
npm run preview
```

## ライセンス

MIT License