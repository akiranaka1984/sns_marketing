/**
 * Buzz Analyzer Service
 * Analyzes viral posts using GPT-4o to extract success factors and patterns
 */

import { invokeLLM } from "../_core/llm";
import { classifyPost, PostClassification } from "./category-classifier";
import { createLogger } from "../utils/logger";

const logger = createLogger("buzz-analyzer");

export interface BuzzAnalysis {
  successFactors: SuccessFactor[];
  hookAnalysis: HookAnalysis;
  ctaAnalysis: CTAAnalysis;
  contentStructure: ContentStructure;
  emotionalTriggers: string[];
  suggestedImprovements: string[];
}

export interface SuccessFactor {
  factor: string;
  explanation: string;
  importance: 'high' | 'medium' | 'low';
}

export interface HookAnalysis {
  hookType: 'question' | 'statement' | 'story' | 'statistic' | 'challenge' | 'curiosity' | 'other';
  hookText: string;
  effectiveness: number; // 0-100
  analysis: string;
}

export interface CTAAnalysis {
  hasCTA: boolean;
  ctaType: 'like' | 'comment' | 'share' | 'follow' | 'link' | 'none' | 'implicit';
  ctaText: string;
  effectiveness: number; // 0-100
  analysis: string;
}

export interface ContentStructure {
  format: 'single_point' | 'list' | 'story' | 'problem_solution' | 'before_after' | 'question_answer';
  paragraphCount: number;
  hasLineBreaks: boolean;
  readability: number; // 0-100
}

export interface BuzzPattern {
  learningType: 'hook_pattern' | 'structure_pattern' | 'hashtag_strategy' | 'timing_pattern' | 'cta_pattern' | 'media_usage' | 'tone_pattern';
  title: string;
  description: string;
  patternData: Record<string, any>;
  confidence: number; // 0-100
  examplePostIds: number[];
  sampleSize: number;
}

/**
 * Analyze a single buzz post
 */
export async function analyzeBuzzPost(
  content: string,
  hasImage: boolean = false,
  hasVideo: boolean = false,
  isThread: boolean = false,
  engagementMetrics?: { likes: number; comments: number; shares: number; views?: number }
): Promise<BuzzAnalysis> {
  const systemPrompt = `You are an expert social media analyst specializing in viral content.
Analyze the given post and identify what makes it successful or has potential to go viral.

Focus on:
1. Success factors - What elements contribute to engagement
2. Hook analysis - How the post grabs attention
3. CTA analysis - How it encourages engagement
4. Content structure - Organization and readability
5. Emotional triggers - What emotions it evokes
6. Improvement suggestions - How it could be better

Respond in JSON format only.`;

  const metricsInfo = engagementMetrics
    ? `Engagement: ${engagementMetrics.likes} likes, ${engagementMetrics.comments} comments, ${engagementMetrics.shares} shares${engagementMetrics.views ? `, ${engagementMetrics.views} views` : ''}`
    : 'No engagement metrics available';

  const mediaInfo = hasVideo ? 'with video' : hasImage ? 'with image' : 'text only';

  const userPrompt = `Analyze this social media post for viral potential:

Content: "${content}"
Media: ${mediaInfo}
Format: ${isThread ? 'Thread' : 'Single post'}
${metricsInfo}

Respond with JSON:
{
  "successFactors": [
    { "factor": "string", "explanation": "string", "importance": "high|medium|low" }
  ],
  "hookAnalysis": {
    "hookType": "question|statement|story|statistic|challenge|curiosity|other",
    "hookText": "first few words that grab attention",
    "effectiveness": 0-100,
    "analysis": "why this hook works or doesn't"
  },
  "ctaAnalysis": {
    "hasCTA": boolean,
    "ctaType": "like|comment|share|follow|link|none|implicit",
    "ctaText": "the CTA text if any",
    "effectiveness": 0-100,
    "analysis": "analysis of CTA effectiveness"
  },
  "contentStructure": {
    "format": "single_point|list|story|problem_solution|before_after|question_answer",
    "paragraphCount": number,
    "hasLineBreaks": boolean,
    "readability": 0-100
  },
  "emotionalTriggers": ["emotion1", "emotion2"],
  "suggestedImprovements": ["improvement1", "improvement2"]
}`;

  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      responseFormat: { type: "json_object" },
      maxTokens: 1500,
    });

    const responseText = typeof result.choices[0]?.message?.content === 'string'
      ? result.choices[0].message.content
      : '';

    const analysis = JSON.parse(responseText);

    // Validate and normalize response
    return {
      successFactors: (analysis.successFactors || []).map((f: any) => ({
        factor: f.factor || '',
        explanation: f.explanation || '',
        importance: ['high', 'medium', 'low'].includes(f.importance) ? f.importance : 'medium',
      })),
      hookAnalysis: {
        hookType: analysis.hookAnalysis?.hookType || 'other',
        hookText: analysis.hookAnalysis?.hookText || '',
        effectiveness: Math.min(100, Math.max(0, analysis.hookAnalysis?.effectiveness || 50)),
        analysis: analysis.hookAnalysis?.analysis || '',
      },
      ctaAnalysis: {
        hasCTA: analysis.ctaAnalysis?.hasCTA || false,
        ctaType: analysis.ctaAnalysis?.ctaType || 'none',
        ctaText: analysis.ctaAnalysis?.ctaText || '',
        effectiveness: Math.min(100, Math.max(0, analysis.ctaAnalysis?.effectiveness || 0)),
        analysis: analysis.ctaAnalysis?.analysis || '',
      },
      contentStructure: {
        format: analysis.contentStructure?.format || 'single_point',
        paragraphCount: analysis.contentStructure?.paragraphCount || 1,
        hasLineBreaks: analysis.contentStructure?.hasLineBreaks || false,
        readability: Math.min(100, Math.max(0, analysis.contentStructure?.readability || 50)),
      },
      emotionalTriggers: analysis.emotionalTriggers || [],
      suggestedImprovements: analysis.suggestedImprovements || [],
    };
  } catch (error) {
    logger.error({ err: error }, "[BuzzAnalyzer] Error analyzing post");
    return getDefaultAnalysis();
  }
}

