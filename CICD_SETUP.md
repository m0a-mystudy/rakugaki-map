# CI/CD セットアップガイド

GitHub ActionsでFirebase Hostingへの自動デプロイを設定する手順です。

## 🚀 概要

### デプロイフロー
- **main ブランチ**: 自動で**開発環境**にデプロイ
- **タグ (v*.*.*)**: 自動で**本番環境**にデプロイ
- **Pull Request**: プレビューデプロイ（7日間有効）

### 自動化機能
- **セキュリティチェック**: 各デプロイ前に実行
- **デプロイ通知**: GitHub上にURL付きコメント
- **環境別設定**: dev/prod環境を自動判別

## 📋 必要な準備

### 1. 自動セットアップ（推奨）

#### 開発環境
```bash
# 開発環境用CI/CDセットアップ
bash scripts/setup-cicd.sh dev rakugakimap-dev
```

#### 本番環境
```bash
# 本番環境用CI/CDセットアップ
bash scripts/setup-cicd.sh prod rakugakimap-prod
```

このスクリプトが以下を自動実行します：
- Firebase サービスアカウント作成
- IAM権限設定
- Firebase CI Token生成
- GitHub Secrets用の値を表示（環境別サフィックス付き）

### 2. 手動セットアップ

#### 2.1 Firebase サービスアカウント作成

```bash
# サービスアカウント作成
gcloud iam service-accounts create github-actions-rakugakimap-dev \
    --project=rakugakimap-dev \
    --display-name="GitHub Actions CI/CD"

# 必要な権限を付与
gcloud projects add-iam-policy-binding rakugakimap-dev \
    --member="serviceAccount:github-actions-rakugakimap-dev@rakugakimap-dev.iam.gserviceaccount.com" \
    --role="roles/firebase.admin"

gcloud projects add-iam-policy-binding rakugakimap-dev \
    --member="serviceAccount:github-actions-rakugakimap-dev@rakugakimap-dev.iam.gserviceaccount.com" \
    --role="roles/firebasehosting.admin"

# サービスアカウントキー生成
gcloud iam service-accounts keys create github-actions-key.json \
    --iam-account=github-actions-rakugakimap-dev@rakugakimap-dev.iam.gserviceaccount.com \
    --project=rakugakimap-dev
```

#### 2.2 Firebase CI Token生成

```bash
firebase login:ci
```

## ⚙️ GitHub Secrets設定

### 必須シークレット

GitHubリポジトリの **Settings** → **Secrets and variables** → **Actions** で以下を設定：

#### 開発環境 (_DEV サフィックス)

| Secret名 | 値 | 取得方法 |
|----------|---|----------|
| `FIREBASE_SERVICE_ACCOUNT_KEY_DEV` | Base64エンコードされたJSONキー | `setup-cicd.sh` の出力 |
| `FIREBASE_TOKEN_DEV` | Firebase CI Token | `setup-cicd.sh` の出力 |
| `FIREBASE_PROJECT_ID_DEV` | `rakugakimap-dev` | プロジェクトID |
| `GOOGLE_MAPS_API_KEY_DEV` | Maps APIキー | `terraform output -raw api_key` |
| `FIREBASE_API_KEY_DEV` | Firebase APIキー | `.env.local`から |
| `FIREBASE_AUTH_DOMAIN_DEV` | `rakugakimap-dev.firebaseapp.com` | `.env.local`から |
| `FIREBASE_STORAGE_BUCKET_DEV` | `rakugakimap-dev.appspot.com` | `.env.local`から |
| `FIREBASE_MESSAGING_SENDER_ID_DEV` | メッセージング送信者ID | `.env.local`から |
| `FIREBASE_APP_ID_DEV` | Firebase アプリID | `.env.local`から |

#### 本番環境 (_PROD サフィックス)

| Secret名 | 値 | 取得方法 |
|----------|---|----------|
| `FIREBASE_SERVICE_ACCOUNT_KEY_PROD` | Base64エンコードされたJSONキー | `setup-cicd.sh prod` の出力 |
| `FIREBASE_TOKEN_PROD` | Firebase CI Token | `setup-cicd.sh prod` の出力 |
| `FIREBASE_PROJECT_ID_PROD` | `rakugakimap-prod` | プロジェクトID |
| `GOOGLE_MAPS_API_KEY_PROD` | Maps APIキー | `terraform output -raw api_key_prod` |
| `FIREBASE_API_KEY_PROD` | Firebase APIキー | Firebase Console |
| `FIREBASE_AUTH_DOMAIN_PROD` | `rakugakimap-prod.firebaseapp.com` | Firebase Console |
| `FIREBASE_STORAGE_BUCKET_PROD` | `rakugakimap-prod.appspot.com` | Firebase Console |
| `FIREBASE_MESSAGING_SENDER_ID_PROD` | メッセージング送信者ID | Firebase Console |
| `FIREBASE_APP_ID_PROD` | Firebase アプリID | Firebase Console |

