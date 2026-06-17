# ReviewChef AI MVP

飲食店向けのGoogleレビュー運用SaaS案を、まずローカルで触れる形にしたMVPです。

## 使い方

1. `index.html` をブラウザで開きます。
2. デモレビューが自動で表示されます。
3. `レビュー受信箱` でCSV取り込み、手動追加、返信案編集、返信済み処理を試せます。
4. `改善タスク` で低評価レビューから生成された店舗改善タスクを確認できます。
5. `通知キュー` でLINEやSlackに送る想定の通知文をコピーできます。
6. `ダッシュボード` で導入対象、Before/After、最低限必要な機能、評判分析を確認できます。
7. `MEO施策` で提供パッケージ案、効果測定、HP/SNS連携、レビュー獲得導線を確認できます。
8. LINEやSlackなどから入る `現場者画面` で、レビュー確認・店長共有・現場確認済み処理を行う流れを確認できます。

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
- 手動レビュー追加
- 優先度判定: P0/P1/P2/P3
- 論点分類: 健康被害、異物混入、接客、待ち時間、料理品質など
- AI風の要約・返信案生成
- 自動返信候補の判定
- 承認待ち・返信済みのステータス管理
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
- 現場者画面向けのLINE通知風レビュー確認UI
- 提供パッケージ案
- 効果測定
- レビュー獲得導線の設計
- 多言語/インバウンド対応チェック
- サイテーション/NAP監査
- Google投稿案生成
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

画面デザインは各社のUIをコピーせず、ReviewChef AI用に再設計しています。

## 本番化で追加するもの

- Google Business Profile API OAuth接続
- Reviews APIによるレビュー取得・返信投稿
- Cloud Pub/Subによる新規レビュー通知
- LINE Messaging API / Slack Webhookの実送信
- LINE Messaging API Webhook: `/api/line/webhook`
- PostgreSQL保存
- 監査ログ
- Google APIポリシーに合わせた保存期間管理
- 店舗ごとの明示的な自動返信同意フロー

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
- 現場者画面URL: `https://reviewchef-ai.pages.dev/?view=staff`
- LINEで送るテスト文言: `レビュー`

Cloudflare Pagesの環境変数に以下を設定します。値はGitHubへコミットしません。

- `LINE_CHANNEL_SECRET`: LINE DevelopersのMessaging APIチャネルのChannel secret
- `LINE_CHANNEL_ACCESS_TOKEN`: Messaging APIチャネルのChannel access token

LINE Developers側では、Messaging APIタブでWebhook URLを設定し、Use webhookを有効にします。その後、LINE公式アカウントを友だち追加し、トークで `レビュー` と送ると確認カードが返ります。

現時点では実機確認用の返信型デモです。スタッフへの能動的なプッシュ通知は、次段階でLINE userIdまたはgroupIdを保存する仕組みを追加して有効化します。

## 注意

このMVPはローカルプロトタイプです。現在は実際のGoogleレビューへ返信しません。
本番運用ではGoogle Business Profile APIの審査、OAuth、店舗オーナー権限、レビュー返信の明示的な許諾が必要です。
