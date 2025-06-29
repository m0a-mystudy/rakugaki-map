# トラブルシューティング

このドキュメントでは、rakugaki-mapでよく発生する問題と解決方法を説明します。

## 地図が表示されない

### 症状
- 地図エリアが空白または灰色で表示される
- "For development purposes only"のウォーターマークが表示される

### 解決方法

1. **Google Maps APIキーの確認**
   ```bash
   # 環境変数が設定されているか確認
   echo $VITE_GOOGLE_MAPS_API_KEY

   # .env.localファイルの確認
   cat .env.local | grep VITE_GOOGLE_MAPS_API_KEY
   ```

2. **APIキーの制限設定を確認**
   - [Google Cloud Console](https://console.cloud.google.com/apis/credentials) にアクセス
   - 使用しているAPIキーをクリック
   - HTTPリファラー制限が正しく設定されているか確認
   - API制限でMaps JavaScript APIが有効になっているか確認

3. **ブラウザの開発者ツールでエラーを確認**
   - F12キーで開発者ツールを開く
   - Consoleタブでエラーメッセージを確認
   - Networkタブで Google Maps API のリクエストが失敗していないか確認

## 保存機能が動作しない

### 症状
- 「保存」ボタンを押してもエラーが発生する
- `permission-denied` エラーが表示される

### 解決方法

1. **Terraformユーザーの場合**
   - 全ての設定が自動で完了しているはずです
   - 以下で設定確認：
   ```bash
   cd terraform/environments/dev
   terraform output -json
   ```

2. **手動セットアップユーザーの場合**

   **Firestore セキュリティルールの確認:**
   ```javascript
   // 正しいルール設定
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

   **Firebase Authentication の確認:**
   - Firebase Console → Authentication → Sign-in method
   - 「匿名」認証が有効になっているか確認

   **Firestore Database の確認:**
   - Firebase Console → Firestore Database
   - データベースが作成されているか確認

3. **ブラウザの設定確認**
   - ブラウザでJavaScriptが有効になっているか確認
   - シークレットモードで試してみる
   - 別のブラウザで試してみる

## CORS エラーが発生する

### 症状
- ブラウザコンソールに CORS エラーが表示される
- Firebase のリクエストが失敗する

### 解決方法

1. **Firebase Hosting を使用する**
   ```bash
   npm run deploy:dev
   ```

2. **開発サーバーの設定確認**
   ```bash
   # 開発サーバーを正しく起動
   npm run dev

   # ホストアクセスを許可する場合
   npm run dev:host
   ```

3. **Firebase設定の確認**
   - `.env.local` のFirebase設定値が正しいか確認
   - Firebase Console のプロジェクト設定と一致しているか確認

## ビルドエラー

### 症状
- `npm run build` でエラーが発生する
- TypeScript エラーが表示される

### 解決方法

1. **依存関係のインストール**
   ```bash
   # node_modules を削除して再インストール
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **TypeScript エラーの確認**
   ```bash
   # TypeScript のチェックのみ実行
   npx tsc --noEmit
   ```

3. **環境変数の確認**
   ```bash
   # 必要な環境変数が全て設定されているか確認
   npm run check:env
   ```

## CI/CD エラー

### 症状
- GitHub Actions でデプロイが失敗する
- WIF (Workload Identity Federation) エラーが発生する

### 解決方法

1. **WIF設定の確認**
   ```bash
   # WIF設定の確認
   ./scripts/wif-management.sh show-config -p rakugakimap-dev -e dev
   ```

2. **GitHub Secrets の確認**
   - GitHub Repository → Settings → Secrets and variables → Actions
   - 必要なシークレットが設定されているか確認

3. **権限の確認**
   ```bash
   # サービスアカウントの権限確認
   ./scripts/wif-management.sh list-permissions -p rakugakimap-dev -e dev
   ```

4. **ログの確認**
   - GitHub Actions のログを詳細に確認
   - エラーメッセージから原因を特定

## Firestore Emulator の問題

### 症状
- ローカル開発でFirestore emulatorが起動しない
- Emulatorに接続できない

### 解決方法

1. **Emulator の起動確認**
   ```bash
   # Emulator のみ起動
   npm run dev:emulator

   # 開発サーバーと同時起動
   npm run dev:with-emulator
   ```

2. **ポートの確認**
   ```bash
   # ポート8080が使用されていないか確認
   lsof -i :8080

   # 使用されている場合はプロセスを終了
   kill -9 <PID>
   ```

3. **Firebase CLI の更新**
   ```bash
   npm install -g firebase-tools@latest
   ```

## パフォーマンスの問題

### 症状
- 描画が重い・遅い
- ブラウザが応答しなくなる

### 解決方法

1. **描画データの最適化**
   - 大量の描画データがある場合は分割して保存
   - 不要な描画は削除

2. **ブラウザのパフォーマンス確認**
   - F12 → Performance タブでプロファイリング
   - メモリ使用量の確認

3. **デバイスの制限**
   - 古いデバイスやブラウザでは制限される場合があります
   - 最新のブラウザを使用することを推奨

## その他のよくある問題

### "Development purposes only" が表示される

**原因**: APIキーの制限設定が正しくない

**解決方法**:
1. Google Cloud Console でAPIキーの制限を確認
2. HTTPリファラー制限に正しいドメインを設定
3. API制限でMaps JavaScript APIのみを許可

### 描画が保存されない

**原因**: 認証またはFirestore の設定問題

**解決方法**:
1. ブラウザコンソールでエラー確認
2. Firebase Authentication の状態確認
3. Firestore セキュリティルールの確認

### GitHub Actions でタイムアウトエラー

**原因**: ビルドまたはデプロイ処理が長時間かかっている

**解決方法**:
1. 依存関係のキャッシュ設定確認
2. 並列処理の最適化
3. タイムアウト設定の調整

## サポート

上記の方法で解決しない場合は、以下の方法でサポートを受けてください：

1. **GitHub Issues**: 詳細なエラーメッセージとともに Issue を作成
2. **開発者ツール**: ブラウザの開発者ツールのスクリーンショットを含める
3. **環境情報**: OS、ブラウザ、Node.js のバージョン情報を含める

### Issue 作成時のテンプレート

```
## 環境情報
- OS:
- ブラウザ:
- Node.js バージョン:
- npm バージョン:

## 症状
（具体的な症状を記述）

## 再現手順
1.
2.
3.

## エラーメッセージ
（ブラウザコンソールまたはターミナルのエラーメッセージ）

## 試した解決方法
（既に試した解決方法があれば記述）
```
