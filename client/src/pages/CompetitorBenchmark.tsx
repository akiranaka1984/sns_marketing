import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, TrendingUp, TrendingDown, Target, Lightbulb, BarChart3, Users, ArrowRight } from "lucide-react";

export default function CompetitorBenchmark() {
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>(undefined);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined);

  const {
    data: comparison,
    isLoading: comparisonLoading,
    isError: comparisonError,
  } = trpc.analytics.getCompetitorComparison.useQuery({
    accountId: selectedAccountId,
    projectId: selectedProjectId,
  });

  const {
    data: gapAnalysis,
    isLoading: gapLoading,
    isError: gapError,
  } = trpc.analytics.getGapAnalysis.useQuery({
    accountId: selectedAccountId,
    projectId: selectedProjectId,
  });

  if (comparisonLoading && gapLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="page-header flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">競合比較</h2>
          <p className="text-xs text-neutral-500 mt-0.5 font-bold">モデルアカウントとの比較分析</p>
        </div>
      </div>

      {/* Section 1: Comparison Overview */}
      <div className="fade-in-up bg-neutral-950 rounded-lg border border-white/[0.06] p-4">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-neutral-400" />
          比較概要
        </h3>

        {comparisonLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          </div>
        ) : comparisonError ? (
          <div className="text-center py-8 text-neutral-500 text-sm font-bold">
            比較データを読み込めませんでした
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-sky-500/30 p-4 bg-sky-500/10">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-4 w-4 text-sky-400" />
                <h4 className="text-sm font-bold text-sky-400">自アカウント</h4>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-neutral-500 font-bold">総投稿数</span>
                  <span className="text-sm font-bold text-white">
                    {comparison?.myStats?.totalPosts ?? "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-neutral-500 font-bold">平均いいね</span>
                  <span className="text-sm font-bold text-white">
                    {comparison?.myStats?.avgLikes ?? "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-neutral-500 font-bold">平均エンゲージメント率</span>
                  <span className="text-sm font-bold text-white">
                    {comparison?.myStats?.avgEngagementRate != null
                      ? `${(comparison.myStats.avgEngagementRate * 100).toFixed(2)}%`
                      : "-"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-amber-500/30 p-4 bg-amber-500/10">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-4 w-4 text-amber-400" />
                <h4 className="text-sm font-bold text-amber-400">モデルアカウント</h4>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-neutral-500 font-bold">アカウント数</span>
                  <span className="text-sm font-bold text-white">
                    {comparison?.modelStats?.accountCount ?? "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-neutral-500 font-bold">平均投稿頻度 (投稿/週)</span>
                  <span className="text-sm font-bold text-white">
                    {comparison?.modelStats?.avgPostsPerWeek ?? "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-neutral-500 font-bold">平均エンゲージメント率</span>
                  <span className="text-sm font-bold text-white">
                    {comparison?.modelStats?.avgEngagementRate != null
                      ? `${comparison.modelStats.avgEngagementRate}%`
                      : "-"}
                  </span>
                </div>
                {comparison?.modelStats?.topModels && comparison.modelStats.topModels.length > 0 && (
                  <div>
                    <span className="text-xs text-neutral-500 font-bold">トップモデル</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {comparison.modelStats.topModels.map((m) => (
                        <span
                          key={m.id}
                          className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold border border-white/[0.06] text-neutral-400 bg-neutral-800"
                        >
                          @{m.handle}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Gap Analysis */}
      <div className="fade-in-up bg-neutral-950 rounded-lg border border-white/[0.06] p-4">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-neutral-400" />
          ギャップ分析
        </h3>

        {gapLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          </div>
        ) : gapError ? (
          <div className="text-center py-8 text-neutral-500 text-sm font-bold">
            ギャップ分析データを読み込めませんでした
          </div>
        ) : !gapAnalysis?.gaps || gapAnalysis.gaps.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-sm font-bold">
            ギャップ分析データがありません
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {gapAnalysis.gaps.map((gap, index) => {
              const isNegativeGap = gap.gapPercentage < 0;
              return (
                <div
                  key={index}
                  className="rounded-lg border border-white/[0.06] p-4 hover:bg-neutral-900 transition-colors bg-neutral-950"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">{gap.metric}</span>
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={gap.priority as "high" | "medium" | "low"} />
                      {gap.gapPercentage !== 0 && (
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold ${
                            isNegativeGap ? "text-rose-400" : "text-emerald-400"
                          }`}
                        >
                          {isNegativeGap ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : (
                            <TrendingUp className="h-3 w-3" />
                          )}
                          {gap.gapPercentage > 0 ? "+" : ""}
                          {gap.gapPercentage}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-center flex-1">
                      <p className="text-[10px] text-neutral-500 uppercase tracking-wide font-bold">自分</p>
                      <p className="text-lg font-bold text-white">{gap.myValue}</p>
                    </div>
                    {gap.modelValue > 0 && (
                      <>
                        <ArrowRight className="h-4 w-4 text-neutral-500 shrink-0" />
                        <div className="text-center flex-1">
                          <p className="text-[10px] text-neutral-500 uppercase tracking-wide font-bold">モデル</p>
                          <p className="text-lg font-bold text-white">{gap.modelValue}</p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="bg-amber-500/10 rounded-lg p-2 border border-amber-500/30">
                    <p className="text-[11px] text-amber-400 flex items-start gap-1 font-bold">
                      <Lightbulb className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                      {gap.recommendation}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" }) {
  const config: Record<string, { label: string; className: string }> = {
    high: { label: "高", className: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
    medium: { label: "中", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    low: { label: "低", className: "bg-neutral-800 text-neutral-400 border-white/[0.06]" },
  };

  const { label, className } = config[priority] || config.low;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold border ${className}`}>
      {label}
    </span>
  );
}
