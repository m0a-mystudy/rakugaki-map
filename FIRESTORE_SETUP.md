# Firestore セキュリティルール設定手順

## 🔥 現在のエラー

```
FirebaseError: [code=permission-denied]: Missing or insufficient permissions
```

## ⚡ 手動設定（即座に解決）

### 1. Firebase Console でルール設定

1. [Firebase Console](https://console.firebase.google.com/project/rakugakimap-dev/firestore/rules) を開く
2. 左サイドバーの「Firestore Database」をクリック
3. 上部タブの「ルール」をクリック
4. 以下のルールを貼り付け：

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // drawings コレクション：読み取り・書き込みを全員に許可（開発環境）
    match /drawings/{documentId} {
      allow read, write: if true;
    }
  }
}
```

5. 「公開」ボタンをクリック

### 2. 設定確認

- ブラウザで http://localhost:5173 を開く
- 右上の「Test Firestore」ボタンをクリック
- ✅ が表示されれば成功

## 🔧 自動設定（Firebase CLI使用）

```bash
# 1. Firebase CLI 認証（ブラウザ認証が必要）
firebase login

# 2. ルールデプロイ
firebase deploy --only firestore:rules
```

## 📋 セキュリティレベル

### 開発環境（現在）
```javascript
allow read, write: if true;  // 全員がアクセス可能
```

### 本番環境（推奨）
```javascript
allow read: if true;                           // 誰でも読み取り可能
allow write: if request.auth != null;         // 認証ユーザーのみ書き込み可能
```

## 🚨 重要

- **開発専用設定**: 現在のルールは全員がデータを読み書きできます
- **本番環境では**: 認証とより厳密なルールが必要
- **一時的措置**: アプリケーションテスト後、セキュリティを強化してください