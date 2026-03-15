import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2, Brain, Zap, TrendingUp, BarChart3, Lightbulb, ExternalLink, Play, Sparkles } from "lucide-react";
import { toast } from "sonner";

type TabValue = 'posts' | 'learnings' | 'dashboard';

const industryLabels: Record<string, string> = {
  it_tech: 'IT・テック',
  beauty_fashion: '美容・ファッション',
  food_restaurant: 'フード',
  finance_investment: '金融・投資',
  health_fitness: '健康・フィットネス',
  education: '教育',
  entertainment: 'エンタメ',
  travel: '旅行',
  business: 'ビジネス',
  other: 'その他',
  uncategorized: '未分類',
};

const postTypeLabels: Record<string, string> = {
  announcement: 'お知らせ',
  empathy: '共感',
  educational: '教育的',
  humor: 'ユーモア',
  promotional: 'プロモーション',
  question: '質問',
  other: 'その他',
};

const learningTypeLabels: Record<string, string> = {
  hook_pattern: 'フック（冒頭）パターン',
  structure_pattern: '構成パターン',
  hashtag_strategy: 'ハッシュタグ戦略',
  timing_pattern: 'タイミングパターン',
  cta_pattern: 'CTA（行動喚起）パターン',
  media_usage: 'メディア活用',
  tone_pattern: 'トーンパターン',
};

const getViralityColor = (score: number) => {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
};

const getViralityBgColor = (score: number) => {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
};

