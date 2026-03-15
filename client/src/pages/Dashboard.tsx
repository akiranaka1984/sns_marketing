import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Users,
  Zap,
  Lightbulb,
  BarChart3,
  ArrowRight,
  Activity,
  Clock,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Send,
} from "lucide-react";
import { Link } from "wouter";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "おはようございます";
  if (hour < 18) return "こんにちは";
  return "こんばんは";
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}日前`;
  const months = Math.floor(days / 30);
  return `${months}ヶ月前`;
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "success" || status === "active"
      ? "bg-emerald-500"
      : status === "failed"
        ? "bg-rose-500"
        : "bg-amber-500";
  return <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color}`} />;
}

function StatusTag({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    active: { bg: "bg-emerald-500/10", text: "text-emerald-600" },
    success: { bg: "bg-emerald-500/10", text: "text-emerald-600" },
    pending: { bg: "bg-amber-500/10", text: "text-amber-600" },
    failed: { bg: "bg-rose-500/10", text: "text-rose-600" },
  };
  const { bg, text } = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium ${bg} ${text}`}>
      <StatusDot status={status} />
      {status}
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-full max-w-[1100px]">
      {/* Header skeleton */}
      <div className="page-header">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-8 w-32 rounded-full" />
      </div>

      {/* Metric cards skeleton */}
      <div className="grid grid-cols-4 gap-4 mb-7">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="metric-card px-4 py-4">
            <Skeleton className="h-3 w-20 mb-3" />
            <Skeleton className="h-7 w-12 mb-1.5" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Two-column skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">
        <div>
          <Skeleton className="h-4 w-32 mb-3" />
          <div className="border border-border rounded-lg overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-b-0">
                <Skeleton className="w-7 h-7 rounded-md" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <div>
            <Skeleton className="h-4 w-40 mb-3" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          </div>
          <div>
            <Skeleton className="h-4 w-36 mb-3" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: accounts, isLoading: accountsLoading } = trpc.accounts.list.useQuery(undefined, {
    refetchInterval: 60000,
  });
  const { data: recentLogs, isLoading: logsLoading } = trpc.logs.recent.useQuery(
    { limit: 10 },
    { refetchInterval: 60000 }
  );
  const { data: postStats, isLoading: statsLoading } = trpc.scheduledPosts.getStats.useQuery(
    { days: 30 },
    { refetchInterval: 60000 }
  );

  const isLoading = accountsLoading && logsLoading && statsLoading;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const activeAccounts = accounts?.filter(a => a.status === "active").length || 0;
  const pendingAccounts = accounts?.filter(a => a.status === "pending").length || 0;
  const totalAccounts = accounts?.length || 0;
  const scheduledTotal = postStats?.total || 0;

  const metrics = [
    {
      label: "アカウント総数",
      value: totalAccounts,
      sub: "登録済みアカウント",
      icon: Users,
      barColor: "#3B82F6",
      iconColor: "text-blue-500",
      iconBg: "bg-blue-500/10",
    },
    {
      label: "アクティブ",
      value: activeAccounts,
      sub: "稼働中のアカウント",
      icon: Activity,
      barColor: "#10B981",
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-500/10",
    },
    {
      label: "保留中",
      value: pendingAccounts,
      sub: "認証待ちアカウント",
      icon: Clock,
      barColor: "#F59E0B",
      iconColor: "text-amber-500",
      iconBg: "bg-amber-500/10",
    },
    {
      label: "スケジュール投稿",
      value: scheduledTotal,
      sub: `成功率 ${postStats?.successRate || 0}%（30日間）`,
      icon: CalendarCheck,
      barColor: "#4ECDC4",
      iconColor: "text-teal-400",
      iconBg: "bg-teal-400/10",
    },
  ];

  const quickActions = [
    { href: "/automation", icon: Zap, label: "自動化設定", sub: "ワークフロー管理", iconColor: "text-amber-500", iconBg: "bg-amber-500/10" },
    { href: "/strategies/new", icon: Lightbulb, label: "AI戦略を生成", sub: "AI戦略アシスト", iconColor: "text-teal-400", iconBg: "bg-teal-400/10" },
    { href: "/analytics", icon: BarChart3, label: "分析を見る", sub: "パフォーマンス分析", iconColor: "text-blue-500", iconBg: "bg-blue-500/10" },
    { href: "/scheduled-posts", icon: Send, label: "スケジュール投稿", sub: "投稿管理", iconColor: "text-emerald-500", iconBg: "bg-emerald-500/10" },
  ];

  return (
    <div className="min-h-full max-w-[1100px]">
      {/* Page Header */}
      <div className="page-header fade-in-up">
        <div>
          <h1 className="page-title">
            {getGreeting()}
            {user?.name ? `、${user.name}` : ""}
          </h1>
          <p className="page-subtitle mt-1">
            {new Date().toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </p>
        </div>
        {activeAccounts > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[12px] font-medium text-emerald-600">
              {activeAccounts}件 稼働中
            </span>
          </div>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-4 mb-7">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className={`metric-card px-4 py-4 fade-in-up animation-delay-${(i + 1) * 100}`}
              style={{ "--metric-color": m.barColor } as React.CSSProperties}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-neutral-500 uppercase tracking-wider">
                  {m.label}
                </p>
                <div className={`w-7 h-7 rounded-md ${m.iconBg} flex items-center justify-center`}>
                  <Icon className={`w-3.5 h-3.5 ${m.iconColor}`} strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-2xl font-semibold text-white tabular-nums tracking-tight leading-none mb-1">
                {m.value}
              </p>
              <p className="text-xs text-neutral-500">{m.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 fade-in-up animation-delay-300">
        {/* Left: Accounts Table */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-[13px] font-semibold text-white flex items-center gap-2 tracking-[-0.01em]">
              アカウント
              {totalAccounts > 0 && (
                <span className="text-[11px] font-medium text-neutral-500 bg-white/[0.06] px-1.5 py-0.5 rounded-md">
                  {totalAccounts}
                </span>
              )}
            </h2>
            <Link
              href="/accounts"
              className="flex items-center gap-1 px-2 py-1 text-[12px] text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04] rounded-md transition-colors font-medium"
            >
              すべて表示
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="border border-white/[0.06] rounded-xl overflow-hidden bg-neutral-900">
            <div className="grid grid-cols-[1fr_100px_100px] border-b border-white/[0.06] bg-white/[0.02]">
              <div className="px-4 py-2 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                名前
              </div>
              <div className="px-4 py-2 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                ステータス
              </div>
              <div className="px-4 py-2 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                作成日
              </div>
            </div>

            {accountsLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-7 h-7 rounded-md" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </div>
                ))}
              </div>
            ) : accounts && accounts.length > 0 ? (
              accounts.slice(0, 5).map((account) => (
                <Link
                  key={account.id}
                  href={`/accounts/${account.id}`}
                  className="grid grid-cols-[1fr_100px_100px] border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="px-4 py-2.5 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-neutral-300" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </div>
                    <span className="text-[13px] font-medium text-white group-hover:text-neutral-200 transition-colors truncate">
                      {account.username}
                    </span>
                  </div>
                  <div className="px-4 py-2.5 flex items-center">
                    <StatusTag status={account.status} />
                  </div>
                  <div className="px-4 py-2.5 text-[12px] text-neutral-500 tabular-nums flex items-center font-mono">
                    {new Date(account.createdAt).toLocaleDateString("ja-JP")}
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-10 text-center">
                <p className="text-[13px] text-neutral-500 mb-3">アカウントがありません</p>
                <Link
                  href="/accounts/new"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-[13px] font-medium rounded-md transition-colors hover:opacity-90"
                >
                  <Plus className="w-4 h-4" />
                  新規作成
                </Link>
              </div>
            )}

            {accounts && accounts.length > 0 && (
              <Link
                href="/accounts/new"
                className="flex items-center gap-2 px-4 py-2 text-[12px] text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.02] transition-colors border-t border-white/[0.04]"
              >
                <Plus className="w-3 h-3" />
                新規追加
              </Link>
            )}
          </div>
        </div>

        {/* Right: Activity + Quick Actions */}
        <div className="space-y-5">
          {/* Recent Activity — Timeline */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-[13px] font-semibold text-white flex items-center gap-2 tracking-[-0.01em]">
                最近のアクティビティ
              </h2>
              <Link
                href="/logs"
                className="flex items-center gap-1 px-2 py-1 text-[12px] text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04] rounded-md transition-colors font-medium"
              >
                すべて表示
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="bg-neutral-900 rounded-xl border border-white/[0.06] overflow-hidden">
              {logsLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-1.5 h-1.5 rounded-full" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  ))}
                </div>
              ) : recentLogs && recentLogs.length > 0 ? (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[19px] top-3 bottom-3 w-px bg-white/[0.06]" />

                  {recentLogs.slice(0, 5).map((log) => {
                    const icon =
                      log.status === "success"
                        ? CheckCircle2
                        : log.status === "failed"
                          ? XCircle
                          : Clock;
                    const iconColor =
                      log.status === "success"
                        ? "text-emerald-500"
                        : log.status === "failed"
                          ? "text-rose-500"
                          : "text-amber-500";
                    const Icon = icon;
                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors relative"
                      >
                        <div className="relative z-10 mt-0.5 w-3 h-3 flex items-center justify-center bg-neutral-900">
                          <Icon className={`w-3 h-3 ${iconColor}`} strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-neutral-200 truncate leading-tight">
                            {log.action}
                          </p>
                          <p
                            className="text-[11px] text-neutral-500 mt-0.5"
                            title={new Date(log.createdAt).toLocaleString("ja-JP")}
                          >
                            {relativeTime(log.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-[13px] text-neutral-500">
                  アクティビティがありません
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-[13px] font-semibold text-white flex items-center gap-2 mb-2.5 tracking-[-0.01em]">
              クイックアクション
            </h2>
            <div className="space-y-2">
              {quickActions.map((action) => {
                const ActionIcon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-neutral-900 hover:border-white/[0.10] transition-all group"
                  >
                    <div className={`w-8 h-8 rounded-md ${action.iconBg} flex items-center justify-center flex-shrink-0`}>
                      <ActionIcon className={`w-4 h-4 ${action.iconColor}`} strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[13px] font-medium text-white block tracking-[-0.01em]">
                        {action.label}
                      </span>
                      <span className="text-[11px] text-neutral-500">{action.sub}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
