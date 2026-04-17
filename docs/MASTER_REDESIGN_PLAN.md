# MASTER REDESIGN PLAN — Kagerou / PULSE

**作成日**: 2026-04-17
**ベース**: 10名エキスパートエージェントによる統合分析
**目標**: SNSマーケティング市場で「これ、見たことない」と言わせる破壊的プロダクトへの刷新

---

## エグゼクティブサマリー

現在のプラットフォームは機能的には業界最前線にあるが、**43ページの情報過多、機能別ナビ、裏方AI**という2020年前半型のUXに縛られている。本計画では、これを **5画面 + 常駐Copilot + Generative UI** という2026年型AIネイティブOSに転換する。

**戦略的転換の3本柱**:
1. 43ページ → 5ワークスペース（Command Center, Accounts, Pipeline, Intelligence, Studio）
2. ボタン操作 → 常駐AI Copilot + Cmd+Kで全操作自然言語化
3. 汎用業務ツール → 「Kagerou / PULSE」として記憶に残るブランド構築

**投資回収**:
- MVP（3ヶ月・2名体制）: 新AppShell + 統合Dashboard + Copilot Read-Only
- フル実装（6-9ヶ月）: 全5画面 + Copilot Mutation + Agent Marketplace
- 期待ARR（2027年末）: ¥1,050M → ¥2,000M

---

## Part 1: ブランド戦略

### 1.1 ブランドコア

- **名称候補**: Kagerou（陽炎）/ PULSE（脈動）
- **タグライン**: 「あなたの影武者、SNSを制す。」
- **パーソナリティ**: 27歳、京都の若手職人。知的・誠実・粋・静か・温かいユーモア
- **敵**: 時間泥棒な手動運用 × 雑なAI自動ツール × KPI至上主義 × ダッシュボード疲れ

### 1.2 ビジュアルアイデンティティ

**カラーパレット（PULSE）**:
- Primary: `#10B981` (Pulse Green 500) + グラデーション `→ #059669`
- Amber Signal: `#F59E0B` (警告・注目)
- AI Purple: `#A78BFA` (AI機能専用)
- Danger: `#F87171` (ダークモード視認性確保)
- Neutral Scale: 15段階定義（0/50/100/.../950/975）

**タイポグラフィ（3層）**:
- **Display**: Plus Jakarta Sans 700/800（ページタイトル、大型数値）
- **Body**: Inter Variable（本文、ラベル、ナビ）
- **Mono**: JetBrains Mono（タイムスタンプ、ID、コード）

**モーション**:
- Spring: `cubic-bezier(0.16, 1, 0.3, 1)` — 全ての入場アニメーション標準
- Ultra-fast: 80ms（active状態）
- Fast: 120ms（hover効果）
- Normal: 180ms（カード・ドロップダウン）

---

## Part 2: 情報アーキテクチャ（43ページ → 5ワークスペース）

### 2.1 新ナビゲーション構造

```
────────────────────────────────
  今日 (/)                    ← Command Center
  受信トレイ (/inbox)         [3]
────────────────────────────────
  アカウント (/accounts)
  コンテンツ (/content)
  インサイト (/insights)
────────────────────────────────
  戦略 (/strategies)
────────────────────────────────
  設定 (/settings)
  ログ (/logs)
```

**変更前後**:
- サイドバー項目: 24 → 9（62.5%削減）
- 実質ページ数: 43 → 8（81%削減）
- 主要タスクの最大クリック数: 4 → 2以内

### 2.2 ページ統合マッピング