### Firebase設定値の取得

`.env.local`ファイルから値をコピー：

```bash
# .env.localの内容を表示
cat .env.local
```

## 🔄 ワークフロー詳細

### 開発環境デプロイ（mainブランチ）

```yaml
on:
  push:
    branches:
      - main    # 開発環境へ自動デプロイ
```

**実行内容:**
1. 依存関係インストール
2. セキュリティチェック実行
3. 開発環境用の環境変数設定
4. アプリケーションビルド
5. Firebase Hosting (dev)にデプロイ
6. デプロイURLをコミットにコメント

### 本番環境デプロイ（タグ）

```yaml
on:
  push:
    tags:
      - 'v*'    # v1.0.0, v2.1.3など
```

**実行内容:**
1. 依存関係インストール
2. セキュリティチェック実行
3. 本番環境用の環境変数設定
4. アプリケーションビルド
5. Firebase Hosting (prod)にデプロイ
6. デプロイURLをコミットにコメント

### プルリクエストプレビュー

```yaml
on:
  pull_request:
    branches:
      - main
```

**実行内容:**
1. 依存関係インストール
2. セキュリティチェック実行
3. アプリケーションビルド
4. プレビューチャンネルにデプロイ（7日間）
5. プレビューURLをPRにコメント

## 📊 ワークフロー状況確認

### デプロイ方法

#### 開発環境へのデプロイ
```bash
# mainブランチにプッシュ
git checkout main
git merge feature-branch
git push origin main
# → 自動で開発環境にデプロイ
```

#### 本番環境へのデプロイ
```bash
# タグを作成してプッシュ
git tag v1.0.0
git push origin v1.0.0
# → 自動で本番環境にデプロイ
```

### デプロイ状況確認

1. GitHubリポジトリの **Actions** タブを開く
2. 最新のワークフロー実行を確認
3. ログで詳細な実行状況を確認

### デプロイURL確認

- **開発環境**: https://rakugakimap-dev.web.app
- **本番環境**: https://rakugakimap-prod.web.app
- **プレビュー**: PRページにプレビューURLがコメント表示

## 🛠️ トラブルシューティング

### よくあるエラー

#### 1. `Permission denied` エラー
```
Error: HTTP Error: 403, The caller does not have permission
```

**解決方法:**
- サービスアカウントの権限を確認
- 必要なロールが付与されているか確認

#### 2. `Project not found` エラー
```
Error: Project rakugakimap-dev not found
```

**解決方法:**
- `FIREBASE_PROJECT_ID` シークレットの値を確認
- プロジェクトIDが正確か確認

#### 3. `Firebase token expired` エラー
```
Error: Invalid access token
```

**解決方法:**
- Firebase CI Tokenを再生成
- `FIREBASE_TOKEN` シークレットを更新

### デバッグ方法

#### ワークフローログ確認
1. GitHub Actions タブ → 失敗したワークフロー
2. エラーが発生したステップを展開
3. 詳細なエラーメッセージを確認

#### ローカルでテスト
```bash
# ローカルでビルドテスト
npm run build

# Firebase デプロイテスト（手動）
firebase deploy --only hosting --project rakugakimap-dev
```

## 🔒 セキュリティ考慮事項

### シークレット管理
- **絶対に** シークレット値をコードに含めない
- サービスアカウントキーは最小権限の原則
- 定期的なキーローテーション推奨

### アクセス制御
- ブランチ保護ルール設定推奨
- レビュー必須設定推奨
- 管理者のみがSecrets設定可能

### 監査
- デプロイログの定期確認
- 異常なデプロイ活動の監視
- アクセスログの確認

## 📚 関連ドキュメント

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Firebase Hosting CI/CD](https://firebase.google.com/docs/hosting/github-integration)
- [Google Cloud IAM](https://cloud.google.com/iam/docs)

## 🆘 サポート

問題が発生した場合：
1. このドキュメントのトラブルシューティングを確認
2. GitHub Issues で報告
3. ワークフローログの詳細を添付
