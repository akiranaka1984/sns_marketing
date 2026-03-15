import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Bot,
  ArrowLeft,
  Play,
  Plus,
  Trash2,
  Brain,
  Shield,
  Link2,
  History,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  BarChart3,
  RefreshCw,
  Calendar
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import AutoOptimizationSettings from "@/components/AutoOptimizationSettings";

// Knowledge types with Japanese labels
const knowledgeTypes = [
  { value: "success_pattern", label: "成功パターン", icon: CheckCircle, color: "text-emerald-400" },
  { value: "failure_pattern", label: "失敗パターン", icon: XCircle, color: "text-rose-400" },
  { value: "content_template", label: "コンテンツテンプレート", icon: Lightbulb, color: "text-amber-400" },
  { value: "hashtag_strategy", label: "ハッシュタグ戦略", icon: Zap, color: "text-sky-400" },
  { value: "timing_insight", label: "タイミングの知見", icon: Clock, color: "text-blue-400" },
  { value: "audience_insight", label: "オーディエンスの知見", icon: Bot, color: "text-rose-400" },
  { value: "engagement_tactic", label: "エンゲージメント戦術", icon: Zap, color: "text-amber-400" },
  { value: "general", label: "一般的な知見", icon: Brain, color: "text-neutral-500" },
];

// Rule types with Japanese labels
const ruleTypes = [
  { value: "forbidden_word", label: "禁止ワード" },
  { value: "required_element", label: "必須要素" },
  { value: "content_limit", label: "コンテンツ制限" },
  { value: "posting_limit", label: "投稿制限" },
  { value: "time_restriction", label: "時間制限" },
  { value: "platform_specific", label: "プラットフォーム固有" },
  { value: "tone_guideline", label: "トーンガイドライン" },
  { value: "custom", label: "カスタム" },
];

