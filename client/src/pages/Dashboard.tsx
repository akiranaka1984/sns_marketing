import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ApiErrorFallback } from "@/components/ApiErrorFallback";
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
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";

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

function StatusTag({ status }: { status: string }) {
  const config: Record<string, { dot: string; text: string; label: string }> = {
    active:  { dot: "bg-emerald-500", text: "text-emerald-400", label: "active" },
    success: { dot: "bg-emerald-500", text: "text-emerald-400", label: "success" },
    pending: { dot: "bg-amber-400",   text: "text-amber-400",   label: "pending" },
    failed:  { dot: "bg-rose-500",    text: "text-rose-400",    label: "failed" },
  };
  const c = config[status] ?? config.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {c.label}
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
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>

      {/* Metric cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent px-5 py-4">
            <Skeleton className="h-3 w-20 mb-4" />
            <Skeleton className="h-8 w-12 mb-1.5" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Two-column skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
        <div>
          <Skeleton className="h-4 w-32 mb-3" />
          <div className="border border-white/[0.06] rounded-xl overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] last:border-b-0">
                <Skeleton className="w-6 h-6 rounded-md" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-16 ml-auto" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <div>
            <Skeleton className="h-4 w-40 mb-3" />
            <div className="space-y-px border border-white/[0.06] rounded-xl overflow-hidden">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full rounded-none" />
              ))}
            </div>
          </div>
          <div>
            <Skeleton className="h-4 w-36 mb-3" />
            <div className="space-y-px border border-white/[0.06] rounded-xl overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full rounded-none" />
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
  const {
    data: accounts,
    isLoading: accountsLoading,
    isError: accountsError,
    error: accountsErr,
    refetch: refetchAccounts,
  } = trpc.accounts.list.useQuery(undefined, {
    refetchInterval: 60000,
  });
  const {
    data: recentLogs,
    isLoading: logsLoading,
    isError: logsError,
    refetch: refetchLogs,
  } = trpc.logs.recent.useQuery(
    { limit: 10 },
    { refetchInterval: 60000 }
  );
  const {
    data: postStats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
  } = trpc.scheduledPosts.getStats.useQuery(
    { days: 30 },
    { refetchInterval: 60000 }
  );

  const isLoading = accountsLoading && logsLoading && statsLoading;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // All three queries failed — show a full-page error fallback
  if (accountsError && logsError && statsError) {
    return (
      <div className="min-h-full max-w-[1100px]">
        <ApiErrorFallback
          error={accountsErr}
          onRetry={() => {
            void refetchAccounts();
            void refetchLogs();
            void refetchStats();
          }}
        />
      </div>
    );
  }

  const activeAccounts = accounts?.filter(a => a.status === "active").length || 0;
  const pendingAccounts = accounts?.filter(a => a.status === "pending").length || 0;
  const totalAccounts = accounts?.length || 0;
  const scheduledTotal = postStats?.total || 0;

  // TODO: Replace mock deltas with real previous-period data from the backend.
  // When the backend exposes a `previousPeriod` object in getStats / accounts list,
  // compute deltas as: Math.round(((current - prev) / Math.max(prev, 1)) * 100)
  const mockDeltas = { totalAccounts: 8, activeAccounts: 12, pendingAccounts: -3, scheduledTotal: 5 };

  const metrics: Array<{
    label: string;
    value: number;
    sub: string;
    icon: LucideIcon;
    iconColor: string;
    delta: number;
  }> = [
    {
      label: "アカウント総数",
      value: totalAccounts,
      sub: "登録済みアカウント",
      icon: Users,
      iconColor: "text-neutral-400",
      delta: mockDeltas.totalAccounts,
    },
    {
      label: "アクティブ",
      value: activeAccounts,
      sub: "稼働中のアカウント",
      icon: Activity,
      iconColor: "text-emerald-400",
      delta: mockDeltas.activeAccounts,
    },
    {
      label: "保留中",
      value: pendingAccounts,
      sub: "認証待ちアカウント",
      icon: Clock,
      iconColor: "text-amber-400",
      delta: mockDeltas.pendingAccounts,
    },
    {
      label: "スケジュール投稿",
      value: scheduledTotal,
      sub: `成功率 ${postStats?.successRate ?? 0}%（30日間）`,
      icon: CalendarCheck,
      iconColor: "text-cyan-400",
      delta: mockDeltas.scheduledTotal,
    },
  ];

  const quickActions: Array<{ href: string; icon: LucideIcon; label: string }> = [
    { href: "/automation",      icon: Zap,        label: "自動化設定"     },
    { href: "/strategies/new",  icon: Lightbulb,  label: "AI戦略を生成"  },
    { href: "/analytics",       icon: BarChart3,  label: "分析を見る"    },
    { href: "/scheduled-posts", icon: Send,       label: "スケジュール投稿" },
  ];

  return (
    <div className="min-h-full max-w-[1100px]">
      {/* ── Page Header ── */}
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
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.07]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="text-[12px] font-medium text-emerald-400 tabular-nums">
              {activeAccounts} 件稼働中
            </span>
          </div>
        )}
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className={`relative rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-transparent px-5 py-4 hover:border-white/[0.12] transition-colors fade-in-up animation-delay-${(i + 1) * 100}`}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-widest leading-none">
                  {m.label}
                </p>
                <Icon className={`w-3.5 h-3.5 ${m.iconColor}`} strokeWidth={1.5} />
              </div>
              <p className="text-[28px] font-bold text-white tabular-nums tracking-tight leading-none mb-1.5">
                {m.value}
              </p>
              <p className="text-[11px] text-neutral-600 leading-none">{m.sub}</p>
              {m.delta !== undefined && (
                <div className={`flex items-center gap-1 text-xs mt-1.5 ${
                  m.delta > 0 ? "text-emerald-400" :
                  m.delta < 0 ? "text-red-400" : "text-muted-foreground"
                }`}>
                  {m.delta > 0 ? <TrendingUp className="w-3 h-3" /> :
                   m.delta < 0 ? <TrendingDown className="w-3 h-3" /> :
                   <Minus className="w-3 h-3" />}
                  <span>{m.delta > 0 ? "+" : ""}{m.delta}% vs 先月</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 fade-in-up animation-delay-300">

        {/* Left: Accounts Table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold text-white flex items-center gap-2 tracking-[-0.01em]">
              アカウント
              {totalAccounts > 0 && (
                <span className="text-[11px] font-medium text-neutral-600 bg-white/[0.05] px-1.5 py-0.5 rounded">
                  {totalAccounts}
                </span>
              )}
            </h2>
            <Link
              href="/accounts"
              className="flex items-center gap-1 px-2 py-1 text-[12px] text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.04] rounded-md transition-colors"
            >
              すべて表示
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="border border-white/[0.06] rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_90px_90px] border-b border-white/[0.06] bg-white/[0.015]">
              <div className="px-4 py-2.5 text-[11px] font-medium text-neutral-600 uppercase tracking-widest">名前</div>
              <div className="px-3 py-2.5 text-[11px] font-medium text-neutral-600 uppercase tracking-widest">状態</div>
              <div className="px-3 py-2.5 text-[11px] font-medium text-neutral-600 uppercase tracking-widest">作成日</div>
            </div>

            {accountsLoading ? (
              <div className="divide-y divide-white/[0.04]">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <Skeleton className="w-6 h-6 rounded" />
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-14 ml-auto" />
                  </div>
                ))}
              </div>
            ) : accountsError ? (
              <ApiErrorFallback
                title="アカウントを読み込めませんでした"
                error={accountsErr}
                onRetry={() => void refetchAccounts()}
                size="compact"
              />
            ) : accounts && accounts.length > 0 ? (
              <div className="divide-y divide-white/[0.04]">
                {accounts.slice(0, 6).map((account) => (
                  <Link
                    key={account.id}
                    href={`/accounts/${account.id}`}
                    className="grid grid-cols-[1fr_90px_90px] hover:bg-white/[0.02] transition-colors group"
                  >
                    <div className="px-4 py-3 flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded bg-white/[0.05] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                        <svg viewBox="0 0 24 24" className="w-3 h-3 text-neutral-400" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                      </div>
                      <span className="text-[13px] font-medium text-neutral-200 group-hover:text-white transition-colors truncate">
                        {account.username}
                      </span>
                    </div>
                    <div className="px-3 py-3 flex items-center">
                      <StatusTag status={account.status} />
                    </div>
                    <div className="px-3 py-3 text-[11px] text-neutral-600 tabular-nums flex items-center font-mono">
                      {new Date(account.createdAt).toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit", year: "2-digit" })}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-[13px] text-neutral-600 mb-4">アカウントがありません</p>
                <Link
                  href="/accounts/new"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/[0.06] hover:bg-white/[0.09] border border-white/[0.08] text-neutral-200 text-[13px] font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  新規作成
                </Link>
              </div>
            )}

            {accounts && accounts.length > 0 && (
              <Link
                href="/accounts/new"
                className="flex items-center gap-1.5 px-4 py-2.5 text-[12px] text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.02] transition-colors border-t border-white/[0.04]"
              >
                <Plus className="w-3 h-3" />
                新規追加
              </Link>
            )}
          </div>
        </div>

        {/* Right: Activity + Quick Actions */}
        <div className="space-y-5">

          {/* Recent Activity */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[13px] font-semibold text-white tracking-[-0.01em]">
                最近のアクティビティ
              </h2>
              <Link
                href="/logs"
                className="flex items-center gap-1 px-2 py-1 text-[12px] text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.04] rounded-md transition-colors"
              >
                すべて表示
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="border border-white/[0.06] rounded-xl overflow-hidden">
              {logsLoading ? (
                <div className="divide-y divide-white/[0.04]">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <Skeleton className="w-3 h-3 rounded-full" />
                      <Skeleton className="h-3.5 flex-1" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  ))}
                </div>
              ) : logsError ? (
                <ApiErrorFallback
                  title="アクティビティを読み込めませんでした"
                  onRetry={() => void refetchLogs()}
                  size="compact"
                />
              ) : recentLogs && recentLogs.length > 0 ? (
                <div className="divide-y divide-white/[0.04]">
                  {recentLogs.slice(0, 5).map((log) => {
                    const LogIcon =
                      log.status === "success" ? CheckCircle2
                      : log.status === "failed"  ? XCircle
                      : Clock;
                    const iconColor =
                      log.status === "success" ? "text-emerald-400"
                      : log.status === "failed"  ? "text-rose-400"
                      : "text-amber-400";
                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
                      >
                        <LogIcon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${iconColor}`} strokeWidth={2} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-neutral-300 truncate leading-snug">
                            {log.action}
                          </p>
                          <p
                            className="text-[11px] text-neutral-600 mt-0.5"
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
                <div className="py-10 text-center text-[13px] text-neutral-600">
                  アクティビティがありません
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-[13px] font-semibold text-white mb-3 tracking-[-0.01em]">
              クイックアクション
            </h2>
            <div className="border border-white/[0.06] rounded-xl overflow-hidden divide-y divide-white/[0.04]">
              {quickActions.map((action) => {
                const ActionIcon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors group"
                  >
                    <ActionIcon className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0 group-hover:text-neutral-300 transition-colors" strokeWidth={1.5} />
                    <span className="text-[13px] font-medium text-neutral-300 group-hover:text-white transition-colors flex-1 tracking-[-0.01em]">
                      {action.label}
                    </span>
                    <ArrowRight className="w-3 h-3 text-neutral-700 group-hover:text-neutral-500 transition-colors flex-shrink-0" />
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
