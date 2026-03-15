/**
 * Unified Learning Service
 *
 * Integrates data from 3 learning tables:
 *   - agentKnowledge: Agent-level patterns derived from post performance
 *   - accountLearnings: Account-specific learnings (style, timing, hashtags, etc.)
 *   - buzzLearnings: Viral/buzz patterns extracted from high-performing posts
 *
 * Provides a unified API for content suggestion and performance pattern analysis.
 */

import { db } from "../db";
import { eq, and, desc, gte, inArray } from "drizzle-orm";
import * as schema from "../../drizzle/schema";
import { createLogger } from "../utils/logger";

const logger = createLogger("unified-learning-service");

// ============================================
// Types
// ============================================

export interface UnifiedLearning {
  id: number;
  source: "account" | "buzz" | "agent";
  learningType: string;
  title: string;
  content: string;
  confidence: number;
  usageCount: number;
  successRate: number;
  isActive: number;
  createdAt: string;
  // Source-specific metadata
  meta: {
    accountId?: number;
    agentId?: number;
    projectId?: number;
    sourcePostId?: number;
    sourceLearningId?: number;
    industryCategory?: string;
    postType?: string;
  };
}

export interface TopPerformingPattern {
  learningType: string;
  title: string;
  description: string;
  confidence: number;
  successRate: number;
  score: number; // Composite score for ranking
  source: "account" | "buzz" | "agent";
  examples?: string[]; // Parsed example data
}

export interface ContentSuggestion {
  category: "hook" | "structure" | "hashtag" | "timing" | "tone" | "cta" | "topic";
  suggestion: string;
  rationale: string;
  confidence: number;
  source: "account" | "buzz" | "agent";
}

export interface UnifiedLearningsResult {
  accountLearnings: UnifiedLearning[];
  buzzLearnings: UnifiedLearning[];
  agentKnowledge: UnifiedLearning[];
  summary: {
    total: number;
    avgConfidence: number;
    topLearningType: string;
    hasEnoughData: boolean; // true if total >= 5
  };
}

// ============================================
// Internal helpers
// ============================================

/**
 * Resolve agentIds associated with a given accountId via agent_accounts join table.
 */
async function resolveAgentIds(accountId: number): Promise<number[]> {
  const rows = await db
    .select({ agentId: schema.agentAccounts.agentId })
    .from(schema.agentAccounts)
    .where(
      and(
        eq(schema.agentAccounts.accountId, accountId),
        eq(schema.agentAccounts.isActive, 1)
      )
    );
  return rows.map((r) => r.agentId);
}

/**
 * Safely parse JSON string. Returns null on parse failure.
 */
function safeJsonParse<T = Record<string, unknown>>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Compute a composite score for ranking patterns.
 * score = confidence * 0.5 + successRate * 0.3 + min(usageCount / 20, 1) * 20
 */
function computeScore(confidence: number, successRate: number, usageCount: number): number {
  return (
    confidence * 0.5 +
    successRate * 0.3 +
    Math.min(usageCount / 20, 1) * 20
  );
}

/**
 * Find the most frequent string value in an array.
 */
