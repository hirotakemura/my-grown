# 筋トレ＆食事管理（my-grown）

11月末までに体を引き締めるための、スマホ向けの筋トレ＆食事記録アプリ。
Vite + React + TypeScript の静的サイトで、データは端末の IndexedDB（Dexie.js）に保存します。PWA なので iPhone のホーム画面に追加してオフラインでも使えます。

## 開発

```bash
npm install
npm run dev        # http://localhost:5173/ で起動（同じWi-Fiのスマホからも見られる）
npm test           # ユニットテスト（保存・バックアップ・達成判定・重さの提案）
npm run test:e2e   # 本番ビルドをブラウザで動かし、リロード後もデータが残るか確認
npm run build      # dist/ に出力（base は /my-grown/）
```

### スマホ（同じWi-Fi）から確認する

1. `npm run dev` を実行すると `Network: http://192.168.x.x:5173/` のような行が出ます
2. iPhone の Safari でそのアドレスを開く
   - 開けないときは、PC のファイアウォールで 5173 番ポートを許可してください
   - dev サーバーは http なので Service Worker（オフライン動作）は効きません。オフラインやホーム画面追加は GitHub Pages（https）で確認してください

## GitHub Pages に公開する

1. GitHub のリポジトリで **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にする
2. このブランチを `main` にマージ（または push）する
3. **Actions** タブの「Test & Deploy to GitHub Pages」が緑になれば、`https://<ユーザー名>.github.io/my-grown/` で公開されます

ワークフローは「型チェック → ユニットテスト → E2E テスト → ビルド → 公開」の順に動き、テストが落ちたら公開しません。

## iPhone のホーム画面に追加する

1. Safari で公開URLを開く（Chrome などでは不可）
2. 下の共有ボタン（□に↑）→「ホーム画面に追加」→「追加」
3. ホーム画面のアイコンから起動すると、アドレスバーのないアプリ表示になります
4. 設定タブの「データ」に「✓ 永続保存が有効です」と出ていれば、ブラウザが自動でデータを消すことはありません

> データはその端末の中にだけあります。Safari で開いたものと、ホーム画面から開いたものは別の保存場所になるので、ホーム画面から使い続けてください。機種変更の前には「JSONでバックアップを書き出す」を。

## 構成

| 場所 | 中身 |
|---|---|
| `src/db.ts` | Dexie のテーブル定義・初期データ投入・永続化の要求 |
| `src/lib/plan.ts` | 達成判定、連続記録、A/B の割り当て、次にやること、提案のローテーション |
| `src/lib/progression.ts` | 前回の記録、+5kg / +2.5kg の提案、自己ベスト、総重量 |
| `src/lib/backup.ts` | JSON の書き出し・復元（失敗したら元のまま） |
| `src/data/` | ローソン商品・提案メニュー（作り方）・種目・祝日 |
| `tests/` | ユニットテスト（fake-indexeddb で開き直しても残るか等） |
| `e2e/` | Playwright：リロード後の保持、バックアップ往復、オフライン起動 |
