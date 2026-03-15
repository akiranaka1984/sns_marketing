import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Calendar,
  TrendingUp,
  Lightbulb,
  Target,
  Sparkles,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  BarChart3,
  Clock,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Helper to format numbers compactly
function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toLocaleString();
}

// Helper to get change indicator
function ChangeIndicator({ current, previous, suffix = "" }: { current: number; previous: number; suffix?: string }) {
  if (previous === 0 && current === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-neutral-500 font-bold">
        <Minus className="h-3 w-3" />
        変化なし
      </span>
    );
  }
  const change = previous === 0 ? 100 : ((current - previous) / previous) * 100;
  const isPositive = change > 0;
  const isNeutral = change === 0;

  if (isNeutral) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-neutral-500 font-bold">
        <Minus className="h-3 w-3" />
        変化なし
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${isPositive ? "text-white" : "text-white"}`}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {isPositive ? "+" : ""}{change.toFixed(1)}%{suffix}
    </span>
  );
}

// Priority badge for recommendations
function PriorityBadge({ index }: { index: number }) {
  const colors = [
    "bg-rose-500/20 text-rose-400 border border-rose-500/30",
    "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    "bg-sky-500/20 text-sky-400 border border-sky-500/30",
    "bg-teal-500/20 text-teal-400 border border-teal-500/30",
  ];
  const labels = ["高", "中", "低", "参考"];
  const colorClass = colors[Math.min(index, colors.length - 1)];
  const label = labels[Math.min(index, labels.length - 1)];

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider ${colorClass}`}>
      {label}
    </span>
  );
}

