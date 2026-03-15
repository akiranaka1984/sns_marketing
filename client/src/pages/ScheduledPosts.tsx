import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Calendar, Plus, Play, X, Clock, CheckCircle2, XCircle, Bot, Sparkles, Loader2, RefreshCw, Trash, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { calculateCharCount, getCharCountDisplay, isCharCountExceeded } from "@/lib/charCounter";

export default function ScheduledPosts() {

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<number | undefined>();
  const [selectedAccount, setSelectedAccount] = useState<number | undefined>();
  const [selectedAgent, setSelectedAgent] = useState<number | undefined>();
  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("");
  const [repeatInterval, setRepeatInterval] = useState<"none" | "daily" | "weekly" | "monthly">("none");
  const [isGenerating, setIsGenerating] = useState(false);

  const postsQuery = trpc.scheduledPosts.getAll.useQuery({ limit: 100 });
  const projectsQuery = trpc.projects.list.useQuery();
  const accountsQuery = trpc.accounts.list.useQuery();

  const selectedAccountData = accountsQuery.data?.find(a => a.id === selectedAccount);
  const agentsQuery = trpc.agents.list.useQuery();

  const generateMutation = trpc.scheduledPosts.generateWithAgent.useMutation({
    onSuccess: (data) => {
      const hashtagsText = data.hashtags?.length > 0 ? '\n\n' + data.hashtags.map((h: string) => `#${h}`).join(' ') : '';
      setContent(data.content + hashtagsText);
      toast.success(`「${data.agentName}」が投稿内容を生成しました`);
      setIsGenerating(false);
    },
    onError: (error) => {
      toast.error(`生成エラー: ${error.message}`);
      setIsGenerating(false);
    },
  });

  const createMutation = trpc.scheduledPosts.create.useMutation({
    onSuccess: () => {
      toast.success("スケジュール投稿を作成しました");
      postsQuery.refetch();
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const cancelMutation = trpc.scheduledPosts.cancel.useMutation({
    onSuccess: () => {
      toast.success("スケジュール投稿をキャンセルしました");
      postsQuery.refetch();
    },
  });

  const publishNowMutation = trpc.scheduledPosts.publishNow.useMutation({
    onSuccess: () => {
      toast.success("投稿を実行しました");
      postsQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const retryMutation = trpc.scheduledPosts.retryFailed.useMutation({
    onSuccess: () => {
      toast.success("投稿を再試行しました");
      postsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`再試行エラー: ${error.message}`);
    },
  });

  const deleteMutation = trpc.scheduledPosts.delete.useMutation({
    onSuccess: () => {
      toast.success("スケジュール投稿を削除しました");
      postsQuery.refetch();
    },
  });

  const resetForm = () => {
    setSelectedProject(undefined);
    setSelectedAccount(undefined);
    setSelectedAgent(undefined);
    setContent("");
    setMediaFiles([]);
    setMediaUrls([]);
    setScheduledTime("");
    setRepeatInterval("none");
  };

  const handleGenerateContent = () => {
    if (!selectedAgent) {
      toast.error("エージェントを選択してください");
      return;
    }
    setIsGenerating(true);
    generateMutation.mutate({ agentId: selectedAgent, accountId: selectedAccount });
  };

  const handleCreate = async () => {
    if (!selectedProject || !selectedAccount || !content || !scheduledTime) {
      toast.error("すべての項目を入力してください");
      return;
    }

    if (selectedAccountData?.platform === 'instagram' && mediaFiles.length === 0 && mediaUrls.length === 0) {
      toast.error("Instagram投稿には画像または動画が必須です");
      return;
    }

    let uploadedUrls: string[] = [...mediaUrls];
    if (mediaFiles.length > 0) {
      setIsUploadingMedia(true);
      try {
        for (const file of mediaFiles) {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('画像アップロード失敗');
          }

          const data = await response.json();
          uploadedUrls.push(data.url);
        }
      } catch (error) {
        toast.error(`画像アップロードエラー: ${error}`);
        setIsUploadingMedia(false);
        return;
      } finally {
        setIsUploadingMedia(false);
      }
    }

    createMutation.mutate({
      projectId: selectedProject,
      accountId: selectedAccount,
      content,
      mediaUrls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
      scheduledTime: new Date(scheduledTime),
      repeatInterval,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-400">
            <Clock className="h-3 w-3" />
            待機中
          </span>
        );
      case "posted":
        return (
          <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            投稿済み
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-400">
            <XCircle className="h-3 w-3" />
            失敗
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 rounded-lg border border-white/[0.06] bg-neutral-800 px-2 py-0.5 text-xs font-bold text-neutral-500">
            <X className="h-3 w-3" />
            キャンセル
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-lg border border-white/[0.06] bg-neutral-800 px-2 py-0.5 text-xs font-bold text-neutral-500">
            {status}
          </span>
        );
    }
  };

  const getRepeatBadge = (interval: string) => {
    switch (interval) {
      case "daily":
        return <span className="inline-flex items-center rounded-lg border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs font-bold text-sky-400">毎日</span>;
      case "weekly":
        return <span className="inline-flex items-center rounded-lg border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs font-bold text-blue-400">毎週</span>;
      case "monthly":
        return <span className="inline-flex items-center rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400">毎月</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">スケジュール投稿</h1>
            <p className="page-subtitle">
              指定した日時に自動的に投稿を実行
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <button className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-sm font-bold text-emerald-400 transition-all hover:bg-emerald-500/30">
                <Plus className="h-4 w-4" />
                新規作成
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border border-white/[0.06] bg-neutral-900">
              <DialogHeader>
                <DialogTitle className="text-white font-bold">スケジュール投稿を作成</DialogTitle>
                <DialogDescription className="text-neutral-500 text-sm">
                  投稿内容と実行日時を設定してください
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="project" className="text-xs font-bold text-white">プロジェクト</Label>
                  <Select
                    value={selectedProject?.toString()}
                    onValueChange={(value) => setSelectedProject(Number.parseInt(value))}
                  >
                    <SelectTrigger className="border border-white/[0.06] bg-neutral-950">
                      <SelectValue placeholder="プロジェクトを選択" />
                    </SelectTrigger>
                    <SelectContent className="border border-white/[0.06] bg-neutral-900">
                      {projectsQuery.data?.map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account" className="text-xs font-bold text-white">アカウント（投稿に使用するデバイス）</Label>
                  <Select
                    value={selectedAccount?.toString()}
                    onValueChange={(value) => setSelectedAccount(Number.parseInt(value))}
                  >
                    <SelectTrigger className="border border-white/[0.06] bg-neutral-950">
                      <SelectValue placeholder="アカウントを選択" />
                    </SelectTrigger>
                    <SelectContent className="border border-white/[0.06] bg-neutral-900">
                      {accountsQuery.data?.map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{account.platform}</span>
                            <span className="text-sm text-neutral-400">@{account.username}</span>
                            {account.deviceId ? (
                              <span className="ml-2 inline-flex items-center rounded-lg border border-white/[0.06] px-2 py-0.5 text-xs text-neutral-500">
                                デバイス: {account.deviceId.slice(0, 8)}...
                              </span>
                            ) : (
                              <span className="ml-2 inline-flex items-center rounded-lg bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 text-xs font-bold text-rose-400">
                                デバイス未設定
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agent" className="text-xs font-bold text-white">エージェント（AI自動生成）</Label>
                  <div className="flex gap-2">
                    <Select
                      value={selectedAgent?.toString()}
                      onValueChange={(value) => setSelectedAgent(Number.parseInt(value))}
                    >
                      <SelectTrigger className="flex-1 border border-white/[0.06] bg-neutral-950">
                        <SelectValue placeholder="エージェントを選択（任意）" />
                      </SelectTrigger>
                      <SelectContent className="border border-white/[0.06] bg-neutral-900">
                        {agentsQuery.data?.map((agent: any) => (
                          <SelectItem key={agent.id} value={agent.id.toString()}>
                            <div className="flex items-center gap-2">
                              <Bot className="h-4 w-4 text-teal-400" />
                              <span className="font-bold text-sm text-white">{agent.name}</span>
                              <span className="text-neutral-500 text-xs">- {agent.theme}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-500/20 px-3 py-2 text-sm font-bold text-teal-400 transition-all hover:bg-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleGenerateContent}
                      disabled={!selectedAgent || isGenerating}
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {isGenerating ? "生成中..." : "AI生成"}
                    </button>
                  </div>
                  {selectedAgent && agentsQuery.data && (
                    <p className="text-xs text-neutral-500">
                      選択したエージェントのスタイルで投稿内容を自動生成します
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="content" className="text-xs font-bold text-white">投稿内容</Label>
                    <span className={`text-sm ${
                      isCharCountExceeded(content)
                        ? 'text-red-500 font-bold'
                        : calculateCharCount(content) > 240
                          ? 'text-orange-400 font-bold'
                          : 'text-neutral-500'
                    }`}>
                      {getCharCountDisplay(content)}
                    </span>
                  </div>
                  <Textarea
                    id="content"
                    placeholder="投稿内容を入力、またはエージェントでAI生成..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={5}
                    className={`border border-white/[0.06] bg-neutral-950 text-sm ${isCharCountExceeded(content) ? 'border-red-500' : ''}`}
                  />
                  {isCharCountExceeded(content) && (
                    <p className="text-xs text-red-500">
                      文字数が上限を超えています（全角文字は2文字としてカウント）
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="media" className="text-xs font-bold text-white">画像・動画</Label>
                  {selectedAccountData?.platform === 'instagram' && (
                    <p className="text-xs text-neutral-500 mb-2">
                      ※ Instagram投稿には画像または動画が必須です
                    </p>
                  )}
                  <div className="space-y-2">
                    <Input
                      id="media"
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="border border-white/[0.06] bg-neutral-950 text-sm"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setMediaFiles(files);
                      }}
                    />
                    {mediaFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {mediaFiles.map((file, index) => (
                          <div key={index} className="relative group">
                            <div className="w-20 h-20 border border-white/[0.06] rounded-lg overflow-hidden">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`プレビュー ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <button
                              type="button"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full border border-rose-500/30 bg-rose-500/20 text-rose-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500/30"
                              onClick={() => {
                                setMediaFiles(mediaFiles.filter((_, i) => i !== index));
                              }}
                            >
                              <Trash className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduledTime" className="text-xs font-bold text-white">実行日時</Label>
                  <Input
                    id="scheduledTime"
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="border border-white/[0.06] bg-neutral-950 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="repeatInterval" className="text-xs font-bold text-white">繰り返し</Label>
                  <Select
                    value={repeatInterval}
                    onValueChange={(value: any) => setRepeatInterval(value)}
                  >
                    <SelectTrigger className="border border-white/[0.06] bg-neutral-950">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border border-white/[0.06] bg-neutral-900">
                      <SelectItem value="none">なし</SelectItem>
                      <SelectItem value="daily">毎日</SelectItem>
                      <SelectItem value="weekly">毎週</SelectItem>
                      <SelectItem value="monthly">毎月</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <button
                  className="rounded-lg border border-white/[0.06] bg-neutral-800 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-neutral-700"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  キャンセル
                </button>
                <button
                  className="rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-sm font-bold text-emerald-400 transition-all hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                >
                  作成
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Posts Table Card */}
        <div className="bg-neutral-900 rounded-lg border border-white/[0.06]">
          <div className="px-5 py-4 border-b border-white/[0.06] bg-emerald-500/10">
            <h2 className="text-sm font-bold text-white">スケジュール投稿一覧</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {postsQuery.data?.length || 0}件の投稿が登録されています
            </p>
          </div>
          <div className="p-0">
            {postsQuery.isLoading ? (
              <p className="text-center text-sm text-neutral-500 py-12">読み込み中...</p>
            ) : postsQuery.data && postsQuery.data.length > 0 ? (
              <div className="overflow-x-auto">
                {/* Table Header */}
                <div className="grid grid-cols-[60px_1fr_160px_80px_100px_50px_200px] gap-3 px-5 py-3 border-b border-white/[0.06] bg-emerald-500/10 text-xs font-bold text-white uppercase tracking-wider">
                  <div>ID</div>
                  <div>内容</div>
                  <div>実行日時</div>
                  <div>繰り返し</div>
                  <div>ステータス</div>
                  <div>検証</div>
                  <div>アクション</div>
                </div>
                {/* Table Rows */}
                {postsQuery.data.map((post) => (
                  <div
                    key={post.id}
                    className="grid grid-cols-[60px_1fr_160px_80px_100px_50px_200px] gap-3 px-5 py-3 border-b border-white/[0.06] last:border-b-0 items-center hover:bg-neutral-800 transition-colors"
                  >
                    <div className="font-mono text-xs text-neutral-500">{post.id}</div>
                    <div className="text-sm text-white truncate font-bold">{post.content}</div>
                    <div className="text-xs text-white font-bold">
                      {new Date(post.scheduledTime).toLocaleString("ja-JP")}
                    </div>
                    <div>{getRepeatBadge(post.repeatInterval)}</div>
                    <div>{getStatusBadge(post.status)}</div>
                    <div>
                      {post.screenshotUrl && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <button className="flex items-center justify-center h-8 w-8 rounded-lg border border-white/[0.06] text-neutral-500 transition-all hover:bg-neutral-800 hover:text-white">
                              <ImageIcon className="h-4 w-4" />
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl border border-white/[0.06] bg-neutral-900">
                            <DialogHeader>
                              <DialogTitle className="text-white font-bold">投稿検証スクリーンショット</DialogTitle>
                              <DialogDescription className="text-neutral-500 text-sm">
                                投稿ID: {post.id} - {new Date(post.scheduledTime).toLocaleString("ja-JP")}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="mt-4">
                              <img
                                src={post.screenshotUrl}
                                alt="投稿検証スクリーンショット"
                                className="w-full h-auto rounded-lg border border-white/[0.06]"
                              />
                            </div>
                            {post.postUrl && (
                              <div className="mt-4">
                                <Label className="text-xs font-bold text-white">投稿URL</Label>
                                <a
                                  href={post.postUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-teal-400 hover:underline text-sm font-bold"
                                >
                                  {post.postUrl}
                                </a>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {post.status === "pending" && (
                        <>
                          <button
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-1.5 text-xs font-bold text-emerald-400 transition-all hover:bg-emerald-500/30"
                            onClick={() => publishNowMutation.mutate({ id: post.id })}
                          >
                            <Play className="h-3 w-3" />
                            今すぐ実行
                          </button>
                          <button
                            className="inline-flex items-center gap-1 rounded-lg border border-white/[0.06] bg-neutral-800 px-2.5 py-1.5 text-xs font-bold text-white transition-all hover:bg-neutral-700"
                            onClick={() => cancelMutation.mutate({ id: post.id })}
                          >
                            <X className="h-3 w-3" />
                            キャンセル
                          </button>
                        </>
                      )}
                      {post.status === "failed" && (
                        <button
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-400 transition-all hover:bg-amber-500/20"
                          onClick={() => retryMutation.mutate({ id: post.id })}
                        >
                          <RefreshCw className="h-3 w-3" />
                          再試行
                        </button>
                      )}
                      <button
                        className="inline-flex items-center rounded-lg border border-rose-500/30 bg-rose-500/20 px-2.5 py-1.5 text-xs font-bold text-rose-400 transition-all hover:bg-rose-500/30"
                        onClick={() => deleteMutation.mutate({ id: post.id })}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-neutral-500 py-12">
                スケジュール投稿がありません
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