| 新画面 | 統合元 |
|--------|--------|
| **今日** (`/`) | Home + Dashboard + GrowthDashboard |
| **受信トレイ** (`/inbox`) | Inbox + Engagement + Notifications |
| **アカウント** (`/accounts`) | Accounts + AccountDetail + NewAccount + FreezeDetection + ModelAccounts |
| **コンテンツ** (`/content`) | PostReview + ScheduledPosts + ContentCalendarPage + Automation + ContentManagement + ContentReview + ContentRewrite + ContentCollection |
| **インサイト** (`/insights`) | Analytics + WeeklyReview + AIOptimization + ABTesting + BuzzAnalysis + LearningInsights + HashtagAnalytics + CompetitorBenchmark |
| **戦略** (`/strategies`) | Strategies + Projects + Agents + TeamManagement |
| **設定** (`/settings`) | Settings (+ 自動化/チーム/API連携タブ) |
| **ログ** (`/logs`) | 変更なし |

---

## Part 3: 破壊的機能TOP 5（Product Hunt 1位狙い）

### 3.1 AI Agent Marketplace
訓練済みエージェントを他ユーザーに販売できる機能。「Food Bloggerエージェント v2.1」のようなプリセット販売 → 30-40%を作者に還元。**競合全社が持たない**。

### 3.2 Autonomous Growth Loop Orchestrator
「人間は何もしない」でSNS戦略が全自動改善。分析→判断→実行→検証→学習の完全自律ループ。既存コード資産を活用可能。

### 3.3 Natural Language Campaign Builder
「月1000フォロワー獲得したい」と言うだけで、AIが戦略→カレンダー→投稿生成→スケジュール→実行まで全自動設計。

### 3.4 Viral Velocity Predictor
投稿後30分で「これからバズる」をリアルタイム予測 → 自動的に類似コンテンツ量産・連鎖投稿を開始。

### 3.5 Cross-Platform Persona Sync
1つのマスターペルソナから X/Threads/Instagram/TikTok/LinkedIn 向けに最適化された版を自動生成。各SNS固有の学習も自動管理。

---

## Part 4: AIネイティブUI設計

### 4.1 3ペイン構造

```
┌─────────────────────────────────────────────┐
│  [≡] Kagerou   Project ▾   [音声][通知][👤] │
├─────┬──────────────────────┬────────────────┤
│     │                      │                │
│Agent│  Canvas              │  Copilot Chat  │
│Rail │  (Generative UI)     │  (常駐)        │
│     │                      │                │
│● 戦略│  ┌────────────────┐ │  💬 対話       │
│● 執筆│  │動的生成ダッシュ│ │                │
│● 分析│  │ボード/フォーム │ │  [Streaming]   │
│● 投稿│  │(Artifact風)    │ │                │
│● 監視│  └────────────────┘ │  ────────────  │
│     │                      │  [🎤][📎][▶]  │
│[+新 │  Proactive Cards     │                │
│     │  ┌──┐┌──┐┌──┐    │                │
├─────┴──────────────────────┴────────────────┤
│  [⌘K] Command Palette（自然言語で全操作）   │
└─────────────────────────────────────────────┘
```

### 4.2 Generative UI の実装方針

**方式A（採用）**: Tool Call → Typed Component Registry
- LLMが `createArtifact({type: 'dashboard', data: {...}})` を呼ぶ
- Zodスキーマで型検証
- ホワイトリスト化されたコンポーネントで描画
- セキュリティと品質を両立

**Artifact 種類**:
- Dashboard / PostComposer / CalendarPlan / AudienceInsight / ABTestReport / CompetitorMatrix / WorkflowBuilder / LiveMonitor

### 4.3 Proactive AI（先回り型）
Canvas下部に常時3枚のカードが表示される。AIが裏で継続監視：
- バズ検知 → 「このツイートは今投稿で72%バズ確率」
- A/Bテスト勝者 → 「勝者確定。適用しますか？」
- 凍結リスク → 緊急通知 + 自動対応提案

---

## Part 5: オンボーディング設計（5分で本質体験）