export default function WeeklyReview() {
  const [weekStartDate, setWeekStartDate] = useState("");
  const [weekEndDate, setWeekEndDate] = useState("");
  const [generatedReview, setGeneratedReview] = useState<any>(null);
  const [previousWeekReview, setPreviousWeekReview] = useState<any>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);

  const { data: agents } = trpc.agents.list.useQuery();

  const generateReview = trpc.weeklyReview.generateReview.useMutation({
    onSuccess: (data) => {
      toast.success("週次レビューを生成しました");
      setGeneratedReview(data);
    },
    onError: (error: any) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const generatePreviousWeekReview = trpc.weeklyReview.generateReview.useMutation({
    onSuccess: (data) => {
      setPreviousWeekReview(data);
    },
    onError: () => {
      // Silently fail for comparison data
      setPreviousWeekReview(null);
    },
  });

  const autoOptimizeMutation = trpc.weeklyReview.autoOptimize.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setOptimizationResult(data);
    },
    onError: (error: any) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  // Calculate the previous week dates for comparison
  const previousWeekDates = useMemo(() => {
    if (!weekStartDate || !weekEndDate) return null;
    const start = new Date(weekStartDate);
    const end = new Date(weekEndDate);
    const diff = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1); // day before current start
    const prevStart = new Date(prevEnd.getTime() - diff);
    return {
      startDate: prevStart.toISOString().split("T")[0],
      endDate: prevEnd.toISOString().split("T")[0],
    };
  }, [weekStartDate, weekEndDate]);

  const handleGenerateReview = () => {
    if (!weekStartDate || !weekEndDate) {
      toast.error("期間を選択してください");
      return;
    }

    // Generate current week review
    generateReview.mutate({
      weekStartDate: new Date(weekStartDate),
      weekEndDate: new Date(weekEndDate),
    });

    // Also generate previous week for comparison
    if (previousWeekDates) {
      generatePreviousWeekReview.mutate({
        weekStartDate: new Date(previousWeekDates.startDate),
        weekEndDate: new Date(previousWeekDates.endDate),
      });
    }
  };

  const handleAutoOptimize = (autoApply: boolean) => {
    if (!selectedAgentId) {
      toast.error("エージェントを選択してください");
      return;
    }

    autoOptimizeMutation.mutate({
      agentId: selectedAgentId,
      daysBack: 7,
      autoApply,
    });
  };

  // Quick date presets
  const setThisWeek = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    setWeekStartDate(monday.toISOString().split("T")[0]);
    setWeekEndDate(sunday.toISOString().split("T")[0]);
  };

  const setLastWeek = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() + mondayOffset);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    setWeekStartDate(lastMonday.toISOString().split("T")[0]);
    setWeekEndDate(lastSunday.toISOString().split("T")[0]);
  };

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Page Header */}
      <div className="fade-in-up page-header">
        <div>
          <h1 className="page-title font-bold text-white">週次レビュー</h1>
          <p className="page-subtitle font-bold text-neutral-500">
            週次のパフォーマンスデータを分析し、AI生成のインサイトと推奨事項を提供します
          </p>
        </div>
      </div>

      {/* Date Range Selection */}
      <div className="fade-in-up bg-neutral-950 rounded-lg border border-white/[0.06] p-5">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="h-4 w-4 text-white" />
          <h3 className="font-bold text-sm text-white">レビュー期間選択</h3>
        </div>
        <p className="text-xs text-neutral-500 font-bold mb-4">分析したい週の開始日と終了日を選択してください</p>

        {/* Quick Presets */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={setThisWeek}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-neutral-900 border border-white/[0.06] hover:bg-emerald-500 hover:hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            今週
          </button>
          <button
            onClick={setLastWeek}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-neutral-900 border border-white/[0.06] hover:bg-emerald-500 hover:hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            先週
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="startDate" className="text-white font-bold">開始日</Label>
            <Input
              id="startDate"
              type="date"
              value={weekStartDate}
              onChange={(e) => setWeekStartDate(e.target.value)}
              className="border border-white/[0.06] bg-neutral-950 text-white font-bold rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate" className="text-white font-bold">終了日</Label>
            <Input
              id="endDate"
              type="date"
              value={weekEndDate}
              onChange={(e) => setWeekEndDate(e.target.value)}
              className="border border-white/[0.06] bg-neutral-950 text-white font-bold rounded-lg"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleGenerateReview}
              disabled={generateReview.isPending}
              className="w-full bg-emerald-500 hover:bg-emerald-500 text-white font-bold border border-white/[0.06] rounded-lg hover:hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              {generateReview.isPending ? "生成中..." : "レビュー生成"}
            </Button>
          </div>
        </div>
      </div>

      {/* AI Auto-Optimization */}
      <div className="fade-in-up bg-neutral-950 rounded-lg border border-white/[0.06] p-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-white" />
          <h3 className="font-bold text-sm text-white">AI自動最適化</h3>
        </div>
        <p className="text-xs text-neutral-500 font-bold mb-4">
          エージェントの投稿パフォーマンスを分析し、戦略を自動最適化します
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agent" className="text-white font-bold">対象エージェント</Label>
            <Select
              value={selectedAgentId?.toString()}
              onValueChange={(value) => setSelectedAgentId(parseInt(value))}
            >
              <SelectTrigger className="border border-white/[0.06] bg-neutral-950 text-white font-bold rounded-lg">
                <SelectValue placeholder="エージェントを選択" />
              </SelectTrigger>
              <SelectContent className="border border-white/[0.06] bg-neutral-950">
                {agents?.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id.toString()} className="text-white font-bold focus:bg-neutral-900">
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => handleAutoOptimize(false)}
              disabled={autoOptimizeMutation.isPending}
              variant="outline"
              className="flex-1 border border-white/[0.06] text-white font-bold bg-neutral-950 hover:bg-neutral-900 rounded-lg hover:hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              <Lightbulb className="mr-2 h-4 w-4" />
              {autoOptimizeMutation.isPending ? "分析中..." : "提案のみ生成"}
            </Button>
            <Button
              onClick={() => handleAutoOptimize(true)}
              disabled={autoOptimizeMutation.isPending}
              className="flex-1 bg-emerald-500 hover:bg-emerald-500 text-white font-bold border border-white/[0.06] rounded-lg hover:hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              <Zap className="mr-2 h-4 w-4" />
              {autoOptimizeMutation.isPending ? "実行中..." : "自動最適化実行"}
            </Button>
          </div>
        </div>
      </div>

      {/* Optimization Results */}
      {optimizationResult && optimizationResult.success && (
        <div className="fade-in-up bg-neutral-950 rounded-lg border border-white/[0.06] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-white" />
            <h3 className="font-bold text-sm text-white">最適化結果</h3>
          </div>
          <div className="space-y-4">
            {/* Analysis Summary */}
            {optimizationResult.analysis && (
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
                <div className="fade-in-up bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                  <div className="pl-3">
                    <p className="text-[11px] text-blue-400 font-bold uppercase tracking-wide">分析投稿数</p>
                    <p className="text-2xl font-bold text-white mt-0.5">{optimizationResult.analysis.totalPosts}</p>
                  </div>
                </div>
                <div className="fade-in-up bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
                  <div className="pl-3">
                    <p className="text-[11px] text-amber-400 font-bold uppercase tracking-wide">平均エンゲージメント率</p>
                    <p className="text-2xl font-bold text-white mt-0.5">{optimizationResult.analysis.avgEngagementRate.toFixed(2)}%</p>
                  </div>
                </div>
                <div className="fade-in-up bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg">
                  <div className="pl-3">
                    <p className="text-[11px] text-emerald-400 font-bold uppercase tracking-wide">インサイト数</p>
                    <p className="text-2xl font-bold text-white mt-0.5">{optimizationResult.analysis.insightsCount}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Suggestions */}
            {optimizationResult.suggestions && optimizationResult.suggestions.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-white" />
                  最適化提案
                </h4>
                {optimizationResult.suggestions.map((suggestion: any, index: number) => (
                  <div
                    key={index}
                    className="relative bg-neutral-950 rounded-lg border border-white/[0.06] p-4 hover:hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <PriorityBadge index={index} />
                          <h5 className="font-bold text-sm text-white">{suggestion.title}</h5>
                        </div>
                        <p className="text-xs text-neutral-500 font-bold mb-3 leading-relaxed">{suggestion.description}</p>
                        <div className="flex gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                            <ArrowUpRight className="h-3 w-3" />
                            期待改善: +{suggestion.expectedImprovement}%
                          </span>
                          <span className="inline-flex items-center rounded-lg bg-neutral-950 border border-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-neutral-500">
                            信頼度: {suggestion.confidence}%
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-neutral-500 flex-shrink-0 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Applied Results */}
            {optimizationResult.applied && (
              <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-white">
                    {optimizationResult.applied.applied}件の最適化を適用しました
                  </p>
                  {optimizationResult.applied.failed > 0 && (
                    <p className="text-xs text-neutral-400 font-bold mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {optimizationResult.applied.failed}件の適用に失敗しました
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generated Review Results */}
      {generatedReview && (
        <div className="space-y-5">
          {/* Section Title */}
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider px-2">レビュー結果</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Summary Metrics - Current Week */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <div className="fade-in-up bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
              <div className="pl-3">
                <p className="text-[11px] text-blue-400 font-bold uppercase tracking-wide">総投稿数</p>
                <p className="text-2xl font-bold text-white mt-0.5">{generatedReview.totalPosts}</p>
                {previousWeekReview && (
                  <div className="mt-1">
                    <ChangeIndicator current={generatedReview.totalPosts} previous={previousWeekReview.totalPosts} />
                  </div>
                )}
              </div>
            </div>
            <div className="fade-in-up bg-sky-500/10 border border-sky-500/20 p-4 rounded-lg">
              <div className="pl-3">
                <p className="text-[11px] text-sky-400 font-bold uppercase tracking-wide">総視聴数</p>
                <p className="text-2xl font-bold text-white mt-0.5">
                  {formatNumber(generatedReview.totalViews || 0)}
                </p>
                {previousWeekReview && (
                  <div className="mt-1">
                    <ChangeIndicator current={generatedReview.totalViews || 0} previous={previousWeekReview.totalViews || 0} />
                  </div>
                )}
              </div>
            </div>
            <div className="fade-in-up bg-teal-500/10 border border-teal-500/20 p-4 rounded-lg">
              <div className="pl-3">
                <p className="text-[11px] text-teal-400 font-bold uppercase tracking-wide">総いいね</p>
                <p className="text-2xl font-bold text-white mt-0.5">
                  {formatNumber(generatedReview.totalLikes || 0)}
                </p>
                {previousWeekReview && (
                  <div className="mt-1">
                    <ChangeIndicator current={generatedReview.totalLikes || 0} previous={previousWeekReview.totalLikes || 0} />
                  </div>
                )}
              </div>
            </div>
            <div className="fade-in-up bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg">
              <div className="pl-3">
                <p className="text-[11px] text-emerald-400 font-bold uppercase tracking-wide">平均エンゲージメント率</p>
                <p className="text-2xl font-bold text-white mt-0.5">
                  {generatedReview.avgEngagement?.toFixed(2) || 0}%
                </p>
                {previousWeekReview && (
                  <div className="mt-1">
                    <ChangeIndicator current={generatedReview.avgEngagement || 0} previous={previousWeekReview.avgEngagement || 0} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Weekly Comparison Table */}
          {previousWeekReview && (
            <div className="fade-in-up bg-neutral-950 rounded-lg border border-white/[0.06] p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-white" />
                <h3 className="font-bold text-sm text-white">週間比較</h3>
                <span className="text-[10px] text-neutral-500 font-bold ml-auto">今週 vs 先週</span>
              </div>
              <div className="border border-white/[0.06] rounded-lg overflow-hidden">
                <div className="grid grid-cols-4 gap-0 bg-emerald-500/10 text-[11px] font-bold text-emerald-400 uppercase tracking-wide border-b border-white/[0.06]">
                  <div className="px-4 py-2.5">指標</div>
                  <div className="px-4 py-2.5 text-right">先週</div>
                  <div className="px-4 py-2.5 text-right">今週</div>
                  <div className="px-4 py-2.5 text-right">変化</div>
                </div>
                {[
                  {
                    label: "投稿数",
                    icon: FileText,
                    current: generatedReview.totalPosts || 0,
                    previous: previousWeekReview.totalPosts || 0,
                    format: (v: number) => v.toString(),
                  },
                  {
                    label: "視聴数",
                    icon: BarChart3,
                    current: generatedReview.totalViews || 0,
                    previous: previousWeekReview.totalViews || 0,
                    format: formatNumber,
                  },
                  {
                    label: "いいね数",
                    icon: Target,
                    current: generatedReview.totalLikes || 0,
                    previous: previousWeekReview.totalLikes || 0,
                    format: formatNumber,
                  },
                  {
                    label: "エンゲージメント率",
                    icon: TrendingUp,
                    current: generatedReview.avgEngagement || 0,
                    previous: previousWeekReview.avgEngagement || 0,
                    format: (v: number) => v.toFixed(2) + "%",
                  },
                ].map((row, i) => {
                  const change = row.previous === 0
                    ? (row.current > 0 ? 100 : 0)
                    : ((row.current - row.previous) / row.previous) * 100;
                  const isPositive = change > 0;
                  const isNeutral = change === 0;

                  return (
                    <div key={i} className="grid grid-cols-4 gap-0 border-t border-white/[0.06] hover:bg-neutral-900 transition-colors bg-neutral-950">
                      <div className="px-4 py-3 flex items-center gap-2">
                        <row.icon className="h-3.5 w-3.5 text-white" />
                        <span className="text-sm font-bold text-white">{row.label}</span>
                      </div>
                      <div className="px-4 py-3 text-right text-sm text-neutral-500 font-bold">
                        {row.format(row.previous)}
                      </div>
                      <div className="px-4 py-3 text-right text-sm font-bold text-white">
                        {row.format(row.current)}
                      </div>
                      <div className="px-4 py-3 text-right">
                        {isNeutral ? (
                          <span className="text-xs text-neutral-500 font-bold">--</span>
                        ) : (
                          <span className={`inline-flex items-center gap-0.5 text-xs font-bold text-white`}>
                            {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                            {isPositive ? "+" : ""}{change.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Insights */}
          {generatedReview.insights && (
            <div className="fade-in-up bg-neutral-950 rounded-lg border border-white/[0.06] p-5">
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb className="h-4 w-4 text-white" />
                <h3 className="font-bold text-sm text-white">AIインサイト</h3>
              </div>
              <p className="text-xs text-neutral-500 font-bold mb-4">AIが分析したパフォーマンスの洞察</p>
              <div className="grid gap-3 md:grid-cols-2">
                {generatedReview.insights.topPerformingContent && (
                  <div className="p-4 rounded-lg bg-teal-500/10 border border-teal-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-neutral-950 border border-white/[0.06] flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-teal-400" />
                      </div>
                      <h4 className="font-bold text-sm text-white">
                        トップパフォーマンスコンテンツ
                      </h4>
                    </div>
                    <p className="text-xs text-neutral-400 font-bold leading-relaxed">
                      {generatedReview.insights.topPerformingContent}
                    </p>
                  </div>
                )}
                {generatedReview.insights.engagementTrends && (
                  <div className="p-4 rounded-lg bg-sky-500/10 border border-sky-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-neutral-950 border border-white/[0.06] flex items-center justify-center">
                        <BarChart3 className="h-4 w-4 text-sky-400" />
                      </div>
                      <h4 className="font-bold text-sm text-white">
                        エンゲージメントトレンド
                      </h4>
                    </div>
                    <p className="text-xs text-neutral-400 font-bold leading-relaxed">
                      {generatedReview.insights.engagementTrends}
                    </p>
                  </div>
                )}
                {generatedReview.insights.audienceBehavior && (
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-neutral-950 border border-white/[0.06] flex items-center justify-center">
                        <Target className="h-4 w-4 text-blue-400" />
                      </div>
                      <h4 className="font-bold text-sm text-white">
                        オーディエンス行動
                      </h4>
                    </div>
                    <p className="text-xs text-neutral-400 font-bold leading-relaxed">
                      {generatedReview.insights.audienceBehavior}
                    </p>
                  </div>
                )}
                {generatedReview.insights.contentGaps && (
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-neutral-950 border border-white/[0.06] flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                      </div>
                      <h4 className="font-bold text-sm text-white">
                        コンテンツギャップ
                      </h4>
                    </div>
                    <p className="text-xs text-neutral-400 font-bold leading-relaxed">
                      {generatedReview.insights.contentGaps}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recommendations - Action Cards */}
          {generatedReview.recommendations && (
            <div className="fade-in-up bg-neutral-950 rounded-lg border border-white/[0.06] p-5">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-white" />
                <h3 className="font-bold text-sm text-white">推奨アクション</h3>
              </div>
              <p className="text-xs text-neutral-500 font-bold mb-4">次週に向けた改善提案</p>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Content Strategy */}
                {generatedReview.recommendations.contentStrategy && generatedReview.recommendations.contentStrategy.length > 0 && (
                  <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/10 hover:hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-neutral-950 border border-white/[0.06] flex items-center justify-center">
                        <FileText className="h-4 w-4 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">コンテンツ戦略</h4>
                        <p className="text-[10px] text-neutral-500 font-bold">{generatedReview.recommendations.contentStrategy.length}件の提案</p>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {generatedReview.recommendations.contentStrategy.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-neutral-300 font-bold leading-relaxed">
                          <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Posting Schedule */}
                {generatedReview.recommendations.postingSchedule && generatedReview.recommendations.postingSchedule.length > 0 && (
                  <div className="p-4 rounded-lg border border-sky-500/20 bg-sky-500/10 hover:hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-neutral-950 border border-white/[0.06] flex items-center justify-center">
                        <Clock className="h-4 w-4 text-sky-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">投稿スケジュール</h4>
                        <p className="text-[10px] text-neutral-500 font-bold">{generatedReview.recommendations.postingSchedule.length}件の提案</p>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {generatedReview.recommendations.postingSchedule.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-neutral-300 font-bold leading-relaxed">
                          <CheckCircle2 className="h-3.5 w-3.5 text-sky-400 flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Engagement Tactics */}
                {generatedReview.recommendations.engagementTactics && generatedReview.recommendations.engagementTactics.length > 0 && (
                  <div className="p-4 rounded-lg border border-teal-500/20 bg-teal-500/10 hover:hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-neutral-950 border border-white/[0.06] flex items-center justify-center">
                        <Zap className="h-4 w-4 text-teal-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">エンゲージメント戦術</h4>
                        <p className="text-[10px] text-neutral-500 font-bold">{generatedReview.recommendations.engagementTactics.length}件の提案</p>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {generatedReview.recommendations.engagementTactics.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-neutral-300 font-bold leading-relaxed">
                          <CheckCircle2 className="h-3.5 w-3.5 text-teal-400 flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Platform Optimization */}
                {generatedReview.recommendations.platformOptimization && generatedReview.recommendations.platformOptimization.length > 0 && (
                  <div className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 hover:hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-neutral-950 border border-white/[0.06] flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">プラットフォーム最適化</h4>
                        <p className="text-[10px] text-neutral-500 font-bold">{generatedReview.recommendations.platformOptimization.length}件の提案</p>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {generatedReview.recommendations.platformOptimization.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-neutral-300 font-bold leading-relaxed">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!generatedReview && (
        <div className="fade-in-up bg-neutral-950 rounded-lg border border-white/[0.06] p-5">
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-12 h-12 rounded-lg bg-neutral-900 border border-white/[0.06] flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <p className="text-sm font-bold text-white mb-1">
              レビューデータがありません
            </p>
            <p className="text-xs text-neutral-500 font-bold max-w-xs">
              上部の期間選択からレビュー期間を指定し、「レビュー生成」をクリックしてください
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
