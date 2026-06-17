# ReviewChef AI 本番導入設計

この設計は、画面デモではなく飲食店に導入して実運用する前提の全体設計です。

## 画面と役割

### 管理者画面

対象: オーナー、店長、本部、運用代行担当者。

主な操作:

- Googleレビューの取得、要約、返信案確認
- 期間、星数、キーワード、リスク、状態によるレビュー絞り込み
- 低評価レビューの承認、返信投稿
- LINEの現場者画面から戻った確認結果の確認
- 返信済みレビューの返信日時、投稿結果、失敗理由の確認
- 改善タスク管理
- GBP店舗投稿の下書き、承認、公開
- MEO施策、キーワード、効果測定の確認
- LINE/Slack通知先、Google連携、店舗権限の設定

### 現場者画面

対象: 現場スタッフ、社員、アルバイトリーダー。

主な操作:

- LINE/Slack通知からレビュー確認。本番ではWeb画面ではなく、LINE Flex MessageやSlack Block Kit上で完結させる
- 事実確認、店長共有、現場確認済みの報告
- GBP店舗投稿の素材提供: 今日のおすすめ、写真、空席、臨時営業時間、イベント情報
- 管理者権限を持つユーザーだけ、LINEの「管理者ログイン」からSafari/ChromeなどのスマホブラウザでWeb管理者画面へ遷移

現場者画面には、分析、MEOスコア、売上指標、店舗横断データを出さない。ブラウザ上の `?view=staff` は検証用プレビューであり、本番の現場者画面はLINE/SlackのメッセージUIとする。

## 画面間導線

### LINEから管理者画面へ

1. 現場者にはLINE Flex Messageでレビュー確認カードを送る
2. カード上の通常操作は `現場確認済み` と `店長に共有`
3. 管理者だけが `管理者ログイン` を押す
4. LIFFを使う場合は `liff.openWindow({ external: true })` でSafari/Chrome等の外部ブラウザを開く
5. Web管理者画面でGoogleログイン
6. `users.role` と `store_id` でアクセス権限を判定
7. LINEカードに紐づく `review_id` をURLに渡し、管理者画面では対象レビューを選択状態で開く

### 管理者画面から現場へ

1. 管理者がP0/P1レビューを確認
2. `現場確認依頼` を作成
3. LINE userId/groupId または Slack channelId へ通知
4. 現場はLINE/Slack上で返信
5. `field_events` と `reviews.staff_status` 相当の状態を更新

## 本番インフラ

- Hosting: Cloudflare Pages
- API: Cloudflare Pages Functions
- DB: Cloudflare D1
- Object storage: Cloudflare R2
- Queue: Cloudflare Queues
- Scheduled jobs: Cloudflare Cron Triggers
- Secrets: Cloudflare Pages environment variables
- Auth: Google OAuth + 店舗ロール

## 外部API

### Google Business Profile

用途:

- 店舗一覧取得
- レビュー一覧取得
- レビュー返信投稿
- GBP店舗投稿作成
- 投稿一覧取得、投稿更新、投稿削除
- 投稿インサイト取得

必要スコープ:

- `https://www.googleapis.com/auth/business.manage`

主要API:

- Reviews: `accounts.locations.reviews`
- LocalPosts: `accounts.locations.localPosts`
- Locations: `accounts.locations`

### LINE Messaging API

用途:

- 新規レビュー通知
- 現場者画面への確認依頼
- postbackによる現場確認済み/店長共有
- 投稿素材依頼

必要情報:

- `LINE_CHANNEL_SECRET`
- `LINE_CHANNEL_ACCESS_TOKEN`
- userId/groupId/roomIdの保存

### Slack

用途:

- 管理者通知
- 店舗別チャンネルへの低評価レビュー通知
- 投稿承認依頼

必要情報:

- Slack OAuth Bot Token
- Signing Secret
- channelId

### OpenAI API

用途:

- レビュー要約
- リスク分類
- 返信案生成
- GBP投稿案生成
- 現場者向け確認項目の平易化

運用ルール:

- P0レビューは自動返信しない
- 返金、補償、健康被害、法務リスクは公開文に断定表現を入れない
- 返信/投稿の最終送信は監査ログを残す

## データモデル

中核テーブル:

- `organizations`: 契約単位
- `stores`: 店舗。GBP account/location紐付けを持つ
- `users`: 管理者/現場者
- `integrations`: Google/LINE/Slack連携情報
- `reviews`: Googleレビュー
- `review_replies`: 返信案、承認、投稿結果
- `tasks`: 店舗改善タスク
- `field_events`: 現場者画面からの確認結果
- `gbp_posts`: GBP店舗投稿の下書き、承認、公開結果
- `media_assets`: 写真/画像素材
- `notifications`: 通知キュー
- `audit_logs`: すべての重要操作ログ

## レビュー運用フロー

