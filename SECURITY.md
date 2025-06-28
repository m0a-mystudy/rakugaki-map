# セキュリティガイドライン

## 🔒 クレデンシャル管理

### 環境変数の取り扱い

1. **絶対に行ってはいけないこと**
   - `.env.local` などの実際のクレデンシャルをGitにコミット
   - APIキーをソースコードに直接記述
   - パスワードやトークンをプレーンテキストで保存

2. **正しい方法**
   - `.env.local` ファイルを使用し、`.gitignore` で除外
   - `.env.example` でテンプレートを提供
   - 本番環境では環境変数またはシークレット管理サービスを使用

### ファイル構成

```
├── .env.local          # 実際の値（Gitで無視）
├── .env.example        # テンプレート（Gitに含める）
└── .gitignore          # .env.local を含める
```

## 🛡️ 自動保護機能

### Pre-commitフック

プロジェクトでは以下のツールで自動的にクレデンシャルを検出します：

1. **detect-secrets**: 一般的なシークレットパターンを検出
2. **gitleaks**: 包括的なシークレットスキャン
3. **カスタムルール**: プロジェクト固有のパターン検出

### セットアップ方法

```bash
# Pre-commitのインストール
pip install pre-commit

# フックの有効化
pre-commit install

# 手動実行（任意）
pre-commit run --all-files
```

### 検出された場合の対処法

1. **即座にコミットを停止**
2. **該当ファイルから機密情報を削除**
3. **API キーの場合は無効化・再生成**
4. **`.gitignore` を確認・更新**

## 🚨 インシデント対応

### クレデンシャルが誤ってコミットされた場合

1. **緊急対応**
   ```bash
   # 最新コミットから削除
   git rm --cached <file>
   git commit --amend

   # 履歴から完全削除（必要な場合）
   git filter-branch --index-filter 'git rm --cached --ignore-unmatch <file>'
   ```

2. **セキュリティ対応**
   - 公開されたAPIキーを即座に無効化
   - 新しいクレデンシャルを生成
   - アクセスログを確認

3. **再発防止**
   - Pre-commitフックの設定確認
   - チーム教育の実施

## 📋 チェックリスト

### 開発前
- [ ] `.env.local` が `.gitignore` に含まれている
- [ ] Pre-commitフックがインストールされている
- [ ] 環境変数テンプレート（`.env.example`）が最新

### コミット前
- [ ] `git status` で機密ファイルが含まれていないか確認
- [ ] Pre-commitフックが正常に動作した
- [ ] 差分レビューでAPIキーなどが含まれていないか確認

### デプロイ前
- [ ] 本番環境の環境変数が設定されている
- [ ] 開発用と本番用のクレデンシャルが分離されている
- [ ] アクセス権限が適切に設定されている

## 🔧 ツール

- **detect-secrets**: https://github.com/Yelp/detect-secrets
- **gitleaks**: https://github.com/gitleaks/gitleaks
- **pre-commit**: https://pre-commit.com/

## 📞 サポート

セキュリティに関する質問や懸念がある場合は、プロジェクトメンテナーに連絡してください。
