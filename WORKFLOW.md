# 開発・運用ワークフロー

このドキュメントは、Rakugaki Mapプロジェクトの開発・運用における作業ワークフローの方針をまとめたものです。

## 基本方針

### 1. 環境分離
- **開発環境** (`rakugakimap-dev`): 開発・検証・テスト用
- **本番環境** (`the-rakugaki-map`): 実際のユーザー向けサービス
- **プレビュー環境**: Pull Request毎に自動作成（7日間の一時環境）

### 2. ブランチ戦略
- **`main`ブランチ**: 開発環境への自動デプロイ対象
- **タグ (`v*.*.*`)**: 本番環境への自動デプロイトリガー
- **Pull Request**: プレビュー環境での検証

### 3. インフラ管理分離
- **Terraform管理**: アプリケーションインフラ（API、データベース、認証設定）
- **手動管理**: セキュリティ基盤（WIF、Secret Manager、ステートバケット）

## ワークフロー詳細

### 🔄 日常開発フロー

#### 1. 機能開発
```bash
# 1. 最新のmainブランチを取得
git checkout main
git pull origin main

# 2. 機能ブランチ作成
git checkout -b feature/new-feature

# 3. 開発作業
npm run dev  # 開発サーバー起動
# コード編集・テスト

# 4. コミット・プッシュ
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature
```

#### 2. Pull Request作成
```bash
# GitHub上でPull Request作成
# → プレビュー環境が自動作成される
# → CI/CDパイプラインが実行される
```

#### 3. レビュー・マージ
```bash
# レビュー後、mainブランチにマージ
# → 開発環境に自動デプロイ
```

### 🚀 リリースフロー

#### 1. 開発環境での最終確認
```bash
# 開発環境での動作確認
# https://rakugakimap-dev.web.app

# 必要に応じて修正・追加コミット
```

#### 2. 本番リリース
```bash
# mainブランチで本番リリース用タグ作成
git checkout main
git pull origin main
git tag v1.0.0
git push origin v1.0.0

# → 本番環境に自動デプロイ
# → https://the-rakugaki-map.web.app
```

### ⚙️ インフラ変更フロー

#### 1. Terraform管理リソースの変更

**開発環境での変更**:
```bash
# 1. 開発環境で変更をテスト
cd terraform/environments/dev
terraform plan
terraform apply

# 2. 動作確認
npm run dev  # ローカルでテスト
# 開発環境 (rakugakimap-dev.web.app) でテスト

# 3. 変更をコミット
git add terraform/
git commit -m "feat: update terraform configuration"
git push origin feature/terraform-update
```

**本番環境への適用**:
```bash
# 1. Pull Requestマージ後
# → CI/CDで開発環境のTerraformが自動実行

# 2. 本番環境でも同様の変更を適用
cd terraform/environments/prod
terraform plan
terraform apply

# 3. 本番リリース（必要に応じて）
git tag v1.0.1
git push origin v1.0.1
```

#### 2. 手動管理リソースの変更

**Secret Manager**:
```bash
# 新しいシークレット追加
gcloud secrets create new-secret --project=rakugakimap-dev
echo "secret-value" | gcloud secrets versions add new-secret --data-file=- --project=rakugakimap-dev

# 本番環境にも同様に適用
gcloud secrets create new-secret --project=the-rakugaki-map
echo "secret-value" | gcloud secrets versions add new-secret --data-file=- --project=the-rakugaki-map
```

**Workload Identity Federation**:
```bash
# WIF設定変更（慎重に実行）
# 1. 開発環境でテスト
# 2. 動作確認
# 3. 本番環境に適用
# 詳細は terraform/INFRASTRUCTURE_MANAGEMENT.md を参照
```

### 🔧 トラブルシューティングフロー

#### 1. CI/CD失敗時
```bash
# 1. GitHub Actionsのログを確認
# 2. 権限エラーの場合
#    - WIF設定確認
#    - Secret Managerアクセス権限確認
# 3. Terraformエラーの場合
#    - 状態ファイル確認
#    - リソース競合確認
```

