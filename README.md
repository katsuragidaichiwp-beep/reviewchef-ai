# ReviewChef AI MVP

飲食店向けのGoogleレビュー運用SaaS案を、まずローカルで触れる形にしたMVPです。

## 使い方

1. `index.html` をブラウザで開きます。
2. デモレビューが自動で表示されます。
3. `レビュー受信箱` でCSV取り込み、手動追加、返信案編集、返信済み処理を試せます。
4. `改善タスク` で低評価レビューから生成された店舗改善タスクを確認できます。
5. `通知キュー` でLINEやSlackに送る想定の通知文をコピーできます。

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
- サイテーション/NAP監査
- Google投稿案生成
- クリエイティブABテスト案
- 運用代行カレンダー

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

## 注意

このMVPはローカルプロトタイプです。現在は実際のGoogleレビューへ返信しません。
本番運用ではGoogle Business Profile APIの審査、OAuth、店舗オーナー権限、レビュー返信の明示的な許諾が必要です。