### フロー
1. **ウェルカム（30秒）**: 「あなたのSNSを、AIに任せる準備は？」
2. **目標入力（60秒）**: 選択肢6つ + 業種/現在値/目標値の3フィールドのみ
3. **AI生成画面（20秒）**: 「AIが戦略を設計中...」のアニメーション
4. **First Success Moment（60秒）**: AI生成の投稿プレビュー + 予測エンゲージメント
5. **アカウント接続（60秒）**: Xアカウントを接続（スキップ可）
6. **完了（10秒）**: 「準備完了。AIに任せてください。」

### Progressive Disclosure
- Level 1（0-3日）: Dashboard + Scheduled + 1アカウント
- Level 2（3日後 or 10投稿）: 分析・複数アカウント解放
- Level 3（30日後 or 100投稿）: A/Bテスト・エージェント・競合

---

## Part 6: モバイル戦略（PWA First）

### 6.1 アーキテクチャ選定
- **PWA採用**（95%以上のコード再利用、2-3週間で実装）
- React Native移行は MAU 1,000人超 + カメラ/音声需要顕在化時に再検討

### 6.2 Bottom Navigation（5タブ + FAB）
```
ホーム | レビュー | [+投稿] | 分析 | その他
 🏠    ✓(3件)   ⊕       📊    ⋯
```

### 6.3 Swipe-to-Act承認フロー（30秒で3件承認）
- 右スワイプ → 承認（緑背景フェードイン）
- 左スワイプ → 却下理由Bottom Sheet
- 上スワイプ → 編集
- 下スワイプ → スキップ

### 6.4 Push通知 → 直接承認（アプリ起動不要）
Service Worker経由で通知のアクションボタンから直接APIコール。3秒で完了。

---

## Part 7: 競合優位性（Unfair Advantage）

### 7.1 データネットワーク効果
ユーザー数 100人 → 学習精度60% / 1,000人 → 78% / 10,000人 → 91%
**18ヶ月後には競合が技術的に追いつけない状態**に到達。

### 7.2 成果報酬型価格（業界初）
```
Tier 1 Seed Creator (<5K): 無料 + 成功報酬5-10%
Tier 2 Growing (5-50K): ¥2,980/月 or フォロワー100人ごと¥2,000
Tier 3 Pro (50K+): ¥9,980/月 (成長保証なし) or ¥1,500/100人 (成長連動)
```

### 7.3 日本市場特化ポジショニング
- SocialDog: 企業向け
- Kagerou/PULSE: **個人クリエイター向け** (Non-competing)

---

## Part 8: 実装戦略 — Strangler Fig + Feature Flag

### 8.1 絶対NG
- ❌ Big Bang書換え（9-14ヶ月、機能退行20-30%）
- ❌ Wouter → TanStack Router（純粋コスト、ビジネス価値ゼロ）
- ❌ CSS-in-JS移行（30MM大事故）
- ❌ バックエンド再設計（聖域）

### 8.2 採用戦略
- ✅ Strangler Fig: 新旧並列、段階的置換
- ✅ Feature Flag: ユーザー単位ON/OFF、即時ロールバック可能
- ✅ URL互換性維持: 旧URLは自動リダイレクト
- ✅ サーバ層は聖域: tRPC/Playwright/BullMQ/AIエンジン全て保持

### 8.3 工数見積もり

| Phase | 期間 | 工数 |
|-------|------|------|
| Phase 0: 設計基盤整備 | 2-3週間 | 0.5-0.75 MM |
| Phase 1: 共通基盤 | 4-6週間 | 1.5-2 MM |
| Phase 2: コア画面 | 6-8週間 | 2.5-3.5 MM |
| Phase 3: 機能ページ統合 | 8-12週間 | 3-5 MM |
| Phase 4: AI Copilot | 4-6週間 | 1.5-2.5 MM |
| Phase 5: ブランド適用 | 3-4週間 | 1-1.5 MM |
| Phase 6: 安定化 | 3-4週間 | 1-1.5 MM |
| **合計** | **30-44週** | **11-16 MM** |

**推奨体制**: シニアフルスタック2名 + デザイナー1名 + PM 0.5名、6-9ヶ月

