import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Plus,
  Filter,
  ArrowUpDown,
  MoreHorizontal,
  Power,
  Trash2,
  Loader2,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

type Platform = "all" | "twitter" | "facebook" | "instagram" | "tiktok";
type SortField = "username" | "status" | "createdAt";
type SortOrder = "asc" | "desc";

function StatusTag({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; dot: string }> = {
    active: { bg: "bg-emerald-500/20", text: "text-emerald-400", dot: "bg-emerald-400" },
    pending: { bg: "bg-amber-500/20", text: "text-amber-400", dot: "bg-amber-400" },
    failed: { bg: "bg-rose-500/20", text: "text-rose-400", dot: "bg-rose-400" },
    suspended: { bg: "bg-rose-500/20", text: "text-rose-400", dot: "bg-rose-400" },
  };
  const { bg, text, dot } = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[12px] font-bold border border-white/[0.06] ${bg} ${text}`}>
      <span className={`w-[6px] h-[6px] rounded-full ${dot}`} />
      {status}
    </span>
  );
}

function PlanTag({ plan }: { plan: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    free: { bg: "bg-sky-500/20", text: "text-sky-400" },
    premium: { bg: "bg-blue-500/20", text: "text-blue-400" },
    premium_plus: { bg: "bg-emerald-500/20", text: "text-emerald-400" },
  };
  const labels: Record<string, string> = {
    free: "Free",
    premium: "Pro",
    premium_plus: "Pro+",
  };
  const { bg, text } = config[plan] || config.free;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[12px] font-bold border border-white/[0.06] ${bg} ${text}`}>
      {labels[plan] || plan}
    </span>
  );
}

function PropertyPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-1.5 text-[13px]">
      <span className="text-neutral-400 font-bold">{label}</span>
      <span className="text-white font-black">{value}</span>
    </div>
  );
}

