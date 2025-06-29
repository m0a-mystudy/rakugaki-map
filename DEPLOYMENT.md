# デプロイメント

このドキュメントでは、rakugaki-mapのデプロイメント手順とCI/CD設定について説明します。

## 🤖 CI/CD 自動デプロイ（推奨）

### GitHub Actions による自動デプロイ

- **mainブランチにプッシュ** → 自動で**開発環境**デプロイ
- **タグ作成 (v*.*.*)** → 自動で**本番環境**デプロイ
- **Pull Request作成** → 自動でプレビューデプロイ（7日間）

### 初回セットアップ

```bash
# 開発環境CI/CDセットアップ
bash scripts/setup-cicd.sh dev

# 本番環境CI/CDセットアップ
bash scripts/setup-cicd.sh prod

# GitHub Secretsに表示された値を設定（_DEV/_PRODサフィックス付き）
# 詳細は CICD_SETUP.md を参照
```

### デプロイ方法

```bash
# 開発環境へデプロイ
git push origin main

# 本番環境へデプロイ
git tag v1.0.0
git push origin v1.0.0
```

## 🚀 手動デプロイ

### ワンコマンドデプロイ

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

## デプロイコマンド

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

## 🤖 CI/CD ワークフロー

### 利用可能なワークフロー

- `.github/workflows/deploy.yml`: メイン自動デプロイ
- `.github/workflows/security.yml`: セキュリティチェック

### ワークフロー状況確認

- GitHub Actions タブでデプロイ状況を確認
- エラー時は詳細ログを確認

## 環境管理

### ブランチ戦略

- **main branch**: Auto-deploy to development environment
- **tags (v*.*.*)**: Auto-deploy to production environment
- **Pull Requests**: Create preview environments (7-day expiry)

### 環境フロー

```
Feature Branch → Pull Request → Preview Environment
     ↓              ↓
main branch → Development (rakugakimap-dev.web.app)
     ↓
Tag v*.*.* → Production (the-rakugaki-map.web.app)
```

### 環境設定

**開発環境**: `rakugakimap-dev` project
**本番環境**: `the-rakugaki-map` project

## トラブルシューティング

1. **CI/CD failures**: Check GitHub Actions logs for WIF/permissions issues
2. **Infrastructure issues**: Check Terraform state and manual resource status
3. **Deployment issues**: Verify Firebase project settings and domain restrictions

詳細な対処法については [TROUBLESHOOTING.md](TROUBLESHOOTING.md) を参照してください。
