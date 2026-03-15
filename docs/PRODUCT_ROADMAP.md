# SNSマーケティング自動化プラットフォーム プロダクトロードマップ

**作成日:** 2026-03-15
**計画期間:** 2026年Q2〜2027年

---

## 戦略概要

### 現状と課題

本プラットフォームは現在、Playwrightを用いたブラウザ自動化で12アカウントの同時運用を行っていますが、以下の致命的なリスクを抱えています：

| リスク | 深刻度 | 影響 |
|--------|--------|------|
| X/Twitter規約違反（CIB機能） | CRITICAL | 全アカウント一斉凍結の確率70%以上 |
| アカウント凍結実績 | CRITICAL | 既に複数アカウントが凍結中 |
| ブラウザ自動化の検出リスク | CRITICAL | X社のTLS/Behavioral分析で年々検出が容易に |
| 法的リスク（CFAA/ステマ規制） | HIGH | 日本法・米国法の両面で違反リスク |
| インフラ不安定性 | HIGH | プロキシ・DuoPlusサービスへの依存 |

### 戦略方針

**「コンプライアンス重視型への根本的転換」**

- **即座の危機回避:** Network Orchestrator等の高リスク機能の無効化
- **中期的な合法化:** X API v2への完全移行
- **長期的なスケール:** 規約準拠のアーキテクチャに基づくマルチプラットフォーム展開

---

## Q2 2026（4月〜6月）: 危機回避と基盤安定化

### 目標
- 全アカウント一斉凍結のリスク排除
- X API v2準拠のアーキテクチャ基盤構築
- 法的リスク（ステマ規制等）の最小化

### 1. 高リスク機能の即座停止（P0）

**成果物:**
- Network Orchestratorの機能無効化
- Amplification Plan機能の削除
- 自動フォロー/アンフォロー機能の停止
- freeze-detection（制裁回避機能）の無効化

**技術実装:**
```typescript
// コード例：Network Orchestratorの無効化
const generateAmplificationPlan = (mainPost) => {
  logger.warn('Amplification Plan is DEPRECATED due to X ToS CIB violation');
  return null; // 機能完全停止
};

// amplifier/engagement/supportアカウントのロール廃止
// accountRoles テーブル: 'main', 'amplifier' → 'main' のみに簡素化
```

**ビジネスインパクト:**
- 短期的な投稿数減少（30-40%の投稿数低下予想）
- ただし、運用の持続性確保により長期的な回収が可能
- エンゲージメント増幅戦略の廃止に伴う、有機的戦略への転換機会

**実現可能性:** ⭐⭐⭐⭐⭐ **非常に高い**
- コード削除による実装で、復雑な技術実装不要
- 完了期間：1-2週間

---

### 2. X API v2の導入・投稿機能の全面移行

**成果物:**
- X API v2 Developer Account取得（複数アカウント対応）
- OAuth 2.0認証フローの実装
- 投稿・削除機能のAPI化
- Playwright依存の投稿機能排除

**技術実装:**

```typescript
// server/routers/posts.ts - X API v2統合例
import { XApiClient } from '../services/x-api-client';

export const postsRouter = createTRPCRouter({
  createPost: protectedProcedure
    .input(z.object({ accountId: z.string(), content: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const xClient = new XApiClient(input.accountId);
      const result = await xClient.createTweet({
        text: input.content,
        // mediaIds, quoteTweetId等のオプションもAPI経由で対応可能
      });
      return result;
    }),
});
```

**API利用プラン:**
- **Phase 1（Free Tier）:** 基本的な投稿テスト、月1,500ツイート（開発環境向け）
- **Phase 2（Basic Tier）:** 本番運用開始、月$200、3,000ツイート/書き込み
- **Phase 3（Pro Tier検討）:** 規模拡大時、月$5,000、300,000ツイート/書き込み

**月額コスト:**
- 現在（Playwright + Proxy）: $100-300/月
- 移行後（X API Basic）: $200/月（わずかな増加で大幅リスク削減）

**ビジネスインパクト:**
- アカウント凍結リスク：95% → 5%以下（公式API経由）
- セレクタ変更による機能停止リスク排除
- CFAA違反リスクの大幅低減
- 長期的運用の持続性確保

**実現可能性:** ⭐⭐⭐⭐ **高い**
- X API v2は成熟したAPI
- tRPC統合による型安全な実装が可能
- 完了期間：3-4週間

---

