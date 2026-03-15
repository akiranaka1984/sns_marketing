# X API v2 移行設計書

**作成日:** 2026-03-15
**対象:** SNSマーケティング自動化プラットフォーム
**目的:** Playwright ブラウザ自動化から X API v2 公式 API への完全移行
**背景:** RISK_ANALYSIS_50_ACCOUNTS.md の分析に基づき、ToS 違反・アカウント凍結リスクの根本的解消を目指す

---

## 目次

1. [現状分析](#1-現状分析)
2. [X API v2 機能マッピング](#2-x-api-v2-機能マッピング)
3. [移行フェーズ計画](#3-移行フェーズ計画)
4. [APIレート制限の考慮](#4-apiレート制限の考慮)
5. [リスクと軽減策](#5-リスクと軽減策)
6. [コスト試算](#6-コスト試算)
7. [移行判断基準](#7-移行判断基準)

---

## 1. 現状分析

### 1.1 Playwright 依存箇所の一覧

#### コア自動化モジュール

| ファイル | 役割 | 依存レベル |
|---------|------|-----------|
| `server/playwright/x-playwright-poster.ts` | ツイート投稿（ブラウザ操作） | **最高** |
| `server/playwright/engagement-actions.ts` | いいね・フォロー・リツイート・コメント | **最高** |
| `server/playwright/x-login-handler.ts` | ログイン・セッション維持 | 高 |
| `server/playwright/browser-session-manager.ts` | ブラウザコンテキスト管理 | 高 |
| `server/playwright/screencast-service.ts` | リアルタイムスクリーンキャスト | 中 |
| `server/playwright/ws-preview.ts` | WebSocket プレビュー配信 | 中 |
| `server/playwright/config.ts` | セレクタ・URL 定数 | 高 |

#### Playwright が担う具体的な操作

```
投稿フロー:
  ensureLoggedIn() -> acquireContext() -> page.goto(x.com/home)
  -> composeTweetButton.click() -> tweetTextArea.fill(content)
  -> fileInput.setInputFiles(media) -> tweetButtonInline.click()

エンゲージメントフロー:
  likePostViaPlaywright()      -> page.goto(postUrl) -> like.click()
  commentPostViaPlaywright()   -> page.goto(postUrl) -> reply.click() -> tweetButton.click()
  followUserViaPlaywright()    -> page.goto(/@username) -> follow.click()
  unfollowUserViaPlaywright()  -> page.goto(/@username) -> unfollow.click() -> confirm.click()
  retweetPostViaPlaywright()   -> page.goto(postUrl) -> retweet.click() -> retweetConfirm.click()
```

#### 現在の並行稼働状況

`server/x-api-v2-poster.ts` は既に実装済みで、`account.postingMethod` フィールドにより投稿のみ切り替え可能な状態になっている。ただしエンゲージメント操作（いいね・フォロー・リツイート・コメント）は全て Playwright に依存したままである。

#### セレクタ脆弱性

`config.ts` に定義された 17 個の `data-testid` セレクタは X 社の UI 変更で予告なく無効化される。過去にも複数回の変更実績があり、メンテナンスコストが継続的に発生する。

### 1.2 現行アーキテクチャの問題点

```
問題点の深刻度:

[CRITICAL] X Automation Rules で明確に禁止されているブラウザ自動化を使用
[CRITICAL] Playwright/CDP 検出シグナルが X 社の TLS フィンガープリント解析で識別可能
[HIGH]     セレクタ変更への脆弱性（UI 変更で全機能停止のリスク）
[HIGH]     並行ブラウザ数の制限（MAX_CONCURRENT_BROWSERS = 3）がスケーラビリティを阻害
[HIGH]     メモリ使用量（1 セッションあたり 200-500MB）によるインフラコスト増大
[MEDIUM]   ログイン認証情報（username/password）をサーバー側で管理するセキュリティリスク
[MEDIUM]   スクリーンキャスト・WebSocket 機能の維持コスト
```

### 1.3 既存の X API v2 実装状況

`server/x-api-v2-poster.ts` および `server/x-api-service.ts` で以下が既に実装済み。

| 機能 | 実装ファイル | 使用認証 | 状態 |
|------|------------|---------|------|
| ツイート投稿 | `x-api-v2-poster.ts` | OAuth 1.0a (User context) | 実装済み |
| メディアアップロード（INIT/APPEND/FINALIZE） | `x-api-v2-poster.ts` | OAuth 1.0a | 実装済み |
| 動画処理待機 | `x-api-v2-poster.ts` | OAuth 1.0a | 実装済み |
| API 使用量トラッキング | `x-api-v2-poster.ts` | DB | 実装済み |
| レート制限ヘッダー解析 | `x-api-v2-poster.ts` | - | 実装済み |
| 接続テスト (GET /2/users/me) | `x-api-v2-poster.ts` | OAuth 1.0a | 実装済み |
| ユーザープロフィール取得 | `x-api-service.ts` | Bearer Token | 実装済み |
| タイムライン取得 | `x-api-service.ts` | Bearer Token | 実装済み |
| ツイート検索 | `x-api-service.ts` | Bearer Token | 実装済み |
| エンゲージメントメトリクス取得 | `x-api-service.ts` | Bearer Token | 実装済み |
| ハッシュタグ分析 | `x-api-service.ts` | Bearer Token | 実装済み |

---

## 2. X API v2 機能マッピング

### 2.1 API v2 で実現可能な機能

#### 完全対応（実装済みまたは実装容易）

| 機能 | エンドポイント | 認証 | プラン要件 | 備考 |
|------|--------------|------|-----------|------|
| ツイート投稿 | POST /2/tweets | OAuth 1.0a | Basic ($200/月) | 実装済み |
| リツイート | POST /2/users/:id/retweets | OAuth 1.0a | Basic | 新規実装が必要 |
| いいね | POST /2/users/:id/likes | OAuth 1.0a | Basic | 新規実装が必要 |
| いいね解除 | DELETE /2/users/:id/likes/:tweet_id | OAuth 1.0a | Basic | 新規実装が必要 |
| フォロー | POST /2/users/:id/following | OAuth 1.0a | Basic | 新規実装が必要 |
| フォロー解除 | DELETE /2/users/:source_id/following/:target_id | OAuth 1.0a | Basic | 新規実装が必要 |
| リプライ（ツイートの reply_to 指定） | POST /2/tweets (reply フィールド) | OAuth 1.0a | Basic | 新規実装が必要 |
| リツイート解除 | DELETE /2/users/:id/retweets/:tweet_id | OAuth 1.0a | Basic | 新規実装が必要 |
| メディアアップロード | POST /2/media/upload | OAuth 1.0a | Basic | 実装済み |
| ユーザー情報取得 | GET /2/users/me | OAuth 1.0a | Free | 実装済み |
| タイムライン取得 | GET /2/users/:id/tweets | Bearer Token | Basic | 実装済み |
| ツイート検索 | GET /2/tweets/search/recent | Bearer Token | Basic | 実装済み |
| エンゲージメント指標 | GET /2/tweets/:id (public_metrics) | Bearer Token | Basic | 実装済み |

#### 条件付き対応（API プランによる）

| 機能 | エンドポイント | プラン要件 | 月額 | 制約 |
|------|--------------|-----------|------|------|
| ブックマーク追加 | POST /2/users/:id/bookmarks | Basic | $200 | 読み取り・書き込み両方 |
| ブックマーク削除 | DELETE /2/users/:id/bookmarks/:tweet_id | Basic | $200 | 同上 |
| リスト管理 | POST /2/lists | Basic | $200 | 作成・編集 |
| DM 送信 | POST /2/dm_conversations | Basic | $200 | スパム規制注意 |
| 過去ツイート検索（7日超） | GET /2/tweets/search/all | Pro | $5,000 | Full Archive Search |
| フィルタードストリーム | GET /2/tweets/search/stream | Pro | $5,000 | リアルタイム取得 |

### 2.2 API v2 で実現不可能な機能

#### 技術的に不可能（API 非対応）

| 機能 | 現行実装 | 理由 | 代替手段 |
|------|---------|------|---------|
| プロフィール画像変更 | 未実装（Playwright 想定） | v2 非対応 (v1.1 のみ) | v1.1 は廃止済み。変更不可 |
| ヘッダー画像変更 | 未実装 | v2 非対応 | 変更不可 |
| プロフィール bio 更新 | `updateXUserProfile()` (スタブ) | v2 非対応 | 手動操作のみ |
| トレンド取得 | 未実装 | Trends API は廃止済み | サードパーティデータ活用 |
| ハッシュタグ自動補完候補取得 | 未実装 | 内部 API のみ | 手動設定 |
| スクリーンキャスト（リアルタイム操作確認） | Playwright + WebSocket | 概念自体が API 非対応 | ログ・通知で代替 |

#### ビジネスモデル上実現すべきでない機能（ToS 違反）

| 機能 | 規約上の問題 | 移行後の扱い |
|------|------------|------------|
| 自動エンゲージメント増幅（amplification plan） | CIB（組織的不正行為）に該当 | 廃止必須 |
| 複数アカウント間の相互いいね・RT | Platform Manipulation に該当 | 廃止必須 |
| 会話スレッド偽装 | CIB に該当 | 廃止必須 |

**重要:** API v2 経由であっても、上記の行為は ToS 違反であり、Developer App の停止・全アカウント凍結リスクがある。移行はあくまで「合法的な自動化範囲内での実施」を前提とする。

---

## 3. 移行フェーズ計画

### フェーズ概要

```
Phase 0: 準備期間（1週間）
  - OAuth 認証基盤の整備
  - 各アカウントの Access Token 取得フロー実装

Phase 1: 投稿移行（2-3週間）
  - x-api-v2-poster.ts を全アカウントのデフォルトに昇格
  - Playwright 投稿の段階的廃止

Phase 2: エンゲージメント移行（3-4週間）
  - API v2 エンゲージメントサービスの新規実装
  - engagement-actions.ts の API 版への置き換え

Phase 3: Playwright 完全廃止（2-3週間）
  - 残存 Playwright 依存の除去
  - インフラ・依存パッケージのクリーンアップ
```

---

### Phase 0: 準備期間（1週間）

#### 目的

全フェーズの前提となる OAuth 認証基盤を整備する。現行は `xApiSettings` テーブルにグローバルな Access Token を保存する構造だが、複数アカウントの独立した API 操作には各アカウント固有の Access Token が必要。

#### タスク一覧

```
[ ] P0-1: Developer Portal でアプリケーション設定を確認
    - Read + Write 権限の確認
    - OAuth 1.0a コールバック URL の設定
    - 必要なスコープ: tweet.read, tweet.write, users.read, follows.read,
                      follows.write, like.read, like.write, offline.access

[ ] P0-2: 3-legged OAuth フローのエンドポイント実装
    - GET  /api/oauth/authorize/:accountId  -> X 認証画面へリダイレクト
    - GET  /api/oauth/callback              -> Access Token 取得・DB 保存
    実装場所: server/routers/ 配下に oauth.ts を新規作成

[ ] P0-3: accounts テーブルの確認
    - oauthAccessToken カラム: 存在確認（x-api-v2-poster.ts で参照済み）
    - oauthAccessTokenSecret カラム: 存在確認
    - oauthUsername カラム: 存在確認
    - 不足カラムがあれば drizzle/schema.ts に追加し db:push

[ ] P0-4: API 認証状態確認 UI の実装
    - Settings 画面に各アカウントの OAuth 接続状態を表示
    - 未認証アカウントに対して「X で認証」ボタンを表示

[ ] P0-5: 既存 x-api-v2-poster.ts の動作確認
    - testApiV2Connection() を全アカウントで実行
    - per-account token と global token のフォールバック動作を検証
```

#### 完了基準

- 全対象アカウントで GET /2/users/me が成功すること
- per-account OAuth token が DB に正常保存されていること

---

### Phase 1: 投稿移行（2-3週間）

#### 目的

`postToXViaPlaywright()` を `postToXViaApiV2()` に完全置き換える。`x-api-v2-poster.ts` は既に本番品質で実装されているため、主な作業はルーティングの切り替えとテストになる。

#### タスク一覧

```
[ ] P1-1: postingMethod フィールドの DB 確認
    - accounts テーブルに postingMethod カラムが存在するか確認
    - 存在しない場合: drizzle/schema.ts に追加
    - デフォルト値: 'api_v2' に変更（現行 'playwright' を廃止方向へ）

[ ] P1-2: スケジューラーの切り替えロジック確認
    - server/services/scheduler.ts での postingMethod 分岐箇所を特定
    - API v2 を優先するよう条件を反転

[ ] P1-3: 移行検証（テストアカウントで実施）
    - テキストのみのツイート投稿テスト
    - 画像付きツイートのテスト（JPEG/PNG/GIF）
    - 動画付きツイートのテスト（MP4、処理待機を含む）
    - 280文字上限・日本語文字列のテスト
    - 既存のエラーハンドリング（429, 403, ネットワーク断）のテスト

[ ] P1-4: 全アカウントへの段階的ロールアウト
    - Step 1: 1-2 アカウントで 1 週間稼働確認
    - Step 2: 全アカウントの postingMethod を 'api_v2' に更新

[ ] P1-5: Playwright 投稿コードの非アクティブ化
    - postToXViaPlaywright() の呼び出し箇所に DEPRECATED コメントを追加
    - Phase 3 まで削除は保留（ロールバック用）

[ ] P1-6: メトリクス監視設定
    - apiUsageTracking テーブルのデータを UI で可視化
    - 月次投稿数・レート制限接近アラートの設定
```

#### 完了基準

- 全アカウントで連続 7 日間、API v2 経由での投稿成功率 99% 以上
- Playwright を使った投稿が 0 件であること

---

### Phase 2: エンゲージメント移行（3-4週間）

#### 目的

`engagement-actions.ts` の 5 つの Playwright 関数（like/comment/follow/unfollow/retweet）を API v2 エンドポイントで置き換える。

#### 新規実装: `server/x-api-v2-engagement.ts`

以下のインターフェースで実装する。

```typescript
// server/x-api-v2-engagement.ts

export interface EngagementResult {
  success: boolean;
  message: string;
  error?: string;
}

// いいね: POST /2/users/:id/likes
export async function likePostViaApi(
  accountId: number,
  tweetId: string
): Promise<EngagementResult>

// いいね解除: DELETE /2/users/:id/likes/:tweet_id
export async function unlikePostViaApi(
  accountId: number,
  tweetId: string
): Promise<EngagementResult>

// フォロー: POST /2/users/:id/following
export async function followUserViaApi(
  accountId: number,
  targetUserId: string
): Promise<EngagementResult>

// フォロー解除: DELETE /2/users/:source_id/following/:target_id
export async function unfollowUserViaApi(
  accountId: number,
  targetUserId: string
): Promise<EngagementResult>

// リツイート: POST /2/users/:id/retweets
export async function retweetPostViaApi(
  accountId: number,
  tweetId: string
): Promise<EngagementResult>

// リツイート解除: DELETE /2/users/:id/retweets/:tweet_id
export async function unretweetPostViaApi(
  accountId: number,
  tweetId: string
): Promise<EngagementResult>

// リプライ（コメント）: POST /2/tweets (reply フィールド)
// tweet_id から reply_to を設定する
export async function replyToPostViaApi(
  accountId: number,
  inReplyToTweetId: string,
  replyText: string
): Promise<EngagementResult>
```

#### タスク一覧

```
[ ] P2-1: x-api-v2-engagement.ts の新規実装
    - OAuth 1.0a ヘッダー生成は x-api-v2-poster.ts の generateOAuthHeader() を共通化
    - generateOAuthHeader を共通モジュール (server/lib/oauth.ts) に抽出
    - 各関数の実装（上記インターフェース参照）
    - レート制限・エラーハンドリングの統一

[ ] P2-2: ユーザー ID キャッシュ機能の実装
    - フォロー/フォロー解除 API には username ではなく user_id が必要
    - getXUserId() の結果を accounts テーブルにキャッシュ
    - accounts テーブルに xUserId カラムを追加（drizzle/schema.ts）

[ ] P2-3: engagement-actions.ts の API 版への切り替え
    - 各関数に engagementMethod パラメータを追加（'api_v2' | 'playwright'）
    - デフォルトを 'api_v2' に設定
    - 旧 Playwright 実装はフォールバックとして残す（Phase 3 まで）

[ ] P2-4: エンゲージメント使用量トラッキングの拡張
    - apiUsageTracking テーブルに likeCount / followCount / retweetCount カラムを追加
    - 各エンゲージメント操作後に recordApiUsage() 相当の処理を実行

[ ] P2-5: テスト実施
    - いいね・いいね解除の往復テスト
    - フォロー・フォロー解除の往復テスト
    - リツイート・リツイート解除の往復テスト
    - リプライ投稿テスト（280 文字制限含む）
    - レート制限到達時の挙動テスト（Mock で 429 を返す）

[ ] P2-6: スケジューラーとの統合
    - engagement automation の呼び出し箇所を API v2 版に切り替え
    - getEngagementRateLimits() の設定値を API レート制限に合わせて調整

[ ] P2-7: 段階的ロールアウト
    - テストアカウントで 1 週間稼働確認
    - 全アカウントへ展開
```

#### 完了基準

- 全エンゲージメント操作が API v2 経由で動作すること
- Playwright を使ったエンゲージメント操作が 0 件であること
- エラー率 1% 未満で 7 日間継続稼働すること

---

### Phase 3: Playwright 完全廃止（2-3週間）

#### 目的

Playwright に依存するコードとインフラを完全に除去し、依存関係・メモリ・CPU コストを削減する。

#### タスク一覧

```
[ ] P3-1: Playwright 依存コードの削除
    - server/playwright/ ディレクトリ全体を削除
      - browser-session-manager.ts
      - config.ts (X_SELECTORS, X_URLS など)
      - engagement-actions.ts
      - screencast-service.ts
      - ws-preview.ts
      - x-login-handler.ts
      - x-playwright-poster.ts
      - index.ts

[ ] P3-2: 参照箇所の更新
    - server/routers/ 内の Playwright import を全て削除
    - server/services/scheduler.ts の Playwright 分岐を削除
    - accounts テーブルの postingMethod カラムを廃止
      （全アカウントが API v2 に移行後、カラム自体を削除）

[ ] P3-3: スクリーンキャスト機能の代替実装（オプション）
    - Playwright のスクリーンキャストは削除する
    - 代替: 投稿ログのリアルタイムストリーミング（SSE または WebSocket）
    - 各操作の成否・ツイート URL をダッシュボードにリアルタイム表示

[ ] P3-4: WebSocket サーバーのクリーンアップ
    - ws-preview.ts が提供していた WebSocket エンドポイントを削除
    - または新しいログストリーミング用 WebSocket に置き換え

[ ] P3-5: パッケージの削除
    - package.json から playwright を削除
    - pnpm remove playwright @playwright/test
    - Docker イメージの軽量化（Playwright ブラウザバイナリ ~500MB 削減）

[ ] P3-6: Dockerfile の更新
    - Playwright インストールコマンドを Dockerfile から削除
    - ブラウザ依存のシステムパッケージを削除

[ ] P3-7: accounts テーブルのクリーンアップ
    - password カラムの扱いを検討
      （API 移行後は Playwright ログインに不要。セキュリティリスク）
    - proxyId カラムの扱いを検討
      （API v2 はプロキシ不要。ただし他用途があれば保持）

[ ] P3-8: 最終確認テスト
    - 全機能の E2E テスト実施
    - Docker コンテナのメモリ使用量を測定・記録
    - 24 時間の無人稼働テスト

[ ] P3-9: ドキュメント更新
    - CLAUDE.md のアーキテクチャ説明を更新
    - USER_GUIDE.md の操作手順を更新
    - SYSTEM_ARCHITECTURE.md を更新
```

#### 完了基準

- `import` / `require` に 'playwright' が含まれる箇所がゼロであること
- Docker イメージサイズが Phase 0 時点より 30% 以上削減されていること
- 全機能が API v2 のみで動作することを E2E テストで確認できること

---

## 4. APIレート制限の考慮

### 4.1 X API v2 Basic プラン ($200/月) のレート制限

#### 書き込み系（OAuth 1.0a User Context 必須）

| 操作 | エンドポイント | レート制限 | 対象 |
|------|--------------|-----------|------|
| ツイート投稿 | POST /2/tweets | 50 リクエスト/15分/ユーザー | per-user |
| ツイート投稿（月次） | POST /2/tweets | 3,000 ツイート/月/アプリ | per-app |
| リツイート | POST /2/users/:id/retweets | 50 リクエスト/15分/ユーザー | per-user |
| いいね | POST /2/users/:id/likes | 50 リクエスト/15分/ユーザー | per-user |
| フォロー | POST /2/users/:id/following | 50 リクエスト/15分/ユーザー | per-user |
| フォロー解除 | DELETE /2/users/:source/following/:target | 50 リクエスト/15分/ユーザー | per-user |

#### 読み取り系（Bearer Token または OAuth 1.0a 両方可）

| 操作 | エンドポイント | レート制限 | 対象 |
|------|--------------|-----------|------|
| タイムライン取得 | GET /2/users/:id/tweets | 1,500 リクエスト/15分/アプリ | per-app |
| ユーザー検索 | GET /2/users/by/username/:username | 900 リクエスト/15分/アプリ | per-app |
| ツイート検索 | GET /2/tweets/search/recent | 450 リクエスト/15分/アプリ | per-app |
| ツイート詳細 | GET /2/tweets/:id | 900 リクエスト/15分/アプリ | per-app |
| ユーザー自身の情報 | GET /2/users/me | 150 リクエスト/15分/ユーザー | per-user |

### 4.2 アカウント数とレート制限の関係

#### 月次投稿数の上限計算

```
Basic プラン: 3,000 ツイート/月/アプリ

アカウント数別の 1 アカウントあたり月次投稿上限:
  10 アカウント: 300 ツイート/月/アカウント（= 約 10 ツイート/日）
  20 アカウント: 150 ツイート/月/アカウント（= 約 5 ツイート/日）
  50 アカウント:  60 ツイート/月/アカウント（= 約 2 ツイート/日）

Pro プラン ($5,000/月): 300,000 ツイート/月/アプリ
  50 アカウント: 6,000 ツイート/月/アカウント（= 約 200 ツイート/日）
```

#### エンゲージメントの実効レート

```
Basic プラン いいね制限: 50 リクエスト/15分/ユーザー = 200 いいね/時間/アカウント

実際の推奨運用値（レート制限の 50% 以下で運用することを推奨）:
  いいね:    最大 100/時間/アカウント
  フォロー:  最大 100/時間/アカウント
  リツイート: 最大 100/時間/アカウント
  リプライ:  最大 50/時間/アカウント
```

### 4.3 レート制限管理の実装方針

#### 短期（Phase 1-2 で実装）

1. **`x-rate-limit-remaining` ヘッダーの監視**
   - 既に `parseRateLimitHeaders()` が `x-api-v2-poster.ts` に実装済み
   - 同じ仕組みを engagement サービスにも適用する

2. **リトライロジック**
   - 429 受信時: `retry-after` ヘッダーの値だけ待機してリトライ
   - 最大 3 回リトライ後に失敗を記録してスキップ

3. **操作の分散実行**
   - `getEngagementRateLimits()` の既存設定を API 制限に合わせて調整
   - アカウント間で操作タイミングをずらすジッターを追加

#### 中期（Phase 3 完了後に実装）

4. **グローバルレート制限カウンター（Redis）**
   - 既存の Redis 環境を活用
   - アプリ全体の月次ツイート数カウンター
   - 残余カウントが閾値以下になったら管理者にアラート

5. **ダッシュボードへのレート制限表示**
   - 現在の使用量 / 上限値 をリアルタイム表示
   - プランごとの上限値設定

---

## 5. リスクと軽減策

### 5.1 移行期間中のリスク

| リスク | 発生確率 | 影響度 | 軽減策 |
|--------|---------|--------|--------|
| API v2 の仕様変更 | 低 | 高 | 公式 changelog の定期確認、バージョン固定 |
| 移行中のサービス断 | 中 | 高 | フェーズごとにロールバック手順を用意。Playwright コードは Phase 3 まで保持 |
| OAuth token の有効期限切れ | 中 | 中 | token 有効性チェックの定期実行、再認証フローの UI 実装 |
| アカウントごとの API 権限不足 | 低 | 高 | Phase 0 で全アカウントの権限確認を実施 |
| Basic プランの月次投稿上限超過 | 中 | 中 | apiUsageTracking で事前アラート、閾値超過前にスケジューラーを停止 |

### 5.2 移行後の継続リスク

| リスク | 発生確率 | 影響度 | 軽減策 |
|--------|---------|--------|--------|
| API プランの料金変更 | 中 | 中 | 複数プラン対応の設計、コスト監視 |
| Developer App の停止（ToS 違反） | 低（API 準拠運用なら） | 最高 | ToS 準拠の定期レビュー、CIB 的運用の完全廃止 |
| レート制限の突然の変更 | 低 | 高 | レート制限は動的に読み取る設計、ハードコードしない |
| 50 アカウント × API 認証の管理複雑性 | 高 | 中 | OAuth 認証ダッシュボードの実装、自動再認証フロー |
| per-app 月次ツイート上限による投稿機会損失 | 中 | 中 | Pro プランへのアップグレード基準を事前に定義 |

### 5.3 ToS 準拠に関するリスク

API v2 に移行しても以下の行為は ToS 違反のまま変わらない。

```
[廃止必須] amplification plan（複数アカウントによる相互エンゲージメント増幅）
  -> 理由: CIB（Coordinated Inauthentic Behavior）に該当
  -> 代替: 各アカウントが独立したコンテンツ戦略で運用

[廃止必須] 会話スレッド偽装（複数アカウント間の自然な会話を装った投稿）
  -> 理由: Platform Manipulation に該当
  -> 代替: 廃止のみ。代替手段なし

[見直し必須] 同一 Developer App での 50 アカウント同時管理
  -> 現状: ToS 上グレーゾーン
  -> 推奨: 各アカウントの独立性を確保し、相互インタラクションを行わない設計
```

### 5.4 ロールバック戦略

Phase 1 および Phase 2 の各ステップでは、Playwright コードを削除せずコメントアウト状態で保持する。問題発生時は `postingMethod` / `engagementMethod` の値を `'playwright'` に戻すことで即時復旧できる。

Phase 3（Playwright 完全廃止）のみ、ロールバックが困難になる。そのため Phase 3 開始前に以下を確認する。

- API v2 稼働実績: 30 日以上
- 各操作の成功率: 99% 以上
- レート制限の余裕: 月次上限の 70% 以下での運用が定常化していること

---

## 6. コスト試算

### 6.1 現行コスト（Playwright）

| 項目 | 月額（推定） |
|------|------------|
| VPS（Playwright ブラウザ用メモリ増強） | $50-100 |
| プロキシサービス（アカウントごとの IP） | $100-300 |
| Playwright メンテナンス工数 | 実質的なリスクコスト |
| **合計** | **$150-400/月 + リスク** |

### 6.2 移行後コスト（API v2）

| 項目 | Basic ($200/月) | Pro ($5,000/月) |
|------|----------------|----------------|
| X API プラン | $200 | $5,000 |
| VPS（API はメモリ不要） | $20-30 | $20-30 |
| プロキシ（不要） | $0 | $0 |
| **合計** | **$220-230/月** | **$5,020-5,030/月** |

### 6.3 プラン選択基準

```
Basic プラン ($200/月) が適切な条件:
  - 管理アカウント数: 10 以下
  - 1 アカウントあたりの投稿頻度: 5-10 ツイート/日 以下
  - エンゲージメント自動化: 限定的

Pro プラン ($5,000/月) が必要な条件:
  - 管理アカウント数: 20 以上
  - 1 アカウントあたりの投稿頻度: 10 ツイート/日 以上
  - エンゲージメント自動化: 積極的
  - 過去ツイート検索（Full Archive）が必要
```

---

## 7. 移行判断基準

### フェーズ開始条件

| フェーズ | 開始条件 |
|---------|---------|
| Phase 0 開始 | 本設計書の承認 |
| Phase 1 開始 | Phase 0 完了基準を全て達成 |
| Phase 2 開始 | Phase 1 完了基準を全て達成、かつ 7 日間の稼働実績 |
| Phase 3 開始 | Phase 2 完了基準を全て達成、かつ 30 日間の稼働実績 |

### 移行中断条件

以下のいずれかが発生した場合、フェーズを中断し原因調査を優先する。

- API v2 投稿の成功率が 95% を下回った場合
- 1 日あたりのレート制限超過が 5 回を超えた場合
- Developer App に警告または停止通知が届いた場合
- アカウント凍結が 2 件以上発生した場合

### 完了の定義

以下を全て満たした時点で移行完了とする。

1. `server/playwright/` ディレクトリが存在しない
2. `package.json` に `playwright` の記載がない
3. 全アカウントの `postingMethod` が `'api_v2'` または相当する設定
4. 全エンゲージメント操作が `x-api-v2-engagement.ts` 経由で実行されている
5. 30 日間の稼働ログで Playwright 使用が 0 件
6. 月次ツイート数が API プランの上限の 80% 以下で安定している

---

## 付録: 実装参考資料

### X API v2 エンドポイントリファレンス

| 操作 | メソッド | エンドポイント | 参考ドキュメント |
|------|---------|--------------|----------------|
| いいね | POST | /2/users/:id/likes | https://developer.x.com/en/docs/x-api/tweets/likes/api-reference/post-users-id-likes |
| いいね解除 | DELETE | /2/users/:id/likes/:tweet_id | https://developer.x.com/en/docs/x-api/tweets/likes/api-reference/delete-users-id-likes-tweet_id |
| フォロー | POST | /2/users/:id/following | https://developer.x.com/en/docs/x-api/users/follows/api-reference/post-users-source_user_id-following |
| フォロー解除 | DELETE | /2/users/:source_id/following/:target_id | https://developer.x.com/en/docs/x-api/users/follows/api-reference/delete-users-source_id-following |
| リツイート | POST | /2/users/:id/retweets | https://developer.x.com/en/docs/x-api/tweets/retweets/api-reference/post-users-id-retweets |
| リツイート解除 | DELETE | /2/users/:id/retweets/:tweet_id | https://developer.x.com/en/docs/x-api/tweets/retweets/api-reference/delete-users-id-retweets-tweet_id |
| リプライ（ツイート） | POST | /2/tweets | https://developer.x.com/en/docs/x-api/tweets/manage-tweets/api-reference/post-tweets |

### OAuth 1.0a 認証の共通化

現在 `x-api-v2-poster.ts` 内にある `generateOAuthHeader()` 関数は Phase 2 で `server/lib/oauth.ts` に抽出する。

```
移動元: server/x-api-v2-poster.ts
移動先: server/lib/oauth.ts
エクスポート: generateOAuthHeader, percentEncode, generateNonce
```

### 関連ドキュメント

- `docs/RISK_ANALYSIS_50_ACCOUNTS.md` - リスク分析（本計画の起点）
- `docs/RISK_COMPLIANCE_ASSESSMENT.md` - コンプライアンス評価
- `server/x-api-v2-poster.ts` - Phase 1 の中核となる既存実装
- `server/x-api-service.ts` - 読み取り系 API の既存実装
- `drizzle/schema.ts` - DB スキーマ定義
