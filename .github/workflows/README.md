# GitHub Actions Workflows

このディレクトリには以下のワークフローが含まれています：

## 1. `deploy-wif.yml` - Firebase Hosting デプロイ (Workload Identity)

**トリガー:**
- `main` ブランチにプッシュ → **開発環境**デプロイ
- `v*` タグ作成 → **本番環境**デプロイ  
- Pull Request → **プレビュー**デプロイ（7日間）

**認証方式:** Workload Identity Federation（キーレス認証）

**必要なRepository Variables:**
- `WIF_PROVIDER`: Workload Identity Provider
- `WIF_SERVICE_ACCOUNT`: サービスアカウントメール
- `FIREBASE_PROJECT_ID_DEV`: 開発環境プロジェクトID
- `FIREBASE_PROJECT_ID_PROD`: 本番環境プロジェクトID

## 2. `terraform.yml` - Terraform CI/CD

**トリガー:**
- `terraform/` 配下のファイル変更で自動実行
- 手動実行（`workflow_dispatch`）でplan/apply/destroy選択可能

**機能:**
- **Plan**: PRで実行、結果をコメント表示
- **Apply**: mainブランチマージで自動実行、または手動実行
- **Destroy**: 手動実行のみ（要environment保護）

**認証方式:** Workload Identity Federation

**環境保護設定推奨:**
- `prod`: 本番環境への変更は承認必須
- `destroy-dev`/`destroy-prod`: リソース削除は承認必須

## セットアップ手順

### 1. Workload Identity Federation設定

```bash
# 開発環境
npm run wif:setup dev

# 本番環境  
npm run wif:setup prod rakugakimap-prod
```

### 2. GitHub Repository Variables設定

上記コマンドの出力をGitHubリポジトリの Variables に設定：

**Settings → Secrets and variables → Actions → Variables**

### 3. Environment保護設定（推奨）

**Settings → Environments**で以下を作成：

- `prod`: Required reviewers設定
- `destroy-dev`: Required reviewers設定  
- `destroy-prod`: Required reviewers設定

## 使用方法

### 自動デプロイ
```bash
# 開発環境デプロイ
git push origin main

# 本番環境デプロイ
git tag v1.0.0
git push origin v1.0.0
```

### 手動Terraform実行
1. **Actions** タブで **Terraform CI/CD** を選択
2. **Run workflow** で環境とアクションを選択
3. 実行

### プレビューデプロイ
Pull Request作成で自動実行、URLがコメント表示

## トラブルシューティング

### 認証エラー
- Repository Variablesの値を確認
- Workload Identity設定を再実行

### Terraform実行エラー  
- `terraform.tfvars`の設定を確認
- プロジェクトIDとの整合性チェック

### 権限エラー
- サービスアカウントに適切な権限が付与されているか確認
- IAM設定を見直し