### 3. パスワード暗号化・セキュリティ強化（P0）

**成果物:**
- bcrypt/Argon2によるパスワード暗号化
- プロキシ認証情報の暗号化保存
- API Key管理の厳格化（vault化検討）
- ログの機密情報マスキング

**技術実装:**
```typescript
// server/lib/password-encryption.ts
import bcrypt from 'bcryptjs';

export const encryptPassword = async (plainPassword: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plainPassword, salt);
};

export const verifyPassword = (plainPassword: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

// DB マイグレーション
// ALTER TABLE accounts CHANGE COLUMN password password_hash VARCHAR(255);
```

**ビジネスインパクト:**
- セキュリティコンプライアンスの大幅向上
- ユーザー信頼度向上（SaaS化時の必須要件）
- 個人情報保護法対応

**実現可能性:** ⭐⭐⭐⭐⭐ **非常に高い**
- 既にbcryptjsはpackage.jsonに含まれている
- 完了期間：1週間

---

### 4. ステマ規制対応（P1）

**成果物:**
- AI生成コンテンツへの「#PR」「#広告」表示ルール実装
- ステマ規制チェックリストの実装
- コンテンツレビューフロー（人間による事前承認）
- ダッシュボードでのステマリスク表示

**実装詳細:**
```typescript
// server/services/stealth-marketing-check.ts
export interface SteamCheckResult {
  isStealth: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendations: string[];
}

export const checkForStealthMarketing = (content: string, isSponsoredContent: boolean): StealthCheckResult => {
  const checks = [
    {
      name: '広告表示',
      pass: isSponsoredContent ? content.includes('#PR') || content.includes('#広告') : true,
      recommendation: 'スポンサーコンテンツには#PRまたは#広告を表示'
    },
    {
      name: 'AI生成表示',
      pass: content.includes('#AI生成') || content.includes('※AI生成'),
      recommendation: 'AI生成コンテンツであることを明示'
    },
    // 追加チェック項目
  ];

  return {
    isStealth: checks.some(c => !c.pass),
    riskLevel: calculateRiskLevel(checks),
    recommendations: checks.filter(c => !c.pass).map(c => c.recommendation)
  };
};
```

**ビジネスインパクト:**
- 消費者庁の行政処分リスク排除
- 景品表示法違反のリスク排除
- ユーザーの信頼向上

**実現可能性:** ⭐⭐⭐⭐ **高い**
- 完了期間：2週間

---

### 5. アカウント数の段階的削減（P2）

**成果物:**
- 12アカウント → 6-8アカウントへの削減
- 各アカウントへの明確なペルソナ・差別化設定
- アカウント相互作用の最小化

**削減戦略:**
| 削減方針 | 対象 | 残存アカウント |
|---------|------|---------------|
| 高エンゲージメント | メインアカウント + 2-3の専門アカウント | 3-4個 |
| ブランド垂直統合 | 各ブランド専用 | 2-3個 |
| 地域展開（後期） | 日本・海外市場向け | 予備枠 |

**ビジネスインパクト:**
- CIB検出リスク大幅削減（相互インタラクションペア数：1,225 → 15-28）
- 運用複雑性の低下（人工知能管理コスト削減）
- 各アカウントの品質向上（投稿数/アカウントが増加）

**実現可能性:** ⭐⭐⭐ **中程度**
- 既存アカウントの統廃合に伴うデータロス
- 完了期間：3-4週間

---

### Q2の成功指標

| メトリクス | 現状 | 目標 | 達成基準 |
|-----------|------|------|---------|
| 全アカウント凍結リスク | 70% | <10% | リスク分析で10%以下と評価 |
| API経由投稿数 | 0% | >80% | 投稿の80%以上がAPI経由 |
| パスワード暗号化 | 0% | 100% | 全アカウントがhash化 |
| ステマリスク警告実装 | なし | 実装完了 | ダッシュボード上に表示 |
| アカウント数 | 12 | 6-8 | 段階的削減完了 |

---

## Q3 2026（7月〜9月）: マルチプラットフォーム化と高度な分析

### 目標
- X/Twitter以外のプラットフォーム対応開始
- 高度なA/Bテスト・予測分析機能
- チーム権限管理の強化

### 1. Instagram対応（新規プラットフォーム統合）

**成果物:**
- Instagram Graph API統合
- ストーリー・フィード投稿の自動化
- ハッシュタグ分析
- インサイト統合（フォロワー数、エンゲージメント率）

