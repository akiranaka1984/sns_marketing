import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft, Calendar, Activity, Loader2, Info,
  Edit2, Save, X, RefreshCw, User, BookOpen, Users2, LayoutDashboard, Sparkles, Bot,
  Monitor, Shield, ShieldCheck, ShieldAlert, ShieldX, LogIn, Trash2, Eye, Zap,
  Link2, Unlink, AlertTriangle
} from "lucide-react";
import { useState } from "react";
import BrowserPreviewDialog from "@/components/BrowserPreviewDialog";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import AccountLevelCard from "@/components/AccountLevelCard";
import AccountLearningsTab from "@/components/AccountLearningsTab";
import AccountPersonaTab from "@/components/AccountPersonaTab";
import AccountModelAccountsTab from "@/components/AccountModelAccountsTab";
import AccountProfileTab from "@/components/AccountProfileTab";
import AccountAgentsTab from "@/components/AccountAgentsTab";

function SessionStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; border: string; icon: typeof ShieldCheck; label: string }> = {
    active: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30", icon: ShieldCheck, label: "Active" },
    expired: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30", icon: ShieldAlert, label: "Expired" },
    needs_login: { bg: "bg-rose-500/20", text: "text-rose-400", border: "border-rose-500/30", icon: ShieldX, label: "Needs Login" },
  };
  const { bg, text, border, icon: Icon, label } = config[status] || config.needs_login;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${bg} ${text} border ${border}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

