import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ViralScorePreview } from "@/components/ViralScorePreview";
import {
  CheckCircle,
  XCircle,
  Edit,
  Clock,
  Bot,
  User,
  Calendar,
  Sparkles,
  AlertCircle,
  TrendingUp,
  Loader2
} from "lucide-react";

export default function PostReview() {
  const utils = trpc.useUtils();

  const [selectedPosts, setSelectedPosts] = useState<number[]>([]);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editContent, setEditContent] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingPostId, setRejectingPostId] = useState<number | null>(null);
  const [predictingPostId, setPredictingPostId] = useState<number | null>(null);
  const [viralPredictions, setViralPredictions] = useState<Record<number, any>>({});

  const { data: pendingPosts, isLoading } = trpc.agentScheduledPosts.getPendingReview.useQuery({
    limit: 100,
  });

  const approveMutation = trpc.agentScheduledPosts.approve.useMutation({
    onSuccess: () => {
      toast.success("承認しました");
      utils.agentScheduledPosts.getPendingReview.invalidate();
    },
  });

  const rejectMutation = trpc.agentScheduledPosts.reject.useMutation({
    onSuccess: () => {
      toast.success("却下しました");
      utils.agentScheduledPosts.getPendingReview.invalidate();
      setRejectingPostId(null);
      setRejectReason("");
    },
  });

  const editMutation = trpc.agentScheduledPosts.edit.useMutation({
    onSuccess: () => {
      toast.success("編集を保存しました");
      utils.agentScheduledPosts.getPendingReview.invalidate();
      setEditingPost(null);
    },
  });

  const bulkApproveMutation = trpc.agentScheduledPosts.bulkApprove.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.approved}件を承認しました`);
      utils.agentScheduledPosts.getPendingReview.invalidate();
      setSelectedPosts([]);
    },
  });

  const bulkRejectMutation = trpc.agentScheduledPosts.bulkReject.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.rejected}件を却下しました`);
      utils.agentScheduledPosts.getPendingReview.invalidate();
      setSelectedPosts([]);
    },
  });

  const predictScoreMutation = trpc.buzzAnalysis.predictScore.useMutation({
    onSuccess: (data, variables) => {
      // variables is the input; we need to correlate via predictingPostId
      if (predictingPostId !== null) {
        setViralPredictions(prev => ({ ...prev, [predictingPostId]: data }));
        setPredictingPostId(null);
      }
    },
    onError: (error) => {
      toast.error(`バイラル予測失敗: ${error.message}`);
      setPredictingPostId(null);
    },
  });

  const handlePredictScore = (post: any) => {
    if (predictingPostId !== null) return;
    // Toggle off if prediction is already shown
    if (viralPredictions[post.id]) {
      setViralPredictions(prev => {
        const next = { ...prev };
        delete next[post.id];
        return next;
      });
      return;
    }
    setPredictingPostId(post.id);
    predictScoreMutation.mutate({
      content: post.content,
      hasMedia: false,
    });
  };

  const handleSelectAll = () => {
    if (selectedPosts.length === pendingPosts?.length) {
      setSelectedPosts([]);
    } else {
      setSelectedPosts(pendingPosts?.map(p => p.id) || []);
    }
  };

  const handleSelectPost = (postId: number) => {
    setSelectedPosts(prev =>
      prev.includes(postId)
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    );
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case "twitter": return "bg-sky-500/20 text-sky-400";
      case "instagram": return "bg-rose-500/20 text-rose-400";
      case "tiktok": return "bg-neutral-800 text-neutral-300";
      case "facebook": return "bg-teal-500/20 text-teal-400";
      default: return "bg-neutral-800 text-neutral-400";
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <div className="space-y-5 max-w-5xl">
        {/* Header */}
        <div className="fade-in-up page-header">
          <div>
            <h1 className="page-title">投稿レビュー</h1>
            <p className="page-subtitle">
              エージェントが生成した投稿を確認・承認します
            </p>
          </div>

          {selectedPosts.length > 0 && (
            <div className="flex gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-sm font-bold text-emerald-400 transition-all hover:bg-emerald-500/30"
                onClick={() => bulkApproveMutation.mutate({ postIds: selectedPosts })}
                disabled={bulkApproveMutation.isPending}
              >
                <CheckCircle className="h-4 w-4" />
                {selectedPosts.length}件を承認
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/20 px-4 py-2 text-sm font-bold text-rose-400 transition-all hover:bg-rose-500/30"
                onClick={() => {
                  const reason = prompt("却下理由を入力してください");
                  if (reason) {
                    bulkRejectMutation.mutate({ postIds: selectedPosts, reason });
                  }
                }}
                disabled={bulkRejectMutation.isPending}
              >
                <XCircle className="h-4 w-4" />
                {selectedPosts.length}件を却下
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-3 grid-cols-3">
          <div className="fade-in-up bg-emerald-500/10 rounded-lg border border-emerald-500/20 p-4">
            <div className="pl-3">
              <p className="text-[11px] text-emerald-400 font-bold uppercase tracking-wide">レビュー待ち</p>
              <p className="text-2xl font-bold text-white mt-0.5">{pendingPosts?.length || 0}</p>
            </div>
          </div>

          <div className="fade-in-up bg-blue-500/10 rounded-lg border border-blue-500/20 p-4">
            <div className="pl-3">
              <p className="text-[11px] text-blue-400 font-bold uppercase tracking-wide">エージェント</p>
              <p className="text-2xl font-bold text-white mt-0.5">
                {new Set(pendingPosts?.map(p => p.agentId).filter(Boolean)).size}
              </p>
            </div>
          </div>

          <div className="fade-in-up bg-teal-500/10 rounded-lg border border-teal-500/20 p-4">
            <div className="pl-3">
              <p className="text-[11px] text-teal-400 font-bold uppercase tracking-wide">24時間以内</p>
              <p className="text-2xl font-bold text-white mt-0.5">
                {pendingPosts?.filter(p => {
                  const scheduledTime = new Date(p.scheduledTime);
                  const now = new Date();
                  const hoursDiff = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);
                  return hoursDiff < 24;
                }).length || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Post List */}
        <div className="fade-in-up bg-neutral-900 rounded-lg border border-white/[0.06] p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-white">レビュー待ち投稿</h3>
            {pendingPosts && pendingPosts.length > 0 && (
              <button
                className="rounded-lg border border-white/[0.06] bg-neutral-800 px-3 py-1 text-xs font-bold text-neutral-400 transition-all hover:bg-neutral-700"
                onClick={handleSelectAll}
              >
                {selectedPosts.length === pendingPosts.length ? "選択解除" : "すべて選択"}
              </button>
            )}
          </div>
          {isLoading ? (
            <div className="text-center py-8 text-neutral-500 font-bold">読み込み中...</div>
          ) : !pendingPosts || pendingPosts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto text-emerald-400 mb-4 rounded-full p-2 bg-emerald-500/10" />
              <p className="text-lg font-bold text-white">レビュー待ちの投稿はありません</p>
              <p className="text-neutral-500 font-bold">すべての投稿が処理されています</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingPosts.map((post) => (
                <div
                  key={post.id}
                  className={`border border-white/[0.06] rounded-lg p-4 transition-colors ${
                    selectedPosts.includes(post.id) ? "bg-amber-500/5 border-amber-500/20" : "bg-neutral-950"
                  }`}
                >
                  <div className="flex gap-4">
                    <Checkbox
                      checked={selectedPosts.includes(post.id)}
                      onCheckedChange={() => handleSelectPost(post.id)}
                    />

                    <div className="flex-1 space-y-3">
                      {/* Meta */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {post.agent && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-sky-500/30 text-[11px] font-bold bg-sky-500/10 text-sky-400">
                            <Bot className="h-3 w-3" />
                            {post.agent.name}
                          </span>
                        )}
                        {post.account && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border border-white/[0.06] text-[11px] font-bold ${getPlatformColor(post.account.platform)}`}>
                            @{post.account.username}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-white/[0.06] text-[11px] font-bold bg-neutral-800 text-neutral-400">
                          <Calendar className="h-3 w-3" />
                          {formatDate(post.scheduledTime)}
                        </span>
                        {post.contentConfidence && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-teal-500/30 text-[11px] font-bold bg-teal-500/10 text-teal-400">
                            <Sparkles className="h-3 w-3" />
                            信頼度: {post.contentConfidence}%
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="bg-neutral-900 border border-white/[0.06] rounded-lg p-3">
                        <p className="whitespace-pre-wrap font-bold text-white">{post.content}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap">
                        <button
                          className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-3 py-2 text-sm font-bold text-emerald-400 transition-all hover:bg-emerald-500/30"
                          onClick={() => approveMutation.mutate({ postId: post.id })}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4" />
                          承認
                        </button>
                        <button
                          className="inline-flex items-center gap-2 rounded-lg border border-white/[0.06] bg-neutral-800 px-3 py-2 text-sm font-bold text-white transition-all hover:bg-neutral-700"
                          onClick={() => {
                            setEditingPost(post);
                            setEditContent(post.content);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                          編集
                        </button>
                        <button
                          className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/20 px-3 py-2 text-sm font-bold text-rose-400 transition-all hover:bg-rose-500/30"
                          onClick={() => setRejectingPostId(post.id)}
                        >
                          <XCircle className="h-4 w-4" />
                          却下
                        </button>
                        <button
                          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition-all ${
                            viralPredictions[post.id]
                              ? "border-violet-500/30 bg-violet-500/20 text-violet-400 hover:bg-violet-500/30"
                              : "border-white/[0.06] bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                          }`}
                          onClick={() => handlePredictScore(post)}
                          disabled={predictingPostId === post.id}
                        >
                          {predictingPostId === post.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <TrendingUp className="h-4 w-4" />
                          )}
                          バイラル予測
                        </button>
                      </div>

                      {/* Viral Score Preview */}
                      {viralPredictions[post.id] && (
                        <div className="mt-3">
                          <ViralScorePreview prediction={viralPredictions[post.id]} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingPost} onOpenChange={() => setEditingPost(null)}>
        <DialogContent className="max-w-2xl border border-white/[0.06] bg-neutral-900">
          <DialogHeader>
            <DialogTitle className="text-white font-bold">投稿を編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={8}
              placeholder="投稿内容を編集..."
              className="border border-white/[0.06] bg-neutral-950"
            />
            {editingPost?.originalContent && editingPost.originalContent !== editContent && (
              <div className="text-sm text-neutral-500">
                <p className="font-bold text-white">元のコンテンツ:</p>
                <p className="bg-neutral-950 border border-white/[0.06] p-2 rounded-lg mt-1 font-bold text-white">{editingPost.originalContent}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <button
              className="rounded-lg border border-white/[0.06] bg-neutral-800 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-neutral-700"
              onClick={() => setEditingPost(null)}
            >
              キャンセル
            </button>
            <button
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-sm font-bold text-emerald-400 transition-all hover:bg-emerald-500/30"
              onClick={() => {
                editMutation.mutate({
                  postId: editingPost.id,
                  content: editContent,
                });
              }}
              disabled={editMutation.isPending}
            >
              保存して承認待ちに戻す
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectingPostId} onOpenChange={() => setRejectingPostId(null)}>
        <DialogContent className="border border-white/[0.06] bg-neutral-900">
          <DialogHeader>
            <DialogTitle className="text-white font-bold">投稿を却下</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="却下理由を入力..."
              className="border border-white/[0.06] bg-neutral-950"
            />
          </div>
          <DialogFooter>
            <button
              className="rounded-lg border border-white/[0.06] bg-neutral-800 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-neutral-700"
              onClick={() => setRejectingPostId(null)}
            >
              キャンセル
            </button>
            <button
              className="rounded-lg border border-rose-500/30 bg-rose-500/20 px-4 py-2 text-sm font-bold text-rose-400 transition-all hover:bg-rose-500/30"
              onClick={() => {
                if (rejectingPostId && rejectReason) {
                  rejectMutation.mutate({
                    postId: rejectingPostId,
                    reason: rejectReason,
                  });
                }
              }}
              disabled={!rejectReason || rejectMutation.isPending}
            >
              却下する
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