**技術スタック:**
```typescript
// server/services/instagram-client.ts
import { InstagramGraphAPI } from '@instagram/graph-api';

export class InstagramAutomationService {
  private client: InstagramGraphAPI;

  async createPost(accountId: string, content: InstagramPost): Promise<PostResult> {
    // Instagram APIは自動化に対して寛容（X/Twitterより規制が緩い）
    return this.client.createPost(content);
  }
}
```

**ビジネスインパクト:**
- 新たな収益流を開拓（Instagram広告クライアント層への訴求）
- プラットフォーム依存リスク低減
- マルチプラットフォーム戦略へのシフト

**API利用コスト:**
- Instagram Graph API: 無料（Metaビジネスアカウント必須）

**実現可能性:** ⭐⭐⭐ **中程度**
- Meta APIドキュメントが充実しているが、審査プロセスが必要
- 完了期間：4-6週間

---

### 2. 高度なA/Bテスト分析

**成果物:**
- 複数投稿の統計的比較機能
- コンテンツタイプ別のパフォーマンス分析
- 投稿時刻・フォーマット・ハッシュタグ等の変数分析
- 統計的有意性判定（t検定・カイ二乗検定）

**技術実装:**
```typescript
// server/services/ab-test-analyzer.ts
import { tTest, chiSquareTest } from 'simple-statistics';

export interface ABTestResult {
  controlGroup: PostMetrics;
  treatmentGroup: PostMetrics;
  pValue: number;
  isSignificant: boolean; // p < 0.05
  confidenceInterval: [number, number];
  recommendation: string;
}

export const analyzeABTest = (posts: Post[]): ABTestResult => {
  const controlEngagement = posts.filter(p => p.variant === 'A').map(p => p.engagementRate);
  const treatmentEngagement = posts.filter(p => p.variant === 'B').map(p => p.engagementRate);

  const pValue = tTest(controlEngagement, treatmentEngagement);

  return {
    pValue,
    isSignificant: pValue < 0.05,
    // 詳細な分析ロジック...
  };
};
```

**ビジネスインパクト:**
- データドリブンなコンテンツ最適化
- クライアントへの説得力あるレポート提供
- ROI向上（30-50%のエンゲージメント向上を目指す）

**実現可能性:** ⭐⭐⭐⭐ **高い**
- 統計分析ライブラリの充実（simple-statistics等）
- 完了期間：3週間

---

### 3. チーム権限管理・マルチテナント基盤準備

**成果物:**
- ロールベースアクセス制御（RBAC）
- アカウント/データへのアクセス権限管理
- チーム内での投稿承認ワークフロー
- 監査ログの実装

**テーブル設計:**
```typescript
// drizzle/schema.ts
export const teams = createTable('teams', {
  id: text().primaryKey(),
  name: text().notNull(),
  createdAt: timestamp().defaultNow(),
});

export const teamMembers = createTable('team_members', {
  id: text().primaryKey(),
  teamId: text().references(() => teams.id),
  userId: text().references(() => users.id),
  role: text<'admin' | 'manager' | 'editor' | 'viewer'>().notNull(),
  permissions: text(), // JSONで柔軟に定義
});

export const auditLogs = createTable('audit_logs', {
  id: text().primaryKey(),
  teamId: text().references(() => teams.id),
  userId: text(),
  action: text().notNull(), // 'post_created', 'post_approved' etc
  resourceType: text(), // 'post', 'account' etc
  resourceId: text(),
  timestamp: timestamp().defaultNow(),
});
```

**ビジネスインパクト:**
- SaaS化への必須基盤（複数企業対応）
- コンプライアンス要件（監査証跡）
- 大規模チーム対応での収益拡大

**実現可能性:** ⭐⭐⭐⭐ **高い**
- 完了期間：3-4週間

---

### Q3の成功指標

| メトリクス | 目標 | 達成基準 |
|-----------|------|---------|
| Instagram統合 | 実装完了 | 少なくとも1クライアントで運用実績 |
| A/Bテスト機能 | 5+テストが実行可能 | 統計的有意性判定が動作 |
| RBAC実装 | 全機能カバー | 3段階以上のロール定義 |
| 監査ログ | 全アクション記録 | 6ヶ月分のログが保持 |

---

## Q4 2026（10月〜12月）: AI高度化と予測分析