export default function Accounts() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const { data: accounts, isLoading } = trpc.accounts.list.useQuery(undefined, {
    refetchInterval: 60000,
  });

  const deleteMutation = trpc.accounts.delete.useMutation({
    onSuccess: () => {
      toast.success("アカウントを削除しました");
      utils.accounts.list.invalidate();
    },
    onError: (error) => {
      toast.error(`削除失敗: ${error.message}`);
    },
  });

  const activateMutation = trpc.accounts.activate.useMutation({
    onSuccess: () => {
      toast.success("アカウントをアクティブ化しました");
      utils.accounts.list.invalidate();
    },
    onError: (error) => {
      toast.error(`アクティブ化失敗: ${error.message}`);
    },
  });

  const batchActivateMutation = trpc.accounts.batchActivate.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      utils.accounts.list.invalidate();
    },
    onError: (error) => {
      toast.error(`一括アクティブ化失敗: ${error.message}`);
    },
  });

  const handleDelete = (accountId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("このアカウントを削除してもよろしいですか？")) {
      deleteMutation.mutate({ accountId });
    }
  };

  const handleActivate = (accountId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    activateMutation.mutate({ accountId });
  };

  const getPlatformEmoji = (platform: string) => {
    const emojis: Record<string, string> = {
      twitter: "𝕏",
      tiktok: "🎵",
      instagram: "📷",
      facebook: "👥",
    };
    return emojis[platform] || "📱";
  };

  const getPlatformName = (platform: string) => {
    const names: Record<string, string> = {
      twitter: "X (Twitter)",
      tiktok: "TikTok",
      instagram: "Instagram",
      facebook: "Facebook",
    };
    return names[platform] || platform;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filteredAndSortedAccounts = accounts
    ? accounts
        .filter(account => selectedPlatform === "all" || account.platform === selectedPlatform)
        .sort((a, b) => {
          let comparison = 0;
          switch (sortField) {
            case "username":
              comparison = a.username.localeCompare(b.username);
              break;
            case "status":
              comparison = a.status.localeCompare(b.status);
              break;
            case "createdAt":
              comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
              break;
          }
          return sortOrder === "asc" ? comparison : -comparison;
        })
    : [];

  const platformCounts = accounts
    ? {
        all: accounts.length,
        twitter: accounts.filter(a => a.platform === "twitter").length,
        facebook: accounts.filter(a => a.platform === "facebook").length,
        instagram: accounts.filter(a => a.platform === "instagram").length,
        tiktok: accounts.filter(a => a.platform === "tiktok").length,
      }
    : { all: 0, twitter: 0, facebook: 0, instagram: 0, tiktok: 0 };

  const activeCount = accounts?.filter(a => a.status === 'active').length || 0;
  const pendingCount = accounts?.filter(a => a.status === 'pending').length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <span className="text-[14px] font-bold text-white">読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-[32px] font-black text-white mb-2">アカウント</h1>
        <div className="inline-block bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg">
          <p className="text-[14px] font-bold text-emerald-400">
            SNSアカウントの管理・監視
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-neutral-900 border border-white/[0.06] rounded-lg p-5 mb-6">
        <div className="flex items-center gap-6 flex-wrap">
          <PropertyPill label="アカウント総数" value={platformCounts.all} />
          <PropertyPill label="アクティブ" value={activeCount} />
          <PropertyPill label="保留中" value={pendingCount} />
          <div className="flex-1" />
          {pendingCount > 0 && (
            <button
              onClick={() => batchActivateMutation.mutate()}
              disabled={batchActivateMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-bold text-white bg-emerald-500/20 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-all disabled:opacity-50"
            >
              <Power className="w-3.5 h-3.5" />
              一括アクティブ化
            </button>
          )}
          <Link
            href="/accounts/new"
            className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-bold text-white bg-teal-500/20 border border-teal-500/30 rounded-lg hover:bg-teal-500/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            アカウント追加
          </Link>
        </div>
      </div>

      {/* Platform Filter Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {([
          { key: "all" as Platform, label: "すべて", emoji: "📋" },
          { key: "twitter" as Platform, label: "X", emoji: "𝕏" },
          { key: "instagram" as Platform, label: "Instagram", emoji: "📷" },
          { key: "tiktok" as Platform, label: "TikTok", emoji: "🎵" },
          { key: "facebook" as Platform, label: "Facebook", emoji: "👥" },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedPlatform(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold border border-white/[0.06] transition-all ${
              selectedPlatform === tab.key
                ? "bg-teal-500/20 text-teal-400 border-teal-500/30"
                : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
            }`}
          >
            <span>{tab.emoji}</span>
            {tab.label}
            <span className="text-[12px] font-black">
              {platformCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold text-neutral-400 bg-neutral-900 border border-white/[0.06] rounded-lg hover:bg-neutral-800 transition-all">
              <Filter className="w-3.5 h-3.5" />
              フィルター
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold text-neutral-400 bg-neutral-900 border border-white/[0.06] rounded-lg hover:bg-neutral-800 transition-all">
              <ArrowUpDown className="w-3.5 h-3.5" />
              ソート
            </button>
          </div>
        </div>

        <div className="border border-white/[0.06] rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_140px_100px_80px_120px_60px] bg-emerald-500/10 border-b border-white/[0.06]">
            <button
              onClick={() => handleSort("username")}
              className="px-3 py-3 text-[12px] font-black text-white text-left hover:bg-white/5 flex items-center gap-1"
            >
              名前
              {sortField === "username" && <ArrowUpDown className="w-3 h-3" />}
            </button>
            <div className="px-3 py-3 text-[12px] font-black text-white">プラットフォーム</div>
            <button
              onClick={() => handleSort("status")}
              className="px-3 py-3 text-[12px] font-black text-white text-left hover:bg-white/5 flex items-center gap-1"
            >
              ステータス
              {sortField === "status" && <ArrowUpDown className="w-3 h-3" />}
            </button>
            <div className="px-3 py-3 text-[12px] font-black text-white">プラン</div>
            <button
              onClick={() => handleSort("createdAt")}
              className="px-3 py-3 text-[12px] font-black text-white text-left hover:bg-white/5 flex items-center gap-1"
            >
              作成日
              {sortField === "createdAt" && <ArrowUpDown className="w-3 h-3" />}
            </button>
            <div className="px-3 py-3 text-[12px] font-black text-white"></div>
          </div>

          {/* Rows */}
          {filteredAndSortedAccounts.length === 0 ? (
            <div className="p-8 text-center bg-neutral-900">
              <p className="text-[14px] font-bold text-neutral-500 mb-4">アカウントがありません</p>
              <Link
                href="/accounts/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500/20 text-teal-400 text-[13px] font-bold rounded-lg border border-teal-500/30 hover:bg-teal-500/30 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                新規作成
              </Link>
            </div>
          ) : (
            filteredAndSortedAccounts.map((account) => (
              <div
                key={account.id}
                onClick={() => navigate(`/accounts/${account.id}`)}
                className="grid grid-cols-[1fr_140px_100px_80px_120px_60px] bg-neutral-900 border-b border-white/[0.06] last:border-b-0 hover:bg-neutral-800 transition-colors cursor-pointer group"
              >
                <div className="px-3 py-3 flex items-center gap-2">
                  <span className="text-[14px]">{getPlatformEmoji(account.platform)}</span>
                  <div className="min-w-0">
                    <span className="text-[14px] font-bold text-white truncate block">
                      {account.username}
                    </span>
                    {account.xHandle && (
                      <span className="text-[11px] text-neutral-500">@{account.xHandle}</span>
                    )}
                  </div>
                </div>
                <div className="px-3 py-3 text-[13px] font-bold text-white">
                  {getPlatformName(account.platform)}
                </div>
                <div className="px-3 py-3">
                  <StatusTag status={account.status} />
                </div>
                <div className="px-3 py-3">
                  {account.platform === 'twitter' ? (
                    <PlanTag plan={account.planType || 'free'} />
                  ) : (
                    <span className="text-[12px] font-bold text-neutral-500">—</span>
                  )}
                </div>
                <div className="px-3 py-3 text-[13px] font-bold text-neutral-500">
                  {new Date(account.createdAt).toLocaleDateString('ja-JP')}
                </div>
                <div className="px-3 py-3 flex items-center justify-end gap-1">
                  {account.status === 'pending' && (
                    <button
                      onClick={(e) => handleActivate(account.id, e)}
                      disabled={activateMutation.isPending}
                      title="アクティブ化"
                      className="opacity-0 group-hover:opacity-100 p-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-all text-emerald-400"
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDelete(account.id, e)}
                    disabled={deleteMutation.isPending}
                    title="削除"
                    className="opacity-0 group-hover:opacity-100 p-1.5 bg-rose-500/20 border border-rose-500/30 rounded-lg transition-all text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button className="opacity-0 group-hover:opacity-100 p-1.5 bg-neutral-800 border border-white/[0.06] rounded-lg transition-all">
                    <MoreHorizontal className="w-4 h-4 text-neutral-400" />
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Add Row */}
          {filteredAndSortedAccounts.length > 0 && (
            <Link
              href="/accounts/new"
              className="flex items-center gap-2 px-3 py-3 text-[13px] font-bold text-neutral-400 bg-neutral-900 hover:bg-neutral-800 transition-colors border-t border-white/[0.06]"
            >
              <Plus className="w-3.5 h-3.5" />
              新規追加
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
