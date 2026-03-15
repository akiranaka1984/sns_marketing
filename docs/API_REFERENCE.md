# tRPC API リファレンス

**最終更新**: 2026年3月15日

SNSマーケティング自動化プラットフォームの完全なtRPC APIリファレンスです。すべてのエンドポイント、入力値、出力値、認可要件を網羅しています。

---

## 目次

1. [認証 (Auth)](#auth)
2. [アカウント管理 (Accounts)](#accounts)
3. [プロジェクト管理 (Projects)](#projects)
4. [戦略管理 (Strategies)](#strategies)
5. [スケジュール投稿 (Scheduled Posts)](#scheduled-posts)
6. [エージェント (Agents)](#agents)
7. [エンゲージメント (Engagement)](#engagement)
8. [分析 (Analytics)](#analytics)
9. [コンテンツ管理](#content-management)
10. [X API設定](#x-api-settings)
11. [OAuth認証](#oauth)
12. [その他のルーター](#other-routers)

---

## Auth

ユーザー認証とセッション管理エンドポイント

### auth.me
- **Type**: Query (公開)
- **説明**: 現在のユーザー情報を取得
- **Input**: なし
- **Output**:
  ```typescript
  {
    id: number,
    openId: string,
    // その他のユーザー情報
  }
  ```
- **Auth**: 不要（セッションで自動取得）

### auth.logout
- **Type**: Mutation (公開)
- **説明**: ユーザーをログアウト（セッションクッキーを削除）
- **Input**: なし
- **Output**:
  ```typescript
  { success: true }
  ```
- **Auth**: 不要

---

## Accounts

ユーザーのSNSアカウント管理

### accounts.list
- **Type**: Query
- **説明**: 現在のユーザーのすべてのアカウントを取得
- **Input**: なし
- **Output**: `Account[]`
- **Auth**: 必須

### accounts.byId
- **Type**: Query
- **説明**: IDでアカウントを取得
- **Input**:
  ```typescript
  { id: number }
  ```
- **Output**: `Account | null`
- **Auth**: 必須

### accounts.create
- **Type**: Mutation
- **説明**: 新しいSNSアカウントを作成（ユーザーのアカウント情報を登録）
- **Input**:
  ```typescript
  {
    platform: 'twitter' | 'tiktok' | 'instagram' | 'facebook',
    username: string,      // アカウントのユーザー名
    password: string       // ログイン用パスワード
  }
  ```
- **Output**:
  ```typescript
  { id: number }
  ```
- **Auth**: 必須
- **エラー**:
  - `CONFLICT`: 同じプラットフォーム・ユーザー名のアカウントが既に存在

### accounts.get
- **Type**: Query
- **説明**: アカウントの詳細情報を取得
- **Input**:
  ```typescript
  { accountId: number }
  ```
- **Output**: `Account`
- **Auth**: 必須

### accounts.update
- **Type**: Mutation
- **説明**: アカウント設定を更新（xHandle、planType、postingMethod）
- **Input**:
  ```typescript
  {
    accountId: number,
    xHandle?: string,                                     // Xハンドル
    planType?: 'free' | 'premium' | 'premium_plus',      // サブスクリプション
    postingMethod?: 'playwright' | 'api_v2' | 'duoplus'  // 投稿方法
  }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

### accounts.updateDevice
- **Type**: Mutation
- **説明**: アカウントにデバイスIDを設定
- **Input**:
  ```typescript
  {
    accountId: number,
    deviceId: string
  }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

### accounts.activate
- **Type**: Mutation
- **説明**: ペンディング状態のアカウントをアクティブ化
- **Input**:
  ```typescript
  { accountId: number }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

### accounts.batchActivate
- **Type**: Mutation
- **説明**: すべてのペンディングアカウントを一括アクティブ化
- **Input**: なし
- **Output**:
  ```typescript
  {
    success: true,
    count: number,
    message: string
  }
  ```
- **Auth**: 必須

### accounts.delete
- **Type**: Mutation
- **説明**: アカウントを削除
- **Input**:
  ```typescript
  { accountId: number }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

### accounts.linkDevice
- **Type**: Mutation
- **説明**: アカウントをデバイスにリンク
- **Input**:
  ```typescript
  {
    accountId: number,
    deviceId: string
  }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

### accounts.unlinkDevice
- **Type**: Mutation
- **説明**: アカウントをデバイスからアンリンク
- **Input**:
  ```typescript
  { accountId: number }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

### accounts.growthStats
- **Type**: Query
- **説明**: アカウントの成長統計を取得（レベル、XP、ラーニング数）
- **Input**:
  ```typescript
  { accountId: number }
  ```
- **Output**:
  ```typescript
  {
    level: number,
    currentXP: number,
    xpToNextLevel: number,
    learningsCount: number,
    lastLearningDate: string | null
  }
  ```
- **Auth**: 必須

### accounts.learnings
- **Type**: Query
- **説明**: アカウントのラーニング（学習）を取得
- **Input**:
  ```typescript
  {
    accountId: number,
    type?: string,              // ラーニングの種類でフィルタ
    limit?: number,             // 取得数上限
    minConfidence?: number      // 最小信頼度（0-100）
  }
  ```
- **Output**: `Learning[]`
- **Auth**: 必須

### accounts.syncGrowth
- **Type**: Mutation
- **説明**: 既存のラーニングから成長データを同期（マイグレーション用）
- **Input**:
  ```typescript
  { accountId: number }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

### accounts.updatePersona
- **Type**: Mutation
- **説明**: アカウントのペルソナ設定を更新
- **Input**:
  ```typescript
  {
    accountId: number,
    personaRole?: string | null,
    personaTone?: 'formal' | 'casual' | 'friendly' | 'professional' | 'humorous' | null,
    personaCharacteristics?: string | null
  }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

### accounts.generatePersonaCharacteristics
- **Type**: Mutation
- **説明**: AIを使用してペルソナの特性を生成
- **Input**:
  ```typescript
  {
    role: string,
    tone: 'formal' | 'casual' | 'friendly' | 'professional' | 'humorous'
  }
  ```
- **Output**:
  ```typescript
  { characteristics: string }
  ```
- **Auth**: 必須

### accounts.linkedModelAccounts
- **Type**: Query
- **説明**: このアカウントにリンクされたモデルアカウントを取得
- **Input**:
  ```typescript
  { accountId: number }
  ```
- **Output**: `ModelAccount[]`
- **Auth**: 必須

### accounts.linkModelAccount
- **Type**: Mutation
- **説明**: モデルアカウントをこのアカウントにリンク
- **Input**:
  ```typescript
  {
    accountId: number,
    modelAccountId: number,
    autoApplyLearnings?: boolean
  }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

### accounts.unlinkModelAccount
- **Type**: Mutation
- **説明**: モデルアカウントをアンリンク
- **Input**:
  ```typescript
  {
    accountId: number,
    modelAccountId: number
  }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

### accounts.updateModelAccountLink
- **Type**: Mutation
- **説明**: モデルアカウントリンク設定を更新
- **Input**:
  ```typescript
  {
    accountId: number,
    modelAccountId: number,
    autoApplyLearnings: boolean
  }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

### accounts.getLinkedAgents
- **Type**: Query
- **説明**: このアカウントにリンクされたエージェントを取得
- **Input**:
  ```typescript
  { accountId: number }
  ```
- **Output**: `LinkedAgent[]`
- **Auth**: 必須

### accounts.getAvailableAgents
- **Type**: Query
- **説明**: リンク可能なエージェントを取得（未リンク）
- **Input**:
  ```typescript
  { accountId: number }
  ```
- **Output**: `Agent[]`
- **Auth**: 必須

---

## Projects

マーケティングキャンペーンプロジェクト管理

### projects.list
- **Type**: Query
- **説明**: 現在のユーザーのすべてのプロジェクトを取得（アカウント数・投稿数含む）
- **Input**: なし
- **Output**:
  ```typescript
  Array<{
    ...Project,
    accountCount: number,
    postCount: number
  }>
  ```
- **Auth**: 必須

### projects.byId
- **Type**: Query
- **説明**: プロジェクトの詳細を取得（関連データ含む）
- **Input**:
  ```typescript
  { id: number }
  ```
- **Output**:
  ```typescript
  {
    ...Project,
    startDate: string | null,   // ISO形式
    endDate: string | null,     // ISO形式
    accounts: Account[],
    strategies: Strategy[],
    posts: Post[]
  }
  ```
- **Auth**: 必須

### projects.create
- **Type**: Mutation
- **説明**: 新しいプロジェクトを作成
- **Input**:
  ```typescript
  {
    name: string,
    objective: string,
    description?: string,
    startDate?: string,         // YYYY-MM-DD形式
    endDate?: string,           // YYYY-MM-DD形式
    targets?: Record<string, number | string>  // KPI目標
  }
  ```
- **Output**:
  ```typescript
  { id: number }
  ```
- **Auth**: 必須

### projects.update
- **Type**: Mutation
- **説明**: プロジェクトを更新
- **Input**:
  ```typescript
  {
    id: number,
    name?: string,
    objective?: string,
    description?: string,
    status?: 'draft' | 'active' | 'paused' | 'completed',
    startDate?: string,
    endDate?: string,
    targets?: Record<string, number | string>
  }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

### projects.updateMode
- **Type**: Mutation
- **説明**: プロジェクトの実行モードを更新（全自動/確認/手動）
- **Input**:
  ```typescript
  {
    id: number,
    executionMode: 'fullAuto' | 'confirm' | 'manual'
  }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須
- **副作用**:
  - プロジェクト内のすべてのエージェントの`skipReview`フラグも更新
  - fullAutoモードでは既存の保留中投稿を自動承認

### projects.delete
- **Type**: Mutation
- **説明**: プロジェクトを削除
- **Input**:
  ```typescript
  { id: number }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

### projects.suggestKPIs
- **Type**: Mutation
- **説明**: AIがプロジェクト目標に基づいてKPIを提案
- **Input**:
  ```typescript
  {
    objective: string,
    currentMetrics?: {
      followers?: number,
      engagement?: number,
      clicks?: number
    }
  }
  ```
- **Output**:
  ```typescript
  {
    suggestedKPIs: Array<{
      name: string,
      description: string,
      initialTarget: number,
      unit: string
    }>
  }
  ```
- **Auth**: 必須

### projects.addAccount
- **Type**: Mutation
- **説明**: アカウントをプロジェクトに追加
- **Input**:
  ```typescript
  {
    projectId: number,
    accountId: number,
    personaRole?: string,
    personaTone?: string,
    personaCharacteristics?: string
  }
  ```
- **Output**:
  ```typescript
  { id: number }
  ```
- **Auth**: 必須

### projects.removeAccount
- **Type**: Mutation
- **説明**: アカウントをプロジェクトから削除
- **Input**:
  ```typescript
  { projectAccountId: number }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

### projects.updateAccountPersona
- **Type**: Mutation
- **説明**: プロジェクト内のアカウントのペルソナを更新
- **Input**:
  ```typescript
  {
    projectAccountId: number,
    personaRole?: string,
    personaTone?: string,
    personaCharacteristics?: string
  }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

### projects.linkStrategy
- **Type**: Mutation
- **説明**: 戦略をプロジェクトにリンク
- **Input**:
  ```typescript
  {
    strategyId: number,
    projectId: number
  }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

### projects.createPost
- **Type**: Mutation
- **説明**: プロジェクト用の投稿を作成
- **Input**:
  ```typescript
  {
    projectId: number,
    accountId: number,
    strategyId?: number,
    content: string,
    mediaUrls?: string,
    hashtags?: string,
    scheduledAt?: string      // ISO形式
  }
  ```
- **Output**:
  ```typescript
  { id: number }
  ```
- **Auth**: 必須

### projects.updatePost
- **Type**: Mutation
- **説明**: 投稿を更新
- **Input**:
  ```typescript
  {
    id: number,
    content?: string,
    mediaUrls?: string,
    hashtags?: string,
    scheduledAt?: string,
    status?: 'draft' | 'scheduled' | 'published' | 'failed'
  }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

### projects.deletePost
- **Type**: Mutation
- **説明**: 投稿を削除
- **Input**:
  ```typescript
  { id: number }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

### projects.posts
- **Type**: Query
- **説明**: プロジェクトのすべての投稿を取得
- **Input**:
  ```typescript
  { projectId: number }
  ```
- **Output**: `Post[]`
- **Auth**: 必須

### projects.generateStrategyWithContext
- **Type**: Mutation
- **説明**: バズラーニングとモデルアカウントパターンから戦略を生成（データドリブン）
- **Input**:
  ```typescript
  {
    projectId: number,
    objective?: string,
    minBuzzConfidence?: number,   // 0-100（デフォルト: 50）
    maxBuzzLearnings?: number,    // 1-50（デフォルト: 10）
    maxModelPatterns?: number     // 1-20（デフォルト: 5）
  }
  ```
- **Output**:
  ```typescript
  {
    success: true,
    strategyId: number,
    strategy: {
      contentType: string,
      hashtags: string[],
      postingSchedule: string,
      engagementStrategy: string,
      generatedContent: string,
      contentGuidelines?: object,
      timingGuidelines?: object,
      hashtagGuidelines?: object,
      toneGuidelines?: object
    },
    dataUsed: {
      buzzLearnings: number[],
      modelPatterns: number[]
    }
  }
  ```
- **Auth**: 必須

---

## Strategies

マーケティング戦略管理

### strategies.list
- **Type**: Query
- **説明**: 現在のユーザーのすべての戦略を取得
- **Input**: なし
- **Output**: `Strategy[]`
- **Auth**: 必須

### strategies.generate
- **Type**: Mutation
- **説明**: AIが目標から新しい戦略を生成
- **Input**:
  ```typescript
  {
    objective: string,
    accountId?: number,
    projectId?: number
  }
  ```
- **Output**:
  ```typescript
  {
    ...Strategy,
    contentType: string,
    hashtags: string[],
    postingSchedule: string,
    engagementStrategy: string,
    generatedContent: string
  }
  ```
- **Auth**: 必須

### strategies.get
- **Type**: Query
- **説明**: 戦略の詳細を取得
- **Input**:
  ```typescript
  { strategyId: number }
  ```
- **Output**: `Strategy`
- **Auth**: 必須

---

## Scheduled Posts

スケジュール投稿管理

### scheduledPosts.getAll
- **Type**: Query
- **説明**: スケジュール投稿一覧を取得（フィルター可能）
- **Input**:
  ```typescript
  {
    projectId?: number,
    accountId?: number,
    status?: 'pending' | 'posted' | 'failed' | 'cancelled',
    limit?: number                // デフォルト: 50
  }
  ```
- **Output**: `ScheduledPost[]`
- **Auth**: 必須

### scheduledPosts.getById
- **Type**: Query
- **説明**: スケジュール投稿の詳細を取得
- **Input**:
  ```typescript
  { id: number }
  ```
- **Output**: `ScheduledPost`
- **Auth**: 必須
- **エラー**:
  - `NOT_FOUND`: 投稿が見つからない

### scheduledPosts.create
- **Type**: Mutation
- **説明**: スケジュール投稿を作成
- **Input**:
  ```typescript
  {
    projectId: number,
    accountId: number,
    content: string,
    mediaUrls?: string[],
    hashtags?: string,
    scheduledTime: Date,
    repeatInterval?: 'none' | 'daily' | 'weekly' | 'monthly'
  }
  ```
- **Output**: `ScheduledPost`
- **Auth**: 必須

### scheduledPosts.update
- **Type**: Mutation
- **説明**: スケジュール投稿を更新
- **Input**:
  ```typescript
  {
    id: number,
    content?: string,
    mediaUrls?: string,
    hashtags?: string,
    scheduledTime?: Date,
    repeatInterval?: 'none' | 'daily' | 'weekly' | 'monthly'
  }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

### scheduledPosts.cancel
- **Type**: Mutation
- **説明**: スケジュール投稿をキャンセル
- **Input**:
  ```typescript
  { id: number }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

### scheduledPosts.delete
- **Type**: Mutation
- **説明**: スケジュール投稿を削除
- **Input**:
  ```typescript
  { id: number }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

### scheduledPosts.publishNow
- **Type**: Mutation
- **説明**: スケジュール投稿をすぐに発行
- **Input**:
  ```typescript
  { id: number }
  ```
- **Output**: `{ success: true, postedAt: string }`
- **Auth**: 必須

### scheduledPosts.generateWithAgent
- **Type**: Mutation
- **説明**: エージェントを使用してコンテンツを生成
- **Input**:
  ```typescript
  {
    agentId: number,
    accountId?: number
  }
  ```
- **Output**:
  ```typescript
  {
    content: string,
    hashtags: string[],
    mediaPrompt: string,
    confidence: number,
    agentName: string,
    agentTheme: string
  }
  ```
- **Auth**: 必須

### scheduledPosts.retryFailed
- **Type**: Mutation
- **説明**: 失敗した投稿をリトライ
- **Input**:
  ```typescript
  { id: number }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須
- **エラー**:
  - `BAD_REQUEST`: 失敗状態ではない

### scheduledPosts.getStats
- **Type**: Query
- **説明**: スケジュール投稿の統計を取得
- **Input**:
  ```typescript
  {
    projectId?: number,
    accountId?: number,
    days?: number              // デフォルト: 30
  }
  ```
- **Output**:
  ```typescript
  {
    total: number,
    byStatus: {
      pending: number,
      posted: number,
      failed: number,
      cancelled: number
    },
    successRate: number
  }
  ```
- **Auth**: 必須

---

## Agents

AI投稿エージェント管理

### agents.list
- **Type**: Query
- **説明**: 現在のユーザーのすべてのエージェントを取得
- **Input**: なし
- **Output**: `Agent[]`
- **Auth**: 必須

### agents.getById
- **Type**: Query
- **説明**: エージェントの詳細を取得（リンクアカウント、ナレッジ数など）
- **Input**:
  ```typescript
  { id: number }
  ```
- **Output**:
  ```typescript
  {
    ...Agent,
    linkedAccounts: LinkedAccount[],
    knowledgeCount: number,
    rulesCount: number,
    recentLogs: ExecutionLog[]
  }
  ```
- **Auth**: 必須

### agents.create
- **Type**: Mutation
- **説明**: 新しいエージェントを作成
- **Input**:
  ```typescript
  {
    name: string,
    theme: string,
    tone?: 'formal' | 'casual' | 'friendly' | 'professional' | 'humorous',
    style?: 'ranking' | 'trivia' | 'story' | 'tutorial' | 'news' | 'review',
    targetAudience?: string,
    description?: string,
    projectId?: number,
    postingFrequency?: 'daily' | 'twice_daily' | 'three_times_daily' | 'weekly' | 'custom',
    postingTimeSlots?: string[],   // 例: ["09:00", "15:00"]
    skipReview?: boolean
  }
  ```
- **Output**:
  ```typescript
  { id: number }
  ```
- **Auth**: 必須

### agents.update
- **Type**: Mutation
- **説明**: エージェント設定を更新
- **Input**:
  ```typescript
  {
    id: number,
    name?: string,
    theme?: string,
    tone?: 'formal' | 'casual' | 'friendly' | 'professional' | 'humorous',
    style?: 'ranking' | 'trivia' | 'story' | 'tutorial' | 'news' | 'review',
    targetAudience?: string,
    description?: string,
    projectId?: number,
    postingFrequency?: 'daily' | 'twice_daily' | 'three_times_daily' | 'weekly' | 'custom',
    postingTimeSlots?: string[],
    skipReview?: boolean,
    isActive?: boolean
  }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

### agents.delete
- **Type**: Mutation
- **説明**: エージェントを削除
- **Input**:
  ```typescript
  { id: number }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

### agents.linkAccount
- **Type**: Mutation
- **説明**: アカウントをエージェントにリンク
- **Input**:
  ```typescript
  {
    agentId: number,
    accountId: number
  }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

### agents.unlinkAccount
- **Type**: Mutation
- **説明**: アカウントをエージェントからアンリンク
- **Input**:
  ```typescript
  {
    agentId: number,
    accountId: number
  }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

---

## Engagement

自動エンゲージメント（いいね、フォロー、コメント）タスク管理

### engagement.getTasks
- **Type**: Query
- **説明**: エンゲージメントタスク一覧を取得
- **Input**:
  ```typescript
  {
    projectId?: number,
    accountId?: number,
    taskType?: 'like' | 'follow' | 'comment' | 'unfollow',
    isActive?: boolean,
    limit?: number              // デフォルト: 50
  }
  ```
- **Output**: `EngagementTask[]`
- **Auth**: 必須

### engagement.getTaskById
- **Type**: Query
- **説明**: エンゲージメントタスクの詳細を取得
- **Input**:
  ```typescript
  { id: number }
  ```
- **Output**: `EngagementTask`
- **Auth**: 必須

### engagement.createTask
- **Type**: Mutation
- **説明**: エンゲージメントタスクを作成
- **Input**:
  ```typescript
  {
    projectId: number,
    accountId: number,
    taskType: 'like' | 'follow' | 'comment' | 'unfollow',
    targetUser?: string,        // 対象ユーザーのハンドル
    targetPost?: string,        // 対象投稿のID
    commentText?: string,       // コメント内容
    frequency?: number,         // 実行頻度（デフォルト: 10）
    isActive?: boolean
  }
  ```
- **Output**: `EngagementTask`
- **Auth**: 必須

### engagement.updateTask
- **Type**: Mutation
- **説明**: エンゲージメントタスクを更新
- **Input**:
  ```typescript
  {
    id: number,
    targetUser?: string,
    targetPost?: string,
    commentText?: string,
    frequency?: number,
    isActive?: boolean
  }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

### engagement.deleteTask
- **Type**: Mutation
- **説明**: エンゲージメントタスクを削除
- **Input**:
  ```typescript
  { id: number }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

### engagement.toggleTask
- **Type**: Mutation
- **説明**: エンゲージメントタスクの有効/無効を切り替え
- **Input**:
  ```typescript
  {
    id: number,
    isActive: boolean
  }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

### engagement.getLogs
- **Type**: Query
- **説明**: エンゲージメント実行ログを取得
- **Input**:
  ```typescript
  {
    taskId?: number,
    accountId?: number,
    status?: 'success' | 'failed',
    limit?: number              // デフォルト: 100
  }
  ```
- **Output**: `EngagementLog[]`
- **Auth**: 必須

### engagement.getStats
- **Type**: Query
- **説明**: エンゲージメント統計を取得
- **Input**:
  ```typescript
  {
    projectId?: number,
    accountId?: number,
    days?: number               // デフォルト: 30
  }
  ```
- **Output**:
  ```typescript
  {
    total: number,
    byType: {
      like: number,
      follow: number,
      comment: number,
      unfollow: number
    },
    byStatus: {
      success: number,
      failed: number
    },
    successRate: number
  }
  ```
- **Auth**: 必須

---

## Analytics

投稿パフォーマンス分析

### analytics.getOverview
- **Type**: Query
- **説明**: すべてのアカウントのパフォーマンス概要を取得
- **Input**:
  ```typescript
  {
    startDate?: string,         // YYYY-MM-DD形式
    endDate?: string            // YYYY-MM-DD形式
  }
  ```
- **Output**:
  ```typescript
  {
    totalPosts: number,
    totalViews: number,
    totalLikes: number,
    totalComments: number,
    totalShares: number,
    avgEngagementRate: number,
    accountPerformance: Array<{
      accountId: number,
      totalPosts: number,
      totalViews: number,
      totalLikes: number,
      totalComments: number,
      totalShares: number,
      avgEngagementRate: number
    }>
  }
  ```
- **Auth**: 必須

---

## Content Management

コンテンツ管理・レビュー・リライト

### contentCollection.createSchedule
- **Type**: Mutation
- **説明**: コンテンツ収集スケジュールを作成
- **Input**:
  ```typescript
  {
    projectId?: number,
    platform: 'twitter' | 'tiktok' | 'instagram' | 'facebook' | 'youtube' | 'other',
    searchKeywords?: string[],
    searchHashtags?: string[],
    searchAccounts?: string[],
    frequency?: 'hourly' | 'daily' | 'weekly',
    maxItemsPerRun?: number
  }
  ```
- **Output**:
  ```typescript
  { success: true, scheduleId: number }
  ```
- **Auth**: 必須

### contentCollection.listSchedules
- **Type**: Query
- **説明**: コンテンツ収集スケジュール一覧を取得
- **Input**:
  ```typescript
  { projectId?: number }
  ```
- **Output**: `CollectionSchedule[]`
- **Auth**: 必須

---

## X API Settings

X (Twitter) API設定・管理

### xApiSettings.get
- **Type**: Query
- **説明**: 現在のユーザーのX API設定を取得
- **Input**: なし
- **Output**:
  ```typescript
  {
    configured: boolean,
    apiKey: string,
    apiSecret: string,
    bearerToken: string,
    accessToken: string,
    accessTokenSecret: string,
    apiTier: 'free' | 'basic' | 'pro' | 'enterprise',
    oauthConfigured: boolean,
    lastTestedAt: string | null,
    testResult: string | null
  }
  ```
- **Auth**: 必須

### xApiSettings.save
- **Type**: Mutation
- **説明**: X API設定を保存（APIキー、トークンなど）
- **Input**:
  ```typescript
  {
    apiKey?: string,
    apiSecret?: string,
    bearerToken?: string,
    accessToken?: string,
    accessTokenSecret?: string,
    apiTier?: 'free' | 'basic' | 'pro' | 'enterprise'
  }
  ```
- **Output**:
  ```typescript
  { success: true, message: string }
  ```
- **Auth**: 必須

### xApiSettings.testConnection
- **Type**: Mutation
- **説明**: Bearer Tokenを使用してX APIをテスト
- **Input**:
  ```typescript
  { bearerToken: string }
  ```
- **Output**:
  ```typescript
  {
    success: boolean,
    message: string
  }
  ```
- **Auth**: 必須

### xApiSettings.testOAuthConnection
- **Type**: Mutation
- **説明**: OAuth 1.0a認証情報を使用してX APIをテスト
- **Input**: なし
- **Output**:
  ```typescript
  {
    success: boolean,
    message: string,
    username?: string
  }
  ```
- **Auth**: 必須

### xApiSettings.getApiUsage
- **Type**: Query
- **説明**: 当月のAPI使用統計を取得
- **Input**: なし
- **Output**:
  ```typescript
  {
    month: string,              // 'YYYY-MM'
    totalTweets: number,
    perAccount: Array<{
      accountId: number,
      tweetCount: number,
      lastPostedAt: string | null
    }>
  }
  ```
- **Auth**: 必須

### xApiSettings.getMonthlyLimit
- **Type**: Query
- **説明**: APIティアに基づいた月次ツイート制限を取得
- **Input**: なし
- **Output**:
  ```typescript
  {
    tier: 'free' | 'basic' | 'pro' | 'enterprise',
    monthlyLimit: number | null  // null = 無制限
  }
  ```
- **Auth**: 必須

**月次制限表**:
| Tier | 制限 |
|------|------|
| free | 500 |
| basic | 3,000 |
| pro | 300,000 |
| enterprise | 無制限 |

---

## OAuth

X (Twitter) OAuth 3-legged認証フロー

### accountOAuth.startOAuthFlow
- **Type**: Mutation
- **説明**: OAuth認証フローを開始（ステップ1）
- **Input**:
  ```typescript
  { accountId: number }
  ```
- **Output**:
  ```typescript
  {
    authUrl: string,             // ユーザーが訪問するX認可ページURL
    oauthToken: string
  }
  ```
- **Auth**: 必須
- **流れ**:
  1. このエンドポイントで`authUrl`を取得
  2. ユーザーをそのURLにリダイレクト
  3. ユーザーがX上で認可
  4. Xが`/api/x-oauth/callback`にリダイレクト（コールバックハンドラが処理）

### accountOAuth.getOAuthStatus
- **Type**: Query
- **説明**: アカウントのOAuth接続状態を確認
- **Input**:
  ```typescript
  { accountId: number }
  ```
- **Output**:
  ```typescript
  {
    accountId: number,
    oauthTokenStatus: 'not_connected' | 'connected',
    oauthUsername: string | null,
    oauthConnectedAt: string | null
  }
  ```
- **Auth**: 必須

### accountOAuth.disconnectAccount
- **Type**: Mutation
- **説明**: X OAuth接続を切断（トークンを削除）
- **Input**:
  ```typescript
  { accountId: number }
  ```
- **Output**: `{ success: true }`
- **Auth**: 必須

---

## Other Routers

その他の主要ルーター（簡潔な説明）

### settings
APIキーの管理（OpenAI、Anthropic）、接続テスト
- `getApiKeys`: 保存されたAPIキーを取得
- `saveApiKeys`: APIキーを保存
- `testOpenAIConnection`: OpenAI API接続をテスト
- `testAnthropicConnection`: Anthropic API接続をテスト
- `getApiStatus`: 現在のAPI設定状態を取得

### logs
ログ管理・監査
- `byAccount`: 特定アカウントのログを取得
- `recent`: 最近のログを取得

### freeze
フリーズ検出・自動回復
- `getAll`: フリーズ検出記録一覧
- `getById`: フリーズ検出詳細
- `createAutoResponse`: 自動レスポンスを作成
- 回復スケジューラー管理

### tenant
テナント管理（マルチテナント対応）
- テナント設定
- ユーザー管理
- 権限管理

### scheduler
バックグラウンドスケジューラー管理
- `status`: スケジューラー状態確認
- `start`: スケジューラー開始
- `stop`: スケジューラー停止
- `runNow`: 即座に実行

### agentScheduler
エージェント実行スケジューラー
- `status`: スケジュール済み実行の一覧
- `start`: スケジューラー起動
- `stop`: スケジューラー停止
- `runNow`: 即座に実行

### weeklyReview
週次レビュー・学習の生成
- パフォーマンスレビュー
- 自動最適化提案

### freeze
アカウントフリーズ検出・対応
- フリーズ検出管理
- 自動回復スケジューラー

### playwriteSession
Playwright ブラウザセッション管理
- セッション作成・管理
- スクリーンキャスト機能

### abTesting
A/Bテスト実施・分析
- テスト作成・実行
- パフォーマンス比較
- バリアント管理

### modelAccounts
モデルアカウント管理（ベンチマーク用）
- 高パフォーマンスアカウントの追跡
- パターン抽出

### projectModelAccounts
プロジェクトとモデルアカウントの関連付け

### buzzAnalysis
バズ分析・トレンド検出
- トレンド検出
- バズワード分析

### profileOptimization
プロフィール最適化提案
- プロフィールテキスト最適化
- カバー画像提案

### kpiTracking
KPI追跡・目標管理
- KPI進捗
- 達成度分析

### learningInsights
学習インサイト管理
- 学習の蓄積
- パターン認識

### growthDashboard
成長ダッシュボード
- アカウント成長メトリクス
- 進捗表示

### autoContentGeneration
自動コンテンツ生成
- AIによるコンテンツ生成
- 一括生成オプション

### contentRewrite
コンテンツリライト
- テキスト改善提案
- 複数バージョン生成

### contentReview
コンテンツレビュー・承認
- 投稿レビューワークフロー
- 承認・却下機能

### engagementCollector
エンゲージメント収集
- コメント・リプライ収集
- メンション監視

### interactionSettings
インタラクション設定
- 自動返信設定
- フィルタリングルール

### interactions
インタラクション管理
- コメント・リプライ管理
- 会話トラッキング

### accountRelationships
アカウント関係管理
- フォロー/フォロワー関係
- 関係タイプ定義

---

## Health Check

### health
- **Type**: Query (公開)
- **説明**: API及びデータベースの接続状態をチェック
- **Input**: なし
- **Output**:
  ```typescript
  {
    status: 'ok' | 'error',
    timestamp: string,            // ISO形式
    version: string
  }
  ```
- **Auth**: 不要

---

## 認可（Auth）について

### 保護されたプロシージャ（protectedProcedure）
- **説明**: ユーザー認証が必須
- **実装**: セッションクッキーで自動検証
- **エラー時**: `UNAUTHORIZED` エラーを返却

### 公開プロシージャ（publicProcedure）
- **説明**: 認証不要
- **用途**: ヘルスチェック、ログイン前の設定テストなど

---

## エラーハンドリング

### 一般的なエラーコード

| コード | 説明 | HTTP状態 |
|--------|------|----------|
| `BAD_REQUEST` | 入力値が無効 | 400 |
| `UNAUTHORIZED` | 認証が必要 | 401 |
| `FORBIDDEN` | アクセス権限がない | 403 |
| `NOT_FOUND` | リソースが見つからない | 404 |
| `CONFLICT` | リソース競合（重複など） | 409 |
| `PRECONDITION_FAILED` | 前提条件不満 | 412 |
| `INTERNAL_SERVER_ERROR` | サーバーエラー | 500 |

---

## レート制限

現在のレート制限ポリシー（今後実装予定）:
- **デフォルト**: ユーザーあたり 1,000 リクエスト/時間
- **API使用量**: X API月次制限に依存（ティアごと）

---

## 日時形式

- **Query入力**: ISO 8601形式（`YYYY-MM-DDTHH:mm:ssZ`）、または`YYYY-MM-DD`
- **Response出力**: ISO 8601形式（`2026-03-15T10:30:00Z`）
- **MySQL形式**: `YYYY-MM-DD HH:MM:SS`

---

## SDK利用例

TypeScriptクライアントでの利用例：

```typescript
import { trpc } from '@/utils/trpc';

// アカウント一覧取得
const accounts = await trpc.accounts.list.query();

// 新規プロジェクト作成
const { id } = await trpc.projects.create.mutate({
  name: '新しいキャンペーン',
  objective: 'フォロワー増加',
  startDate: '2026-03-15',
});

// スケジュール投稿作成
await trpc.scheduledPosts.create.mutate({
  projectId: id,
  accountId: 1,
  content: 'Hello, World!',
  scheduledTime: new Date('2026-03-16T09:00:00'),
  repeatInterval: 'daily',
});
```

---

## ドキュメント更新履歴

| 日付 | 内容 |
|------|------|
| 2026-03-15 | 初版作成（36ルーター、200+エンドポイント） |

---

**注**: このドキュメントは自動生成ツールによってメンテナンスされています。定期的に更新されます。