### 目標
- GPT-4 Visionを活用した画像分析・生成
- 自動コンテンツカレンダー生成
- 予測分析（フォロワー成長予測）
- 競合自動ベンチマーク

### 1. GPT-4 Vision統合

**成果物:**
- 画像内容の自動解析（OCR、オブジェクト検出、シーン認識）
- AIによるビジュアルコンテンツ生成（DALL-E統合）
- インフルエンサー画像スタイル分析
- ブランドガイドライン自動チェック

**実装例：**
```typescript
// server/services/vision-analyzer.ts
import OpenAI from 'openai';

export class VisionAnalyzer {
  private client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  async analyzeImage(imageUrl: string): Promise<ImageAnalysis> {
    const response = await this.client.vision.analyze({
      model: 'gpt-4-vision',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageUrl } },
          {
            type: 'text',
            text: 'このイメージについて、以下を分析してください：\n1. 主要なオブジェクト\n2. 色彩構成\n3. 感情的トーン\n4. ブランドガイドラインとの適合性'
          }
        ]
      }]
    });

    return parseAnalysisResponse(response);
  }

  async generateVisualContent(prompt: string, brandGuidelines: BrandGuidelines): Promise<GeneratedImage> {
    const refinedPrompt = `${prompt}\nBrand Colors: ${brandGuidelines.colors.join(', ')}\nStyle: ${brandGuidelines.style}`;

    const image = await this.client.images.generate({
      model: 'dall-e-3',
      prompt: refinedPrompt,
      n: 1,
      size: '1024x1024',
    });

    return image.data[0];
  }
}
```

**ビジネスインパクト:**
- コンテンツ品質の大幅向上（視覚的一貫性）
- ビジュアルコンテンツ制作の自動化（デザイナー工数削減）
- ブランド安全性の自動チェック

**月額コスト:**
- GPT-4 Vision: $0.01-0.03/画像（利用量に応じて）
- DALL-E 3: $0.08/画像生成

**実現可能性:** ⭐⭐⭐⭐ **高い**
- OpenAI APIは成熟・安定
- 完了期間：2-3週間

---

### 2. 自動コンテンツカレンダー生成

**成果物:**
- AI（GPT-4）による30日分のコンテンツ計画自動生成
- トレンド・季節性の考慮
- 各プラットフォーム最適化
- コンテンツ承認ワークフロー統合

**アルゴリズム:**
```typescript
// server/services/content-calendar-generator.ts
export class ContentCalendarGenerator {
  async generate(params: {
    goals: string[];
    targetAudience: string;
    platforms: string[];
    contentTypes: string[];
    length: number; // 日数
  }): Promise<ContentCalendar> {
    const trends = await this.fetchCurrentTrends();
    const seasonalFactors = this.calculateSeasonalFactors();

    const prompt = `
      以下の条件でSNSコンテンツカレンダー（${params.length}日分）を生成してください：
      - マーケティング目標: ${params.goals.join(', ')}
      - ターゲット層: ${params.targetAudience}
      - プラットフォーム: ${params.platforms.join(', ')}
      - 主なトレンド: ${trends.top5.join(', ')}
      - 季節要素: ${seasonalFactors.description}

      各投稿について以下を生成：
      1. 投稿日時（最適なタイミング）
      2. コンテンツテーマ
      3. テキスト案
      4. ビジュアル指示
      5. ハッシュタグ
      6. CTA（Call to Action）

      JSON形式で返してください。
    `;

    const calendar = await this.openai.createCompletion({ prompt });
    return JSON.parse(calendar);
  }
}
```

**ビジネスインパクト:**
- コンテンツ企画工数を80%削減
- 一貫性のあるコンテンツ戦略
- 月額利用料向上の要因（エンタープライズ機能化）

**実現可能性:** ⭐⭐⭐⭐ **高い**
- 完了期間：3週間

---

### 3. 予測分析（フォロワー成長予測・チャーン予測）

**成果物:**
- 時系列予測モデル（ARIMA、Prophet）によるフォロワー成長予測
- エンゲージメント率トレンド予測
- チャーン予測（フォロワー喪失リスク検出）
- 施策インパクト予測

