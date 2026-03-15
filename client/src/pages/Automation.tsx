import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  Calendar,
  Heart,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

function PropertyPill({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[13px]">
      <span className="text-neutral-400 font-bold">{label}</span>
      <span className={`font-bold ${color || 'text-white'}`}>{value}</span>
    </div>
  );
}

function StatusIndicator({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[12px] font-bold border ${
      active
        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        : 'bg-neutral-900 text-neutral-500 border-white/[0.06]'
    }`}>
      <span className={`w-[6px] h-[6px] rounded-full ${active ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
      {active ? '稼働中' : '停止中'}
    </span>
  );
}

export default function Automation() {
  const freezeStats = trpc.freeze.getStats.useQuery({ days: 30 });
  const scheduledStats = trpc.scheduledPosts.getStats.useQuery({ days: 30 });
  const engagementStats = trpc.engagement.getStats.useQuery({ days: 30 });

  return (
    <div className="min-h-full">
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-[32px] font-bold text-white mb-2">自動化管理</h1>
        <p className="text-[14px] text-neutral-500 font-bold">
          凍結検知、スケジュール投稿、自動エンゲージメントの統合管理
        </p>
      </div>

      {/* Quick Stats */}
      <div className="bg-neutral-900 rounded-lg p-4 mb-8 border border-white/[0.06]">
        <div className="flex items-center gap-6 flex-wrap">
          <PropertyPill label="凍結検知" value={`${freezeStats.data?.total || 0}件`} />
          <PropertyPill label="スケジュール投稿" value={`${scheduledStats.data?.total || 0}件`} />
          <PropertyPill label="自動エンゲージメント" value={`${engagementStats.data?.total || 0}件`} />
          <div className="flex-1" />
          <span className="text-[12px] text-neutral-400 font-bold">過去30日間</span>
        </div>
      </div>

      {/* Automation Features */}
      <div className="mb-8">
        <h2 className="text-[16px] font-bold text-white flex items-center gap-2 mb-3">
          自動化機能
        </h2>

        <div className="border border-white/[0.06] rounded-lg overflow-hidden">
          {/* Freeze Detection */}
          <Link
            href="/freeze-detection"
            className="flex items-center gap-4 px-4 py-3 border-b border-white/[0.06] hover:bg-neutral-800 transition-colors group bg-neutral-900"
          >
            <span className="w-8 h-8 flex items-center justify-center bg-amber-500/10 rounded-lg border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] text-white font-bold">
                凍結検知・自動対応
              </p>
              <p className="text-[12px] text-neutral-500 font-bold">
                アカウント凍結を自動検知し、即座に対応
              </p>
            </div>
            <div className="flex items-center gap-4 text-[13px]">
              <div className="text-right">
                <p className="text-neutral-500 font-bold">検知数</p>
                <p className="text-white font-bold">{freezeStats.data?.total || 0}件</p>
              </div>
              <div className="text-right">
                <p className="text-neutral-500 font-bold">解決率</p>
                <p className="text-white font-bold">{freezeStats.data?.resolveRate || 0}%</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>

          {/* Scheduled Posts */}
          <Link
            href="/scheduled-posts"
            className="flex items-center gap-4 px-4 py-3 border-b border-white/[0.06] hover:bg-neutral-800 transition-colors group bg-neutral-900"
          >
            <span className="w-8 h-8 flex items-center justify-center bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Calendar className="w-4 h-4 text-blue-400" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] text-white font-bold">
                スケジュール投稿
              </p>
              <p className="text-[12px] text-neutral-500 font-bold">
                指定した日時に自動的に投稿を実行
              </p>
            </div>
            <div className="flex items-center gap-4 text-[13px]">
              <div className="text-right">
                <p className="text-neutral-500 font-bold">待機中</p>
                <p className="text-white font-bold">{scheduledStats.data?.byStatus?.pending || 0}件</p>
              </div>
              <div className="text-right">
                <p className="text-neutral-500 font-bold">成功率</p>
                <p className="text-white font-bold">{scheduledStats.data?.successRate || 0}%</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>

          {/* Auto Engagement */}
          <Link
            href="/engagement"
            className="flex items-center gap-4 px-4 py-3 hover:bg-neutral-800 transition-colors group bg-neutral-900"
          >
            <span className="w-8 h-8 flex items-center justify-center bg-rose-500/10 rounded-lg border border-rose-500/20">
              <Heart className="w-4 h-4 text-rose-400" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] text-white font-bold">
                自動エンゲージメント
              </p>
              <p className="text-[12px] text-neutral-500 font-bold">
                いいね、フォロー、コメントを自動実行
              </p>
            </div>
            <div className="flex items-center gap-4 text-[13px]">
              <div className="text-right">
                <p className="text-neutral-500 font-bold">実行数</p>
                <p className="text-white font-bold">{engagementStats.data?.total || 0}件</p>
              </div>
              <div className="text-right">
                <p className="text-neutral-500 font-bold">成功率</p>
                <p className="text-white font-bold">{engagementStats.data?.successRate || 0}%</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        </div>
      </div>

      {/* System Status */}
      <div className="mb-8">
        <h2 className="text-[16px] font-bold text-white flex items-center gap-2 mb-3">
          システムステータス
        </h2>

        <div className="border border-white/[0.06] rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_120px_150px] bg-emerald-500/10 border-b border-white/[0.06]">
            <div className="px-3 py-2 text-[12px] font-bold text-white">システム</div>
            <div className="px-3 py-2 text-[12px] font-bold text-white">ステータス</div>
            <div className="px-3 py-2 text-[12px] font-bold text-white">実行間隔</div>
          </div>

          {/* Rows */}
          <div className="grid grid-cols-[1fr_120px_150px] border-b border-white/[0.06] hover:bg-neutral-800 transition-colors bg-neutral-900">
            <div className="px-3 py-2.5 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-[14px] text-white font-bold">凍結検知システム</span>
            </div>
            <div className="px-3 py-2.5">
              <StatusIndicator active={true} />
            </div>
            <div className="px-3 py-2.5 text-[13px] text-neutral-500 font-bold">
              常時監視
            </div>
          </div>

          <div className="grid grid-cols-[1fr_120px_150px] border-b border-white/[0.06] hover:bg-neutral-800 transition-colors bg-neutral-900">
            <div className="px-3 py-2.5 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-[14px] text-white font-bold">投稿スケジューラー</span>
            </div>
            <div className="px-3 py-2.5">
              <StatusIndicator active={true} />
            </div>
            <div className="px-3 py-2.5 text-[13px] text-neutral-500 font-bold">
              1分ごと
            </div>
          </div>

          <div className="grid grid-cols-[1fr_120px_150px] hover:bg-neutral-800 transition-colors bg-neutral-900">
            <div className="px-3 py-2.5 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-[14px] text-white font-bold">エンゲージメント実行</span>
            </div>
            <div className="px-3 py-2.5">
              <StatusIndicator active={true} />
            </div>
            <div className="px-3 py-2.5 text-[13px] text-neutral-500 font-bold">
              5分ごと
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Breakdown */}
      <div className="grid grid-cols-3 gap-4">
        {/* Freeze Stats */}
        <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-[13px] font-bold text-white">凍結タイプ別</span>
          </div>
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between">
              <span className="text-neutral-500 font-bold">IPブロック</span>
              <span className="text-white font-bold">{freezeStats.data?.byType?.ip_block || 0}件</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 font-bold">デバイスブロック</span>
              <span className="text-white font-bold">{freezeStats.data?.byType?.device_block || 0}件</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 font-bold">アカウント凍結</span>
              <span className="text-white font-bold">{freezeStats.data?.byType?.account_freeze || 0}件</span>
            </div>
          </div>
        </div>

        {/* Scheduled Stats */}
        <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span className="text-[13px] font-bold text-white">投稿ステータス別</span>
          </div>
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between">
              <span className="text-neutral-500 font-bold">待機中</span>
              <span className="text-white font-bold">{scheduledStats.data?.byStatus?.pending || 0}件</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 font-bold">投稿済み</span>
              <span className="text-white font-bold">{scheduledStats.data?.byStatus?.posted || 0}件</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 font-bold">失敗</span>
              <span className="text-white font-bold">{scheduledStats.data?.byStatus?.failed || 0}件</span>
            </div>
          </div>
        </div>

        {/* Engagement Stats */}
        <div className="bg-rose-500/10 rounded-lg p-4 border border-rose-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-4 h-4 text-rose-400" />
            <span className="text-[13px] font-bold text-white">エンゲージメントタイプ別</span>
          </div>
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between">
              <span className="text-neutral-500 font-bold">いいね</span>
              <span className="text-white font-bold">{engagementStats.data?.byType?.like || 0}件</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 font-bold">フォロー</span>
              <span className="text-white font-bold">{engagementStats.data?.byType?.follow || 0}件</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 font-bold">コメント</span>
              <span className="text-white font-bold">{engagementStats.data?.byType?.comment || 0}件</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