export default function BuzzAnalysis() {
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<TabValue>('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = trpc.buzzAnalysis.getDashboardStats.useQuery();

  // Fetch buzz posts
  const { data: posts, isLoading: postsLoading } = trpc.buzzAnalysis.listBuzzPosts.useQuery({
    industryCategory: selectedCategory !== 'all' ? selectedCategory as any : undefined,
    limit: 50,
  });

  // Fetch learnings
  const { data: learnings, isLoading: learningsLoading } = trpc.buzzAnalysis.listLearnings.useQuery({
    limit: 50,
  });

  // Mutations
  const analyzeMutation = trpc.buzzAnalysis.analyzeBuzzPost.useMutation({
    onSuccess: (result) => {
      setAnalyzingId(null);
      if (result.success) {
        toast.success("分析が完了しました");
        utils.buzzAnalysis.listBuzzPosts.invalidate();
        utils.buzzAnalysis.getDashboardStats.invalidate();
      } else {
        toast.error(result.error || "分析に失敗しました");
      }
    },
    onError: (error) => {
      setAnalyzingId(null);
      toast.error(`分析失敗: ${error.message}`);
    },
  });

  const batchAnalyzeMutation = trpc.buzzAnalysis.batchAnalyze.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`${result.analyzed}件の投稿を分析しました`);
        utils.buzzAnalysis.listBuzzPosts.invalidate();
        utils.buzzAnalysis.getDashboardStats.invalidate();
      }
    },
    onError: (error) => {
      toast.error(`一括分析失敗: ${error.message}`);
    },
  });

  const extractPatternsMutation = trpc.buzzAnalysis.extractPatterns.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        const autoApplied = (result as any).autoApplied;
        if (autoApplied && autoApplied.appliedCount > 0) {
          toast.success(
            `${result.patterns.length}件のパターンを抽出し、全アカウントに自動適用しました（${autoApplied.appliedCount}件）`,
            { duration: 5000 }
          );
        } else {
          toast.success(`${result.patterns.length}件のパターンを抽出しました`);
        }
        utils.buzzAnalysis.listLearnings.invalidate();
        utils.buzzAnalysis.getDashboardStats.invalidate();
      } else {
        toast.error(result.error || "パターン抽出に失敗しました");
      }
    },
    onError: (error) => {
      toast.error(`パターン抽出失敗: ${error.message}`);
    },
  });

  const toggleLearningMutation = trpc.buzzAnalysis.toggleLearningActive.useMutation({
    onSuccess: () => {
      toast.success("ステータスを更新しました");
      utils.buzzAnalysis.listLearnings.invalidate();
    },
    onError: (error) => {
      toast.error(`更新失敗: ${error.message}`);
    },
  });

  const handleAnalyze = (postId: number) => {
    setAnalyzingId(postId);
    analyzeMutation.mutate({ buzzPostId: postId });
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="bg-neutral-950 border border-white/[0.06] rounded-lg p-4">
          <div>
            <p className="text-[11px] text-neutral-500 font-bold uppercase tracking-wide">バズ投稿</p>
            <p className="text-3xl font-black text-white mt-1">{stats?.totalPosts || 0}</p>
            <p className="text-[10px] text-neutral-500 mt-1 font-medium">分析済み: {stats?.analyzedPosts || 0}</p>
          </div>
        </div>
        <div className="bg-neutral-950 border border-white/[0.06] rounded-lg p-4">
          <div>
            <p className="text-[11px] text-neutral-500 font-bold uppercase tracking-wide">高バイラリティ</p>
            <p className="text-3xl font-black text-emerald-400 mt-1">{stats?.highViralityPosts || 0}</p>
            <p className="text-[10px] text-neutral-500 mt-1 font-medium">スコア70以上</p>
          </div>
        </div>
        <div className="bg-neutral-950 border border-white/[0.06] rounded-lg p-4">
          <div>
            <p className="text-[11px] text-neutral-500 font-bold uppercase tracking-wide">平均スコア</p>
            <p className={`text-3xl font-black mt-1 ${getViralityColor(stats?.avgViralityScore || 0)}`}>
              {stats?.avgViralityScore || 0}
            </p>
            <Progress value={stats?.avgViralityScore || 0} className="mt-2 h-2 border border-white/[0.06]" />
          </div>
        </div>
        <div className="bg-neutral-950 border border-white/[0.06] rounded-lg p-4">
          <div>
            <p className="text-[11px] text-neutral-500 font-bold uppercase tracking-wide">学習パターン</p>
            <p className="text-3xl font-black text-white mt-1">{stats?.totalLearnings || 0}</p>
            <p className="text-[10px] text-neutral-500 mt-1 font-medium">アクティブ: {stats?.activeLearnings || 0}</p>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">バズ投稿分析</h2>
          <p className="text-sm text-neutral-500 mt-1 font-medium">バズ投稿を分析してパターンを学習</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => batchAnalyzeMutation.mutate({ limit: 10 })}
            disabled={batchAnalyzeMutation.isPending}
            className="border border-white/[0.06] bg-neutral-950 hover:bg-neutral-900 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all font-bold"
          >
            {batchAnalyzeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Brain className="h-4 w-4 mr-2" />
            )}
            一括分析
          </Button>
          <Button
            onClick={() => extractPatternsMutation.mutate({ minViralityScore: 50, minPosts: 5 })}
            disabled={extractPatternsMutation.isPending}
            className="bg-emerald-500 hover:bg-emerald-500 text-white border border-white/[0.06] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all font-bold"
          >
            {extractPatternsMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            パターン抽出
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-neutral-950 border border-white/[0.06] rounded-lg p-5">
        {/* Tab Buttons */}
        <div className="flex gap-2 w-fit">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border border-white/[0.06] ${
              activeTab === "dashboard"
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                : "bg-neutral-900 text-neutral-500 hover:translate-x-[1px] hover:translate-y-[1px]"
            }`}
          >
            ダッシュボード
          </button>
          <button
            onClick={() => setActiveTab("posts")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border border-white/[0.06] ${
              activeTab === "posts"
                ? "bg-teal-500/20 text-teal-400 border-teal-500/30"
                : "bg-neutral-900 text-neutral-500 hover:translate-x-[1px] hover:translate-y-[1px]"
            }`}
          >
            投稿一覧 ({stats?.totalPosts || 0})
          </button>
          <button
            onClick={() => setActiveTab("learnings")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border border-white/[0.06] ${
              activeTab === "learnings"
                ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                : "bg-neutral-900 text-neutral-500 hover:translate-x-[1px] hover:translate-y-[1px]"
            }`}
          >
            学習パターン ({stats?.totalLearnings || 0})
          </button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="mt-6 space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              {/* Source Distribution */}
              <div className="bg-neutral-900 border border-white/[0.06] rounded-lg p-4">
                <h3 className="text-sm font-black text-emerald-400 mb-4 pb-2 border-b border-white/[0.06] bg-emerald-500/10 -mx-4 -mt-4 px-4 pt-4 rounded-t-md">ソース別</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-white">自アカウント</span>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-lg">{stats?.ownAccountPosts || 0}</span>
                      <Progress value={stats?.totalPosts ? ((stats.ownAccountPosts || 0) / stats.totalPosts) * 100 : 0} className="w-24 h-3 border border-white/[0.06]" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-white">モデルアカウント</span>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-lg">{stats?.modelAccountPosts || 0}</span>
                      <Progress value={stats?.totalPosts ? ((stats.modelAccountPosts || 0) / stats.totalPosts) * 100 : 0} className="w-24 h-3 border border-white/[0.06]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Distribution */}
              <div className="bg-neutral-900 border border-white/[0.06] rounded-lg p-4">
                <h3 className="text-sm font-black text-teal-400 mb-4 pb-2 border-b border-white/[0.06] bg-teal-500/10 -mx-4 -mt-4 px-4 pt-4 rounded-t-md">カテゴリ別</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {stats?.byCategory && Object.entries(stats.byCategory).map(([cat, count]) => (
                    <div key={cat} className="flex justify-between items-center">
                      <span className="text-sm font-bold text-white">{industryLabels[cat] || cat}</span>
                      <span className="inline-flex items-center px-3 py-1 border border-white/[0.06] rounded text-xs font-bold text-neutral-400 bg-neutral-800">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Learning Types */}
              <div className="bg-neutral-900 border border-white/[0.06] rounded-lg p-4 md:col-span-2">
                <h3 className="text-sm font-black text-blue-400 mb-4 pb-2 border-b border-white/[0.06] bg-blue-500/10 -mx-4 -mt-4 px-4 pt-4 rounded-t-md">学習タイプ別</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {stats?.byLearningType && Object.entries(stats.byLearningType).map(([type, count], idx) => {
                    const bgColors = ['bg-amber-500/20 border-amber-500/30 text-amber-400', 'bg-teal-500/20 border-teal-500/30 text-teal-400', 'bg-rose-500/20 border-rose-500/30 text-rose-400', 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400', 'bg-sky-500/20 border-sky-500/30 text-sky-400', 'bg-blue-500/20 border-blue-500/30 text-blue-400', 'bg-amber-500/20 border-amber-500/30 text-amber-400'];
                    return (
                      <div key={type} className={`text-center p-4 rounded-lg border ${bgColors[idx % bgColors.length]}`}>
                        <div className="text-3xl font-black">{count}</div>
                        <div className="text-xs font-bold mt-2">
                          {learningTypeLabels[type] || type}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Posts Tab */}
        {activeTab === "posts" && (
          <div className="mt-6">
            <div className="mb-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48 border border-white/[0.06] font-bold">
                  <SelectValue placeholder="カテゴリでフィルター" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {Object.entries(industryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border border-white/[0.06] rounded-lg overflow-hidden">
              <div className="grid grid-cols-7 gap-0 bg-emerald-500/10 text-xs font-black text-emerald-400 uppercase tracking-wide border-b border-white/[0.06]">
                <div className="px-3 py-3 col-span-2">コンテンツ</div>
                <div className="px-3 py-3">スコア</div>
                <div className="px-3 py-3">カテゴリ</div>
                <div className="px-3 py-3">タイプ</div>
                <div className="px-3 py-3">エンゲージメント</div>
                <div className="px-3 py-3 text-right">ステータス / アクション</div>
              </div>
              {postsLoading ? (
                <div className="px-3 py-8 text-center bg-neutral-950">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </div>
              ) : !posts || posts.length === 0 ? (
                <div className="px-3 py-8 text-center text-neutral-500 text-sm bg-neutral-950 font-medium">
                  バズ投稿がありません
                </div>
              ) : (
                posts.map((post) => (
                  <div key={post.id} className="grid grid-cols-7 gap-0 border-t border-white/[0.06] hover:bg-neutral-900 transition-colors bg-neutral-950">
                    <div className="px-3 py-3 text-xs text-white col-span-2">
                      <div className="max-w-[300px]">
                        <p className="text-sm font-medium line-clamp-2">{post.content}</p>
                        {post.postUrl && (
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-xs font-bold"
                            onClick={() => window.open(post.postUrl || '', '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            元投稿を見る
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="px-3 py-3 text-xs text-white">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full border border-white/[0.06] ${getViralityBgColor(post.viralityScore || 0)}`} />
                        <span className={`font-black text-sm ${getViralityColor(post.viralityScore || 0)}`}>
                          {post.viralityScore || 0}
                        </span>
                      </div>
                    </div>
                    <div className="px-3 py-3 text-xs text-white">
                      {post.industryCategory ? (
                        <span className="inline-flex items-center px-2 py-1 border border-white/[0.06] rounded text-xs font-bold text-neutral-400 bg-neutral-800">
                          {industryLabels[post.industryCategory] || post.industryCategory}
                        </span>
                      ) : (
                        <span className="text-neutral-500 text-sm">-</span>
                      )}
                    </div>
                    <div className="px-3 py-3 text-xs text-white">
                      {post.postType ? (
                        <span className="inline-flex items-center px-2 py-1 border border-emerald-500/30 rounded text-xs font-bold text-emerald-400 bg-emerald-500/20">
                          {postTypeLabels[post.postType] || post.postType}
                        </span>
                      ) : (
                        <span className="text-neutral-500 text-sm">-</span>
                      )}
                    </div>
                    <div className="px-3 py-3 text-xs text-white">
                      <div className="text-sm font-bold">
                        <span className="text-red-500">&#9825; {post.likesCount || 0}</span>
                        <span className="mx-1 text-neutral-500">|</span>
                        <span className="text-blue-500">&#8635; {post.sharesCount || 0}</span>
                        <span className="mx-1 text-neutral-500">|</span>
                        <span className="text-green-500">&#128172; {post.commentsCount || 0}</span>
                      </div>
                    </div>
                    <div className="px-3 py-3 text-xs text-white">
                      <div className="flex items-center justify-end gap-2">
                        <span className={`inline-flex items-center px-2 py-1 border rounded text-xs font-bold ${
                          post.isAnalyzed === 1
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-neutral-800 text-neutral-400 border-white/[0.06]"
                        }`}>
                          {post.isAnalyzed === 1 ? "分析済み" : "未分析"}
                        </span>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedPost(post)}
                              className="border border-white/[0.06] bg-neutral-900 hover:bg-neutral-800 font-bold"
                            >
                              詳細
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="font-black">投稿分析詳細</DialogTitle>
                              <DialogDescription className="font-bold">
                                バイラリティスコア: {post.viralityScore || 0}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                              <div>
                                <h4 className="font-black mb-2">コンテンツ</h4>
                                <p className="text-sm bg-neutral-950 p-3 rounded-lg border border-white/[0.06]">{post.content}</p>
                              </div>
                              {post.successFactors && (
                                <div>
                                  <h4 className="font-black mb-2">成功要因</h4>
                                  <div className="space-y-2">
                                    {JSON.parse(post.successFactors).map((factor: any, i: number) => (
                                      <div key={i} className="bg-neutral-950 p-3 rounded-lg border border-white/[0.06] text-sm">
                                        <span className="font-black">{factor.factor}</span>
                                        <span className={`ml-2 inline-flex items-center px-2 py-1 border rounded text-xs font-bold ${
                                          factor.importance === 'high'
                                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                            : factor.importance === 'medium'
                                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                            : 'bg-neutral-800 text-neutral-400 border-white/[0.06]'
                                        }`}>
                                          {factor.importance}
                                        </span>
                                        <p className="text-neutral-500 mt-1 font-medium">{factor.explanation}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {post.hookAnalysis && (
                                <div>
                                  <h4 className="font-black mb-2">フック分析</h4>
                                  <div className="bg-neutral-950 p-3 rounded-lg border border-white/[0.06] text-sm">
                                    {(() => {
                                      const hook = JSON.parse(post.hookAnalysis);
                                      return (
                                        <>
                                          <p className="font-bold"><span className="font-black">タイプ:</span> {hook.hookType}</p>
                                          <p className="font-bold"><span className="font-black">テキスト:</span> "{hook.hookText}"</p>
                                          <p className="font-bold"><span className="font-black">効果:</span> {hook.effectiveness}%</p>
                                          <p className="text-neutral-500 mt-1 font-medium">{hook.analysis}</p>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                        {post.isAnalyzed !== 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleAnalyze(post.id)}
                            disabled={analyzingId === post.id}
                            className="border border-white/[0.06] bg-white hover:bg-white"
                          >
                            {analyzingId === post.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Learnings Tab */}
        {activeTab === "learnings" && (
          <div className="mt-6">
            <div className="border border-white/[0.06] rounded-lg overflow-hidden">
              <div className="grid grid-cols-7 gap-0 bg-emerald-500/10 text-xs font-black text-emerald-400 uppercase tracking-wide border-b border-white/[0.06]">
                <div className="px-3 py-3 col-span-2">タイトル</div>
                <div className="px-3 py-3">タイプ</div>
                <div className="px-3 py-3">カテゴリ</div>
                <div className="px-3 py-3">信頼度</div>
                <div className="px-3 py-3">サンプル / 使用</div>
                <div className="px-3 py-3">ステータス</div>
              </div>
              {learningsLoading ? (
                <div className="px-3 py-8 text-center bg-neutral-950">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </div>
              ) : !learnings || learnings.length === 0 ? (
                <div className="px-3 py-8 text-center text-neutral-500 text-sm bg-neutral-950 font-medium">
                  学習パターンがありません
                </div>
              ) : (
                learnings.map((learning) => (
                  <div key={learning.id} className="grid grid-cols-7 gap-0 border-t border-white/[0.06] hover:bg-neutral-900 transition-colors bg-neutral-950">
                    <div className="px-3 py-3 text-xs text-white col-span-2">
                      <div>
                        <p className="font-black text-sm">{learning.title}</p>
                        <p className="text-[10px] text-neutral-500 line-clamp-1 font-medium mt-1">
                          {learning.description}
                        </p>
                      </div>
                    </div>
                    <div className="px-3 py-3 text-xs text-white">
                      <span className="inline-flex items-center px-2 py-1 border border-white/[0.06] rounded text-xs font-bold text-neutral-400 bg-neutral-800">
                        {learningTypeLabels[learning.learningType || ''] || learning.learningType}
                      </span>
                    </div>
                    <div className="px-3 py-3 text-xs text-white">
                      {learning.industryCategory ? (
                        <span className="inline-flex items-center px-2 py-1 border border-sky-500/30 rounded text-xs font-bold text-sky-400 bg-sky-500/20">
                          {industryLabels[learning.industryCategory] || learning.industryCategory}
                        </span>
                      ) : (
                        <span className="text-neutral-500">-</span>
                      )}
                    </div>
                    <div className="px-3 py-3 text-xs text-white">
                      <div className="flex items-center gap-2">
                        <Progress value={learning.confidence || 0} className="w-16 h-2 border border-white/[0.06]" />
                        <span className="text-sm font-bold">{learning.confidence || 0}%</span>
                      </div>
                    </div>
                    <div className="px-3 py-3 text-xs text-white">
                      <span className="font-bold">{learning.sampleSize || 0}</span>
                      <span className="text-neutral-500 mx-1">/</span>
                      <span className="font-bold">{learning.usageCount || 0}</span>
                    </div>
                    <div className="px-3 py-3 text-xs text-white">
                      <span
                        className={`inline-flex items-center px-3 py-1 border rounded text-xs font-bold cursor-pointer transition-all hover:translate-x-[1px] hover:translate-y-[1px] ${
                          learning.isActive === 1
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-neutral-800 text-neutral-400 border-white/[0.06]"
                        }`}
                        onClick={() => toggleLearningMutation.mutate({ learningId: learning.id })}
                      >
                        {learning.isActive === 1 ? "アクティブ" : "停止中"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
