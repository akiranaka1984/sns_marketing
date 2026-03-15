# tRPC API ドキュメント インデックス

**プロジェクト**: SNSマーケティング自動化プラットフォーム
**最終更新**: 2026年3月15日

---

## ドキュメント構成

このフォルダには、tRPC APIに関する包括的なドキュメントが含まれています。

### 📘 主要ドキュメント

| ドキュメント | 説明 | 対象者 |
|-------------|------|--------|
| **[クイックスタートガイド](./API_QUICKSTART.md)** | 5分で始める使用例 | フロントエンド開発者 |
| **[完全なAPI リファレンス](./API_REFERENCE.md)** | すべてのエンドポイント仕様 | 全員 |
| **[実装ガイド](./API_IMPLEMENTATION_GUIDE.md)** | 新しいエンドポイント追加方法 | バックエンド開発者 |

---

## クイックリンク

### 機能別ガイド

#### 🔐 認証・ユーザー管理
- [認証エンドポイント](./API_REFERENCE.md#auth) - ログイン、ログアウト、ユーザー情報
- [実装例：認証](./API_QUICKSTART.md#認証ユーザー)

#### 📱 アカウント管理
- [アカウントエンドポイント](./API_REFERENCE.md#accounts) - アカウント CRUD、デバイスリンク
- [実装例：アカウント](./API_QUICKSTART.md#アカウント管理)
- [成長統計](./API_REFERENCE.md#accountsgrowthstats)
- [ペルソナ管理](./API_REFERENCE.md#accountsupdatepersona)

#### 📊 プロジェクト・キャンペーン
- [プロジェクトエンドポイント](./API_REFERENCE.md#projects) - プロジェクト CRUD、モード管理
- [実装例：プロジェクト](./API_QUICKSTART.md#プロジェクト管理)
- [KPI管理](./API_REFERENCE.md#projectsuggestkpis)
- [戦略生成](./API_REFERENCE.md#projectsgeneratestrategyWithcontext)

#### 📝 コンテンツ・投稿管理
- [スケジュール投稿](./API_REFERENCE.md#scheduled-posts) - 投稿スケジューリング、自動投稿
- [実装例：投稿](./API_QUICKSTART.md#投稿スケジューリング)
- [コンテンツ収集](./API_REFERENCE.md#content-management)
- [戦略管理](./API_REFERENCE.md#strategies)

#### 🤖 エージェント（AI投稿）
- [エージェントエンドポイント](./API_REFERENCE.md#agents) - エージェント作成・管理
- [実装例：エージェント](./API_QUICKSTART.md#エージェント管理)
- [コンテンツ生成](./API_QUICKSTART.md#エージェントでコンテンツを生成)

#### 👥 エンゲージメント自動化
- [エンゲージメント](./API_REFERENCE.md#engagement) - いいね、フォロー、コメント自動化
- [実装例：エンゲージメント](./API_QUICKSTART.md#エンゲージメント管理)
- [エンゲージメント収集](./API_REFERENCE.md#other-routers)

#### 📈 分析・インサイト
- [分析エンドポイント](./API_REFERENCE.md#analytics) - パフォーマンス分析
- [実装例：分析](./API_QUICKSTART.md#分析)
- [学習インサイト](./API_REFERENCE.md#other-routers)
- [バズ分析](./API_REFERENCE.md#other-routers)

#### 🔧 設定・統合
- [X API設定](./API_REFERENCE.md#x-api-settings) - Twitter API管理
- [実装例：X API](./API_QUICKSTART.md#x-api設定)
- [OAuth認証](./API_REFERENCE.md#oauth) - 3-legged OAuth
- [LLM設定](./API_REFERENCE.md#settings)

#### 🛠️ その他の機能
- [フリーズ検出・回復](./API_REFERENCE.md#other-routers)
- [A/Bテスト](./API_REFERENCE.md#other-routers)
- [モデルアカウント](./API_REFERENCE.md#other-routers)
- [プロフィール最適化](./API_REFERENCE.md#other-routers)

---

## 開発者向けガイド

### 新しいエンドポイントを追加する

1. [実装ガイド](./API_IMPLEMENTATION_GUIDE.md#新しいルーターの作成) を読む
2. ルーターファイルを作成（`server/my-feature.routers.ts`）
3. `server/routers.ts` に統合
4. テストを書く（[テスト方法](./API_IMPLEMENTATION_GUIDE.md#テストの書き方)）
5. このドキュメントを更新

### エラー処理

- [エラーハンドリング](./API_IMPLEMENTATION_GUIDE.md#エラーハンドリング)
- [エラーコード表](./API_REFERENCE.md#一般的なエラーコード)
- [トラブルシューティング](./API_IMPLEMENTATION_GUIDE.md#デバッグトラブルシューティング)

### ベストプラクティス

- [セキュリティ](./API_IMPLEMENTATION_GUIDE.md#認可認証)
- [パフォーマンス](./API_IMPLEMENTATION_GUIDE.md#ベストプラクティス)
- [テスト](./API_IMPLEMENTATION_GUIDE.md#テストの書き方)
- [ロギング](./API_IMPLEMENTATION_GUIDE.md#1-ログを見る)

---

## フロントエンド開発者向けガイド

### 開発を始める

1. [クイックスタート](./API_QUICKSTART.md) で基本を学ぶ
2. 必要な機能の実装例を確認
3. [API リファレンス](./API_REFERENCE.md) で詳細を確認

### よくあるパターン

#### データ取得・表示
```typescript
// クイックスタート参照
- [アカウント一覧](./API_QUICKSTART.md#アカウント一覧を取得)
- [プロジェクト一覧](./API_QUICKSTART.md#プロジェクト一覧を取得)
- [投稿一覧](./API_QUICKSTART.md#スケジュール投稿の一覧を取得)
```

#### データ作成・更新
```typescript
// クイックスタート参照
- [アカウント追加](./API_QUICKSTART.md#新しいアカウントを追加)
- [プロジェクト作成](./API_QUICKSTART.md#新規プロジェクトを作成)
- [投稿スケジュール](./API_QUICKSTART.md#投稿をスケジュール)
```

#### エラー処理
- [エラーハンドリング](./API_QUICKSTART.md#エラーハンドリング)
- [よくある質問](./API_QUICKSTART.md#よくある質問)

---

## API 統計

### ルーター数: 36
### エンドポイント数: 200+
### 認可パターン:
- `protectedProcedure`: 認証必須
- `publicProcedure`: 認証不要

### 対応プラットフォーム
- ✅ X (Twitter)
- ⏳ TikTok（計画中）
- ⏳ Instagram（計画中）
- ⏳ Facebook（計画中）

---

## ルーター一覧

### コア機能
- `auth` - 認証・ログアウト
- `accounts` - アカウント管理
- `projects` - プロジェクト管理
- `strategies` - 戦略管理

### 投稿・コンテンツ
- `scheduledPosts` - スケジュール投稿
- `contentCollection` - コンテンツ収集
- `contentReview` - レビュー・承認
- `contentRewrite` - リライト
- `autoContentGeneration` - 自動生成

### エージェント
- `agents` - AI投稿エージェント
- `agentScheduledPosts` - エージェント投稿
- `abTesting` - A/Bテスト

### エンゲージメント
- `engagement` - タスク管理
- `engagementCollector` - データ収集
- `interactionSettings` - 設定
- `interactions` - インタラクション管理

### 分析
- `analytics` - パフォーマンス分析
- `learningInsights` - 学習インサイト
- `buzzAnalysis` - バズ分析
- `growthDashboard` - 成長ダッシュボード
- `kpiTracking` - KPI追跡

### インフラ・設定
- `settings` - APIキー管理
- `xApiSettings` - X API設定
- `accountOAuth` - OAuth認証
- `playwrightSession` - ブラウザセッション
- `freeze` - フリーズ検出
- `scheduler` - スケジューラー
- `agentScheduler` - エージェントスケジューラー
- `tenant` - テナント管理
- `logs` - ログ管理

### その他
- `projectModelAccounts` - プロジェクト×モデルアカウント
- `modelAccounts` - モデルアカウント
- `accountRelationships` - 関係管理
- `profileOptimization` - プロフィール最適化
- `weeklyReview` - 週次レビュー
- `aiOptimization` - AI最適化
- `newAutomation` - 新規自動化
- `health` - ヘルスチェック

---

## トラブルシューティング

### よくある問題

**Q: "NOT_FOUND" エラーが出る**
- [アカウントが所有権を持つか確認](./API_IMPLEMENTATION_GUIDE.md#パターン2-リソース所有権確認)
- [リソースが存在するか確認](./API_REFERENCE.md#エラーハンドリング)

**Q: バリデーションエラー**
- [Zod スキーマの確認](./API_IMPLEMENTATION_GUIDE.md#zod-スキーマの定義)
- [入力形式を確認](./API_QUICKSTART.md#よくある質問)

**Q: タイムアウト**
- [クエリパフォーマンスを確認](./API_IMPLEMENTATION_GUIDE.md#3-データベースクエリは効率的に)
- [ブラウザのネットワークタブを確認](./API_QUICKSTART.md#ネットワークタブを確認)

**Q: キャッシュが古い**
- [キャッシュ無効化](./API_QUICKSTART.md#q-キャッシュを破棄したい)
- [再取得](./API_QUICKSTART.md#ローディングキャッシュ管理)

詳細は [トラブルシューティング](./API_IMPLEMENTATION_GUIDE.md#デバッグトラブルシューティング) を参照。

---

## API 設計原則

1. **型安全**: TypeScript + Zod で完全な型チェック
2. **シンプル**: RESTful なエンドポイント命名
3. **一貫性**: 統一されたエラーハンドリング
4. **セキュリティ**: 所有権確認、入力検証
5. **ドキュメント**: すべてのエンドポイントに説明
6. **テスト**: ユニット・E2Eテスト完備

---

## 関連リソース

### プロジェクトドキュメント
- [README.md](../README.md) - プロジェクト概要
- [CLAUDE.md](../CLAUDE.md) - プロジェクト設定
- [ディレクトリ構造](../CLAUDE.md#ディレクトリ構成)

### 外部リソース
- [tRPC 公式ドキュメント](https://trpc.io/)
- [Zod バリデーション](https://zod.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Express.js](https://expressjs.com/)
- [React Query（React側のtRPC統合）](https://tanstack.com/query/)

---

## 貢献ガイド

### ドキュメント更新時

1. 該当するドキュメントを編集
2. 変更を `git commit` にまとめる
3. PR で レビューを受ける
4. このインデックスを更新

### 新しいドキュメント追加時

このインデックスに追加してください。

---

## ドキュメント更新履歴

| 日付 | 内容 |
|------|------|
| 2026-03-15 | 初版作成 - 4つのドキュメント作成（API リファレンス、実装ガイド、クイックスタート、インデックス） |

---

## よくある質問（FAQ）

**Q: どこから始めたらいい？**
A: 開発者の役割に応じて：
- フロントエンド: [クイックスタート](./API_QUICKSTART.md)
- バックエンド: [実装ガイド](./API_IMPLEMENTATION_GUIDE.md)
- 全員: [API リファレンス](./API_REFERENCE.md)

**Q: 新しいエンドポイントを作りたい**
A: [実装ガイド - 新しいルーターの作成](./API_IMPLEMENTATION_GUIDE.md#新しいルーターの作成)

**Q: エラーが出た**
A: [トラブルシューティング](./API_IMPLEMENTATION_GUIDE.md#デバッグトラブルシューティング)

**Q: このドキュメントのバージョンは？**
A: 最後の行で確認できます（最終更新: 2026年3月15日）

---

**作成者**: Documentation Engineer
**バージョン**: 1.0.0
**ステータス**: 完成版

---

*このドキュメントは定期的に更新されます。ご質問やフィードバックは、プロジェクトリーダーまでお願いします。*
