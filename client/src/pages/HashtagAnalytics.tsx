import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Hash, TrendingUp, Search, Users } from "lucide-react";

const getEngagementColor = (rate: number) => {
  if (rate >= 5) return "text-emerald-400";
  if (rate >= 3) return "text-amber-400";
  if (rate >= 1) return "text-orange-400";
  return "text-rose-400";
};

const getTrendBadgeClass = (score: number): string => {
  if (score >= 70) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (score >= 40) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  if (score >= 20) return "bg-rose-500/20 text-rose-400 border-rose-500/30";
  return "bg-neutral-800 text-neutral-400 border-white/[0.06]";
};

export default function HashtagAnalytics() {
  const [hashtagSearch, setHashtagSearch] = useState("");
  const [selectedHashtag, setSelectedHashtag] = useState("");

  const { data: hashtagRanking, isLoading: rankingLoading } =
    trpc.analytics.getHashtagRanking.useQuery({ limit: 50 }, { retry: false });

  const { data: hashtagTrends, isLoading: trendsLoading } =
    trpc.analytics.getHashtagTrends.useQuery(
      { hashtag: selectedHashtag },
      { enabled: selectedHashtag.length > 0, retry: false }
    );

  const { data: modelAccountHashtags, isLoading: modelLoading } =
    trpc.analytics.getModelAccountHashtags.useQuery({}, { retry: false });

  const handleSearchHashtag = () => {
    if (hashtagSearch.trim()) {
      setSelectedHashtag(hashtagSearch.trim().replace(/^#/, ""));
    }
  };

  const rankingData = hashtagRanking ?? [];
  const trendsData = hashtagTrends ?? [];
  const modelHashtagData = modelAccountHashtags ?? { ownTopHashtags: [], modelTopHashtags: [], recommended: [] };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="fade-in-up page-header">
        <div>
          <h2 className="text-lg font-bold text-white">
            ハッシュタグ分析
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5 font-bold">
            ハッシュタグの効果を追跡・分析
          </p>
        </div>
      </div>

      {/* Section 1: Hashtag Performance Ranking */}
      <div className="fade-in-up bg-neutral-950 rounded-lg border border-white/[0.06] p-4">
        <div className="flex items-center gap-2 mb-4">
          <Hash className="h-4 w-4 text-neutral-400" />
          <h3 className="text-sm font-bold text-white">
            ハッシュタグパフォーマンスランキング
          </h3>
        </div>

        {rankingLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          </div>
        ) : rankingData.length === 0 ? (
          <div className="py-8 text-center text-neutral-500 text-sm font-bold">
            ハッシュタグデータがありません
          </div>
        ) : (
          <div className="border border-white/[0.06] rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-emerald-500/10 border-b border-white/[0.06] hover:bg-emerald-500/10">
                  <TableHead className="text-[11px] text-emerald-400 font-bold uppercase tracking-wide">順位</TableHead>
                  <TableHead className="text-[11px] text-emerald-400 font-bold uppercase tracking-wide">ハッシュタグ</TableHead>
                  <TableHead className="text-[11px] text-emerald-400 font-bold uppercase tracking-wide">使用回数</TableHead>
                  <TableHead className="text-[11px] text-emerald-400 font-bold uppercase tracking-wide">平均いいね</TableHead>
                  <TableHead className="text-[11px] text-emerald-400 font-bold uppercase tracking-wide">平均コメント</TableHead>
                  <TableHead className="text-[11px] text-emerald-400 font-bold uppercase tracking-wide">平均シェア</TableHead>
                  <TableHead className="text-[11px] text-emerald-400 font-bold uppercase tracking-wide">平均ER</TableHead>
                  <TableHead className="text-[11px] text-emerald-400 font-bold uppercase tracking-wide">トレンドスコア</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankingData.map((item: any, index: number) => (
                  <TableRow
                    key={item.hashtag || index}
                    className="hover:bg-neutral-900 transition-colors cursor-pointer bg-neutral-950 border-b border-white/[0.06] last:border-b-0"
                    onClick={() => {
                      setHashtagSearch(item.hashtag);
                      setSelectedHashtag(item.hashtag);
                    }}
                  >
                    <TableCell className="text-xs font-bold text-white">{index + 1}</TableCell>
                    <TableCell className="text-xs text-white">
                      <span className="font-bold">#{item.hashtag}</span>
                    </TableCell>
                    <TableCell className="text-xs text-white font-bold">{item.usageCount ?? 0}</TableCell>
                    <TableCell className="text-xs text-white font-bold">{item.avgLikes?.toFixed(1) ?? "0"}</TableCell>
                    <TableCell className="text-xs text-white font-bold">{item.avgComments?.toFixed(1) ?? "0"}</TableCell>
                    <TableCell className="text-xs text-white font-bold">{item.avgShares?.toFixed(1) ?? "0"}</TableCell>
                    <TableCell className="text-xs">
                      <span className={`font-bold ${getEngagementColor(item.avgEngagementRate ?? 0)}`}>
                        {item.avgEngagementRate?.toFixed(2) ?? "0.00"}%
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold border ${getTrendBadgeClass(item.trendScore ?? 0)}`}>
                        {item.trendScore?.toFixed(0) ?? "0"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Section 2: Hashtag Trends */}
      <div className="fade-in-up bg-neutral-950 rounded-lg border border-white/[0.06] p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-neutral-400" />
          <h3 className="text-sm font-bold text-white">ハッシュタグトレンド</h3>
        </div>

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <Input
              placeholder="ハッシュタグを検索..."
              value={hashtagSearch}
              onChange={(e) => setHashtagSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearchHashtag();
              }}
              className="pl-9 border border-white/[0.06] bg-neutral-900 font-bold"
            />
          </div>
          <Button
            onClick={handleSearchHashtag}
            disabled={!hashtagSearch.trim()}
            className="bg-emerald-500 hover:bg-emerald-500 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] text-white border border-white/[0.06] font-bold"
          >
            検索
          </Button>
        </div>

        {!selectedHashtag ? (
          <div className="py-8 text-center text-neutral-500 text-sm font-bold">
            ハッシュタグを入力して検索してください
          </div>
        ) : trendsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          </div>
        ) : trendsData.length === 0 ? (
          <div className="py-8 text-center text-neutral-500 text-sm font-bold">
            「#{selectedHashtag}」のトレンドデータが見つかりません
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-neutral-500 mb-3 font-bold">
              #{selectedHashtag} のトレンド推移
            </p>
            <div className="border border-white/[0.06] rounded-lg overflow-hidden">
              {trendsData.map((entry: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06] last:border-b-0 hover:bg-neutral-900 transition-colors bg-neutral-950"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-500 w-24 font-bold">
                      {entry.period || entry.date}
                    </span>
                    <span className="text-xs font-bold text-white">
                      {entry.usageCount ?? 0} 回使用
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-rose-400 font-bold">
                      &#9825; {entry.avgLikes?.toFixed(0) ?? "0"}
                    </span>
                    <span className="text-emerald-400 font-bold">
                      &#128172; {entry.avgComments?.toFixed(0) ?? "0"}
                    </span>
                    <span className="text-sky-400 font-bold">
                      &#8635; {entry.avgShares?.toFixed(0) ?? "0"}
                    </span>
                    <span className={`font-bold ${getEngagementColor(entry.avgEngagementRate ?? 0)}`}>
                      ER: {entry.avgEngagementRate?.toFixed(2) ?? "0.00"}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Model Account Hashtags */}
      <div className="fade-in-up bg-neutral-950 rounded-lg border border-white/[0.06] p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-4 w-4 text-neutral-400" />
          <h3 className="text-sm font-bold text-white">モデルアカウントのハッシュタグ</h3>
        </div>

        {modelLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          </div>
        ) : modelHashtagData.modelTopHashtags.length === 0 && modelHashtagData.recommended.length === 0 ? (
          <div className="py-8 text-center text-neutral-500 text-sm font-bold">
            モデルアカウントのハッシュタグデータがありません
          </div>
        ) : (
          <div className="space-y-4">
            {modelHashtagData.modelTopHashtags.length > 0 && (
              <div>
                <p className="text-xs text-neutral-500 mb-2 font-bold">モデルアカウントのトップハッシュタグ</p>
                <div className="flex flex-wrap gap-1.5">
                  {modelHashtagData.modelTopHashtags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold border border-white/[0.06] text-neutral-400 bg-neutral-800 cursor-pointer hover:bg-neutral-700 transition-colors"
                      onClick={() => {
                        setHashtagSearch(tag.hashtag);
                        setSelectedHashtag(tag.hashtag.replace(/^#/, ""));
                      }}
                    >
                      #{tag.hashtag}
                      <span className="ml-1 text-neutral-500">
                        (ER: {tag.avgEngagement.toFixed(1)}%)
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {modelHashtagData.recommended.length > 0 && (
              <div>
                <p className="text-xs text-neutral-500 mb-2 font-bold">おすすめハッシュタグ</p>
                <div className="flex flex-wrap gap-1.5">
                  {modelHashtagData.recommended.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-teal-500/20 border border-teal-500/30 text-teal-400 cursor-pointer hover:bg-teal-500/30 transition-colors"
                      onClick={() => {
                        setHashtagSearch(tag);
                        setSelectedHashtag(tag.replace(/^#/, ""));
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {modelHashtagData.ownTopHashtags.length > 0 && (
              <div>
                <p className="text-xs text-neutral-500 mb-2 font-bold">自分のトップハッシュタグ</p>
                <div className="flex flex-wrap gap-1.5">
                  {modelHashtagData.ownTopHashtags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold border border-white/[0.06] text-neutral-400 bg-neutral-800 cursor-pointer hover:bg-neutral-700 transition-colors"
                      onClick={() => {
                        setHashtagSearch(tag.hashtag);
                        setSelectedHashtag(tag.hashtag.replace(/^#/, ""));
                      }}
                    >
                      #{tag.hashtag}
                      <span className="ml-1 text-neutral-500">
                        (ER: {tag.avgEngagement.toFixed(1)}%)
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
