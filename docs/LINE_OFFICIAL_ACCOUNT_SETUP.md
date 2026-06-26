# LINE公式アカウント設定

## 作成するアカウント

- 推奨アカウント名: `ミセコエ 現場通知`
- 用途: 飲食店スタッフがLINE上でレビュー確認、店長共有、現場確認済み、GBP投稿素材送信を行う
- Webhook URL: `https://reviewchef-ai.pages.dev/api/line/webhook`
- 管理者画面URL: `https://reviewchef-ai.pages.dev/?view=reviews`
- 現場者プレビューURL: `https://reviewchef-ai.pages.dev/?view=staff`

## LINE側で作るもの

1. LINE Official Account Managerで公式アカウントを作成
2. Messaging APIを有効化
3. LINE Developers ConsoleでMessaging APIチャネルを確認
4. Messaging API設定でWebhook URLを設定
5. `Use webhook` を有効化
6. 応答メッセージやAI応答メッセージはオフにする
7. Channel secretとChannel access tokenをCloudflare Pagesへ設定

## Cloudflare環境変数

- `LINE_CHANNEL_SECRET`
- `LINE_CHANNEL_ACCESS_TOKEN`

## LINEで使うコマンド

- `レビュー`: 未確認レビューの確認カードを表示
- `確認`: レビュー確認カードを表示
- `管理者`: 管理者ログインURLを表示
- `投稿素材 今日のおすすめは季節野菜のハンバーグです`: GBP投稿素材として受け付け
- `おすすめ`, `空席`, `イベント`, `臨時営業時間`: 投稿素材として受け付け
- `ヘルプ`: 使い方を表示

## 実機確認

1. 公式アカウントを友だち追加
2. `レビュー` と送信
3. Flex Messageでレビュー確認カードが返る
4. `現場確認済み` と `店長に共有` のpostbackが返る
5. `管理者ログイン` からWeb管理者画面へ進む
6. `投稿素材 今日のおすすめは...` と送信し、投稿キューへの導線が返る

## 本番化で追加すること

- LINE userIdまたはgroupIdを店舗・ユーザーと紐付ける
- postback結果をD1へ保存し、管理者画面のレビュー状態へ反映する
- 投稿素材を `gbp_posts` に保存し、管理者画面の投稿キューへ実データとして表示する
- 店舗ごとの権限判定をGoogleログインまたはLINE Loginで行う
