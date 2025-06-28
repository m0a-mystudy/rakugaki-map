# CLAUDE_ja.md

このファイルは、このリポジトリでコードを扱う際のClaude Code (claude.ai/code)へのガイダンスを提供します。

## 開発コマンド

```bash
npm run dev      # 開発サーバーを起動（Vite）http://localhost:5173
npm run build    # TypeScriptチェックと本番ビルドを実行
npm run preview  # 本番ビルドをローカルでプレビュー
```

## アーキテクチャ概要

これはGoogle Maps上に描画し、URLで描画を共有できる地図ベースの描画アプリケーションです。アーキテクチャはGoogle Maps API、Canvas描画、Firebaseデータ永続化の連携が必要です。

### 主要なアーキテクチャの決定事項

1. **描画の実装**: Google Maps OverlayViewとHTML Canvasを使用
   - 描画座標はピクセルではなく緯度経度のペアとして保存
   - これにより地図が移動・ズームしても描画が正しい位置に保持される
   - 座標変換ロジックは`DrawingCanvas.tsx`を参照

2. **状態管理**: ローカルReact state（Redux/Context不使用）
   - 描画データフロー: DrawingCanvas → App → Firebase
   - URLパラメータ（`?id=xxx`）が共有描画IDを制御
   - 地図の状態（中心、ズーム）は表示の保存/読み込みのために追跡

3. **データ永続化**: Firebase Firestore
   - コレクション: `drawings`
   - 各描画は共有URLで使用されるランダムIDを持つ
   - リアルタイム同期はまだ未実装 - 手動保存ボタンのみ

### コンポーネントの関係性

```
App.tsx
├── GoogleMap (@react-google-maps/apiから)
│   └── DrawingCanvas.tsx (カスタムオーバーレイ)
└── UIコントロール (ツール、色、アクション)
```

- **App.tsx**: すべての状態を管理し、Firebase操作を処理
- **DrawingCanvas.tsx**: 描画ロジックと座標変換を管理
- **drawingService.ts**: Firestore操作を抽象化

### 描画データフロー

1. ユーザーがキャンバスに描画 → マウスイベントがピクセル座標でキャプチャ
2. Google Maps projectionを使用してピクセルを緯度経度に変換
3. 地理座標でShapeオブジェクトを作成
4. 保存時: Shape[] → Firestoreドキュメント
5. 読み込み時: Firestore → Shape[] → 緯度経度でCanvas再描画 → ピクセル変換

### 環境設定要件

アプリはGoogle Maps APIとFirebase設定の両方が必要：

```bash
# .env.local (このファイルを作成 - gitignoreされています)
VITE_GOOGLE_MAPS_API_KEY=xxx
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
```

これらがないと、アプリは読み込まれますが地図が表示されず、保存も機能しません。

### 現在の制限事項と今後の作業

1. **自動保存なし**: ユーザーは手動で保存をクリックする必要がある
2. **リアルタイムコラボレーションなし**: Firestoreを使用しているがリアルタイムリスナーは未実装
3. **ユーザー認証なし**: Authは設定済みだが実装されていない
4. **描画の削除機能なし**: すべてクリアするか何もしないかのみ
5. **バンドルサイズ**: Firebaseがバンドルに約200KB追加

### テストアプローチ

現在テストはありません。テストを追加する際：
- DrawingCanvasテストではGoogle Maps APIをモック
- サービスレイヤーテストではFirebaseをモック
- 最も複雑な座標変換ロジックに焦点を当てる
