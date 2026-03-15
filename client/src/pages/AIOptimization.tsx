import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, Check, X, RotateCcw } from "lucide-react";

export default function AIOptimization() {
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");

  const { data: agents } = trpc.agents.list.useQuery();
  const { data: optimizations, refetch } = trpc.aiOptimization.listOptimizations.useQuery({ limit: 20 });

  const analyzeAgent = trpc.aiOptimization.analyzeAgent.useMutation({
    onSuccess: () => {
      toast.success("エージェントの分析が完了しました");
      refetch();
    },
    onError: (error: any) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const applyOptimization = trpc.aiOptimization.applyOptimization.useMutation({
    onSuccess: () => {
      toast.success("最適化を適用しました");
      refetch();
    },
    onError: (error: any) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const revertOptimization = trpc.aiOptimization.revertOptimization.useMutation({
    onSuccess: () => {
      toast.success("最適化を元に戻しました");
      refetch();
    },
    onError: (error: any) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const handleAnalyze = () => {
    if (!selectedAgentId) {
      toast.error("エージェントを選択してください");
      return;
    }

    analyzeAgent.mutate({
      agentId: Number.parseInt(selectedAgentId),
      daysBack: 30,
    });
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="fade-in-up page-header">
        <div>
          <h1 className="page-title">AI学習最適化</h1>
          <p className="page-subtitle">
            パフォーマンスデータに基づいてエージェントのパラメータを自動最適化します
          </p>
        </div>
      </div>

      {/* Analysis Section */}
      <div className="fade-in-up bg-neutral-900 rounded-lg border border-white/[0.06] p-4">
        <h3 className="font-bold text-sm text-white mb-1">エージェント分析</h3>
        <p className="text-[11px] text-neutral-500 mb-4 font-bold">エージェントのパフォーマンスを分析して最適化提案を生成します</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="agent" className="font-bold text-white">エージェント選択</Label>
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger className="border border-white/[0.06] rounded-lg bg-neutral-950 font-bold text-white">
                <SelectValue placeholder="エージェントを選択" />
              </SelectTrigger>
              <SelectContent className="border border-white/[0.06] rounded-lg bg-neutral-900">
                {agents?.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id.toString()} className="font-bold text-white">
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleAnalyze}
              disabled={analyzeAgent.isPending}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold border border-white/[0.06] rounded-lg transition-all"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {analyzeAgent.isPending ? "分析中..." : "分析開始"}
            </Button>
          </div>
        </div>
      </div>

      {/* Optimizations List */}
      <div>
        <h3 className="font-bold text-sm text-white mb-3">最適化提案</h3>
        <div className="grid gap-4">
          {optimizations?.map((opt: any) => (
            <div key={opt.id} className="fade-in-up bg-neutral-900 rounded-lg border border-white/[0.06] p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-sm text-white">最適化 #{opt.id}</h3>
                {opt.status === "applied" ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-teal-500/20 text-teal-400 border border-teal-500/30">適用済み</span>
                ) : opt.status === "reverted" ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">元に戻した</span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold border border-white/[0.06] text-neutral-400 bg-neutral-800">未適用</span>
                )}
              </div>
              <p className="text-[11px] text-neutral-500 mb-4 font-bold">
                {new Date(opt.createdAt).toLocaleString("ja-JP")}
              </p>
              <div className="space-y-4">
                {/* Before/After Comparison */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-bold text-sm text-white mb-2">変更前</h4>
                    <div className="text-sm space-y-1 bg-neutral-950 p-3 rounded-lg border border-white/[0.06]">
                      <p className="font-bold text-neutral-400"><span className="font-bold text-white">トーン:</span> {opt.beforeParams?.tone || "N/A"}</p>
                      <p className="font-bold text-neutral-400"><span className="font-bold text-white">スタイル:</span> {opt.beforeParams?.style || "N/A"}</p>
                      <p className="font-bold text-neutral-400"><span className="font-bold text-white">投稿頻度:</span> {opt.beforeParams?.postingFrequency || "N/A"}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white mb-2">変更後</h4>
                    <div className="text-sm space-y-1 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                      <p className="font-bold text-neutral-300"><span className="font-bold text-amber-400">トーン:</span> {opt.afterParams?.tone || "N/A"}</p>
                      <p className="font-bold text-neutral-300"><span className="font-bold text-amber-400">スタイル:</span> {opt.afterParams?.style || "N/A"}</p>
                      <p className="font-bold text-neutral-300"><span className="font-bold text-amber-400">投稿頻度:</span> {opt.afterParams?.postingFrequency || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Expected Improvement */}
                {opt.performanceImprovement > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-teal-500/20 text-teal-400 border border-teal-500/30">
                      期待される改善: +{opt.performanceImprovement}%
                    </span>
                  </div>
                )}

                {/* Insights */}
                {opt.insights && (
                  <div>
                    <h4 className="font-bold text-sm text-white mb-2">AI提案理由</h4>
                    <div className="text-sm space-y-2">
                      {opt.insights.toneAdjustment && (
                        <p className="text-neutral-500 font-bold">
                          <span className="font-bold text-white">トーン:</span> {opt.insights.toneAdjustment.reason}
                        </p>
                      )}
                      {opt.insights.styleAdjustment && (
                        <p className="text-neutral-500 font-bold">
                          <span className="font-bold text-white">スタイル:</span> {opt.insights.styleAdjustment.reason}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {opt.status === "pending" && (
                    <Button
                      size="sm"
                      onClick={() => applyOptimization.mutate({ optimizationId: opt.id })}
                      disabled={applyOptimization.isPending}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold border border-white/[0.06] rounded-lg transition-all"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      適用
                    </Button>
                  )}
                  {opt.status === "applied" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => revertOptimization.mutate({ optimizationId: opt.id })}
                      disabled={revertOptimization.isPending}
                      className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold border border-white/[0.06] rounded-lg transition-all"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      元に戻す
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {(!optimizations || optimizations.length === 0) && (
            <div className="fade-in-up bg-neutral-900 rounded-lg border border-white/[0.06] p-4">
              <div className="flex items-center justify-center h-32">
                <p className="text-neutral-500 font-bold">最適化提案はありません</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