export default function AgentDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const agentId = parseInt(params.id || "0");

  // Dialog states
  const [isAddKnowledgeOpen, setIsAddKnowledgeOpen] = useState(false);
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [isLinkAccountOpen, setIsLinkAccountOpen] = useState(false);

  // Form states
  const [knowledgeForm, setKnowledgeForm] = useState({
    knowledgeType: "general" as const,
    title: "",
    content: "",
    confidence: 50,
  });

  const [ruleForm, setRuleForm] = useState({
    ruleType: "forbidden_word" as const,
    ruleName: "",
    ruleValue: "",
    priority: 50,
  });

  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // Queries
  const { data: agent, isLoading: agentLoading } = trpc.agents.getById.useQuery(
    { id: agentId },
    { enabled: agentId > 0 }
  );

  const { data: knowledge = [] } = trpc.agents.getKnowledge.useQuery(
    { agentId },
    { enabled: agentId > 0 }
  );

  const { data: rules = [] } = trpc.agents.getRules.useQuery(
    { agentId },
    { enabled: agentId > 0 }
  );

  const { data: linkedAccounts = [] } = trpc.agents.getLinkedAccounts.useQuery(
    { agentId },
    { enabled: agentId > 0 }
  );

  const { data: executionLogs = [] } = trpc.agents.getExecutionLogs.useQuery(
    { agentId, limit: 20 },
    { enabled: agentId > 0 }
  );

  const { data: collectorStatus } = trpc.engagementCollector.getStatus.useQuery();

  const { data: allAccounts = [] } = trpc.accounts.list.useQuery();

  // Mutations
  // Engagement collector mutations
  const collectAllMutation = trpc.engagementCollector.collectAll.useMutation({
    onSuccess: (result) => {
      toast.success(`エンゲージメント収集完了: ${result.success}/${result.total}件成功`);
      utils.agents.getKnowledge.invalidate({ agentId });
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    },
  });

  const updateConfidenceMutation = trpc.engagementCollector.updateConfidence.useMutation({
    onSuccess: () => {
      toast.success("知見の信頼度を更新しました");
      utils.agents.getKnowledge.invalidate({ agentId });
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    },
  });

  const startCollectorMutation = trpc.engagementCollector.startCollector.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("自動収集を開始しました");
      } else {
        toast.info(result.message);
      }
      utils.engagementCollector.getStatus.invalidate();
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    },
  });

  const stopCollectorMutation = trpc.engagementCollector.stopCollector.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("自動収集を停止しました");
      } else {
        toast.info(result.message);
      }
      utils.engagementCollector.getStatus.invalidate();
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    },
  });

  const generateScheduledPostsMutation = trpc.agentScheduledPosts.generate.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`${result.postsCreated}件のスケジュール投稿を生成しました`);
        utils.agents.getExecutionLogs.invalidate({ agentId });
      } else {
        toast.error("スケジュール投稿の生成に失敗しました: " + result.error);
      }
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    },
  });

  const runAgentMutation = trpc.agents.run.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("エージェントが実行されました。投稿ID: " + result.postId);
        utils.agents.getExecutionLogs.invalidate({ agentId });
      } else {
        toast.error("実行に失敗しました: " + result.error);
      }
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    },
  });

  const addKnowledgeMutation = trpc.agents.addKnowledge.useMutation({
    onSuccess: () => {
      toast.success("知見が追加されました。");
      utils.agents.getKnowledge.invalidate({ agentId });
      setIsAddKnowledgeOpen(false);
      setKnowledgeForm({ knowledgeType: "general", title: "", content: "", confidence: 50 });
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    },
  });

  const deleteKnowledgeMutation = trpc.agents.deleteKnowledge.useMutation({
    onSuccess: () => {
      toast.success("知見が削除されました。");
      utils.agents.getKnowledge.invalidate({ agentId });
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    },
  });

  const addRuleMutation = trpc.agents.addRule.useMutation({
    onSuccess: () => {
      toast.success("ルールが追加されました。");
      utils.agents.getRules.invalidate({ agentId });
      setIsAddRuleOpen(false);
      setRuleForm({ ruleType: "forbidden_word", ruleName: "", ruleValue: "", priority: 50 });
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    },
  });

  const deleteRuleMutation = trpc.agents.deleteRule.useMutation({
    onSuccess: () => {
      toast.success("ルールが削除されました。");
      utils.agents.getRules.invalidate({ agentId });
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    },
  });

  const linkAccountMutation = trpc.agents.linkAccount.useMutation({
    onSuccess: () => {
      toast.success("アカウントがリンクされました。");
      utils.agents.getLinkedAccounts.invalidate({ agentId });
      setIsLinkAccountOpen(false);
      setSelectedAccountId(null);
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    },
  });

  const unlinkAccountMutation = trpc.agents.unlinkAccount.useMutation({
    onSuccess: () => {
      toast.success("アカウントのリンクが解除されました。");
      utils.agents.getLinkedAccounts.invalidate({ agentId });
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    },
  });

  const consolidateMutation = trpc.agents.consolidate.useMutation({
    onSuccess: () => {
      toast.success("知見の統合が完了しました。");
      utils.agents.getKnowledge.invalidate({ agentId });
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    },
  });

  if (agentLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-neutral-500 font-bold text-lg">読み込み中...</div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h1 className="text-2xl font-black text-white mb-4">エージェントが見つかりません</h1>
          <Button
            className="bg-emerald-500 text-white border border-white/[0.06] font-bold rounded-lg hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            onClick={() => setLocation("/agents")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            エージェント一覧に戻る
          </Button>
        </div>
      </div>
    );
  }

  const getKnowledgeTypeInfo = (type: string) => {
    return knowledgeTypes.find(k => k.value === type) || knowledgeTypes[knowledgeTypes.length - 1];
  };

  const getRuleTypeLabel = (type: string) => {
    return ruleTypes.find(r => r.value === type)?.label || type;
  };

  // Available accounts (not already linked)
  const linkedAccountIds = linkedAccounts.map((la: any) => la.accountId);
  const availableAccounts = allAccounts.filter((a: any) => !linkedAccountIds.includes(a.id));

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          className="bg-neutral-950 text-white border border-white/[0.06] font-bold rounded-lg hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-neutral-900 transition-all"
          onClick={() => setLocation("/agents")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-2">
              <Bot className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">{agent.name}</h1>
              <p className="text-neutral-500 font-bold">{agent.theme}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            className="bg-teal-500/20 text-teal-400 border border-teal-500/30 font-bold rounded-lg hover:bg-teal-500/30 transition-all"
            onClick={() => generateScheduledPostsMutation.mutate({ agentId, count: 5 })}
            disabled={generateScheduledPostsMutation.isPending || linkedAccounts.length === 0}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {generateScheduledPostsMutation.isPending ? "生成中..." : "スケジュール投稿を生成"}
          </Button>
          <Button
            className="bg-emerald-500 text-white border border-white/[0.06] font-bold rounded-lg hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            onClick={() => runAgentMutation.mutate({ agentId })}
            disabled={runAgentMutation.isPending || linkedAccounts.length === 0}
          >
            <Play className="mr-2 h-4 w-4" />
            {runAgentMutation.isPending ? "実行中..." : "今すぐ実行"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-neutral-950 border border-white/[0.06] rounded-lg p-6 transition-all">
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-white" />
            <div>
              <p className="text-3xl font-black text-white">{agent.knowledgeCount || 0}</p>
              <p className="text-sm font-bold text-white">蓄積された知見</p>
            </div>
          </div>
        </div>
        <div className="bg-neutral-950 border border-white/[0.06] rounded-lg p-6 transition-all">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-white" />
            <div>
              <p className="text-3xl font-black text-white">{agent.rulesCount || 0}</p>
              <p className="text-sm font-bold text-white">設定されたルール</p>
            </div>
          </div>
        </div>
        <div className="bg-neutral-950 border border-white/[0.06] rounded-lg p-6 transition-all">
          <div className="flex items-center gap-3">
            <Link2 className="h-6 w-6 text-white" />
            <div>
              <p className="text-3xl font-black text-white">{linkedAccounts.length}</p>
              <p className="text-sm font-bold text-white">リンクされたアカウント</p>
            </div>
          </div>
        </div>
        <div className="bg-neutral-950 border border-white/[0.06] rounded-lg p-6 transition-all">
          <div className="flex items-center gap-3">
            <History className="h-6 w-6 text-white" />
            <div>
              <p className="text-3xl font-black text-white">{executionLogs.length}</p>
              <p className="text-sm font-bold text-white">実行履歴</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="knowledge" className="space-y-4">
        <TabsList className="bg-neutral-950 border border-white/[0.06] rounded-lg p-1 gap-1">
          <TabsTrigger value="knowledge" className="font-bold text-white rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:border-2 data-[state=active]:border-white/[0.06] data-[state=active]:">
            <Brain className="mr-2 h-4 w-4" />
            知見
          </TabsTrigger>
          <TabsTrigger value="rules" className="font-bold text-white rounded-lg data-[state=active]:bg-neutral-800 data-[state=active]:border data-[state=active]:border-white/[0.06]">
            <Shield className="mr-2 h-4 w-4" />
            ルール
          </TabsTrigger>
          <TabsTrigger value="accounts" className="font-bold text-white rounded-lg data-[state=active]:bg-neutral-800 data-[state=active]:border data-[state=active]:border-white/[0.06]">
            <Link2 className="mr-2 h-4 w-4" />
            アカウント
          </TabsTrigger>
          <TabsTrigger value="logs" className="font-bold text-white rounded-lg data-[state=active]:bg-neutral-800 data-[state=active]:border data-[state=active]:border-white/[0.06]">
            <History className="mr-2 h-4 w-4" />
            実行履歴
          </TabsTrigger>
          <TabsTrigger value="engagement" className="font-bold text-white rounded-lg data-[state=active]:bg-neutral-800 data-[state=active]:border data-[state=active]:border-white/[0.06]">
            <BarChart3 className="mr-2 h-4 w-4" />
            エンゲージメント
          </TabsTrigger>
          <TabsTrigger value="optimization" className="font-bold text-white rounded-lg data-[state=active]:bg-neutral-800 data-[state=active]:border data-[state=active]:border-white/[0.06]">
            <Zap className="mr-2 h-4 w-4" />
            AI最適化
          </TabsTrigger>
        </TabsList>

        {/* Knowledge Tab */}
        <TabsContent value="knowledge">
          <div className="bg-neutral-950 border border-white/[0.06] rounded-lg">
            <div className="p-6 border-b-2 border-white/[0.06]">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-white">蓄積された知見</h3>
                  <p className="text-neutral-500 font-bold text-sm mt-1">
                    エージェントが学習した成功パターン、失敗パターン、コンテンツテンプレートなど
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="bg-teal-500/20 text-teal-400 border border-teal-500/30 font-bold rounded-lg hover:bg-teal-500/30 transition-all"
                    onClick={() => consolidateMutation.mutate({ agentId })}
                    disabled={consolidateMutation.isPending}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    知見を統合
                  </Button>
                  <Button
                    className="bg-emerald-500 text-white border border-white/[0.06] font-bold rounded-lg hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    onClick={() => setIsAddKnowledgeOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    知見を追加
                  </Button>
                </div>
              </div>
            </div>
            <div className="p-6">
              {knowledge.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 font-bold border border-dashed border-white/[0.06] rounded-lg bg-neutral-900">
                  まだ知見がありません。エージェントを実行すると自動的に学習します。
                </div>
              ) : (
                <div className="space-y-4">
                  {knowledge.map((k: any) => {
                    const typeInfo = getKnowledgeTypeInfo(k.knowledgeType);
                    const TypeIcon = typeInfo.icon;
                    return (
                      <div key={k.id} className="border border-white/[0.06] rounded-lg p-4 bg-neutral-950 hover:bg-neutral-900 transition-all">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <TypeIcon className={`h-5 w-5 mt-1 ${typeInfo.color}`} />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-white">{k.title}</h4>
                                <span className="inline-flex items-center px-2 py-0.5 border border-sky-500/30 rounded-lg text-xs font-bold bg-sky-500/20 text-sky-400">{typeInfo.label}</span>
                                <span className="inline-flex items-center px-2 py-0.5 border border-blue-500/30 rounded-lg text-xs font-bold bg-blue-500/20 text-blue-400">信頼度: {k.confidence}%</span>
                              </div>
                              <p className="text-sm text-neutral-500 font-bold mt-1">{k.content}</p>
                              {k.usageCount > 0 && (
                                <p className="text-xs text-neutral-500 font-bold mt-2">
                                  使用回数: {k.usageCount} | 成功率: {k.successRate}%
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            className="bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-500/30 transition-all h-8 w-8 p-0"
                            onClick={() => deleteKnowledgeMutation.mutate({ id: k.id })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules">
          <div className="bg-neutral-950 border border-white/[0.06] rounded-lg">
            <div className="p-6 border-b-2 border-white/[0.06]">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-white">ルール設定</h3>
                  <p className="text-neutral-500 font-bold text-sm mt-1">
                    エージェントの行動を制御するルールと制約
                  </p>
                </div>
                <Button
                  className="bg-emerald-500 text-white border border-white/[0.06] font-bold rounded-lg hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                  onClick={() => setIsAddRuleOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  ルールを追加
                </Button>
              </div>
            </div>
            <div className="p-6">
              {rules.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 font-bold border border-dashed border-white/[0.06] rounded-lg bg-neutral-900">
                  まだルールが設定されていません。
                </div>
              ) : (
                <div className="space-y-4">
                  {rules.map((r: any) => (
                    <div key={r.id} className="border border-white/[0.06] rounded-lg p-4 bg-neutral-950 hover:bg-neutral-900 transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-white">{r.ruleName}</h4>
                            <span className="inline-flex items-center px-2 py-0.5 border border-amber-500/30 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-400">{getRuleTypeLabel(r.ruleType)}</span>
                            <span className="inline-flex items-center px-2 py-0.5 border border-teal-500/30 rounded-lg text-xs font-bold bg-teal-500/20 text-teal-400">優先度: {r.priority}</span>
                          </div>
                          <p className="text-sm text-neutral-500 font-bold mt-1">{r.ruleValue}</p>
                        </div>
                        <Button
                          className="bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-500/30 transition-all h-8 w-8 p-0"
                          onClick={() => deleteRuleMutation.mutate({ id: r.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts">
          <div className="bg-neutral-950 border border-white/[0.06] rounded-lg">
            <div className="p-6 border-b-2 border-white/[0.06]">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-white">リンクされたアカウント</h3>
                  <p className="text-neutral-500 font-bold text-sm mt-1">
                    このエージェントが投稿に使用するSNSアカウント
                  </p>
                </div>
                <Button
                  className="bg-emerald-500 text-white border border-white/[0.06] font-bold rounded-lg hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                  onClick={() => setIsLinkAccountOpen(true)}
                  disabled={availableAccounts.length === 0}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  アカウントをリンク
                </Button>
              </div>
            </div>
            <div className="p-6">
              {linkedAccounts.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-amber-500/30 rounded-lg bg-amber-500/10">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-white" />
                  <p className="font-bold text-white">アカウントがリンクされていません。</p>
                  <p className="text-sm font-bold text-neutral-500">エージェントを実行するにはアカウントをリンクしてください。</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {linkedAccounts.map((la: any) => (
                    <div key={la.id} className="border border-white/[0.06] rounded-lg p-4 bg-neutral-950 hover:bg-neutral-900 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center px-2 py-0.5 border border-sky-500/30 rounded-lg text-xs font-bold bg-sky-500/20 text-sky-400">{la.account?.platform}</span>
                          <span className="font-bold text-white">@{la.account?.username}</span>
                          {la.account?.deviceId && (
                            <span className="text-sm font-bold text-neutral-500">
                              デバイス: {la.account.deviceId}
                            </span>
                          )}
                        </div>
                        <Button
                          className="bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-500/30 transition-all h-8 w-8 p-0"
                          onClick={() => unlinkAccountMutation.mutate({
                            agentId,
                            accountId: la.accountId
                          })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <div className="bg-neutral-950 border border-white/[0.06] rounded-lg">
            <div className="p-6 border-b-2 border-white/[0.06]">
              <h3 className="text-xl font-black text-white">実行履歴</h3>
              <p className="text-neutral-500 font-bold text-sm mt-1">
                エージェントの実行ログと結果
              </p>
            </div>
            <div className="p-6">
              {executionLogs.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 font-bold border border-dashed border-white/[0.06] rounded-lg bg-neutral-900">
                  まだ実行履歴がありません。
                </div>
              ) : (
                <div className="space-y-4">
                  {executionLogs.map((log: any) => (
                    <div key={log.id} className="border border-white/[0.06] rounded-lg p-4 bg-neutral-950 hover:bg-neutral-900 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {log.status === "success" ? (
                            <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg p-1">
                              <CheckCircle className="h-5 w-5 text-white" />
                            </div>
                          ) : log.status === "failed" ? (
                            <div className="bg-rose-500/20 border border-rose-500/30 rounded-lg p-1">
                              <XCircle className="h-5 w-5 text-white" />
                            </div>
                          ) : (
                            <div className="bg-emerald-500 border border-white/[0.06] rounded-lg p-1">
                              <Clock className="h-5 w-5 text-white" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-white">
                              {log.executionType === "content_generation" && "コンテンツ生成"}
                              {log.executionType === "post_execution" && "投稿実行"}
                              {log.executionType === "learning" && "学習"}
                              {log.executionType === "analysis" && "分析"}
                              {log.executionType === "optimization" && "最適化"}
                            </p>
                            <p className="text-sm font-bold text-neutral-500">
                              {new Date(log.createdAt).toLocaleString("ja-JP")}
                              {log.executionTimeMs && ` (${log.executionTimeMs}ms)`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {log.postId && (
                            <span className="inline-flex items-center px-2 py-0.5 border border-sky-500/30 rounded-lg text-xs font-bold bg-sky-500/20 text-sky-400">投稿ID: {log.postId}</span>
                          )}
                          {log.errorMessage && (
                            <p className="text-sm font-bold text-rose-400 mt-1">{log.errorMessage}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement">
          <div className="bg-neutral-950 border border-white/[0.06] rounded-lg">
            <div className="p-6 border-b-2 border-white/[0.06]">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-white">エンゲージメント収集</h3>
                  <p className="text-neutral-500 font-bold text-sm mt-1">
                    投稿のエンゲージメント（いいね数・コメント数など）を自動収集し、知見の精度を向上させます
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="bg-teal-500/20 text-teal-400 border border-teal-500/30 font-bold rounded-lg hover:bg-teal-500/30 transition-all"
                    onClick={() => collectAllMutation.mutate()}
                    disabled={collectAllMutation.isPending}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${collectAllMutation.isPending ? 'animate-spin' : ''}`} />
                    今すぐ収集
                  </Button>
                  <Button
                    className="bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold rounded-lg hover:bg-blue-500/30 transition-all"
                    onClick={() => updateConfidenceMutation.mutate({ agentId })}
                    disabled={updateConfidenceMutation.isPending}
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    信頼度更新
                  </Button>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {/* Auto Collection Status */}
                <div className="border border-white/[0.06] rounded-lg p-4 bg-neutral-950">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white">自動収集スケジューラー</h4>
                      <p className="text-sm font-bold text-neutral-500">
                        投稿後1時間、6時間、24時間、48時間で自動的にエンゲージメントを収集します
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold ${collectorStatus?.isRunning ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-neutral-900 text-neutral-400 border border-white/[0.06]'}`}>
                        {collectorStatus?.isRunning ? "実行中" : "停止中"}
                      </span>
                      {collectorStatus?.isRunning ? (
                        <Button
                          className="bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold rounded-lg hover:bg-rose-500/30 transition-all"
                          onClick={() => stopCollectorMutation.mutate()}
                          disabled={stopCollectorMutation.isPending}
                        >
                          停止
                        </Button>
                      ) : (
                        <Button
                          className="bg-emerald-500 text-white border border-white/[0.06] font-bold rounded-lg hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                          onClick={() => startCollectorMutation.mutate()}
                          disabled={startCollectorMutation.isPending}
                        >
                          開始
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Collection Schedule Info */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="border border-white/[0.06] rounded-lg p-4 text-center bg-neutral-950 transition-all">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-white" />
                    <p className="font-black text-white">1時間後</p>
                    <p className="text-sm font-bold text-white">初期反応を取得</p>
                  </div>
                  <div className="border border-white/[0.06] rounded-lg p-4 text-center bg-neutral-950 transition-all">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-white" />
                    <p className="font-black text-white">6時間後</p>
                    <p className="text-sm font-bold text-white">中間反応を取得</p>
                  </div>
                  <div className="border border-white/[0.06] rounded-lg p-4 text-center bg-neutral-950 transition-all">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-white" />
                    <p className="font-black text-white">24時間後</p>
                    <p className="text-sm font-bold text-white">知見生成開始</p>
                  </div>
                  <div className="border border-white/[0.06] rounded-lg p-4 text-center bg-neutral-950 transition-all">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-white" />
                    <p className="font-black text-white">48時間後</p>
                    <p className="text-sm font-bold text-white">最終分析</p>
                  </div>
                </div>

                {/* How it works */}
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                  <h4 className="font-black text-white mb-2">エンゲージメント収集の仕組み</h4>
                  <ul className="text-sm font-bold text-white space-y-2">
                    <li>・ 投稿後、設定された時間に自動でエンゲージメントを取得します</li>
                    <li>・ 取得したデータは投稿のパフォーマンス分析に使用されます</li>
                    <li>・ 高パフォーマンスの投稿から成功パターンを抽出し、知見として蓄積します</li>
                    <li>・ 低パフォーマンスの投稿からは失敗パターンを学習し、改善に活かします</li>
                    <li>・ 知見の信頼度は、実際の投稿結果に基づいて自動的に更新されます</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Optimization Tab */}
        <TabsContent value="optimization">
          <AutoOptimizationSettings agentId={agentId} />
        </TabsContent>
      </Tabs>

      {/* Add Knowledge Dialog */}
      <Dialog open={isAddKnowledgeOpen} onOpenChange={setIsAddKnowledgeOpen}>
        <DialogContent className="bg-neutral-950 border border-white/[0.06] rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-white">知見を追加</DialogTitle>
            <DialogDescription className="text-neutral-500 font-bold">
              エージェントに新しい知見を教えます
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-bold text-white">知見タイプ</Label>
              <Select
                value={knowledgeForm.knowledgeType}
                onValueChange={(v: any) => setKnowledgeForm({ ...knowledgeForm, knowledgeType: v })}
              >
                <SelectTrigger className="border border-white/[0.06] rounded-lg font-bold bg-neutral-950 focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px] transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border border-white/[0.06] rounded-lg bg-neutral-950">
                  {knowledgeTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="font-bold hover:bg-neutral-900">
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-bold text-white">タイトル</Label>
              <Input
                className="border border-white/[0.06] rounded-lg font-bold bg-neutral-950 focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px] transition-all"
                value={knowledgeForm.title}
                onChange={(e) => setKnowledgeForm({ ...knowledgeForm, title: e.target.value })}
                placeholder="例: 朝の投稿は反応が良い"
              />
            </div>
            <div>
              <Label className="font-bold text-white">内容</Label>
              <Textarea
                className="border border-white/[0.06] rounded-lg font-bold bg-neutral-950 focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px] transition-all"
                value={knowledgeForm.content}
                onChange={(e) => setKnowledgeForm({ ...knowledgeForm, content: e.target.value })}
                placeholder="詳細な説明を入力..."
                rows={4}
              />
            </div>
            <div>
              <Label className="font-bold text-white">信頼度 ({knowledgeForm.confidence}%)</Label>
              <Input
                className="border border-white/[0.06] rounded-lg accent-emerald-500"
                type="range"
                min="0"
                max="100"
                value={knowledgeForm.confidence}
                onChange={(e) => setKnowledgeForm({ ...knowledgeForm, confidence: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              className="bg-neutral-950 text-white border border-white/[0.06] font-bold rounded-lg hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-neutral-900 transition-all"
              onClick={() => setIsAddKnowledgeOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              className="bg-emerald-500 text-white border border-white/[0.06] font-bold rounded-lg hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              onClick={() => addKnowledgeMutation.mutate({ agentId, ...knowledgeForm })}
              disabled={!knowledgeForm.title || !knowledgeForm.content}
            >
              追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Rule Dialog */}
      <Dialog open={isAddRuleOpen} onOpenChange={setIsAddRuleOpen}>
        <DialogContent className="bg-neutral-950 border border-white/[0.06] rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-white">ルールを追加</DialogTitle>
            <DialogDescription className="text-neutral-500 font-bold">
              エージェントの行動を制御するルールを設定します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-bold text-white">ルールタイプ</Label>
              <Select
                value={ruleForm.ruleType}
                onValueChange={(v: any) => setRuleForm({ ...ruleForm, ruleType: v })}
              >
                <SelectTrigger className="border border-white/[0.06] rounded-lg font-bold bg-neutral-950 focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px] transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border border-white/[0.06] rounded-lg bg-neutral-950">
                  {ruleTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="font-bold hover:bg-neutral-900">
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-bold text-white">ルール名</Label>
              <Input
                className="border border-white/[0.06] rounded-lg font-bold bg-neutral-950 focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px] transition-all"
                value={ruleForm.ruleName}
                onChange={(e) => setRuleForm({ ...ruleForm, ruleName: e.target.value })}
                placeholder="例: 競合他社名の使用禁止"
              />
            </div>
            <div>
              <Label className="font-bold text-white">ルール値</Label>
              <Textarea
                className="border border-white/[0.06] rounded-lg font-bold bg-neutral-950 focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px] transition-all"
                value={ruleForm.ruleValue}
                onChange={(e) => setRuleForm({ ...ruleForm, ruleValue: e.target.value })}
                placeholder="例: 「A社」「B社」という単語を使用しない"
                rows={4}
              />
            </div>
            <div>
              <Label className="font-bold text-white">優先度 ({ruleForm.priority})</Label>
              <Input
                className="border border-white/[0.06] rounded-lg accent-emerald-500"
                type="range"
                min="0"
                max="100"
                value={ruleForm.priority}
                onChange={(e) => setRuleForm({ ...ruleForm, priority: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              className="bg-neutral-950 text-white border border-white/[0.06] font-bold rounded-lg hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-neutral-900 transition-all"
              onClick={() => setIsAddRuleOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              className="bg-emerald-500 text-white border border-white/[0.06] font-bold rounded-lg hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              onClick={() => addRuleMutation.mutate({ agentId, ...ruleForm })}
              disabled={!ruleForm.ruleName || !ruleForm.ruleValue}
            >
              追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Account Dialog */}
      <Dialog open={isLinkAccountOpen} onOpenChange={setIsLinkAccountOpen}>
        <DialogContent className="bg-neutral-950 border border-white/[0.06] rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-white">アカウントをリンク</DialogTitle>
            <DialogDescription className="text-neutral-500 font-bold">
              エージェントが投稿に使用するアカウントを選択します。Playwrightブラウザ自動化で投稿が実行されます。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-bold text-white">アカウント</Label>
              <Select
                value={selectedAccountId?.toString() || ""}
                onValueChange={(v) => setSelectedAccountId(parseInt(v))}
              >
                <SelectTrigger className="border border-white/[0.06] rounded-lg font-bold bg-neutral-950 focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px] transition-all">
                  <SelectValue placeholder="アカウントを選択..." />
                </SelectTrigger>
                <SelectContent className="border border-white/[0.06] rounded-lg bg-neutral-950">
                  {availableAccounts.map((account: any) => (
                    <SelectItem key={account.id} value={account.id.toString()} className="font-bold hover:bg-neutral-900">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white">{account.platform}</span>
                        <span className="font-bold">@{account.username}</span>
                        {account.deviceId ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 border border-sky-500/30 rounded-lg text-xs font-bold bg-sky-500/20 text-sky-400 ml-2">
                            デバイス: {account.deviceId.slice(0, 8)}...
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 border border-rose-500/30 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-400 ml-2">
                            デバイス未設定
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAccountId && !availableAccounts.find((a: any) => a.id === selectedAccountId)?.deviceId && (
                <p className="text-sm font-bold text-rose-400 mt-2">
                  ※ このアカウントにはPlaywrightセッションが設定されていません。アカウント詳細ページで設定を行ってください。
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              className="bg-neutral-950 text-white border border-white/[0.06] font-bold rounded-lg hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-neutral-900 transition-all"
              onClick={() => setIsLinkAccountOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              className="bg-emerald-500 text-white border border-white/[0.06] font-bold rounded-lg hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              onClick={() => selectedAccountId && linkAccountMutation.mutate({ agentId, accountId: selectedAccountId })}
              disabled={!selectedAccountId}
            >
              リンク
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