**技術実装:**
```typescript
// server/services/predictive-analytics.ts
import { Prophet } from 'prophet-js'; // Facebookの時系列予測ライブラリ

export class PredictiveAnalytics {
  async predictFollowerGrowth(
    accountId: string,
    forecastDays: number = 90
  ): Promise<GrowthForecast> {
    const historicalData = await this.fetchHistoricalData(accountId);

    const prophet = new Prophet({
      interval_width: 0.95,
      yearly_seasonality: true,
      weekly_seasonality: true,
      daily_seasonality: false,
    });

    // ds(日付), y(フォロワー数) のフォーマットで学習
    prophet.fit(historicalData.map(d => ({ ds: d.date, y: d.followers })));

    const future = prophet.makeFuture(forecastDays);
    const forecast = prophet.predict(future);

    return {
      forecast: forecast.map(f => ({ date: f.ds, followers: f.yhat })),
      confidence: forecast.map(f => ({
        lower: f.yhat_lower,
        upper: f.yhat_upper
      })),
      trendStrength: this.calculateTrendStrength(historicalData),
    };
  }

  async predictChurn(accountId: string): Promise<ChurnRisk> {
    const recentEngagement = await this.fetchRecentEngagement(accountId);
    const avgEngagementRate = recentEngagement.avgRate;
    const volatility = recentEngagement.volatility;

    // エンゲージメント率が30%以上低下した場合、チャーンリスク高と判定
    const riskLevel = volatility > 0.3 ? 'HIGH' : 'LOW';

    return { riskLevel, recommendation: `監視を強化してください` };
  }
}
```

**ビジネスインパクト:**
- プロアクティブなマーケティング調整
- クライアント満足度向上（予見可能な成長）
- 戦略精度向上（ROI +20-30%予想）

**実現可能性:** ⭐⭐⭐ **中程度**
- Prophet/時系列分析ライブラリの学習曲線あり
- 完了期間：4-5週間

---

### 4. 競合自動ベンチマーク

**成果物:**
- 競合アカウント（3-5指定）のメトリクス自動追跡
- エンゲージメント率・フォロワー増加率の比較
- コンテンツ戦略の比較分析
- 月次ベンチマークレポート自動生成

**実装:**
```typescript
// server/routers/competitive-intelligence.ts
export const competitiveIntelligenceRouter = createTRPCRouter({
  getBenchmark: protectedProcedure
    .input(z.object({ competitors: z.array(z.string()) }))
    .query(async ({ input }) => {
      const metrics = await Promise.all(
        input.competitors.map(handle => fetchAccountMetrics(handle))
      );

      return {
        metrics,
        comparison: {
          yourAccount: yourMetrics,
          competitors: metrics,
          gaps: calculateGaps(yourMetrics, metrics),
          recommendations: generateRecommendations(yourMetrics, metrics),
        },
      };
    }),
});
```

**ビジネスインパクト:**
- 市場での相対的ポジション把握
- 競争優位性の維持
- クライアント向けの説得力あるレポート（SEM等の付加価値向上）

**実現可能性:** ⭐⭐⭐⭐ **高い**
- X API経由での競合分析は公式に許可されている範囲
- 完了期間：2-3週間

---

### Q4の成功指標

| メトリクス | 目標 | 達成基準 |
|-----------|------|---------|
| Vision分析 | 月1000画像以上分析 | ブランドガイドライン自動チェック動作 |
| コンテンツカレンダー | 30日分自動生成 | 80%以上のコンテンツが承認された状態で投稿 |
| 予測精度 | MAPE < 15% | フォロワー成長予測のMAP平均誤差 |
| ベンチマーク報告 | 月1回以上 | クライアント向けレポートに統合 |

---

## 2027年（Q1-Q4）: スケール・SaaS化・エコシステム

### 目標
- マルチテナントSaaS化（複数企業対応）
- API公開（外部開発者の統合）
- エンタープライズ機能（シングルサインオン、SLA対応）
- グローバル展開

### 1. マルチテナント化（Q1-Q2）

**成果物:**
- 複数企業の完全な独立運用環境
- テナント間データの分離
- テナント別メトリクス・請求管理

**アーキテクチャ変更:**
- `tenantId` をすべてのテーブルに追加
- RLS（Row Level Security）の実装
- テナント別のAPI Keyバージョニング

**ビジネスインパクト:**
- B2B SaaS化による継続的収益（MRR）
- スケーラビリティの向上
- 収益モデルの多角化（エンタープライズ層への展開）

---

### 2. パブリックAPI公開（Q2-Q3）

**成果物:**
- OpenAPI 3.0仕様による公開API
- Developer Portal（APIドキュメント・管理画面）
- API Keyの発行・管理
- Rate Limiting・監視