export default function AccountDetail() {
  const { t } = useI18n();
  const [, params] = useRoute("/accounts/:id");
  const accountId = params?.id ? parseInt(params.id) : 0;
  const [isEditingXHandle, setIsEditingXHandle] = useState(false);
  const [xHandleInput, setXHandleInput] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [previewOpen, setPreviewOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: account, isLoading } = trpc.accounts.byId.useQuery(
    { id: accountId },
    { refetchInterval: 60000 }
  );

  const { data: growthStats } = trpc.accounts.growthStats.useQuery(
    { accountId },
    { enabled: !!accountId }
  );

  // Playwright session hooks
  const { data: sessionStatus, refetch: refetchSession } = trpc.playwrightSession.getStatus.useQuery(
    { accountId },
    { enabled: !!accountId, refetchInterval: 30000 }
  );

  const loginMutation = trpc.playwrightSession.login.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("X.comログイン成功");
      } else {
        toast.error(result.message);
      }
      refetchSession();
      utils.accounts.byId.invalidate({ id: accountId });
      // Auto-close preview after 2 seconds
      setTimeout(() => setPreviewOpen(false), 2000);
    },
    onError: (error) => {
      toast.error(`ログイン失敗: ${error.message}`);
      setTimeout(() => setPreviewOpen(false), 2000);
    },
  });

  const healthCheckMutation = trpc.playwrightSession.checkHealth.useMutation({
    onSuccess: (result) => {
      if (result.healthy) {
        toast.success("セッションは有効です");
      } else {
        toast.warning(`セッション状態: ${result.status}`);
      }
      refetchSession();
      setTimeout(() => setPreviewOpen(false), 2000);
    },
    onError: (error) => {
      toast.error(`ヘルスチェック失敗: ${error.message}`);
      setTimeout(() => setPreviewOpen(false), 2000);
    },
  });

  const testPreviewMutation = trpc.playwrightSession.testPreview.useMutation({
    onSuccess: () => {
      toast.success("テストプレビュー完了");
      // Don't auto-close — let the user close the modal manually
    },
    onError: (error) => {
      toast.error(`テストプレビュー失敗: ${error.message}`);
    },
  });

  const deleteSessionMutation = trpc.playwrightSession.deleteSession.useMutation({
    onSuccess: () => {
      toast.success("セッションを削除しました");
      refetchSession();
    },
    onError: (error) => {
      toast.error(`セッション削除失敗: ${error.message}`);
    },
  });

  const updateAccountMutation = trpc.accounts.update.useMutation({
    onSuccess: () => {
      toast.success("X Handleを更新しました");
      setIsEditingXHandle(false);
      utils.accounts.byId.invalidate({ id: accountId });
    },
    onError: (error) => {
      toast.error(`更新失敗: ${error.message}`);
    },
  });

  const updatePostingMethodMutation = trpc.accounts.update.useMutation({
    onSuccess: () => {
      toast.success("投稿方式を変更しました");
      utils.accounts.byId.invalidate({ id: accountId });
    },
    onError: () => {
      toast.error("投稿方式の変更に失敗しました。しばらく待ってから再試行してください。");
    },
  });

  const syncGrowthMutation = trpc.accounts.syncGrowth.useMutation({
    onSuccess: (result) => {
      toast.success(`成長データを同期しました: ${result.learningsCount}件の学習、${result.totalXP} XP`);
      utils.accounts.growthStats.invalidate({ accountId });
    },
    onError: (error) => {
      toast.error(`同期失敗: ${error.message}`);
    },
  });

  // OAuth hooks
  const { data: oauthStatus } = trpc.accountOAuth.getOAuthStatus.useQuery(
    { accountId },
    { enabled: !!accountId }
  );

  const startOAuthMutation = trpc.accountOAuth.startOAuthFlow.useMutation({
    onSuccess: (result) => {
      window.open(result.authUrl, '_blank', 'width=600,height=700');
    },
    onError: (error) => {
      toast.error(`OAuth開始失敗: ${error.message}`);
    },
  });

  const disconnectMutation = trpc.accountOAuth.disconnectAccount.useMutation({
    onSuccess: () => {
      toast.success("連携を解除しました");
      utils.accountOAuth.getOAuthStatus.invalidate({ accountId });
    },
    onError: (error) => {
      toast.error(`連携解除失敗: ${error.message}`);
    },
  });

  const handleEditXHandle = () => {
    setXHandleInput(account?.xHandle || "");
    setIsEditingXHandle(true);
  };

  const handleSaveXHandle = () => {
    updateAccountMutation.mutate({
      accountId,
      xHandle: xHandleInput.trim(),
    });
  };

  const handleCancelEdit = () => {
    setIsEditingXHandle(false);
    setXHandleInput("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          <span className="text-sm text-neutral-500 font-bold">Loading account...</span>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="max-w-5xl">
        <div className="bg-neutral-950 rounded-lg border border-white/[0.06] p-8 text-center">
          <p className="text-neutral-500 font-bold mb-4">Account not found</p>
          <Button asChild size="sm" className="bg-emerald-500 hover:bg-emerald-500 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] text-white font-bold border border-white/[0.06] rounded-lg">
            <Link href="/accounts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('accountDetail.backToAccounts')}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const currentSessionStatus = sessionStatus?.sessionStatus || account.sessionStatus || 'needs_login';

  return (
    <div className="max-w-5xl space-y-5">
      {/* Back + Header */}
      <div className="fade-in-up">
        <Link href="/accounts">
          <button className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-white transition-colors mb-4 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-neutral-950 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Accounts
          </button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">Account Detail</p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              @{account.username}
            </h1>
            <p className="text-sm text-neutral-500 font-bold capitalize mt-0.5">
              {t('accounts.platform.' + account.platform)} Account
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-white border border-white/[0.06] ${
              account.postingMethod === 'api_v2' ? 'bg-teal-500/20 border border-teal-500/30' : 'bg-blue-500/20 border border-blue-500/30'
            }`}>
              {account.postingMethod === 'api_v2' ? (
                <><Zap className="w-3.5 h-3.5" />API v2</>
              ) : (
                <><Monitor className="w-3.5 h-3.5" />Playwright</>
              )}
            </span>
            {/* Status badge */}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border border-white/[0.06] ${
              account.status === 'active'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : account.status === 'pending'
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
            }`}>
              {account.status}
            </span>
          </div>
        </div>
      </div>

      {/* Level Card */}
      {growthStats && (
        <div className="fade-in-up" style={{ animationDelay: '80ms' }}>
          <AccountLevelCard
            level={growthStats.level}
            experiencePoints={growthStats.experiencePoints}
            currentLevelXP={growthStats.currentLevelXP}
            requiredXP={growthStats.requiredXP}
            progressPercent={growthStats.progressPercent}
            totalLearningsCount={growthStats.totalLearningsCount}
            learningsByType={growthStats.learningsByType}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="fade-in-up" style={{ animationDelay: '160ms' }}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex items-center gap-1 p-1 bg-neutral-950 border border-white/[0.06] rounded-lg w-fit">
            {[
              { value: "overview", icon: LayoutDashboard, label: "概要" },
              { value: "session", icon: Shield, label: "セッション" },
              { value: "learnings", icon: BookOpen, label: "学習" },
              { value: "persona", icon: User, label: "ペルソナ" },
              { value: "model-accounts", icon: Users2, label: "モデル" },
              { value: "profile", icon: Sparkles, label: "プロフィール" },
              { value: "agents", icon: Bot, label: "エージェント" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === tab.value
                    ? "bg-white/10 text-white"
                    : "text-neutral-500 hover:text-white hover:bg-neutral-900"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Quick Stats */}
              <div className="grid gap-3 md:grid-cols-3">
                <div className="bg-teal-500/10 rounded-lg border border-teal-500/20 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white">投稿方式</p>
                    <div className="p-1.5 rounded-lg bg-neutral-950 border border-white/[0.06]">
                      {account.postingMethod === 'api_v2' ? (
                        <Zap className="h-3.5 w-3.5 text-white" />
                      ) : (
                        <Monitor className="h-3.5 w-3.5 text-white" />
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {([
                      { value: 'playwright', label: 'Playwright', sub: 'ブラウザ' },
                      { value: 'api_v2', label: 'API v2', sub: '公式API' },
                    ] as const).map((method) => (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => updatePostingMethodMutation.mutate({ accountId, postingMethod: method.value })}
                        disabled={updatePostingMethodMutation.isPending}
                        className={`flex-1 px-2 py-1.5 rounded-lg border border-white/[0.06] text-left transition-all ${
                          (account.postingMethod || 'playwright') === method.value
                            ? 'bg-white/10 text-white shadow-none'
                            : 'bg-neutral-950 text-white hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]'
                        }`}
                      >
                        <p className="text-[11px] font-bold">{method.label}</p>
                        <p className={`text-[9px] font-bold ${(account.postingMethod || 'playwright') === method.value ? 'text-gray-300' : 'text-neutral-500'}`}>{method.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-emerald-500 rounded-lg border border-white/[0.06] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white">作成日</p>
                    <div className="p-1.5 rounded-lg bg-neutral-950 border border-white/[0.06]">
                      <Calendar className="h-3.5 w-3.5 text-white" />
                    </div>
                  </div>
                  <p className="text-sm font-bold text-white">
                    {new Date(account.createdAt).toLocaleDateString("ja-JP")}
                  </p>
                  <p className="text-[10px] font-bold text-white mt-0.5">
                    {new Date(account.createdAt).toLocaleTimeString("ja-JP")}
                  </p>
                </div>

                <div className="bg-rose-500/10 rounded-lg border border-rose-500/20 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white">成長データ</p>
                    <div className="p-1.5 rounded-lg bg-neutral-950 border border-white/[0.06]">
                      <Activity className="h-3.5 w-3.5 text-white" />
                    </div>
                  </div>
                  <p className="text-xs font-bold text-white">
                    既存の学習データから経験値を再計算
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full h-7 text-xs font-bold border border-white/[0.06] bg-neutral-950 text-white hover:bg-neutral-900 rounded-lg"
                    onClick={() => syncGrowthMutation.mutate({ accountId })}
                    disabled={syncGrowthMutation.isPending}
                  >
                    {syncGrowthMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1.5" />
                    )}
                    同期
                  </Button>
                </div>
              </div>

              {/* X API OAuth Connection */}
              <div className="bg-neutral-950 rounded-lg border border-white/[0.06] p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">X API 連携</p>
                  {oauthStatus?.oauthTokenStatus === 'active' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <span className="w-[5px] h-[5px] rounded-full bg-emerald-400" />
                      連携済み
                    </span>
                  )}
                  {oauthStatus?.oauthTokenStatus === 'expired' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      期限切れ
                    </span>
                  )}
                  {(oauthStatus?.oauthTokenStatus === 'not_connected' || oauthStatus?.oauthTokenStatus === 'revoked' || !oauthStatus) && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      <span className="w-[5px] h-[5px] rounded-full bg-rose-400" />
                      未連携
                    </span>
                  )}
                </div>

                {/* Connected state */}
                {oauthStatus?.oauthTokenStatus === 'active' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <div className="p-2 rounded-lg bg-neutral-950 border border-white/[0.06]">
                        <Link2 className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">
                          @{oauthStatus.oauthUsername || account.username}
                        </p>
                        {oauthStatus.oauthConnectedAt && (
                          <p className="text-[10px] font-bold text-neutral-500 mt-0.5">
                            連携日: {new Date(oauthStatus.oauthConnectedAt).toLocaleDateString('ja-JP')}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm("X APIの連携を解除しますか？")) {
                            disconnectMutation.mutate({ accountId });
                          }
                        }}
                        disabled={disconnectMutation.isPending}
                        className="h-8 text-xs font-bold border border-rose-500/30 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] rounded-lg"
                      >
                        {disconnectMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        ) : (
                          <Unlink className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        連携解除
                      </Button>
                    </div>
                    <p className="text-[11px] font-bold text-neutral-500">
                      X API v2を使用して直接投稿が可能です。投稿方式を「API v2」に設定してください。
                    </p>
                  </div>
                )}

                {/* Expired / Revoked state */}
                {(oauthStatus?.oauthTokenStatus === 'expired' || oauthStatus?.oauthTokenStatus === 'revoked') && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="p-2 rounded-lg bg-neutral-950 border border-white/[0.06]">
                        <AlertTriangle className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">アクセストークンが無効です</p>
                        <p className="text-[10px] font-bold text-neutral-500 mt-0.5">
                          {oauthStatus.oauthTokenStatus === 'expired'
                            ? 'トークンの有効期限が切れました。再連携してください。'
                            : 'アクセスが取り消されました。再連携してください。'}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => startOAuthMutation.mutate({ accountId })}
                      disabled={startOAuthMutation.isPending}
                      className="h-8 text-xs font-bold bg-emerald-500 hover:bg-emerald-500 text-white border border-white/[0.06] hover:hover:translate-x-[2px] hover:translate-y-[2px] rounded-lg"
                    >
                      {startOAuthMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : (
                        <Link2 className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      再連携する
                    </Button>
                  </div>
                )}

                {/* Not connected state */}
                {(oauthStatus?.oauthTokenStatus === 'not_connected' || !oauthStatus) && (
                  <div className="space-y-3">
                    <p className="text-[11px] font-bold text-neutral-500 leading-relaxed">
                      3-legged OAuthでXアカウントを連携し、API v2で投稿できるようにします
                    </p>
                    <Button
                      size="sm"
                      onClick={() => startOAuthMutation.mutate({ accountId })}
                      disabled={startOAuthMutation.isPending}
                      className="h-9 text-xs font-bold bg-emerald-500 hover:bg-emerald-500 text-white border border-white/[0.06] hover:hover:translate-x-[2px] hover:translate-y-[2px] rounded-lg"
                    >
                      {startOAuthMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : (
                        <Link2 className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Xと連携する
                    </Button>
                  </div>
                )}
              </div>

              {/* Account Details */}
              <div className="bg-neutral-950 rounded-lg border border-white/[0.06] p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-4">アカウント詳細</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Username</label>
                    <p className="text-sm font-bold text-white mt-0.5">{account.username}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">X Handle</label>
                    {isEditingXHandle ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-bold text-neutral-500">@</span>
                        <Input
                          value={xHandleInput}
                          onChange={(e) => setXHandleInput(e.target.value)}
                          placeholder="例: elonmusk"
                          className="flex-1 h-8 text-sm font-bold border border-white/[0.06] bg-neutral-950 rounded-lg"
                        />
                        <button
                          onClick={handleSaveXHandle}
                          disabled={updateAccountMutation.isPending}
                          className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-neutral-400 hover:text-emerald-400 font-bold transition-colors border border-white/[0.06]"
                        >
                          {updateAccountMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1.5 rounded-lg hover:bg-neutral-900 text-neutral-500 font-bold transition-colors border border-white/[0.06]"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-0.5">
                        {account.xHandle ? (
                          <code className="text-sm font-bold bg-neutral-900 text-white px-2 py-0.5 rounded-lg border border-white/[0.06]">
                            @{account.xHandle}
                          </code>
                        ) : (
                          <span className="text-sm font-bold text-neutral-500">未設定</span>
                        )}
                        <button onClick={handleEditXHandle} className="p-1 rounded-lg hover:bg-neutral-900 text-neutral-500 font-bold transition-colors border border-white/[0.06]">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Platform</label>
                    <p className="text-sm font-bold text-white mt-0.5 capitalize">{account.platform}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Device ID</label>
                    <p className="text-sm font-bold text-white mt-0.5 font-mono">{account.deviceId || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Session Management Tab (Playwright) */}
          {activeTab === "session" && (
            <div className="space-y-4">
              {/* Session Status */}
              <div className="bg-neutral-950 rounded-lg border border-white/[0.06] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">ブラウザセッション</p>
                    <SessionStatusBadge status={currentSessionStatus} />
                  </div>

                  <div className="space-y-3">
                    {/* Status detail */}
                    <div className="p-3 rounded-lg bg-neutral-900 border border-white/[0.06]">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg border border-white/[0.06] ${
                          currentSessionStatus === 'active' ? 'bg-emerald-500' :
                          currentSessionStatus === 'expired' ? 'bg-amber-500' : 'bg-rose-500'
                        }`}>
                          {currentSessionStatus === 'active' ? (
                            <ShieldCheck className="w-5 h-5 text-white" />
                          ) : currentSessionStatus === 'expired' ? (
                            <ShieldAlert className="w-5 h-5 text-white" />
                          ) : (
                            <ShieldX className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-white">
                            {currentSessionStatus === 'active'
                              ? 'セッション有効'
                              : currentSessionStatus === 'expired'
                              ? 'セッション期限切れ'
                              : 'ログインが必要'}
                          </p>
                          <p className="text-xs font-bold text-neutral-500 mt-0.5">
                            {currentSessionStatus === 'active'
                              ? 'X.comへの投稿が可能です。'
                              : currentSessionStatus === 'expired'
                              ? 'セッションが期限切れです。再ログインしてください。'
                              : '初回ログインを行ってセッションを確立してください。'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewOpen(true)}
                        className="h-8 text-xs font-bold border border-blue-500/30 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] rounded-lg"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        ライブプレビュー
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPreviewOpen(true);
                          testPreviewMutation.mutate({ accountId });
                        }}
                        disabled={testPreviewMutation.isPending}
                        className="h-8 text-xs font-bold border border-emerald-500/30 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] rounded-lg"
                      >
                        {testPreviewMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        ) : (
                          <Monitor className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        テストプレビュー
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => {
                          setPreviewOpen(true);
                          loginMutation.mutate({ accountId });
                        }}
                        disabled={loginMutation.isPending}
                        className="h-8 text-xs font-bold bg-emerald-500 hover:bg-emerald-500 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] text-white border border-white/[0.06] rounded-lg"
                      >
                        {loginMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        ) : (
                          <LogIn className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        {currentSessionStatus === 'active' ? '再ログイン' : 'ログイン'}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPreviewOpen(true);
                          healthCheckMutation.mutate({ accountId });
                        }}
                        disabled={healthCheckMutation.isPending}
                        className="h-8 text-xs font-bold border border-white/[0.06] bg-neutral-950 text-white hover:bg-neutral-900 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] rounded-lg"
                      >
                        {healthCheckMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        ) : (
                          <Shield className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        ヘルスチェック
                      </Button>

                      {currentSessionStatus !== 'needs_login' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm("セッションを削除しますか？再度ログインが必要になります。")) {
                              deleteSessionMutation.mutate({ accountId });
                            }
                          }}
                          disabled={deleteSessionMutation.isPending}
                          className="h-8 text-xs font-bold border border-rose-500/30 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] rounded-lg"
                        >
                          {deleteSessionMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          セッション削除
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

              {/* Info note */}
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-neutral-900 border border-white/[0.06]">
                <Info className="w-4 h-4 text-neutral-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs font-bold text-neutral-500 leading-relaxed">
                  <p className="font-bold text-white mb-1">セッションについて</p>
                  <p>
                    Playwrightブラウザ自動化を使用してX.comに投稿します。
                    X.comへのログインセッションの管理が必要です。
                    セッションが期限切れの場合は再ログインしてください。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Learnings Tab */}
          {activeTab === "learnings" && (
            <AccountLearningsTab accountId={accountId} />
          )}

          {/* Persona Tab */}
          {activeTab === "persona" && (
            <AccountPersonaTab
              accountId={accountId}
              account={{
                personaRole: account.personaRole,
                personaTone: account.personaTone,
                personaCharacteristics: account.personaCharacteristics,
              }}
            />
          )}

          {/* Model Accounts Tab */}
          {activeTab === "model-accounts" && (
            <AccountModelAccountsTab accountId={accountId} />
          )}

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <AccountProfileTab
              accountId={accountId}
              account={{
                username: account.username,
                xHandle: account.xHandle,
                platform: account.platform,
                personaRole: account.personaRole,
                personaTone: account.personaTone,
                personaCharacteristics: account.personaCharacteristics,
              }}
            />
          )}

          {/* Agents Tab */}
          {activeTab === "agents" && (
            <AccountAgentsTab accountId={accountId} />
          )}
        </Tabs>
      </div>

      {/* Browser Preview Dialog */}
      <BrowserPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        accountId={accountId}
        username={account.username}
      />
    </div>
  );
}