/**
 * Extract patterns from multiple buzz posts
 */
export async function extractBuzzPatterns(
  posts: Array<{
    id: number;
    content: string;
    viralityScore: number;
    industryCategory?: string;
    postType?: string;
  }>
): Promise<BuzzPattern[]> {
  if (posts.length < 3) {
    logger.info("[BuzzAnalyzer] Not enough posts for pattern extraction");
    return [];
  }

  const systemPrompt = `You are an expert social media analyst. Analyze the given viral posts and extract common patterns that contribute to their success.

For each pattern you identify, provide:
1. Learning type (hook_pattern, structure_pattern, hashtag_strategy, cta_pattern, tone_pattern)
2. A clear title
3. A description of how to apply this pattern
4. Confidence level based on how consistently the pattern appears
5. Specific data points from the posts

Respond in JSON format only.`;

  const postsData = posts.map(p => ({
    id: p.id,
    content: p.content.substring(0, 500),
    score: p.viralityScore,
    category: p.industryCategory,
    type: p.postType,
  }));

  const userPrompt = `Analyze these ${posts.length} viral posts and extract common success patterns:

${JSON.stringify(postsData, null, 2)}

Respond with JSON:
{
  "patterns": [
    {
      "learningType": "hook_pattern|structure_pattern|hashtag_strategy|cta_pattern|tone_pattern",
      "title": "Short pattern title",
      "description": "Detailed description of the pattern and how to apply it",
      "patternData": { "key": "value pairs with specific data" },
      "confidence": 0-100,
      "examplePostIds": [list of post IDs that demonstrate this pattern]
    }
  ]
}`;

  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      responseFormat: { type: "json_object" },
      maxTokens: 2000,
    });

    const responseText = typeof result.choices[0]?.message?.content === 'string'
      ? result.choices[0].message.content
      : '';

    const data = JSON.parse(responseText);

    return (data.patterns || []).map((p: any) => ({
      learningType: validateLearningType(p.learningType),
      title: p.title || 'Untitled Pattern',
      description: p.description || '',
      patternData: p.patternData || {},
      confidence: Math.min(100, Math.max(0, p.confidence || 50)),
      examplePostIds: (p.examplePostIds || []).filter((id: any) => typeof id === 'number'),
      sampleSize: posts.length,
    }));
  } catch (error) {
    logger.error({ err: error }, "[BuzzAnalyzer] Error extracting patterns");
    return [];
  }
}

/**
 * Calculate virality score from engagement metrics
 */
export function calculateViralityScore(
  likes: number,
  comments: number,
  shares: number,
  views?: number,
  followerCount?: number
): number {
  // Weight: shares > comments > likes
  const engagementScore = (likes * 1) + (comments * 3) + (shares * 5);

  // Logarithmic scale for fair comparison across different scales
  let score = Math.log10(engagementScore + 1) * 20;

  // Boost for engagement rate if we have follower count and views
  if (followerCount && followerCount > 0 && views) {
    const engagementRate = (likes + comments + shares) / views;
    const followRatio = views / followerCount;

    // High engagement rate and good reach = bonus points
    if (engagementRate > 0.05) score += 15;
    else if (engagementRate > 0.02) score += 10;
    else if (engagementRate > 0.01) score += 5;

    if (followRatio > 1.5) score += 10;
    else if (followRatio > 1) score += 5;
  }

  return Math.min(100, Math.round(score));
}

