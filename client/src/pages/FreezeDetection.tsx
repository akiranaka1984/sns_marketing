import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  RefreshCw,
  Filter,
  ArrowUpDown,
} from "lucide-react";

function StatusTag({ success }: { success: boolean }) {
  return success ? (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[12px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
      <span className="w-[6px] h-[6px] rounded-full bg-emerald-400" />
      成功
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[12px] bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold">
      <span className="w-[6px] h-[6px] rounded-full bg-rose-400" />
      失敗
    </span>
  );
}

function DetectionTypeTag({ type }: { type: string }) {
  const config: Record<string, { bg: string; text: string; border: string }> = {
    ip_block: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30" },
    device_block: { bg: "bg-rose-500/20", text: "text-rose-400", border: "border-rose-500/30" },
    account_freeze: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
  };
  const labels: Record<string, string> = {
    ip_block: "IPブロック",
    device_block: "デバイスブロック",
    account_freeze: "アカウント凍結",
  };
  const { bg, text, border } = config[type] || { bg: "bg-sky-500/20", text: "text-sky-400", border: "border-sky-500/30" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[12px] ${bg} ${text} border ${border} font-bold`}>
      {labels[type] || type}
    </span>
  );
}

function ActionTag({ action }: { action: string }) {
  const labels: Record<string, string> = {
    ip_change: "IP変更",
    device_switch: "デバイス切替",
    account_pause: "一時停止",
    none: "対応なし",
  };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[12px] bg-teal-500/20 text-teal-400 border border-teal-500/30 font-bold">
      {labels[action] || action}
    </span>
  );
}

function PropertyPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-1.5 text-[13px]">
      <span className="text-neutral-500 font-bold">{label}</span>
      <span className="text-white font-bold">{value}</span>
    </div>
  );
}

export default function FreezeDetection() {
  const [filterType, setFilterType] = useState<string>("all");
  const [filterAccount, setFilterAccount] = useState<string>("all");

  const detectionsQuery = trpc.freeze.getAll.useQuery({ limit: 100 });
  const accountsQuery = trpc.accounts.list.useQuery();

  const filteredDetections = detectionsQuery.data?.filter((detection: any) => {
    if (filterType !== "all" && detection.detectionType !== filterType) return false;
    if (filterAccount !== "all" && detection.accountId.toString() !== filterAccount) return false;
    return true;
  });

  const successCount = filteredDetections?.filter((d: any) => d.actionSuccess).length || 0;
  const failedCount = filteredDetections?.filter((d: any) => !d.actionSuccess).length || 0;

  return (
    <div className="min-h-full">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <h1 className="text-[32px] font-bold text-white">凍結検知ログ</h1>
        </div>
        <p className="text-[14px] text-neutral-500 font-bold">
          アカウント凍結の検知履歴と自動対応の結果
        </p>
      </div>

      <div className="bg-neutral-950 rounded-lg p-4 mb-6 border border-white/[0.06]">
        <div className="flex items-center gap-6 flex-wrap">
          <PropertyPill label="検知数" value={`${filteredDetections?.length || 0}件`} />
          <PropertyPill label="成功" value={`${successCount}件`} />
          <PropertyPill label="失敗" value={`${failedCount}件`} />
          <div className="flex-1" />
          <button
            onClick={() => detectionsQuery.refetch()}
            disabled={detectionsQuery.isLoading}
            className="flex items-center gap-1.5 text-[13px] text-white font-bold hover:underline disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${detectionsQuery.isLoading ? "animate-spin" : ""}`} />
            更新
          </button>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-[16px] font-bold text-white flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4" />
          フィルター
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-neutral-500 font-bold">検知タイプ</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 text-[13px] border border-white/[0.06] rounded-lg bg-neutral-900 text-white font-bold focus:outline-none"
            >
              <option value="all">すべて</option>
              <option value="ip_block">IPブロック</option>
              <option value="device_block">デバイスブロック</option>
              <option value="account_freeze">アカウント凍結</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-neutral-500 font-bold">アカウント</span>
            <select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className="px-3 py-1.5 text-[13px] border border-white/[0.06] rounded-lg bg-neutral-900 text-white font-bold focus:outline-none"
            >
              <option value="all">すべて</option>
              {accountsQuery.data?.map((account) => (
                <option key={account.id} value={account.id.toString()}>
                  {account.username}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-bold text-white flex items-center gap-2">
            検知履歴
          </h2>
          <div className="flex items-center gap-1">
            <button className="flex items-center gap-1 px-2 py-1 text-[12px] text-white hover:bg-neutral-900 rounded-lg transition-colors font-bold border border-white/[0.06] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]">
              <ArrowUpDown className="w-3.5 h-3.5" />
              ソート
            </button>
          </div>
        </div>

        <div className="border border-white/[0.06] rounded-lg overflow-hidden">
          <div className="grid grid-cols-[180px_1fr_120px_100px_80px_1fr] bg-emerald-500/10 border-b border-white/[0.06]">
            <div className="px-3 py-2 text-[12px] font-bold text-emerald-400">検知日時</div>
            <div className="px-3 py-2 text-[12px] font-bold text-emerald-400">アカウント</div>
            <div className="px-3 py-2 text-[12px] font-bold text-emerald-400">検知タイプ</div>
            <div className="px-3 py-2 text-[12px] font-bold text-emerald-400">自動対応</div>
            <div className="px-3 py-2 text-[12px] font-bold text-emerald-400">結果</div>
            <div className="px-3 py-2 text-[12px] font-bold text-emerald-400">詳細</div>
          </div>

          {detectionsQuery.isLoading ? (
            <div className="p-8 text-center text-[13px] text-neutral-500 bg-neutral-950">
              読み込み中...
            </div>
          ) : filteredDetections && filteredDetections.length > 0 ? (
            filteredDetections.map((detection: any) => {
              const account = accountsQuery.data?.find((a) => a.id === detection.accountId);
              return (
                <div
                  key={detection.id}
                  className="grid grid-cols-[180px_1fr_120px_100px_80px_1fr] border-b border-white/[0.06] last:border-b-0 hover:bg-neutral-900 transition-colors bg-neutral-950"
                >
                  <div className="px-3 py-2.5 text-[13px] text-white font-bold">
                    {new Date(detection.detectedAt).toLocaleString("ja-JP", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="px-3 py-2.5 text-[13px] text-white font-bold">
                    {account?.username || `ID: ${detection.accountId}`}
                  </div>
                  <div className="px-3 py-2.5">
                    <DetectionTypeTag type={detection.detectionType} />
                  </div>
                  <div className="px-3 py-2.5">
                    <ActionTag action={detection.autoAction} />
                  </div>
                  <div className="px-3 py-2.5">
                    <StatusTag success={detection.actionSuccess} />
                  </div>
                  <div className="px-3 py-2.5 text-[13px] text-neutral-500 truncate font-bold">
                    {detection.details || "—"}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center bg-neutral-950">
              <AlertTriangle className="w-10 h-10 text-neutral-500 mx-auto mb-3 opacity-50" />
              <p className="text-[13px] text-neutral-500 font-bold">検知記録がありません</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