#### 2. デプロイ失敗時
```bash
# 1. Firebase Hostingステータス確認
firebase projects:list
firebase hosting:channel:list --project=rakugakimap-dev

# 2. 手動デプロイで確認
npm run deploy:dev
npm run deploy:prod
```

#### 3. インフラ問題時
```bash
# 1. Terraformステート確認
cd terraform/environments/dev
terraform state list
terraform plan

# 2. 手動リソース確認
gcloud projects list
gcloud secrets list --project=rakugakimap-dev
```

## セキュリティ要件

### 1. 権限管理
- **最小権限の原則**: 必要最小限の権限のみ付与
- **定期的な権限監査**: 不要な権限の削除
- **環境分離**: 開発・本番の権限を明確に分離

### 2. 機密情報管理
- **Secret Manager使用**: すべての機密情報をSecret Managerで管理
- **GitHub Secrets禁止**: 機密情報をGitHub Secretsに保存しない
- **ローカル環境**: `.env.local`ファイルを使用（gitignore対象）

### 3. アクセス制御
- **WIF認証**: GitHub ActionsはWorkload Identity Federationを使用
- **2段階認証**: 本番環境へのアクセスは追加確認が必要
- **監査ログ**: すべての本番環境操作をログに記録

## 品質保証

### 1. 自動チェック
- **Lint**: ESLint、Prettierによるコード品質チェック
- **Type Check**: TypeScriptによる型安全性チェック
- **Security Scan**: detect-secretsによるシークレット漏洩チェック

### 2. テスト戦略
```bash
# 現在のテスト状況: テストなし
# 今後の追加予定:
# - Unit Tests: コンポーネントテスト
# - Integration Tests: Firebase連携テスト
# - E2E Tests: ユーザーシナリオテスト
```

### 3. デプロイ検証
- **プレビュー環境**: Pull Request毎の動作確認
- **開発環境**: mainブランチマージ後の統合テスト
- **本番環境**: タグ作成後の最終確認

## モニタリング・運用

### 1. 監視項目
- **アプリケーション**: Firebase Hostingの稼働状況
- **データベース**: Firestoreの使用量・エラー率
- **API**: Google Maps APIの使用量・制限状況

### 2. アラート設定
- **使用量アラート**: API制限の80%到達時
- **エラーアラート**: アプリケーションエラー発生時
- **セキュリティアラート**: 不正アクセス検知時

### 3. 定期メンテナンス
```bash
# 月次作業
# 1. 依存関係の更新確認
npm audit
npm outdated

# 2. API使用量確認
# Google Cloud Consoleで確認

# 3. ログローテーション確認
# GitHub Actionsログの整理
```

## エスカレーション手順

### 1. 開発問題
1. **レベル1**: 開発者による自己解決
2. **レベル2**: チーム内での技術相談
3. **レベル3**: 外部技術サポートへの問い合わせ

### 2. インフラ問題
1. **レベル1**: ドキュメント参照による解決
2. **レベル2**: GCPサポートへの問い合わせ
3. **レベル3**: 緊急対応（サービス停止時）

### 3. セキュリティ問題
1. **即座対応**: 該当リソースの一時停止
2. **調査**: ログ分析・影響範囲特定
3. **復旧**: 修正・セキュリティ強化後の再開

## 関連ドキュメント

- [INFRASTRUCTURE_MANAGEMENT.md](terraform/INFRASTRUCTURE_MANAGEMENT.md) - インフラ管理詳細
- [STATE_BUCKET_MANAGEMENT.md](terraform/STATE_BUCKET_MANAGEMENT.md) - ステートバケット管理
- [SECRET_MANAGEMENT.md](terraform/SECRET_MANAGEMENT.md) - シークレット管理
- [CLAUDE.md](CLAUDE.md) - Claude Code向け開発ガイド
- [README.md](README.md) - プロジェクト概要・セットアップ

## 更新履歴

- 2025-06-28: 初版作成（ハイブリッドインフラ管理対応）
