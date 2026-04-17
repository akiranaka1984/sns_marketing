import { useMemo } from "react";
import { Link } from "wouter";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Users,
  Zap,
  AlertTriangle,
  Circle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ButtonV2 } from "@/components/v2/ButtonV2";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "おはようございます";
  if (h < 18) return "こんにちは";
  return "こんばんは";
}

function formatDate(): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "--";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "たった今";
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  return `${Math.floor(hours / 24)}日前`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Header({ userName, activeCount }: { userName: string; activeCount: number }) {
  return (
    <div className="flex items-start justify-between mb-7">
      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-50 tracking-tight leading-tight">
          {getGreeting()}、{userName}
        </h1>
        <p className="text-[13px] text-neutral-500 mt-1 tracking-[-0.008em]">
          {formatDate()}
        </p>
      </div>

      {activeCount > 0 && (
        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[12px] font-medium text-emerald-400 tracking-[-0.008em]">
            {activeCount}件稼働中
          </span>
        </div>
      )}
    </div>
  );
}

interface AINextActionBannerProps {
  pendingCount: number;
  isLoading: boolean;
}

function AINextActionBanner({ pendingCount, isLoading }: AINextActionBannerProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-emerald-500/5 p-5 mb-6 shimmer min-h-[96px]" />
    );
  }

  const hasPending = pendingCount > 0;

  return (
    <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-emerald-500/5 p-5 mb-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 w-7 h-7 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-semibold tracking-widest uppercase text-violet-400">
              AI Next Action
            </span>
          </div>

          <p className="text-[13px] text-neutral-200 tracking-[-0.008em] leading-relaxed">
            {hasPending ? (
              <>
                承認待ちの投稿が{" "}
                <span className="font-semibold text-amber-400">{pendingCount}件</span>{" "}
                あります。今週のERが <span className="font-semibold text-rose-400">-12%</span>。
                バズ分析から新しい知見があります。
              </>
            ) : (
              "AIが今日のアクションを分析中です。しばらくお待ちください。"
            )}
          </p>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Link href="/post-review">
              <ButtonV2
                variant="ai"
                size="sm"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                承認画面へ
              </ButtonV2>
            </Link>
            <Link href="/analytics">
              <ButtonV2
                variant="secondary"
                size="sm"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                分析を見る
              </ButtonV2>
            </Link>
            <ButtonV2 variant="ghost" size="sm">
              却下
            </ButtonV2>
          </div>
        </div>
      </div>
    </div>
  );
}

interface KPICardProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  href: string;
  icon: React.ReactNode;
  delay?: string;
}

