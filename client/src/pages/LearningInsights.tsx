import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Brain, Activity, Users, BarChart3, TrendingUp } from "lucide-react";

function getConfidenceBadgeClass(confidence: number): string {
  if (confidence >= 70) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (confidence >= 40) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return "bg-rose-500/20 text-rose-400 border-rose-500/30";
}

function getHealthScoreBg(score: number): string {
  if (score >= 70) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (score >= 40) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return "bg-rose-500/20 text-rose-400 border-rose-500/30";
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export default function LearningInsights() {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");

  const { data: unifiedView, isLoading: unifiedLoading } = trpc.learningInsights.getUnifiedView.useQuery({});
  const { data: accountHealth, isLoading: healthLoading } = trpc.learningInsights.getAccountHealth.useQuery({});
  const { data: confidenceHistory, isLoading: historyLoading } = trpc.learningInsights.getConfidenceHistory.useQuery(
    { accountId: Number(selectedAccountId) },
    { enabled: selectedAccountId !== "all" }
  );

  if (unifiedLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto" />
          <p className="mt-4 text-neutral-500 text-sm font-bold">読み込み中...</p>
        </div>
      </div>
    );
  }

  const totalLearnings = unifiedView?.stats?.total ?? 0;
  const avgConfidence = unifiedView?.stats?.avgConfidence ?? 0;
  const activeLearnings = unifiedView?.stats?.activeCount ?? 0;

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="fade-in-up page-header">
        <div>
          <h1 className="page-title text-white">学習インサイト</h1>
          <p className="page-subtitle text-neutral-500">3層学習システムの統合分析ダッシュボード</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <div className="fade-in-up bg-neutral-950 p-4 border border-white/[0.06] rounded-lg">
          <div className="pl-3">
            <p className="text-[11px] text-neutral-500 font-bold uppercase tracking-wide">総学習数</p>
            <p className="text-2xl font-bold text-white mt-0.5">{totalLearnings}</p>
            <p className="text-[10px] text-neutral-500 mt-0.5 font-bold">全レイヤー合計</p>
          </div>
        </div>
        <div className="fade-in-up bg-neutral-950 p-4 border border-white/[0.06] rounded-lg">
          <div className="pl-3">
            <p className="text-[11px] text-neutral-500 font-bold uppercase tracking-wide">平均Confidence</p>
            <p className="text-2xl font-bold text-white mt-0.5">{avgConfidence.toFixed(1)}%</p>
            <p className="text-[10px] text-neutral-500 mt-0.5 font-bold">全学習の平均</p>
          </div>
        </div>
        <div className="fade-in-up bg-neutral-950 p-4 border border-white/[0.06] rounded-lg">
          <div className="pl-3">
            <p className="text-[11px] text-neutral-500 font-bold uppercase tracking-wide">アクティブ学習</p>
            <p className="text-2xl font-bold text-white mt-0.5">{activeLearnings}</p>
            <p className="text-[10px] text-neutral-500 mt-0.5 font-bold">現在稼働中</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="unified" className="space-y-4">
        <TabsList className="bg-neutral-900 border border-white/[0.06]">
          <TabsTrigger value="unified" className="text-xs font-bold">統合ビュー</TabsTrigger>
          <TabsTrigger value="health" className="text-xs font-bold">アカウントヘルス</TabsTrigger>
          <TabsTrigger value="history" className="text-xs font-bold">Confidence推移</TabsTrigger>
        </TabsList>

        {/* Tab 1: Unified View */}
        <TabsContent value="unified">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Account Learnings */}
            <div className="fade-in-up bg-neutral-950 rounded-lg border border-white/[0.06] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-neutral-400" />
                <h3 className="font-bold text-sm text-white">アカウント学習</h3>
              </div>
              {unifiedView?.accountLearnings && unifiedView.accountLearnings.length > 0 ? (
                <div className="space-y-2">
                  {unifiedView.accountLearnings.map((learning, index) => (
                    <div key={index} className="p-2.5 border border-white/[0.06] rounded-lg hover:bg-neutral-900 transition-colors bg-neutral-950">
                      <p className="text-xs text-white line-clamp-2 font-bold">
                        {truncateText(learning.content ?? "", 100)}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold border ${getConfidenceBadgeClass(learning.confidence ?? 0)}`}>
                          {learning.confidence ?? 0}%
                        </span>
                        <span className="text-[10px] text-neutral-500 font-bold">
                          使用: {learning.usageCount ?? 0}回
                        </span>
                        <span className="text-[10px] text-neutral-500 font-bold">
                          成功率: {((learning.successRate ?? 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 text-neutral-500 mx-auto mb-2" />
                  <p className="text-xs text-neutral-500 font-bold">データがありません</p>
                </div>
              )}
            </div>

            {/* Buzz Learnings */}
            <div className="fade-in-up bg-neutral-950 rounded-lg border border-white/[0.06] p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-neutral-400" />
                <h3 className="font-bold text-sm text-white">バズ学習</h3>
              </div>
              {unifiedView?.buzzLearnings && unifiedView.buzzLearnings.length > 0 ? (
                <div className="space-y-2">
                  {unifiedView.buzzLearnings.map((learning, index) => (
                    <div key={index} className="p-2.5 border border-white/[0.06] rounded-lg hover:bg-neutral-900 transition-colors bg-neutral-950">
                      <p className="text-xs text-white line-clamp-2 font-bold">
                        {truncateText(learning.description ?? "", 100)}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold border ${getConfidenceBadgeClass(learning.confidence ?? 0)}`}>
                          {learning.confidence ?? 0}%
                        </span>
                        <span className="text-[10px] text-neutral-500 font-bold">
                          使用: {learning.usageCount ?? 0}回
                        </span>
                        <span className="text-[10px] text-neutral-500 font-bold">
                          成功率: {((learning.successRate ?? 0)).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="h-8 w-8 text-neutral-500 mx-auto mb-2" />
                  <p className="text-xs text-neutral-500 font-bold">データがありません</p>
                </div>
              )}
            </div>

            {/* Agent Knowledge */}
            <div className="fade-in-up bg-neutral-950 rounded-lg border border-white/[0.06] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-4 w-4 text-neutral-400" />
                <h3 className="font-bold text-sm text-white">エージェント知識</h3>
              </div>
              {unifiedView?.agentKnowledge && unifiedView.agentKnowledge.length > 0 ? (
                <div className="space-y-2">
                  {unifiedView.agentKnowledge.map((learning, index) => (
                    <div key={index} className="p-2.5 border border-white/[0.06] rounded-lg hover:bg-neutral-900 transition-colors bg-neutral-950">
                      <p className="text-xs text-white line-clamp-2 font-bold">
                        {truncateText(learning.content ?? "", 100)}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold border ${getConfidenceBadgeClass(learning.confidence ?? 0)}`}>
                          {learning.confidence ?? 0}%
                        </span>
                        <span className="text-[10px] text-neutral-500 font-bold">
                          使用: {learning.usageCount ?? 0}回
                        </span>
                        <span className="text-[10px] text-neutral-500 font-bold">
                          成功率: {((learning.successRate ?? 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="h-8 w-8 text-neutral-500 mx-auto mb-2" />
                  <p className="text-xs text-neutral-500 font-bold">データがありません</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Account Health */}
        <TabsContent value="health">
          <div className="fade-in-up bg-neutral-950 rounded-lg border border-white/[0.06] p-4">
            <h3 className="font-bold text-sm text-white mb-1">アカウントヘルススコア</h3>
            <p className="text-xs text-neutral-500 mb-4 font-bold">各アカウントの学習状況とヘルススコア</p>

            {healthLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
              </div>
            ) : accountHealth && accountHealth.length > 0 ? (
              <div className="border border-white/[0.06] rounded-lg overflow-hidden">
                <div className="grid grid-cols-5 gap-0 bg-emerald-500/10 text-[11px] font-bold text-emerald-400 uppercase tracking-wide border-b border-white/[0.06]">
                  <div className="px-3 py-2">アカウント名</div>
                  <div className="px-3 py-2">アクティブ学習</div>
                  <div className="px-3 py-2">平均Confidence</div>
                  <div className="px-3 py-2">平均成功率</div>
                  <div className="px-3 py-2">ヘルススコア</div>
                </div>
                {accountHealth.map((account, index) => (
                  <div key={index} className="grid grid-cols-5 gap-0 border-b border-white/[0.06] last:border-b-0 hover:bg-neutral-900 transition-colors bg-neutral-950">
                    <div className="px-3 py-2.5 text-sm font-bold text-white">
                      {account.username}
                    </div>
                    <div className="px-3 py-2.5 text-sm text-white font-bold">
                      {account.activeLearningCount ?? 0}
                    </div>
                    <div className="px-3 py-2.5 text-sm text-white font-bold">
                      {(account.avgConfidence ?? 0).toFixed(1)}%
                    </div>
                    <div className="px-3 py-2.5 text-sm text-white font-bold">
                      {((account.avgSuccessRate ?? 0) * 100).toFixed(1)}%
                    </div>
                    <div className="px-3 py-2.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold border ${getHealthScoreBg(account.healthScore ?? 0)}`}>
                        {account.healthScore ?? 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-neutral-500 mx-auto mb-4" />
                <p className="text-sm text-neutral-500 font-bold">アカウントヘルスデータがありません</p>
                <p className="text-xs text-neutral-500 mt-2 font-bold">
                  学習データが蓄積されるとヘルススコアが表示されます
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 3: Confidence History */}
        <TabsContent value="history">
          <div className="fade-in-up bg-neutral-950 rounded-lg border border-white/[0.06] p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-white mb-1">Confidence推移</h3>
                <p className="text-xs text-neutral-500 font-bold">日別のConfidence値と学習数の推移</p>
              </div>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="w-48 border border-white/[0.06] bg-neutral-900">
                  <SelectValue placeholder="アカウントを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべてのアカウント</SelectItem>
                  {accountHealth?.map((account, index) => (
                    <SelectItem key={index} value={String(account.accountId)}>
                      {account.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
              </div>
            ) : confidenceHistory && confidenceHistory.length > 0 ? (
              <div className="border border-white/[0.06] rounded-lg overflow-hidden">
                <div className="grid grid-cols-3 gap-0 bg-emerald-500/10 text-[11px] font-bold text-emerald-400 uppercase tracking-wide border-b border-white/[0.06]">
                  <div className="px-3 py-2">日付</div>
                  <div className="px-3 py-2">平均Confidence</div>
                  <div className="px-3 py-2">学習数</div>
                </div>
                {confidenceHistory.map((entry, index) => (
                  <div key={index} className="grid grid-cols-3 gap-0 border-b border-white/[0.06] last:border-b-0 hover:bg-neutral-900 transition-colors bg-neutral-950">
                    <div className="px-3 py-2.5 text-sm text-white font-bold">
                      {entry.date}
                    </div>
                    <div className="px-3 py-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${entry.avgConfidence ?? 0}%` }}
                          />
                        </div>
                        <span className="text-white font-bold">
                          {(entry.avgConfidence ?? 0).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="px-3 py-2.5 text-sm text-white font-bold">
                      {entry.learningCount ?? 0}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-neutral-500 mx-auto mb-4" />
                <p className="text-sm text-neutral-500 font-bold">Confidence履歴データがありません</p>
                <p className="text-xs text-neutral-500 mt-2 font-bold">
                  学習が進むとConfidence推移が表示されます
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