**API層:**
```typescript
// エンドポイント例
POST /api/v1/posts - 投稿作成
GET /api/v1/accounts/{id}/metrics - メトリクス取得
GET /api/v1/analytics/trending - トレンド分析
POST /api/v1/webhooks - Webhook登録
```

**ビジネスインパクト:**
- 外部デベロッパーの統合サービス構築
- マーケットプレイス創出（プラグインエコシステム）
- LTV向上（スイッチングコスト増加）

---

### 3. エンタープライズ機能（Q3-Q4）

**成果物:**
- SAML 2.0 / OpenID Connect対応
- IP制限、デバイス認証
- カスタム SLA（99.9% Uptime保証）
- 専任サポート チーム
- Compliance オプション（HIPAA, SOC 2準備）

**ビジネスインパクト:**
- 大企業クライアント獲得
- ARR（Annual Recurring Revenue）の向上
- Premium Tier設定による高単価化

---

### 4. グローバル展開（通年）

**成果物:**
- 多言語対応（日本語→英語、中国語）
- タイムゾーン対応の最適化
- GDPR完全準拠（EU市場対応）
- 複数リージョンのデータセンター

**ビジネスインパクト:**
- 日本市場から国際市場への拡大
- アジア太平洋地域でのプレゼンス確立

---

## 2027年の成功指標（全体）

| メトリクス | 目標 |
|-----------|------|
| MRR (Monthly Recurring Revenue) | $50,000+ |
| テナント数（企業数） | 30+社 |
| API呼び出し/月 | 10M+ |
| NPS (Net Promoter Score) | 50+ |
| 稼働率 | 99.9% |

---

## 技術的な設負債と改善計画

### 既知の技術課題

| 課題 | 優先度 | 解決期限 |
|------|--------|---------|
| TypeScriptエラー（server/services/） | P1 | Q2完了 |
| テスト自動化（カバレッジ<50%） | P2 | Q3完了 |
| Docker最適化 | P2 | Q2完了 |
| エラーハンドリングの標準化 | P2 | Q3完了 |

### 品質ゲート

各フェーズの出荷前にクリアする基準：

- **単体テスト:** カバレッジ ≥ 80%
- **E2Eテスト:** 主要フロー 100% パス
- **セキュリティ:** 脆弱性スキャン（OWASP Top 10）パス
- **パフォーマンス:** P99レイテンシ < 500ms
- **コンプライアンス:** 法務レビュー完了

---

## リスク対策と監視

### 重要なリスク継続監視

| リスク | 2026対応 | 2027対応 |
|--------|---------|---------|
| X/Twitter規約変更 | API v2採用で最小化 | 定期的なTOSレビュー |
| 技術的陳腐化 | 新言語検討（Rust/Go） | マイクロサービス化検討 |
| 競合台頭 | 差別化機能（AI）強化 | 独自API, エコシステム |
| セキュリティ脅威 | 暗号化強化 | PCI DSS準拠検討 |

---

## 予算・リソース計画

### 開発チーム構成

**2026:**
- バックエンド：2名
- フロントエンド：1名
- QA/DevOps：1名
- PM：1名
- **計：5名**

**2027:**
- 上記に加え、インフラ/セキュリティ：1名
- **計：6名**

### 月額運用コスト（例想定）

| 項目 | 2026 | 2027 |
|------|------|------|
| クラウドインフラ | $500 | $1,500 |
| X API利用料 | $200-5,000 | $5,000+ |
| その他外部サービス | $500 | $1,000 |
| **合計** | **$1,200-5,500** | **$7,500+** |

*実際の費用はクライアント規模と使用量に応じて変動*

---

## まとめ

このロードマップは、現在の**致命的なコンプライアンスリスク**から脱却し、**持続可能で規約準拠な事業モデル**へ転換することを最優先としています。

### フェーズ別の戦略転換

1. **Q2 2026: 危機回避** → Playwright/CIB機能廃止、API v2移行開始
2. **Q3-Q4 2026: 機能強化** → マルチプラットフォーム、高度な分析
3. **2027: スケーライズ** → SaaS化、API公開、グローバル展開

各フェーズの完了は、次のフェーズへの移行ゲートとなります。リスク軽減が十分でないまま次フェーズに進むことは認めません。

---

**ドキュメント管理:**
- 最終更新：2026-03-15
- 次回レビュー：2026-04-30（Q2完了時）
- 責任者：Product Manager
