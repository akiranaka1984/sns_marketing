import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  FlaskConical,
  Plus,
  Play,
  BarChart3,
  Trophy,
  Clock,
  CheckCircle,
  XCircle,
  Lightbulb,
  Eye,
  AlertTriangle,
  TrendingUp,
  Activity
} from "lucide-react";
import { Link } from "wouter";
import { Progress } from "@/components/ui/progress";

// Statistical analysis result type
interface AnalysisResult {
  winnerId: number | null;
  confidence: number;
  analysis: string;
  statistics: {
    pValue: number | null;
    effectSize: number | null;
    effectSizeInterpretation: string;
    isStatisticallySignificant: boolean;
    confidenceInterval: {
      lower: number;
      upper: number;
    } | null;
    sampleSizeAdequate: boolean;
    requiredSampleSize: number;
    currentSampleSize: number;
    warnings: string[];
  } | null;
}

export default function ABTesting() {
  const { t } = useI18n();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [previewVariations, setPreviewVariations] = useState<any[]>([]);
  const [adaptiveTestId, setAdaptiveTestId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    agentId: 0,
    name: "",
    theme: "",
    variationCount: 2,
    testDurationHours: 48
  });

  const utils = trpc.useUtils();
  const { data: adaptiveData } = trpc.abTesting.getAdaptiveAllocations.useQuery(
    { testId: adaptiveTestId! },
    { enabled: adaptiveTestId !== null }
  );
  const { data: tests = [] } = trpc.abTesting.list.useQuery();
  const { data: agents = [] } = trpc.agents.list.useQuery();
  const { data: learnings = [] } = trpc.abTesting.getLearnings.useQuery();

  const createMutation = trpc.abTesting.create.useMutation({
    onSuccess: () => {
      toast.success("A/Bテストを作成しました");
      setIsCreateOpen(false);
      setFormData({ agentId: 0, name: "", theme: "", variationCount: 2, testDurationHours: 48 });
      utils.abTesting.list.invalidate();
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    }
  });

  const startMutation = trpc.abTesting.start.useMutation({
    onSuccess: () => {
      toast.success("A/Bテストを開始しました");
      utils.abTesting.list.invalidate();
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    }
  });

  const analyzeMutation = trpc.abTesting.analyze.useMutation({
    onSuccess: (result, variables) => {
      setAnalysisResult(result as AnalysisResult);
      setAdaptiveTestId(variables.testId);
      setIsAnalysisOpen(true);
      if (result.winnerId) {
        toast.success(`分析完了！信頼度: ${result.confidence}%`);
      } else {
        toast.info("まだ十分なデータがありません");
      }
      utils.abTesting.list.invalidate();
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    }
  });

  const extractLearningsMutation = trpc.abTesting.extractLearnings.useMutation({
    onSuccess: () => {
      toast.success("学習を抽出しました");
      utils.abTesting.getLearnings.invalidate();
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    }
  });

  const previewMutation = trpc.abTesting.previewVariations.useMutation({
    onSuccess: (result) => {
      setPreviewVariations(result.variations);
      setIsPreviewOpen(true);
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-neutral-800 text-neutral-400 border border-white/[0.06]">下書き</span>;
      case "running":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">実行中</span>;
      case "completed":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-teal-500/20 text-teal-400 border border-teal-500/30">完了</span>;
      case "cancelled":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">キャンセル</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold border border-white/[0.06] text-neutral-500 bg-neutral-900">{status}</span>;
    }
  };

  const getLearningTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      tone_preference: "トーン",
      length_preference: "長さ",
      emoji_preference: "絵文字",
      hashtag_preference: "ハッシュタグ",
      media_preference: "メディア",
      timing_preference: "タイミング",
      general: "一般"
    };
    return labels[type] || type;
  };

  return (
    <>
      <div className="space-y-5 max-w-5xl">
        {/* Header */}
        <div className="fade-in-up page-header">
          <div>
            <h1 className="page-title">A/Bテスト</h1>
            <p className="page-subtitle">
              異なるスタイルの投稿を比較し、最も効果的なパターンを発見
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="bg-emerald-500 hover:bg-emerald-500 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] text-white font-bold border border-white/[0.06] rounded-lg">
            <Plus className="mr-2 h-4 w-4" />
            新規テスト
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="fade-in-up bg-neutral-950 rounded-lg border border-white/[0.06] p-4">
            <div className="pl-3">
              <p className="text-[11px] text-neutral-500 font-bold uppercase tracking-wide">総テスト数</p>
              <p className="text-2xl font-bold text-white mt-0.5">{tests.length}</p>
              <p className="text-[10px] text-neutral-500 mt-0.5 font-bold">全テスト</p>
            </div>
          </div>
          <div className="fade-in-up bg-neutral-950 rounded-lg border border-white/[0.06] p-4">
            <div className="pl-3">
              <p className="text-[11px] text-neutral-500 font-bold uppercase tracking-wide">実行中</p>
              <p className="text-2xl font-bold text-white mt-0.5">
                {tests.filter((t: any) => t.status === "running").length}
              </p>
              <p className="text-[10px] text-neutral-500 mt-0.5 font-bold">アクティブ</p>
            </div>
          </div>
          <div className="fade-in-up bg-neutral-950 rounded-lg border border-white/[0.06] p-4">
            <div className="pl-3">
              <p className="text-[11px] text-neutral-500 font-bold uppercase tracking-wide">完了</p>
              <p className="text-2xl font-bold text-white mt-0.5">
                {tests.filter((t: any) => t.status === "completed").length}
              </p>
              <p className="text-[10px] text-neutral-500 mt-0.5 font-bold">終了済み</p>
            </div>
          </div>
          <div className="fade-in-up bg-neutral-950 rounded-lg border border-white/[0.06] p-4">
            <div className="pl-3">
              <p className="text-[11px] text-neutral-500 font-bold uppercase tracking-wide">獲得した学習</p>
              <p className="text-2xl font-bold text-white mt-0.5">{learnings.length}</p>
              <p className="text-[10px] text-neutral-500 mt-0.5 font-bold">インサイト</p>
            </div>
          </div>
        </div>

        {/* Tests List */}
        <div className="fade-in-up bg-neutral-950 rounded-lg border border-white/[0.06] p-4">
          <h3 className="font-bold text-sm text-white mb-1">テスト一覧</h3>
          <p className="text-[11px] text-neutral-500 mb-4 font-bold">
            作成したA/Bテストの管理と結果の確認
          </p>
          {tests.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-bold">まだA/Bテストがありません</p>
              <p className="text-sm mt-1 font-bold">新規テストを作成して、最適な投稿スタイルを見つけましょう</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tests.map((test: any) => (
                <div key={test.id} className="border border-white/[0.06] rounded-lg bg-neutral-900 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{test.name}</h3>
                        {getStatusBadge(test.status)}
                        {test.winnerId && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold border border-amber-500/30 bg-amber-500/20 text-amber-400">
                            <Trophy className="h-3 w-3 mr-1" />
                            勝者決定
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-neutral-500 mt-1 font-bold">
                        テーマ: {test.theme}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-neutral-500 font-bold">
                        <span>バリエーション: {test.variationCount}個</span>
                        <span>期間: {test.testDurationHours}時間</span>
                        {test.confidenceLevel && (
                          <span className="flex items-center gap-1">
                            信頼度: {test.confidenceLevel}%
                            {test.confidenceLevel >= 95 && (
                              <CheckCircle className="h-3 w-3 text-emerald-500" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {test.status === "draft" && (
                        <Button
                          size="sm"
                          onClick={() => startMutation.mutate({ testId: test.id })}
                          disabled={startMutation.isPending}
                          className="bg-emerald-500 hover:bg-emerald-500 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] text-white font-bold border border-white/[0.06] rounded-lg"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          開始
                        </Button>
                      )}
                      {test.status === "running" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => analyzeMutation.mutate({ testId: test.id })}
                          disabled={analyzeMutation.isPending}
                          className="bg-neutral-950 hover:bg-neutral-900 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] text-white font-bold border border-white/[0.06] rounded-lg"
                        >
                          <BarChart3 className="h-4 w-4 mr-1" />
                          分析
                        </Button>
                      )}
                      {test.status === "completed" && !test.winnerId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => analyzeMutation.mutate({ testId: test.id })}
                          disabled={analyzeMutation.isPending}
                          className="bg-neutral-950 hover:bg-neutral-900 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] text-white font-bold border border-white/[0.06] rounded-lg"
                        >
                          <BarChart3 className="h-4 w-4 mr-1" />
                          結果確認
                        </Button>
                      )}
                      {test.status === "completed" && test.winnerId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => extractLearningsMutation.mutate({ testId: test.id })}
                          disabled={extractLearningsMutation.isPending}
                          className="bg-neutral-950 hover:bg-neutral-900 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] text-white font-bold border border-white/[0.06] rounded-lg"
                        >
                          <Lightbulb className="h-4 w-4 mr-1" />
                          学習抽出
                        </Button>
                      )}
                      <Link href={`/ab-testing/${test.id}`}>
                        <Button size="sm" variant="ghost" className="hover:bg-neutral-900 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] font-bold border border-white/[0.06] rounded-lg">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Learnings */}
        {learnings.length > 0 && (
          <div className="fade-in-up bg-neutral-950 rounded-lg border border-white/[0.06] p-4">
            <h3 className="font-bold text-sm text-white mb-1 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              獲得した学習
            </h3>
            <p className="text-[11px] text-neutral-500 mb-4 font-bold">
              A/Bテストから抽出されたインサイト
            </p>
            <div className="space-y-3">
              {learnings.slice(0, 5).map((learning: any) => (
                <div key={learning.id} className="border border-white/[0.06] rounded-lg bg-neutral-900 p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold border border-emerald-500/30 bg-emerald-500/20 text-emerald-400">{getLearningTypeLabel(learning.learningType)}</span>
                        <span className="font-bold">{learning.title}</span>
                      </div>
                      <p className="text-sm text-neutral-500 mt-1 font-bold">{learning.insight}</p>
                    </div>
                    {learning.isApplied ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-teal-500/20 text-teal-400 border border-teal-500/30">適用済み</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">信頼度: {learning.confidence}%</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Test Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg border border-white/[0.06] rounded-lg">
          <DialogHeader>
            <DialogTitle className="font-bold">新規A/Bテスト作成</DialogTitle>
            <DialogDescription className="font-bold text-neutral-500">
              同じテーマで異なるスタイルの投稿を比較します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-bold">エージェント</Label>
              <Select
                value={formData.agentId.toString()}
                onValueChange={(v) => setFormData({ ...formData, agentId: parseInt(v) })}
              >
                <SelectTrigger className="border border-white/[0.06] rounded-lg font-bold">
                  <SelectValue placeholder="エージェントを選択..." />
                </SelectTrigger>
                <SelectContent className="border border-white/[0.06] rounded-lg">
                  {agents.map((agent: any) => (
                    <SelectItem key={agent.id} value={agent.id.toString()} className="font-bold">
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-bold">テスト名</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例: 朝の挨拶投稿スタイル比較"
                className="border border-white/[0.06] rounded-lg font-bold"
              />
            </div>
            <div>
              <Label className="font-bold">テーマ</Label>
              <Textarea
                value={formData.theme}
                onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                placeholder="例: 月曜日の朝、フォロワーに元気を与える挨拶"
                rows={3}
                className="border border-white/[0.06] rounded-lg font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="font-bold">バリエーション数</Label>
                <Select
                  value={formData.variationCount.toString()}
                  onValueChange={(v) => setFormData({ ...formData, variationCount: parseInt(v) })}
                >
                  <SelectTrigger className="border border-white/[0.06] rounded-lg font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border border-white/[0.06] rounded-lg">
                    {[2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={n.toString()} className="font-bold">
                        {n}個
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-bold">テスト期間</Label>
                <Select
                  value={formData.testDurationHours.toString()}
                  onValueChange={(v) => setFormData({ ...formData, testDurationHours: parseInt(v) })}
                >
                  <SelectTrigger className="border border-white/[0.06] rounded-lg font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border border-white/[0.06] rounded-lg">
                    <SelectItem value="24" className="font-bold">24時間</SelectItem>
                    <SelectItem value="48" className="font-bold">48時間</SelectItem>
                    <SelectItem value="72" className="font-bold">72時間</SelectItem>
                    <SelectItem value="168" className="font-bold">1週間</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full bg-neutral-950 hover:bg-neutral-900 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] text-white font-bold border border-white/[0.06] rounded-lg"
              onClick={() => previewMutation.mutate({
                theme: formData.theme,
                count: formData.variationCount
              })}
              disabled={!formData.theme || previewMutation.isPending}
            >
              <Eye className="mr-2 h-4 w-4" />
              バリエーションをプレビュー
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="bg-neutral-950 hover:bg-neutral-900 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] text-white font-bold border border-white/[0.06] rounded-lg">
              キャンセル
            </Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.agentId || !formData.name || !formData.theme || createMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-500 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] text-white font-bold border border-white/[0.06] rounded-lg"
            >
              作成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto border border-white/[0.06] rounded-lg">
          <DialogHeader>
            <DialogTitle className="font-bold">バリエーションプレビュー</DialogTitle>
            <DialogDescription className="font-bold text-neutral-500">
              生成されるバリエーションの例
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {previewVariations.map((v, i) => (
              <div key={i} className="border border-white/[0.06] rounded-lg bg-neutral-900 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-teal-500/20 text-teal-400 border border-teal-500/30">バリエーション {v.variationName}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold border border-emerald-500/30 text-emerald-400 bg-emerald-500/20">{v.config.tone}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold border border-amber-500/30 text-amber-400 bg-amber-500/20">{v.config.contentLength}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold border border-blue-500/30 text-blue-400 bg-blue-500/20">絵文字: {v.config.emojiUsage}</span>
                </div>
                <p className="text-sm font-bold">{v.content}</p>
                {v.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {v.hashtags.map((tag: string, j: number) => (
                      <span key={j} className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsPreviewOpen(false)} className="bg-emerald-500 hover:bg-emerald-500 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] text-white font-bold border border-white/[0.06] rounded-lg">
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analysis Result Dialog */}
      <Dialog open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto border border-white/[0.06] rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <BarChart3 className="h-5 w-5" />
              分析結果
            </DialogTitle>
            <DialogDescription className="font-bold text-neutral-500">
              A/Bテストの統計分析結果
            </DialogDescription>
          </DialogHeader>

          {analysisResult && (
            <div className="space-y-6">
              {/* Winner Section */}
              {analysisResult.winnerId ? (
                <div className="border border-emerald-500/30 rounded-lg p-4 bg-emerald-500/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="h-5 w-5 text-amber-400" />
                    <span className="font-bold text-white">勝者決定</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      信頼度: {analysisResult.confidence}%
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap font-bold text-white">{analysisResult.analysis}</p>
                </div>
              ) : (
                <div className="border border-amber-500/30 rounded-lg p-4 bg-amber-500/10">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <span className="font-bold">まだ十分なデータがありません</span>
                  </div>
                </div>
              )}

              {/* Statistical Analysis Section */}
              {analysisResult.statistics && (
                <div className="space-y-4">
                  <h4 className="font-bold flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    統計分析
                  </h4>

                  {/* Significance */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-white/[0.06] rounded-lg bg-neutral-900 p-3">
                      <div className="text-sm text-neutral-500 font-bold">統計的有意性</div>
                      <div className="flex items-center gap-2 mt-1">
                        {analysisResult.statistics.isStatisticallySignificant ? (
                          <>
                            <CheckCircle className="h-5 w-5 text-emerald-500" />
                            <span className="font-bold text-emerald-600">有意 (p &lt; 0.05)</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-5 w-5 text-neutral-500" />
                            <span className="font-bold text-neutral-500">有意差なし</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="border border-white/[0.06] rounded-lg bg-neutral-900 p-3">
                      <div className="text-sm text-neutral-500 font-bold">p値</div>
                      <div className="font-bold mt-1">
                        {analysisResult.statistics.pValue !== null
                          ? analysisResult.statistics.pValue.toFixed(4)
                          : "N/A"}
                      </div>
                    </div>

                    <div className="border border-white/[0.06] rounded-lg bg-neutral-900 p-3">
                      <div className="text-sm text-neutral-500 font-bold">効果量 (Cohen's d)</div>
                      <div className="font-bold mt-1">
                        {analysisResult.statistics.effectSize !== null
                          ? `${analysisResult.statistics.effectSize.toFixed(2)} (${analysisResult.statistics.effectSizeInterpretation})`
                          : "N/A"}
                      </div>
                    </div>

                    <div className="border border-white/[0.06] rounded-lg bg-neutral-900 p-3">
                      <div className="text-sm text-neutral-500 font-bold">信頼区間 (95%)</div>
                      <div className="font-bold mt-1">
                        {analysisResult.statistics.confidenceInterval
                          ? `[${analysisResult.statistics.confidenceInterval.lower.toFixed(2)}, ${analysisResult.statistics.confidenceInterval.upper.toFixed(2)}]`
                          : "N/A"}
                      </div>
                    </div>
                  </div>

                  {/* Sample Size Progress */}
                  <div className="border border-white/[0.06] rounded-lg bg-neutral-900 p-3">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm text-neutral-500 font-bold">サンプルサイズ</div>
                      <div className="text-sm font-bold">
                        {analysisResult.statistics.currentSampleSize} / {analysisResult.statistics.requiredSampleSize}
                      </div>
                    </div>
                    <Progress
                      value={Math.min(100, (analysisResult.statistics.currentSampleSize / analysisResult.statistics.requiredSampleSize) * 100)}
                      className="h-2"
                    />
                    {!analysisResult.statistics.sampleSizeAdequate && (
                      <div className="flex items-center gap-1 mt-2 text-sm text-amber-600 font-bold">
                        <AlertTriangle className="h-4 w-4" />
                        サンプルサイズが不足しています
                      </div>
                    )}
                  </div>

                  {/* Warnings */}
                  {analysisResult.statistics.warnings.length > 0 && (
                    <div className="border border-amber-500/30 rounded-lg p-3 bg-amber-500/10">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                        <span className="font-bold text-sm text-amber-400">警告</span>
                      </div>
                      <ul className="space-y-1">
                        {analysisResult.statistics.warnings.map((warning, i) => (
                          <li key={i} className="text-sm text-amber-400 font-bold">
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Adaptive Allocation Section */}
              {adaptiveData && adaptiveData.allocations.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-sky-400" />
                    適応配分
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                      Thompson Sampling
                    </span>
                  </h4>
                  <div className="border border-white/[0.06] rounded-lg bg-neutral-900 p-3 space-y-2">
                    <p className="text-[11px] text-neutral-500 font-bold">各バリエーションが最適である確率（モンテカルロシミュレーション）</p>
                    {adaptiveData.allocations.map((item) => (
                      <div key={item.variationId} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-neutral-300">バリエーション {item.variationName}</span>
                          <span className="text-sky-400">{item.allocation}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-sky-500 transition-all duration-500"
                            style={{ width: `${item.allocation}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsAnalysisOpen(false)} className="bg-emerald-500 hover:bg-emerald-500 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] text-white font-bold border border-white/[0.06] rounded-lg">
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
