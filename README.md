# ミセコエ MVP

飲食店向けのGoogleレビュー運用SaaS案を、まずローカルで触れる形にしたMVPです。

## 使い方

1. `index.html` をブラウザで開きます。
2. デモレビューが自動で表示されます。
3. `レビュー受信箱` でCSV取り込み、期間・星数・キーワード絞り込み、AI要約、リスク測定、返信案編集、承認投稿、完全自動返信の確認を試せます。
4. `改善タスク` で低評価レビューから生成された店舗改善タスクを確認できます。
5. AI返信案は再生成するたびに新しい下書きとして保存され、必要に応じて前案へ戻せます。
6. `GBP投稿` で店舗投稿の下書き、AI整形、承認待ち、公開済み管理を試せます。GBP投稿案も再生成ごとに新しい下書きになり、前案へ戻せます。
7. `MEO施策` で提供パッケージ案、効果測定、HP/SNS連携、レビュー獲得導線を確認できます。現在の説明では通知キュータブとMEOの「今週やること」は置かず、レビュー返信、改善タスク、GBP投稿に操作を集約します。
8. 現場者はLINE上でレビュー確認・店長共有・現場確認済み処理を行い、管理者だけがLINEの `管理者ログイン` からWeb管理者画面へ進む想定です。

## CSV形式

`sample_reviews.csv` のように、以下の列名で取り込めます。

```csv
store,rating,author,comment,createdAt
渋谷店,5,佐藤,"料理が美味しかったです。",2026-06-15
```

日本語列名の `店舗,評価,投稿者,口コミ,投稿日` にも一部対応しています。

## 今できること

- レビューのローカル保存
- CSVインポート
- 過去24時間/7日/30日、星数、リスク、状態、キーワードでのレビュー絞り込み
- 優先度判定: P0/P1/P2/P3
- 論点分類: 健康被害、異物混入、接客、待ち時間、料理品質など
- AI風の要約・返信案生成
- 選択星数の未返信レビューを完全自動返信対象として判定
- 指定時刻にユーザー承認なしで完全自動返信する運用設計
- 要チェックキーワードに該当するレビューの自動停止
- AI返信案/GBP投稿案の再生成履歴と前案への復帰
- 承認待ち・返信済みのステータス管理
- 返信済みレビューの返信日時表示
- 通知文生成
- 店舗改善タスク生成
- MEO施策ボード
- ASPIC掲載上位サービスを参考にした運用パターン切替
- キーワード順位トラッキング
- 多地点順位ヒートマップ
- 競合比較
- GBP改善チェック
- 検索キーワード選定の改善チェック
- HP/SNS/グルメサイト連携
- 評価されている部分・そうでない部分の分析
- Before/Afterの営業用ケーススタディ
- クライアント向けに簡素化したMEOレポート
- 管理者画面と現場者画面の二層式運用
- LINE上で完結する現場者向けレビュー確認フロー
- LINEの管理者ログインからスマホブラウザで管理者画面へ進む導線
- 管理者画面/現場者LINE素材からのGBP投稿下書き作成
- 提供パッケージ案
- 効果測定
- レビュー獲得導線の設計
- 多言語/インバウンド対応チェック
- サイテーション/NAP監査
- Google投稿案生成
- GBP投稿キュー
- クリエイティブABテスト案
- 運用代行カレンダー

## 事業構想ミーティングから反映した論点

- 主な販売対象は、競合の多い繁華街でMEOが伸び悩む単独店舗・少人数店舗です。
- hanare/離れのようにBefore時点で強い店舗は効果比較ではなく、無料モニターやUX検証、上位店ベンチマークとして扱います。
- MEOの価値はレビュー返信だけでなく、レビュー数を増やす導線、GBP最適化、正確な店舗情報、投稿、HP/SNS連携まで含めて伝えます。
- 初期診断を無料化し、最低6か月の運用契約につなげるプランを想定しています。
- 将来構想として、Googleアカウント起点のモバイルオーダーや会計前アンケートからレビュー投稿へつなげる導線を置いています。
- 飲食店が使いやすいよう、機能を盛りすぎず、短時間で返信・確認・改善タスク化できるUIを優先しています。

## 参考にしたMEO運用代行サービスの機能パターン

ASPICの記事「MEO運用代行サービス比較12選」に掲載されているサービスのうち、掲載順上位の以下3サービスを参考にしています。

- EPRESS MEO: GBP運用、口コミ対策、サイテーション、外部媒体連携、データ分析
- MEO Dash!: 順位計測、競合順位比較、多地点順位分析、多店舗一括管理、クリエイティブ改善
- ホワイトリンク: GBP最適化、外部対策、費用対効果、店舗ごとの個別支援