/**
 * Generate learning entry for agentKnowledge
 */
export async function generateLearningEntry(
  pattern: BuzzPattern,
  industryCategory: string
): Promise<{
  key: string;
  value: string;
  category: string;
  source: string;
}> {
  const key = `buzz_${pattern.learningType}_${industryCategory}_${Date.now()}`;
  const value = JSON.stringify({
    title: pattern.title,
    description: pattern.description,
    patternData: pattern.patternData,
    confidence: pattern.confidence,
    sampleSize: pattern.sampleSize,
    extractedAt: new Date().toISOString(),
  });

  return {
    key,
    value,
    category: `buzz_${industryCategory}`,
    source: 'buzz_analyzer',
  };
}

export interface ViralScorePrediction {
  score: number; // 0-100
  factors: {
    hookStrength: number;
    emotionalImpact: number;
    shareability: number;
    relevance: number;
    readability: number;
  };
  suggestions: string[];
}

/**
 * Predict virality score BEFORE posting
 */
export async function predictViralScore(
  content: string,
  hasMedia: boolean = false
): Promise<ViralScorePrediction> {
  const systemPrompt = `You are an expert social media virality analyst. Evaluate the given post content and predict its viral potential BEFORE it is published.

Score each factor from 0 to 100:
- hookStrength: How compelling is the opening line? Does it make the reader want to continue?
- emotionalImpact: Does it trigger strong emotions (curiosity, surprise, inspiration, humor, anger)?
- shareability: Would people want to share this with their followers?
- relevance: Is the topic timely, relatable, or aligned with trending discussions?
- readability: Is it easy to read? Good formatting, appropriate length, clear message?

The overall score (0-100) should reflect the weighted average with shareability and hookStrength weighted higher.

Provide 2-4 concrete, actionable suggestions to improve the score.

Respond in JSON format only.`;

  const mediaContext = hasMedia ? "The post includes media (image or video)." : "The post is text only.";

  const userPrompt = `Predict the viral potential of this social media post:

Content: "${content}"
${mediaContext}

Respond with JSON:
{
  "score": 0-100,
  "factors": {
    "hookStrength": 0-100,
    "emotionalImpact": 0-100,
    "shareability": 0-100,
    "relevance": 0-100,
    "readability": 0-100
  },
  "suggestions": ["actionable suggestion 1", "actionable suggestion 2"]
}`;

  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      responseFormat: { type: "json_object" },
      maxTokens: 800,
    });

    const responseText = typeof result.choices[0]?.message?.content === 'string'
      ? result.choices[0].message.content
      : '';

    const data = JSON.parse(responseText);

    const clamp = (v: any) => Math.min(100, Math.max(0, Number(v) || 0));

    return {
      score: clamp(data.score),
      factors: {
        hookStrength: clamp(data.factors?.hookStrength),
        emotionalImpact: clamp(data.factors?.emotionalImpact),
        shareability: clamp(data.factors?.shareability),
        relevance: clamp(data.factors?.relevance),
        readability: clamp(data.factors?.readability),
      },
      suggestions: Array.isArray(data.suggestions) ? data.suggestions.slice(0, 4) : [],
    };
  } catch (error) {
    logger.error({ err: error }, "[BuzzAnalyzer] Error predicting viral score");
    return {
      score: 0,
      factors: {
        hookStrength: 0,
        emotionalImpact: 0,
        shareability: 0,
        relevance: 0,
        readability: 0,
      },
      suggestions: [],
    };
  }
}

// Helper functions

function validateLearningType(type: string): BuzzPattern['learningType'] {
  const validTypes: BuzzPattern['learningType'][] = [
    'hook_pattern', 'structure_pattern', 'hashtag_strategy',
    'timing_pattern', 'cta_pattern', 'media_usage', 'tone_pattern'
  ];
  return validTypes.includes(type as any) ? (type as BuzzPattern['learningType']) : 'hook_pattern';
}

function getDefaultAnalysis(): BuzzAnalysis {
  return {
    successFactors: [],
    hookAnalysis: {
      hookType: 'other',
      hookText: '',
      effectiveness: 0,
      analysis: 'Analysis failed',
    },
    ctaAnalysis: {
      hasCTA: false,
      ctaType: 'none',
      ctaText: '',
      effectiveness: 0,
      analysis: 'Analysis failed',
    },
    contentStructure: {
      format: 'single_point',
      paragraphCount: 1,
      hasLineBreaks: false,
      readability: 50,
    },
    emotionalTriggers: [],
    suggestedImprovements: [],
  };
}