function mostFrequent(values: string[]): string {
  if (values.length === 0) return "";
  const freq: Record<string, number> = {};
  for (const v of values) {
    freq[v] = (freq[v] || 0) + 1;
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
}

// ============================================
// Public API
// ============================================

/**
 * getUnifiedLearnings
 *
 * Fetches all learning data for a given accountId from the 3 tables
 * and returns them as a unified, normalised structure.
 *
 * @param accountId - The account to retrieve learnings for
 * @param options.projectId - Optionally scope buzz/account learnings to a project
 * @param options.minConfidence - Minimum confidence threshold (0–100), default 0
 * @param options.activeOnly - Only return active learnings, default true
 * @param options.limit - Max records per source table, default 50
 */
export async function getUnifiedLearnings(
  accountId: number,
  options: {
    projectId?: number;
    minConfidence?: number;
    activeOnly?: boolean;
    limit?: number;
  } = {}
): Promise<UnifiedLearningsResult> {
  const {
    projectId,
    minConfidence = 0,
    activeOnly = true,
    limit = 50,
  } = options;

  logger.info({ accountId, options }, "getUnifiedLearnings called");

  // --- Layer 1: accountLearnings ---
  const accountConditions = [
    eq(schema.accountLearnings.accountId, accountId),
    ...(activeOnly ? [eq(schema.accountLearnings.isActive, 1)] : []),
    ...(minConfidence > 0 ? [gte(schema.accountLearnings.confidence, minConfidence)] : []),
  ];

  const rawAccountLearnings = await db
    .select()
    .from(schema.accountLearnings)
    .where(and(...accountConditions))
    .orderBy(desc(schema.accountLearnings.confidence))
    .limit(limit);

  // Filter to project scope: include global (null projectId) + project-specific
  const filteredAccountLearnings = projectId
    ? rawAccountLearnings.filter(
        (l) => l.projectId === null || l.projectId === projectId
      )
    : rawAccountLearnings;

  const normalizedAccountLearnings: UnifiedLearning[] = filteredAccountLearnings.map((l) => ({
    id: l.id,
    source: "account",
    learningType: l.learningType,
    title: l.title,
    content: l.content,
    confidence: l.confidence,
    usageCount: l.usageCount,
    successRate: l.successRate,
    isActive: l.isActive,
    createdAt: l.createdAt,
    meta: {
      accountId: l.accountId,
      projectId: l.projectId ?? undefined,
      sourcePostId: l.sourcePostId ?? undefined,
      sourceLearningId: l.sourceLearningId ?? undefined,
    },
  }));

  // --- Layer 2: buzzLearnings ---
  // Buzz learnings are scoped to userId via account->userId join
  // For simplicity, we scope by projectId when provided, otherwise fetch all active
  const buzzConditions = [
    eq(schema.buzzLearnings.isActive, 1),
    ...(projectId ? [eq(schema.buzzLearnings.projectId, projectId)] : []),
    ...(minConfidence > 0 ? [gte(schema.buzzLearnings.confidence, minConfidence)] : []),
  ];

  const rawBuzzLearnings = await db
    .select()
    .from(schema.buzzLearnings)
    .where(and(...buzzConditions))
    .orderBy(desc(schema.buzzLearnings.confidence))
    .limit(limit);

  const normalizedBuzzLearnings: UnifiedLearning[] = rawBuzzLearnings.map((l) => ({
    id: l.id,
    source: "buzz",
    learningType: l.learningType,
    title: l.title,
    content: l.description,
    confidence: l.confidence,
    usageCount: l.usageCount ?? 0,
    successRate: l.successRate ?? 0,
    isActive: l.isActive,
    createdAt: l.createdAt,
    meta: {
      agentId: l.agentId ?? undefined,
      projectId: l.projectId ?? undefined,
      industryCategory: l.industryCategory ?? undefined,
      postType: l.postType ?? undefined,
    },
  }));

  // --- Layer 3: agentKnowledge ---
  // Resolve agents associated with this account
  const agentIds = await resolveAgentIds(accountId);

  let normalizedAgentKnowledge: UnifiedLearning[] = [];
  if (agentIds.length > 0) {
    const agentConditions = [
      inArray(schema.agentKnowledge.agentId, agentIds),
      ...(activeOnly ? [eq(schema.agentKnowledge.isActive, 1)] : []),
      ...(minConfidence > 0 ? [gte(schema.agentKnowledge.confidence, minConfidence)] : []),
    ];

    const rawAgentKnowledge = await db
      .select()
      .from(schema.agentKnowledge)
      .where(and(...agentConditions))
      .orderBy(desc(schema.agentKnowledge.confidence))
      .limit(limit);

    normalizedAgentKnowledge = rawAgentKnowledge.map((l) => ({
      id: l.id,
      source: "agent",
      learningType: l.knowledgeType,
      title: l.title,
      content: l.content,
      confidence: l.confidence,
      usageCount: l.usageCount,
      successRate: l.successRate,
      isActive: l.isActive,
      createdAt: l.createdAt,
      meta: {
        agentId: l.agentId,
        sourcePostId: l.sourcePostId ?? undefined,
      },
    }));
  }

  // --- Summary ---
  const allTypes = [
    ...normalizedAccountLearnings.map((l) => l.learningType),
    ...normalizedBuzzLearnings.map((l) => l.learningType),
    ...normalizedAgentKnowledge.map((l) => l.learningType),
  ];

  const allConfidences = [
    ...normalizedAccountLearnings.map((l) => l.confidence),
    ...normalizedBuzzLearnings.map((l) => l.confidence),
    ...normalizedAgentKnowledge.map((l) => l.confidence),
  ];

  const total =
    normalizedAccountLearnings.length +
    normalizedBuzzLearnings.length +
    normalizedAgentKnowledge.length;

  const avgConfidence =
    allConfidences.length > 0
      ? Math.round(allConfidences.reduce((s, c) => s + c, 0) / allConfidences.length)
      : 0;

  logger.info({ accountId, total, avgConfidence }, "getUnifiedLearnings completed");

  return {
    accountLearnings: normalizedAccountLearnings,
    buzzLearnings: normalizedBuzzLearnings,
    agentKnowledge: normalizedAgentKnowledge,
    summary: {
      total,
      avgConfidence,
      topLearningType: mostFrequent(allTypes),
      hasEnoughData: total >= 5,
    },
  };
}

/**
 * getTopPerformingPatterns
 *
 * Returns the top N patterns across all 3 learning tables, ranked by a
 * composite score of confidence, success rate, and usage count.
 *
 * Only returns patterns with confidence >= minConfidence (default 40).
 *
 * @param accountId - The account to analyse
 * @param options.topN - How many top patterns to return, default 10
 * @param options.minConfidence - Minimum confidence threshold, default 40
 * @param options.projectId - Optional project scope
 */
export async function getTopPerformingPatterns(
  accountId: number,
  options: {
    topN?: number;
    minConfidence?: number;
    projectId?: number;
  } = {}
): Promise<TopPerformingPattern[]> {
  const { topN = 10, minConfidence = 40, projectId } = options;

  logger.info({ accountId, options }, "getTopPerformingPatterns called");

  const { accountLearnings, buzzLearnings, agentKnowledge } =
    await getUnifiedLearnings(accountId, {
      projectId,
      minConfidence,
      activeOnly: true,
      limit: 100, // Fetch more so we can rank across all sources
    });

  const patterns: TopPerformingPattern[] = [];

  // --- Convert accountLearnings ---
  for (const l of accountLearnings) {
    const parsed = safeJsonParse<Record<string, unknown>>(l.content);
    const description =
      (parsed?.insight as string) ||
      (parsed?.description as string) ||
      l.title;

    patterns.push({
      learningType: l.learningType,
      title: l.title,
      description,
      confidence: l.confidence,
      successRate: l.successRate,
      score: computeScore(l.confidence, l.successRate, l.usageCount),
      source: "account",
    });
  }

  // --- Convert buzzLearnings ---
  for (const l of buzzLearnings) {
    const patternData = safeJsonParse<Record<string, unknown>>(l.content);
    let examples: string[] = [];

    // Extract representative examples from patternData where available
    if (patternData) {
      const topHooks = patternData.topHooks;
      if (Array.isArray(topHooks)) {
        examples = (topHooks as string[]).slice(0, 3);
      }
      const explicitCTAs = patternData.explicitCTAs;
      if (examples.length === 0 && Array.isArray(explicitCTAs)) {
        examples = (explicitCTAs as string[]).slice(0, 3);
      }
    }

    patterns.push({
      learningType: l.learningType,
      title: l.title,
      description: l.content, // buzzLearnings.description stored in content field
      confidence: l.confidence,
      successRate: l.successRate,
      score: computeScore(l.confidence, l.successRate, l.usageCount),
      source: "buzz",
      examples: examples.length > 0 ? examples : undefined,
    });
  }

  // --- Convert agentKnowledge ---
  for (const l of agentKnowledge) {
    const parsed = safeJsonParse<Record<string, unknown>>(l.content);
    const description =
      (parsed?.insight as string) ||
      (parsed?.description as string) ||
      l.title;

    patterns.push({
      learningType: l.learningType,
      title: l.title,
      description,
      confidence: l.confidence,
      successRate: l.successRate,
      score: computeScore(l.confidence, l.successRate, l.usageCount),
      source: "agent",
    });
  }

  // Sort by composite score descending, take top N
  const result = patterns
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  logger.info({ accountId, count: result.length }, "getTopPerformingPatterns completed");

  return result;
}

/**
 * generateContentSuggestions
 *
 * Analyses unified learning data and produces actionable content suggestions
 * categorised by content dimension (hook, structure, hashtag, timing, tone, cta, topic).
 *
 * Each suggestion includes a rationale grounded in actual learning data so that
 * callers (e.g. AI prompt builders) can use it directly.
 *
 * @param accountId - The account to generate suggestions for
 * @param options.projectId - Optional project scope
 * @param options.maxPerCategory - Max suggestions per category, default 2
 */
export async function generateContentSuggestions(
  accountId: number,
  options: {
    projectId?: number;
    maxPerCategory?: number;
  } = {}
): Promise<ContentSuggestion[]> {
  const { projectId, maxPerCategory = 2 } = options;

  logger.info({ accountId, options }, "generateContentSuggestions called");

  const { accountLearnings, buzzLearnings, agentKnowledge, summary } =
    await getUnifiedLearnings(accountId, {
      projectId,
      minConfidence: 30,
      activeOnly: true,
      limit: 100,
    });

  if (!summary.hasEnoughData) {
    logger.warn({ accountId }, "Not enough learning data to generate suggestions");
    return [];
  }

  const suggestions: ContentSuggestion[] = [];

  // ---- Hook suggestions (from buzz hook_pattern + agent success_pattern) ----
  const hookSources = [
    ...buzzLearnings.filter((l) => l.learningType === "hook_pattern"),
    ...agentKnowledge.filter((l) => l.learningType === "success_pattern"),
    ...accountLearnings.filter((l) => l.learningType === "success_pattern"),
  ]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxPerCategory);

  for (const l of hookSources) {
    const parsed = safeJsonParse<Record<string, unknown>>(l.content);
    let suggestion = l.title;
    let rationale = l.content;

    if (parsed) {
      const topHooks = parsed.topHooks;
      if (Array.isArray(topHooks) && topHooks.length > 0) {
        suggestion = `Hook例: ${(topHooks as string[]).slice(0, 2).join(" / ")}`;
        rationale = `信頼度${l.confidence}%のバズパターン「${l.title}」より`;
      } else {
        const insight = (parsed.insight as string) || (parsed.description as string);
        if (insight) rationale = insight;
      }
    }

    suggestions.push({
      category: "hook",
      suggestion,
      rationale,
      confidence: l.confidence,
      source: l.source,
    });
  }

  // ---- Structure suggestions (from buzz structure_pattern + agent content_template) ----
  const structureSources = [
    ...buzzLearnings.filter((l) => l.learningType === "structure_pattern"),
    ...agentKnowledge.filter((l) => l.learningType === "content_template"),
    ...accountLearnings.filter((l) => l.learningType === "posting_style"),
  ]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxPerCategory);

  for (const l of structureSources) {
    const parsed = safeJsonParse<Record<string, unknown>>(l.content);
    let suggestion = l.title;
    let rationale = l.content;

    if (parsed) {
      const formatMap: Record<string, string> = {
        problem_solution: "問題→解決形式",
        list: "リスト形式",
        story: "ストーリー形式",
        question_answer: "質問→回答形式",
        before_after: "ビフォー→アフター形式",
        single_point: "単一ポイント形式",
      };
      const fmt = parsed.mostEffectiveFormat as string;
      if (fmt && formatMap[fmt]) {
        suggestion = `${formatMap[fmt]}を採用する`;
        rationale = `「${l.title}」から: ${formatMap[fmt]}が最も効果的`;
      } else {
        const desc = (parsed.description as string) || (parsed.insight as string);
        if (desc) {
          suggestion = l.title;
          rationale = desc;
        }
      }
    }

    suggestions.push({
      category: "structure",
      suggestion,
      rationale,
      confidence: l.confidence,
      source: l.source,
    });
  }

  // ---- Hashtag suggestions (from buzz + account hashtag_strategy) ----
  const hashtagSources = [
    ...buzzLearnings.filter((l) => l.learningType === "hashtag_strategy"),
    ...accountLearnings.filter((l) => l.learningType === "hashtag_strategy"),
    ...agentKnowledge.filter((l) => l.learningType === "hashtag_strategy"),
  ]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxPerCategory);

  for (const l of hashtagSources) {
    const parsed = safeJsonParse<Record<string, unknown>>(l.content);
    const description =
      (parsed?.description as string) || (parsed?.insight as string) || l.content;

    suggestions.push({
      category: "hashtag",
      suggestion: l.title,
      rationale: description,
      confidence: l.confidence,
      source: l.source,
    });
  }

  // ---- Timing suggestions (from buzz + account timing_pattern) ----
  const timingSources = [
    ...buzzLearnings.filter((l) => l.learningType === "timing_pattern"),
    ...accountLearnings.filter((l) => l.learningType === "timing_pattern"),
    ...agentKnowledge.filter((l) => l.learningType === "timing_insight"),
  ]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxPerCategory);

  for (const l of timingSources) {
    const parsed = safeJsonParse<Record<string, unknown>>(l.content);
    const description =
      (parsed?.description as string) || (parsed?.insight as string) || l.content;

    suggestions.push({
      category: "timing",
      suggestion: l.title,
      rationale: description,
      confidence: l.confidence,
      source: l.source,
    });
  }

  // ---- Tone suggestions (from buzz tone_pattern + agent engagement_tactic) ----
  const toneSources = [
    ...buzzLearnings.filter((l) => l.learningType === "tone_pattern"),
    ...agentKnowledge.filter((l) => l.learningType === "engagement_tactic"),
    ...accountLearnings.filter((l) => l.learningType === "audience_insight"),
  ]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxPerCategory);

  for (const l of toneSources) {
    const parsed = safeJsonParse<Record<string, unknown>>(l.content);
    const description =
      (parsed?.description as string) || (parsed?.insight as string) || l.content;

    suggestions.push({
      category: "tone",
      suggestion: l.title,
      rationale: description,
      confidence: l.confidence,
      source: l.source,
    });
  }

  // ---- CTA suggestions (from buzz cta_pattern) ----
  const ctaSources = buzzLearnings
    .filter((l) => l.learningType === "cta_pattern")
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxPerCategory);

  for (const l of ctaSources) {
    const parsed = safeJsonParse<Record<string, unknown>>(l.content);
    let suggestion = l.title;
    let rationale = l.content;

    if (parsed) {
      const ctas = parsed.explicitCTAs;
      if (Array.isArray(ctas) && ctas.length > 0) {
        suggestion = `CTA例: ${(ctas as string[]).slice(0, 2).join(" / ")}`;
        rationale = `「${l.title}」からの効果的なCTA`;
      }
    }

    suggestions.push({
      category: "cta",
      suggestion,
      rationale,
      confidence: l.confidence,
      source: l.source,
    });
  }

  // ---- Topic suggestions (from account topic_preference) ----
  const topicSources = accountLearnings
    .filter((l) => l.learningType === "topic_preference")
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxPerCategory);

  for (const l of topicSources) {
    const parsed = safeJsonParse<Record<string, unknown>>(l.content);
    const description =
      (parsed?.description as string) || (parsed?.insight as string) || l.content;

    suggestions.push({
      category: "topic",
      suggestion: l.title,
      rationale: description,
      confidence: l.confidence,
      source: l.source,
    });
  }

  logger.info(
    { accountId, suggestionCount: suggestions.length },
    "generateContentSuggestions completed"
  );

  return suggestions;
}