---

## Part 9: MVP定義（3ヶ月・4-6 MM）

### 最小実装で最大インパクトの5機能

1. **新AppShell + Command Center**（Phase 1の一部）
   - サイドバー再設計、⌘Kで全操作
   - インパクト: 全ページで効く、「探す」コスト50%削減

2. **統合Dashboard**（Phase 2の一部）
   - Home + Dashboard + GrowthDashboard → 1画面
   - AI Next Actionバナー
   - インパクト: ログイン直後のUX最大化

3. **統合Inbox**（Phase 2の一部）
   - 通知 + 承認待ち + アラート集約
   - インパクト: タスク駆動型UX実現

4. **Copilot MVP (Read-Only)**（Phase 4簡易版）
   - 閲覧系質問のみ対応
   - mutation系は後回し
   - インパクト: AIファースト体験、リスク最小

5. **新ブランドトークン（MVP範囲のみ）**
   - Pulse Green + Plus Jakarta Sans + 新Shadow Scale
   - インパクト: 「新UIに触れた」感を即時提供

---

## Part 10: リリース計画

```
Month 1-3:   MVP開発（新旧切替可能、Feature Flag）
Month 4:     社内dogfooding + 10%ベータユーザー
Month 5:     50%ユーザーにロールアウト、計測
Month 6-7:   Phase 3（機能ページ統合）部分着手
Month 8:     全ユーザーに新UIデフォルト化
Month 9-10:  Phase 4完全版（Copilot mutation）
Month 11-12: Phase 5ブランド適用 + Phase 6旧コード削除
```

---

## Part 11: 成功指標（KPI）

### 体験指標
| 指標 | Before | After目標 |
|------|--------|-----------|
| Time to First Action | 45s | **8s以下** |
| 1セッション完了タスク | 2.3 | **5.5** |
| Proactive Card採択率 | - | **35%+** |
| Copilot満足度（👍率） | - | **80%+** |
| WAU継続率 | 基準 | **+40%** |

### ビジネス指標（2027年末目標）
| 指標 | 目標 |
|------|------|
| ARR | ¥2,000M |
| ユーザー数 | 25,000 (Tier 3: 3,000) |
| Operating Margin | 35% |
| 日本市場シェア | 30-40%（個人クリエイター） |

---

## Part 12: リスク管理

| リスク | 確率 | 影響 | 対策 |
|--------|------|------|------|
| 機能退行 | 高 | 大 | Phase 3前にユーザーフロー分析、導線Top20検証 |
| Copilot品質 | 高 | 大 | mutation系は必ず確認ダイアログ、OpenAI呼出レート/コスト制御 |
| 開発遅延 | 中-高 | 大 | Phase分割、MVPで早期検証、+50%バッファ |
| パフォーマンス劣化 | 中 | 中 | Core Web Vitals CIチェック、Copilot遅延ロード |
| ユーザー離脱 | 中 | 大 | 新旧切替3-6ヶ月提供、in-app tour |

---

## 承認と次のアクション

本計画は以下を前提とする:
- サーバ層（tRPC/Drizzle/BullMQ/Playwright/AIサービス）は一切触らない
- URL互換性を必ず維持（既存リンク・ブックマーク保護）
- Feature Flagで即時ロールバック可能な状態を常に保つ

**即時着手可能なアクション**:
1. CSS デザイントークン全面置換（Phase 1の一部、1-2日）
2. Feature Flag基盤整備（0.5日）
3. コアコンポーネント v2 実装（Button/Card/Badge/Input、2-3日）
4. Command Center プロトタイプ作成（1週間）
5. Command Palette 強化（アクション実行エンジン化、1-2日）

---

*本計画は10名のエキスパートエージェント（UX簡素化、デザインシステム、AI UI、競合差別化、モバイル、ブランド、IA、オンボーディング、革新戦略、実装評価）の統合分析に基づき作成されました。*