function KPICard({ label, value, delta, deltaLabel, href, icon, delay = "" }: KPICardProps) {
  const isPositive = delta !== undefined && delta > 0;
  const isNegative = delta !== undefined && delta < 0;

  return (
    <Link href={href}>
      <div
        className={`rounded-xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-transparent px-5 py-4 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-150 cursor-pointer group fade-in-up ${delay}`}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-medium tracking-wider uppercase text-neutral-500">
            {label}
          </span>
          <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.07] flex items-center justify-center text-neutral-500 group-hover:text-neutral-300 transition-colors">
            {icon}
          </div>
        </div>

        <div className="font-display text-2xl font-bold text-neutral-50 tracking-tight tabular-nums">
          {value}
        </div>

        {delta !== undefined && (
          <div className="flex items-center gap-1 mt-1.5">
            {isPositive && <TrendingUp className="w-3 h-3 text-emerald-400" />}
            {isNegative && <TrendingDown className="w-3 h-3 text-rose-400" />}
            <span
              className={`text-[11px] font-medium ${
                isPositive ? "text-emerald-400" : isNegative ? "text-rose-400" : "text-neutral-500"
              }`}
            >
              {delta > 0 ? "+" : ""}
              {deltaLabel ?? delta}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

function KPIGrid({
  accountCount,
  activeCount,
  pendingCount,
  isLoading,
}: {
  accountCount: number;
  activeCount: number;
  pendingCount: number;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent px-5 py-4 shimmer h-[108px]"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
      <KPICard
        label="アカウント"
        value={accountCount}
        delta={8}
        deltaLabel="+8%"
        href="/accounts"
        icon={<Users className="w-3.5 h-3.5" />}
        delay="animation-delay-100"
      />
      <KPICard
        label="アクティブ"
        value={activeCount}
        delta={12}
        deltaLabel="+12%"
        href="/accounts"
        icon={<Activity className="w-3.5 h-3.5" />}
        delay="animation-delay-200"
      />
      <KPICard
        label="承認待ち"
        value={pendingCount}
        delta={-1}
        deltaLabel="-1"
        href="/post-review"
        icon={<Clock className="w-3.5 h-3.5" />}
        delay="animation-delay-300"
      />
      <KPICard
        label="インプレッション"
        value={formatNumber(847_000)}
        delta={23}
        deltaLabel="+23%"
        href="/analytics"
        icon={<Zap className="w-3.5 h-3.5" />}
        delay="animation-delay-400"
      />
    </div>
  );
}

type LogStatus = "success" | "failed" | "pending";

interface ActivityItemProps {
  action: string;
  status: LogStatus;
  createdAt: string;
  accountId: number | null;
  isLast: boolean;
}

function activityIcon(status: LogStatus) {
  switch (status) {
    case "success":
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
    case "failed":
      return <XCircle className="w-3.5 h-3.5 text-rose-400" />;
    default:
      return <Circle className="w-3.5 h-3.5 text-amber-400" />;
  }
}

function dotColor(status: LogStatus) {
  switch (status) {
    case "success":
      return "bg-emerald-500";
    case "failed":
      return "bg-rose-500";
    default:
      return "bg-amber-400";
  }
}

function ActivityItem({ action, status, createdAt, accountId, isLast }: ActivityItemProps) {
  return (
    <div className="relative flex gap-3 pb-4 last:pb-0 group cursor-pointer">
      {/* vertical line */}
      {!isLast && (
        <div className="absolute left-[7px] top-5 bottom-0 w-px bg-white/[0.06]" />
      )}

      {/* dot */}
      <div className="mt-1 relative z-10 flex-shrink-0">
        <div
          className={`w-3.5 h-3.5 rounded-full border-2 border-neutral-950 ${dotColor(status)}`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] text-neutral-300 tracking-[-0.008em] truncate group-hover:text-neutral-100 transition-colors">
            {action}
          </p>
          <div className="flex items-center gap-1 flex-shrink-0">
            {activityIcon(status)}
          </div>
        </div>
        <p className="text-[11px] text-neutral-600 mt-0.5">
          {accountId ? `アカウント #${accountId} · ` : ""}
          {relativeTime(createdAt)}
        </p>
      </div>
    </div>
  );
}

interface LogEntry {
  id: number;
  action: string;
  status: LogStatus;
  createdAt: string;
  accountId: number | null;
}

function LiveActivityFeed({ logs, isLoading }: { logs: LogEntry[]; isLoading: boolean }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-gradient-to-br from-white/[0.03] to-transparent p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[13px] font-semibold text-neutral-200 tracking-tight flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          ライブアクティビティ
        </h2>
        <Link href="/logs">
          <span className="text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer flex items-center gap-1">
            すべて見る <ArrowRight className="w-3 h-3" />
          </span>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-3.5 h-3.5 rounded-full shimmer mt-1 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 rounded shimmer" />
                <div className="h-2.5 w-1/3 rounded shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <p className="text-[13px] text-neutral-600 text-center py-8">
          アクティビティがありません
        </p>
      ) : (
        <div>
          {logs.map((log, i) => (
            <ActivityItem
              key={log.id}
              action={log.action}
              status={log.status}
              createdAt={log.createdAt}
              accountId={log.accountId}
              isLast={i === logs.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ProactiveCard {
  title: string;
  evidence: string;
  badge?: string;
  badgeColor?: string;
  actions: Array<{ label: string; onClick: () => void; variant?: "primary" | "secondary" | "ghost" | "ai" }>;
}

function ProactiveCardItem({ card }: { card: ProactiveCard }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-gradient-to-br from-white/[0.03] to-transparent p-4 hover:border-white/[0.11] transition-all duration-150">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-[13px] font-semibold text-neutral-200 tracking-tight leading-snug">
          {card.title}
        </h3>
        {card.badge && (
          <span
            className={`flex-shrink-0 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full border ${card.badgeColor ?? "bg-violet-500/15 border-violet-500/25 text-violet-400"}`}
          >
            {card.badge}
          </span>
        )}
      </div>
      <p className="text-[12px] text-neutral-500 tracking-[-0.008em] leading-relaxed mb-3">
        {card.evidence}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {card.actions.map((action) => (
          <ButtonV2
            key={action.label}
            variant={action.variant ?? "secondary"}
            size="xs"
            onClick={action.onClick}
          >
            {action.label}
          </ButtonV2>
        ))}
      </div>
    </div>
  );
}

function ProactiveCardsSidebar() {
  const cards: ProactiveCard[] = useMemo(
    () => [
      {
        title: "バズ予測: 今すぐ投稿のチャンス",
        evidence:
          "AI分析により、このツイートのバズ確率は72%です。フォロワーのアクティブ時間帯と合致しています。",
        badge: "72% バズ",
        badgeColor: "bg-violet-500/15 border-violet-500/25 text-violet-400",
        actions: [
          {
            label: "投稿する",
            variant: "ai" as const,
            onClick: () => toast.info("クイック投稿モーダルは近日実装"),
          },
          {
            label: "詳細",
            variant: "ghost" as const,
            onClick: () => {},
          },
        ],
      },
      {
        title: "A/Bテスト: 勝者が確定しました",
        evidence:
          "バリアントBが+34%のエンゲージメントを記録。全アカウントへの展開を推奨します。",
        badge: "A/B テスト",
        badgeColor: "bg-emerald-500/15 border-emerald-500/25 text-emerald-400",
        actions: [
          {
            label: "結果を見る",
            variant: "secondary" as const,
            onClick: () => {},
          },
          {
            label: "展開する",
            variant: "primary" as const,
            onClick: () => {},
          },
        ],
      },
      {
        title: "最適投稿時間: 19:00",
        evidence:
          "過去30日間のデータから、19:00〜21:00の投稿がインプレッション+41%を達成しています。",
        badge: "スケジュール",
        badgeColor: "bg-amber-500/15 border-amber-500/25 text-amber-400",
        actions: [
          {
            label: "スケジュール設定",
            variant: "secondary" as const,
            onClick: () => {},
          },
        ],
      },
    ],
    []
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[13px] font-semibold text-neutral-200 tracking-tight flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          プロアクティブ提案
        </h2>
        <span className="text-[11px] text-neutral-600 bg-white/[0.05] border border-white/[0.07] rounded-full px-2 py-0.5">
          {cards.length}件
        </span>
      </div>
      {cards.map((card) => (
        <ProactiveCardItem key={card.title} card={card} />
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CommandCenter() {
  const { user } = useAuth();

  const accountsQuery = trpc.accounts.list.useQuery();
  const logsQuery = trpc.logs.recent.useQuery({ limit: 10 });
  const statsQuery = trpc.scheduledPosts.getStats.useQuery({ days: 30 });

  const accounts = accountsQuery.data ?? [];
  const logs = (logsQuery.data ?? []) as LogEntry[];
  const stats = statsQuery.data;

  const accountCount = accounts.length;
  const activeCount = accounts.filter((a) => a.status === "active").length;
  const pendingCount = stats?.byStatus.pending ?? 0;

  const isLoading =
    accountsQuery.isLoading || logsQuery.isLoading || statsQuery.isLoading;

  const userName =
    (user as { username?: string } | null)?.username ?? "Admin";

  return (
    <div className="min-h-full max-w-[1200px] mx-auto px-1 py-1">
      <Header userName={userName} activeCount={activeCount} />

      <AINextActionBanner
        pendingCount={pendingCount}
        isLoading={statsQuery.isLoading}
      />

      <KPIGrid
        accountCount={accountCount}
        activeCount={activeCount}
        pendingCount={pendingCount}
        isLoading={isLoading}
      />

      <div className="grid lg:grid-cols-[1fr_380px] gap-5 mt-1">
        <LiveActivityFeed logs={logs} isLoading={logsQuery.isLoading} />
        <ProactiveCardsSidebar />
      </div>
    </div>
  );
}
