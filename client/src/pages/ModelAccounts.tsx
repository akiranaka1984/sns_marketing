import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Trash2, RefreshCw, Download, Brain, Users, BarChart3, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type IndustryCategory = 'all' | 'it_tech' | 'beauty_fashion' | 'food_restaurant' | 'finance_investment' | 'health_fitness' | 'education' | 'entertainment' | 'travel' | 'business' | 'other';

const industryLabels: Record<string, string> = {
  it_tech: 'IT・テック',
  beauty_fashion: '美容・ファッション',
  food_restaurant: 'フード・レストラン',
  finance_investment: '金融・投資',
  health_fitness: '健康・フィットネス',
  education: '教育',
  entertainment: 'エンタメ',
  travel: '旅行',
  business: 'ビジネス',
  other: 'その他',
};

const postingStyleLabels: Record<string, string> = {
  informative: '情報提供型',
  entertaining: 'エンタメ型',
  educational: '教育型',
  inspirational: 'インスピレーション型',
  promotional: 'プロモーション型',
};

const toneStyleLabels: Record<string, string> = {
  casual: 'カジュアル',
  formal: 'フォーマル',
  humorous: 'ユーモア',
  professional: 'プロフェッショナル',
};

export default function ModelAccounts() {
  const utils = trpc.useUtils();
  const [selectedCategory, setSelectedCategory] = useState<IndustryCategory>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newIndustryCategory, setNewIndustryCategory] = useState<string>("");
  const [collectingId, setCollectingId] = useState<number | null>(null);
  const [classifyingId, setClassifyingId] = useState<number | null>(null);

  // Fetch model accounts
  const { data: accounts, isLoading } = trpc.modelAccounts.list.useQuery(
    selectedCategory === 'all' ? {} : { industryCategory: selectedCategory as any }
  );

  // Fetch stats
  const { data: stats } = trpc.modelAccounts.getStats.useQuery();

  // Mutations
  const addMutation = trpc.modelAccounts.add.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("モデルアカウントを追加しました");
        setAddDialogOpen(false);
        setNewUsername("");
        setNewIndustryCategory("");
        utils.modelAccounts.list.invalidate();
        utils.modelAccounts.getStats.invalidate();
      } else {
        toast.error(result.error || "追加に失敗しました");
      }
    },
    onError: (error) => {
      toast.error(`追加失敗: ${error.message}`);
    },
  });

  const fetchProfileMutation = trpc.modelAccounts.fetchProfile.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("プロフィールを更新しました");
        utils.modelAccounts.list.invalidate();
      } else {
        toast.error(result.error || "プロフィール取得に失敗しました");
      }
    },
    onError: (error) => {
      toast.error(`プロフィール取得失敗: ${error.message}`);
    },
  });

  const collectPostsMutation = trpc.modelAccounts.collectPosts.useMutation({
    onSuccess: (result) => {
      setCollectingId(null);
      if (result.success) {
        toast.success(`${result.collected}件の投稿を収集しました`);
        utils.modelAccounts.list.invalidate();
        utils.modelAccounts.getStats.invalidate();
      } else {
        toast.error(result.error || "投稿収集に失敗しました");
      }
    },
    onError: (error) => {
      setCollectingId(null);
      toast.error(`投稿収集失敗: ${error.message}`);
    },
  });

  const collectAllActiveMutation = trpc.modelAccounts.collectAllActive.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`合計${result.totalCollected}件の投稿を収集しました`);
        utils.modelAccounts.list.invalidate();
        utils.modelAccounts.getStats.invalidate();
      }
    },
    onError: (error) => {
      toast.error(`一括収集失敗: ${error.message}`);
    },
  });

  const autoClassifyMutation = trpc.modelAccounts.autoClassify.useMutation({
    onSuccess: (result) => {
      setClassifyingId(null);
      if (result.success) {
        toast.success("AIによる分類が完了しました");
        utils.modelAccounts.list.invalidate();
        utils.modelAccounts.getStats.invalidate();
      } else {
        toast.error(result.error || "分類に失敗しました");
      }
    },
    onError: (error) => {
      setClassifyingId(null);
      toast.error(`分類失敗: ${error.message}`);
    },
  });

  const toggleActiveMutation = trpc.modelAccounts.toggleActive.useMutation({
    onSuccess: () => {
      toast.success("ステータスを更新しました");
      utils.modelAccounts.list.invalidate();
      utils.modelAccounts.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(`ステータス更新失敗: ${error.message}`);
    },
  });

  const deleteMutation = trpc.modelAccounts.delete.useMutation({
    onSuccess: () => {
      toast.success("モデルアカウントを削除しました");
      utils.modelAccounts.list.invalidate();
      utils.modelAccounts.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(`削除失敗: ${error.message}`);
    },
  });

  const handleAdd = () => {
    if (!newUsername.trim()) {
      toast.error("ユーザー名を入力してください");
      return;
    }
    addMutation.mutate({
      platform: "twitter",
      username: newUsername.trim().replace('@', ''),
      industryCategory: newIndustryCategory as any || undefined,
    });
  };

  const handleCollect = (modelAccountId: number) => {
    setCollectingId(modelAccountId);
    collectPostsMutation.mutate({ modelAccountId, maxPosts: 20 });
  };

  const handleAutoClassify = (modelAccountId: number) => {
    setClassifyingId(modelAccountId);
    autoClassifyMutation.mutate({ modelAccountId });
  };

  const handleDelete = (modelAccountId: number) => {
    if (confirm("このモデルアカウントを削除しますか？関連する収集済み投稿も削除されます。")) {
      deleteMutation.mutate({ modelAccountId });
    }
  };

  const categoryCounts = stats?.byCategory || {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="bg-neutral-950 border border-white/[0.06] rounded-lg p-5">
          <div>
            <p className="text-xs text-neutral-500 font-bold uppercase tracking-wide">モデルアカウント</p>
            <p className="text-3xl font-black text-white mt-2">{stats?.totalAccounts || 0}</p>
            <p className="text-xs text-neutral-500 mt-1 font-bold">アクティブ: {stats?.activeAccounts || 0}</p>
          </div>
        </div>
        <div className="bg-neutral-950 border border-white/[0.06] rounded-lg p-5">
          <div>
            <p className="text-xs text-neutral-500 font-bold uppercase tracking-wide">収集済み投稿</p>
            <p className="text-3xl font-black text-white mt-2">{stats?.totalCollectedPosts || 0}</p>
            <p className="text-xs text-neutral-500 mt-1 font-bold">分析済み: {stats?.analyzedPosts || 0}</p>
          </div>
        </div>
        <div className="bg-neutral-950 border border-white/[0.06] rounded-lg p-5">
          <div>
            <p className="text-xs text-neutral-500 font-bold uppercase tracking-wide">カテゴリ</p>
            <p className="text-3xl font-black text-white mt-2">{Object.keys(categoryCounts).length}</p>
            <p className="text-xs text-neutral-500 mt-1 font-bold">業界分類数</p>
          </div>
        </div>
        <div className="bg-neutral-950 border border-white/[0.06] rounded-lg p-5">
          <div>
            <p className="text-xs text-neutral-500 font-bold uppercase tracking-wide">AI分類</p>
            <p className="text-3xl font-black text-white mt-2">GPT-4o</p>
            <p className="text-xs text-neutral-500 mt-1 font-bold">自動分類エンジン</p>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">モデルアカウント管理</h2>
          <p className="text-sm text-neutral-500 mt-1 font-medium">バズ投稿を学習するためのモデルアカウント（インフルエンサー・競合）を管理</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => collectAllActiveMutation.mutate()}
            disabled={collectAllActiveMutation.isPending}
            className="border border-white/[0.06] bg-neutral-950 hover:bg-neutral-900 font-bold transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          >
            {collectAllActiveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            一括収集
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500 hover:bg-emerald-500 text-white border border-white/[0.06] font-bold transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none">
                <Plus className="h-4 w-4 mr-2" />
                アカウント追加
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>モデルアカウント追加</DialogTitle>
                <DialogDescription>
                  学習対象のXアカウント（インフルエンサー・競合）を追加します
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Xユーザー名</Label>
                  <Input
                    id="username"
                    placeholder="@username または username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">業界カテゴリ（オプション）</Label>
                  <Select value={newIndustryCategory} onValueChange={setNewIndustryCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="カテゴリを選択..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(industryLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-neutral-500">
                    後からAIで自動分類することもできます
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={handleAdd} disabled={addMutation.isPending} className="bg-emerald-500 hover:bg-emerald-500 text-white border border-white/[0.06] font-bold">
                  {addMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  追加
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tab Buttons */}
      <div className="bg-neutral-950 border border-white/[0.06] rounded-lg p-5">
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all", label: `すべて (${stats?.totalAccounts || 0})`, active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
            { key: "it_tech", label: `IT・テック (${categoryCounts['it_tech'] || 0})`, active: "bg-teal-500/20 text-teal-400 border-teal-500/30" },
            { key: "business", label: `ビジネス (${categoryCounts['business'] || 0})`, active: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
            { key: "entertainment", label: `エンタメ (${categoryCounts['entertainment'] || 0})`, active: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
            { key: "education", label: `教育 (${categoryCounts['education'] || 0})`, active: "bg-sky-500/20 text-sky-400 border-sky-500/30" },
            { key: "other", label: `その他 (${categoryCounts['other'] || 0})`, active: "bg-neutral-700 text-neutral-300 border-white/[0.06]" },
          ].map(({ key, label, active }) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key as IndustryCategory)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                selectedCategory === key
                  ? active
                  : "bg-neutral-900 text-neutral-500 border-white/[0.06] hover:translate-x-[1px] hover:translate-y-[1px]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="mt-5 border border-white/[0.06] rounded-lg overflow-hidden">
          <div className="grid grid-cols-8 gap-0 bg-emerald-500/10 text-xs font-black text-emerald-400 uppercase tracking-wide border-b border-white/[0.06]">
            <div className="px-4 py-3">ユーザー</div>
            <div className="px-4 py-3">フォロワー</div>
            <div className="px-4 py-3">業界</div>
            <div className="px-4 py-3">投稿スタイル</div>
            <div className="px-4 py-3">トーン</div>
            <div className="px-4 py-3">収集数</div>
            <div className="px-4 py-3">ステータス</div>
            <div className="px-4 py-3 text-right">アクション</div>
          </div>
          {!accounts || accounts.length === 0 ? (
            <div className="px-4 py-12 text-center text-neutral-500 text-sm font-bold bg-neutral-950">
              モデルアカウントがありません
            </div>
          ) : (
            accounts.map((account) => (
              <div key={account.id} className="grid grid-cols-8 gap-0 border-b border-white/[0.06] last:border-b-0 hover:bg-neutral-900 transition-colors bg-neutral-950">
                <div className="px-4 py-3 text-sm text-white">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">𝕏</span>
                      <span className="font-bold">@{account.username}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 border border-white/[0.06] rounded hover:bg-emerald-500 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                        onClick={() => window.open(`https://x.com/${account.username}`, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                    {account.displayName && (
                      <span className="text-xs text-neutral-500 font-medium">{account.displayName}</span>
                    )}
                  </div>
                </div>
                <div className="px-4 py-3 text-sm text-white">
                  {account.followersCount ? (
                    <span className="font-bold">
                      {account.followersCount.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-neutral-500">-</span>
                  )}
                </div>
                <div className="px-4 py-3 text-sm text-white">
                  {account.industryCategory ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border border-emerald-500/30 bg-emerald-500/20 text-emerald-400">
                      {industryLabels[account.industryCategory] || account.industryCategory}
                    </span>
                  ) : (
                    <span className="text-neutral-500 text-xs font-medium">未分類</span>
                  )}
                </div>
                <div className="px-4 py-3 text-sm text-white">
                  {account.postingStyle ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border border-sky-500/30 bg-sky-500/20 text-sky-400">
                      {postingStyleLabels[account.postingStyle] || account.postingStyle}
                    </span>
                  ) : (
                    <span className="text-neutral-500 text-xs">-</span>
                  )}
                </div>
                <div className="px-4 py-3 text-sm text-white">
                  {account.toneStyle ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border border-blue-500/30 bg-blue-500/20 text-blue-400">
                      {toneStyleLabels[account.toneStyle] || account.toneStyle}
                    </span>
                  ) : (
                    <span className="text-neutral-500 text-xs">-</span>
                  )}
                </div>
                <div className="px-4 py-3 text-sm text-white">
                  <span className="font-bold">{account.totalCollectedPosts || 0}</span>
                  <span className="text-neutral-500 text-xs ml-1 font-medium">件</span>
                </div>
                <div className="px-4 py-3 text-sm text-white">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold cursor-pointer border transition-all ${
                      account.isActive === 1
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:translate-x-[1px] hover:translate-y-[1px]"
                        : "bg-neutral-800 text-neutral-400 border-white/[0.06] hover:bg-neutral-700"
                    }`}
                    onClick={() => toggleActiveMutation.mutate({ modelAccountId: account.id })}
                  >
                    {account.isActive === 1 ? "アクティブ" : "停止中"}
                  </span>
                </div>
                <div className="px-4 py-3 text-sm text-white">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => fetchProfileMutation.mutate({ modelAccountId: account.id })}
                      disabled={fetchProfileMutation.isPending}
                      title="プロフィール更新"
                      className="h-8 w-8 border border-white/[0.06] rounded hover:bg-neutral-800 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                    >
                      <RefreshCw className={`h-4 w-4 ${fetchProfileMutation.isPending ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCollect(account.id)}
                      disabled={collectingId === account.id}
                      title="投稿を収集"
                      className="h-8 w-8 border border-white/[0.06] rounded hover:bg-neutral-800 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                    >
                      {collectingId === account.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleAutoClassify(account.id)}
                      disabled={classifyingId === account.id}
                      title="AIで自動分類"
                      className="h-8 w-8 border border-white/[0.06] rounded hover:bg-neutral-800 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                    >
                      {classifyingId === account.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Brain className="h-4 w-4 text-white" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(account.id)}
                      disabled={deleteMutation.isPending}
                      title="削除"
                      className="h-8 w-8 border border-white/[0.06] rounded hover:bg-rose-500/20 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                    >
                      <Trash2 className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