画面デザインは各社のUIをコピーせず、ミセコエ用に再設計しています。

## 本番化で追加するもの

- Google Business Profile API OAuth接続。店舗オーナーまたは管理者権限を持つGoogleアカウントでGoogleログインし、対象店舗へのアクセスを許可する
- Reviews APIによるレビュー取得・返信投稿
- LocalPosts APIによるGBP店舗投稿
- Cloud Pub/Subによる新規レビュー通知
- LINE Messaging API / Slack Webhookの実送信
- LINE Messaging API Webhook: `/api/line/webhook`
- Cloudflare D1保存
- 監査ログ
- Google APIポリシーに合わせた保存期間管理
- 店舗ごとの明示的な自動返信同意フロー

詳細は以下に整理しています。

- `docs/PRODUCTION_DESIGN.md`: 本番導入時の全体設計
- `docs/SETUP_CHECKLIST.md`: 導入作業チェックリスト
- `migrations/0001_schema.sql`: Cloudflare D1用の初期スキーマ

## Cloudflare Pagesで公開する設定

このMVPは静的サイトなので、Cloudflare Pagesでは以下の設定で公開できます。

- Framework preset: None
- Build command: 空欄、または `npm run build`
- Build output directory: `/`
- Root directory: `/`

GitHub連携で公開する場合は、このフォルダをGitHub repoにpushし、Cloudflare Pagesで `Connect to Git` から対象repoを選択します。

## LINEで実機確認する設定

Cloudflare Pages FunctionsでLINE Webhookを受ける実装を追加しています。

- Webhook URL: `https://reviewchef-ai.pages.dev/api/line/webhook`
- 現場者画面: LINE上のFlex Messageとpostback
- 管理者ログインURL: `https://reviewchef-ai.pages.dev/?view=reviews`
- 検証用プレビューURL: `https://reviewchef-ai.pages.dev/?view=staff`
- LINEで送るテスト文言: `レビュー`

Cloudflare Pagesの環境変数に以下を設定します。値はGitHubへコミットしません。

- `LINE_CHANNEL_SECRET`: LINE DevelopersのMessaging APIチャネルのChannel secret
- `LINE_CHANNEL_ACCESS_TOKEN`: Messaging APIチャネルのChannel access token

LINE Developers側では、Messaging APIタブでWebhook URLを設定し、Use webhookを有効にします。その後、LINE公式アカウントを友だち追加し、トークで `レビュー` と送ると確認カードが返ります。カード内の `管理者ログイン` からWeb管理者画面へ進む想定です。

公式アカウント作成とWebhook接続の詳細は [`docs/LINE_OFFICIAL_ACCOUNT_SETUP.md`](docs/LINE_OFFICIAL_ACCOUNT_SETUP.md) にまとめています。

現時点では実機確認用の返信型デモです。スタッフへの能動的なプッシュ通知は、次段階でLINE userIdまたはgroupIdを保存する仕組みを追加して有効化します。

## GBP投稿API

Cloudflare Pages FunctionsにGBP投稿APIの骨格を追加しています。

- `GET /api/gbp/posts`: 接続状態確認
- `POST /api/gbp/posts` with `action=draft`: Google投稿payloadの正規化
- `POST /api/gbp/posts` with `action=publish`: Google Business Profile LocalPosts APIへ投稿

公開に必要な環境変数:

- `GBP_LOCATION_NAME`: `accounts/{accountId}/locations/{locationId}`
- `GOOGLE_GBP_ACCESS_TOKEN` または `GOOGLE_GBP_REFRESH_TOKEN`
- Refresh token利用時は `GOOGLE_CLIENT_ID` と `GOOGLE_CLIENT_SECRET`

本番の管理者画面には、店舗設定または連携設定としてGBP連携ステータス、接続開始、OAuth期限切れ時の再連携導線を置きます。接続はGoogleログイン/OAuthで行い、店舗オーナーまたは管理者権限のGoogleアカウントだけがGBP locationを紐付けられる想定です。

## レビュー返信API

- `POST /api/reviews/{reviewId}/reply` with `action=draft`: 返信payloadの正規化
- `POST /api/reviews/{reviewId}/reply` with `action=publish`: Google Business Profile Reviews APIへ返信投稿

本番では管理者画面の `承認してGoogleに投稿` をこのエンドポイントへ接続し、成功時に返信日時を保存します。

## 注意

このMVPはローカルプロトタイプです。現在は実際のGoogleレビューへ返信しません。
本番運用ではGoogle Business Profile APIの審査、OAuth、店舗オーナーまたは管理者権限、レビュー返信の明示的な許諾が必要です。完全自動返信は、店舗ごとの同意、対象星数、実行時刻、要チェックキーワード、監査ログを前提に実行します。
