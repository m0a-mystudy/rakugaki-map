# Firebase セキュリティ設定手順

## 🔒 セキュリティレベル変更

**新しい設定**: 読み取り専用 + 認証済みユーザーのみ編集可能

- ✅ **読み取り**: 誰でも描画を見ることができる
- 🔐 **編集**: 認証済みユーザーのみ（匿名認証で自動対応）

## 🚀 Terraform自動セットアップ（推奨）

**Terraformを使用した場合、以下の設定は全て自動で完了済みです：**

- ✅ Firebase Authentication（匿名認証有効化）
- ✅ Firestore セキュリティルール（読み取り全員、書き込み認証済みのみ）
- ✅ 必要なAPI有効化
- ✅ 適切な権限設定

手動設定は不要です。アプリケーションを起動してテストしてください。

## ⚡ 手動設定（Terraformを使用しない場合）

### 1. Firebase Console でルール設定

1. [Firebase Console](https://console.firebase.google.com/project/rakugakimap-dev/firestore/rules) を開く
2. 左サイドバーの「Firestore Database」をクリック
3. 上部タブの「ルール」をクリック
4. 以下のルールを貼り付け：

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // drawings コレクション：読み取りは全員、書き込みは認証済みユーザーのみ
    match /drawings/{documentId} {
      allow read: if true;                    // 誰でも描画を見ることができる
      allow write: if request.auth != null;  // 認証済みユーザーのみ編集可能
    }
  }
}
```

5. 「公開」ボタンをクリック

### 2. Firebase Authentication で匿名認証を有効化

1. [Firebase Console](https://console.firebase.google.com/project/rakugakimap-dev/authentication/providers) を開く
2. 左サイドバーの「Authentication」をクリック
3. 上部タブの「Sign-in method」をクリック
4. 「匿名」プロバイダーを見つけて「有効にする」をクリック
5. 「保存」ボタンをクリック

### 3. 設定確認

- ブラウザで http://localhost:5173 を開く
- コンソールに「🔥 Anonymous user signed in: xxx」が表示されることを確認
- 何か描画して「保存」ボタンをテスト
- 「Drawing saved successfully!」が表示されれば成功

## 🔧 Terraformで管理されたセキュリティルール

Terraformを使用している場合、セキュリティルールは以下のファイルで管理されています：

```bash
# ルールファイルの場所
terraform/firestore.rules

# Terraformで再デプロイ
cd terraform/environments/dev
terraform apply
```

### 現在適用されているルール
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

## 📋 セキュリティレベル履歴

### ✅ 現在の設定（本番対応済み）
```javascript
allow read: if true;                           // 誰でも読み取り可能
allow write: if request.auth != null;         // 認証ユーザーのみ書き込み可能
```

### ❌ 旧設定（開発用）
```javascript
allow read, write: if true;  // 全員がアクセス可能（削除済み）
```

## ✅ セキュリティ対応完了

- **Terraformユーザー**: 全ての設定が自動で本番レベルに設定済み
- **手動設定ユーザー**: 上記手順に従って設定してください
- **認証**: Firebase匿名認証により、編集時に自動で認証される
- **本番対応**: 現在の設定は本番環境でも安全に使用可能