1. CronまたはGoogle通知でレビュー取得
2. 新規レビューをDB保存
3. AIで優先度、論点、返信案、現場確認事項を生成
4. P0/P1は管理者と現場者へ通知
5. 現場者がLINE/Slackで確認結果を返す
6. 管理者が返信案を確認
7. Google Business Profile APIで返信投稿
8. `review_replies.posted_at` に返信日時、Google側レスポンス、失敗時のエラーを保存
9. 監査ログと返信済み状態を保存

レビュー受信箱のフィルター:

- `created_at` または `google_created_at`: 過去24時間、7日、30日
- `rating`: 星1〜5、低評価1〜2
- `comment`/`author_name`/`store.name`: キーワード検索
- `priority`: P0/P1/P2/P3
- `status`: 未対応、返信案あり、承認待ち、返信済み

## GBP店舗投稿フロー

### 管理者画面から投稿

1. 投稿タイプを選ぶ: 最新情報、イベント、オファー
2. 店舗、本文、CTA、URL、公開日時、画像を入力
3. AIが投稿文を整える
4. 管理者が承認
5. Google Business Profile LocalPosts APIへ送信
6. `searchUrl`、`state`、Google側IDを保存

### 現場者画面から投稿素材を送る

1. 現場者がLINE/Slackから「今日のおすすめ」「空席」「臨時営業時間」「イベント」を送る
2. 投稿素材として `gbp_posts` に `draft` で保存
3. AIが管理者向け投稿文に整形
4. 管理者画面で承認
5. Google Business Profileへ公開

現場者は直接公開しない。公開権限は管理者画面だけ。

GBP投稿の状態:

- `draft`: 管理者または現場素材から作られた下書き
- `approval`: 管理者承認待ちまたは公開準備
- `published`: Google Business Profile LocalPosts API成功後
- `failed`: Google API拒否、OAuth期限切れ、payload不備

## 通知設計

通知対象:

- P0/P1レビュー
- 返信承認待ち
- 現場確認待ち
- GBP投稿承認待ち
- Google API失敗
- トークン期限切れ

通知先:

- LINE userId/groupId
- Slack channelId
- 管理者メール

## 権限設計

ロール:

- `owner`: 全権限
- `manager`: レビュー返信、投稿承認、店舗設定
- `operator`: 返信案編集、投稿下書き、通知確認
- `field_staff`: 現場者画面のみ

重要制限:

- `field_staff` は管理者画面へ直接アクセス不可
- 現場者画面から管理者画面へ遷移する場合はGoogleログインまたは店舗PIN + 二要素相当の確認
- P0レビュー、GBP公開投稿、外部API送信は監査ログ必須

## API設計

管理者画面:

- `GET /api/reviews`
- `POST /api/reviews/:id/reply-draft`
- `POST /api/reviews/:id/reply`
- `POST /api/reviews/:id/reply` with `action=publish` はGoogle Business Profile `reviews.updateReply` へ送信
- `GET /api/tasks`
- `PATCH /api/tasks/:id`
- `GET /api/gbp/posts`
- `POST /api/gbp/posts`
- `POST /api/gbp/posts/:id/publish`
- `POST /api/gbp/posts` with `action=publish` はGoogle Business Profile `localPosts.create` へ送信
- `GET /api/settings/integrations`

現場者画面:

- `GET /api/field/reviews`
- `POST /api/field/reviews/:id/confirm`
- `POST /api/field/reviews/:id/escalate`
- `POST /api/field/gbp-post-ideas`
- `GET /api/admin/login/start`
- `GET /api/admin/login/callback`

Webhook:

- `POST /api/line/webhook`
- `POST /api/slack/webhook`

System:

- `GET /api/system/health`

## 導入手順

1. Cloudflare PagesにGitHub連携
2. D1 databaseを作成
3. `migrations/0001_schema.sql` を適用
4. R2 bucketを作成
5. Google CloudでOAuth clientを作成
6. Google Business Profile APIを有効化
7. LINE DevelopersでMessaging APIチャネルを作成
8. Cloudflare環境変数を設定
9. 店舗ごとにGBP locationを紐付け
10. LINE/Slack通知先を登録
11. テストレビュー、テスト投稿、テスト通知を実行

## 最低限の環境変数

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_ENCRYPTION_KEY`
- `OPENAI_API_KEY`
- `LINE_CHANNEL_SECRET`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `SLACK_SIGNING_SECRET`
- `SLACK_BOT_TOKEN`
- `ADMIN_SESSION_SECRET`

## 失敗時の設計

- Google APIが失敗: `notifications` に失敗通知を残し、管理者に再実行ボタンを出す
- LINE返信が失敗: 管理者画面の通知キューで再送可能にする
- OAuth期限切れ: 店舗設定に再連携ボタンを出す
- GBP投稿が拒否: Google側の `state` とエラー内容を保存し、投稿文を修正できるようにする
- AI生成失敗: 定型テンプレートへフォールバックする

## 現在のMVPとの差分

現在のMVPはブラウザのローカル保存とデモデータ中心です。本番導入ではD1にデータを保存し、Google/LINE/Slack/OpenAI APIをCloudflare Functions経由で呼び出します。
