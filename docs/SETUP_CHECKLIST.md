# ミセコエ 導入チェックリスト

## 1. 基本環境

- GitHub repoをCloudflare Pagesへ接続
- Production branchを `main` に設定
- Cloudflare D1 databaseを作成
- `migrations/0001_schema.sql` をD1へ適用
- R2 bucketを作成し、店舗投稿用画像の保存先を決める
- `/api/system/health` で環境変数の設定状態を確認

## 2. Google Business Profile

- Google Cloud projectを作成
- Google Business Profile APIを有効化
- OAuth clientを作成
- OAuth consent screenを設定
- `https://www.googleapis.com/auth/business.manage` を利用範囲に含める
- 管理者画面にGBP連携ステータス、接続開始、再連携ボタンがあることを確認
- 店舗オーナーまたは管理者権限を持つGoogleアカウントでGoogleログイン/OAuth接続を実行
- 店舗ごとに `accounts/{accountId}/locations/{locationId}` を保存
- レビュー取得テストを実行
- レビュー返信テストを実行
- LocalPosts投稿テストを実行

必要な環境変数:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_GBP_REFRESH_TOKEN`
- `GBP_LOCATION_NAME`

## 3. LINE現場者画面

- LINE DevelopersでMessaging APIチャネルを作成
- Webhook URLを `https://misekoe.pages.dev/api/line/webhook` に設定
- Use webhookを有効化
- `LINE_CHANNEL_SECRET` をCloudflare Pagesへ設定
- `LINE_CHANNEL_ACCESS_TOKEN` をCloudflare Pagesへ設定
- 公式アカウントを友だち追加
- LINEで `レビュー` と送って確認カードを受け取る
- `現場確認済み` と `店長に共有` のpostbackを確認
- `管理者ログイン` からWeb管理者画面へ遷移することを確認

Safari/Chromeなど外部ブラウザで開きたい場合:

- LIFFアプリを作成
- LIFF上の管理者ログインボタンで `liff.openWindow({ external: true })` を使う
- Web管理者画面側でGoogleログインと店舗ロールを確認

## 4. Slack

- Slack appを作成
- Bot Token Scopesを設定
- Signing Secretを保存
- 店舗別channelIdを保存
- P0/P1レビュー通知をテスト

必要な環境変数:

- `SLACK_SIGNING_SECRET`
- `SLACK_BOT_TOKEN`

## 5. OpenAI

- `OPENAI_API_KEY` をCloudflare Pagesへ設定
- レビュー要約、リスク分類、返信案生成をテスト
- AI返信案の再生成で新しい下書きが作成され、前案へ戻せることを確認
- 完全自動返信の対象星数、要チェックキーワード、実行時刻を店舗ごとに保存できることを確認
- 対象星数の未返信レビューは承認なしで指定時刻に返信されることを確認
- 対象星数でも要チェックキーワードを含むレビューは `needs_check` に止まることを確認
- GBP投稿案生成をテスト
- GBP投稿案の再生成で新しい下書きが作成され、前案へ戻せることを確認

## 6. 運用ルール

- P0: 健康被害、異物混入、返金、法務、保健所など。対象星数でも要チェックに止める
- P1: 低評価、強い不満。店長確認後に返信
- P2: 改善余地あり。通常確認
- P3: 低リスク
- 返信済みレビューには `posted_at` を必ず保存
- GBP投稿は現場者が直接公開せず、管理者承認後に公開
- 通知キュータブは置かず、通知の失敗や再送は通知履歴または対象レビュー詳細から扱う
- MEOの「今週やること」は置かず、改善タスクと運用代行カレンダーに集約する
- 外部API送信はすべて `audit_logs` に保存
