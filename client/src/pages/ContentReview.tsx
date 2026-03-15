import { trpc } from "@/lib/trpc";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, X, MessageSquare, ClipboardList } from "lucide-react";
import { useState } from "react";

export default function ContentReview() {
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [feedback, setFeedback] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: reviews, refetch } = trpc.contentReview.listReviews.useQuery({ limit: 50 });

  const approveReview = trpc.contentReview.approveContent.useMutation({
    onSuccess: () => {
      toast.success("コンテンツを承認しました");
      refetch();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const rejectReview = trpc.contentReview.rejectContent.useMutation({
    onSuccess: () => {
      toast.success("コンテンツを却下しました");
      setIsDialogOpen(false);
      setFeedback("");
      refetch();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const requestRevision = trpc.contentReview.requestRevision.useMutation({
    onSuccess: () => {
      toast.success("修正を依頼しました");
      setIsDialogOpen(false);
      setFeedback("");
      refetch();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const handleReject = () => {
    if (!selectedReview) return;
    rejectReview.mutate({
      reviewId: selectedReview.id,
      feedback: feedback.trim() || "却下されました",
    });
  };

  const handleRequestRevision = () => {
    if (!selectedReview) return;
    if (!feedback.trim()) {
      toast.error("修正内容を入力してください");
      return;
    }
    requestRevision.mutate({
      reviewId: selectedReview.id,
      feedback: feedback.trim(),
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="inline-flex items-center rounded-lg border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-400">審査待ち</span>;
      case "approved":
        return <span className="inline-flex items-center rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">承認済み</span>;
      case "rejected":
        return <span className="inline-flex items-center rounded-lg border border-rose-500/30 bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-400">却下</span>;
      case "revision_requested":
        return <span className="inline-flex items-center rounded-lg border border-orange-500/30 bg-orange-500/20 px-2 py-0.5 text-xs font-bold text-orange-400">修正依頼</span>;
      default:
        return <span className="inline-flex items-center rounded-lg border border-white/[0.06] bg-neutral-800 px-2 py-0.5 text-xs font-bold text-neutral-400">{status}</span>;
    }
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="fade-in-up page-header">
        <div>
          <h2 className="text-lg font-bold text-white">コンテンツ審査</h2>
          <p className="text-xs text-neutral-500 mt-0.5 font-bold">
            リライトされたコンテンツを審査し、承認・却下・修正依頼を行います
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {reviews?.map((review: any) => (
          <div key={review.id} className="fade-in-up bg-neutral-950 rounded-lg border border-white/[0.06]">
            <div className="p-4 border-b border-white/[0.06] bg-teal-500/10 rounded-t-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">審査 #{review.id}</span>
                <div className="flex gap-2">
                  {getStatusBadge(review.status)}
                </div>
              </div>
              <p className="text-xs text-neutral-500 font-bold mt-1">
                {new Date(review.createdAt).toLocaleString("ja-JP")}
              </p>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                <div>
                  <p className="font-bold text-xs mb-2 text-neutral-500">コンテンツ:</p>
                  <p className="text-sm bg-neutral-900 border border-white/[0.06] p-4 rounded-lg font-bold text-white">{review.rewrite?.rewrittenContent || "コンテンツなし"}</p>
                </div>

                {review.feedback && (
                  <div>
                    <p className="font-bold text-xs mb-2 text-neutral-500">フィードバック:</p>
                    <p className="text-sm text-neutral-400 bg-neutral-900 border border-white/[0.06] p-4 rounded-lg font-bold">
                      {review.feedback}
                    </p>
                  </div>
                )}

                {review.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-3 py-2 text-sm font-bold text-emerald-400 hover:bg-emerald-500/30 transition-all"
                      onClick={() => approveReview.mutate({ reviewId: review.id })}
                      disabled={approveReview.isPending}
                    >
                      <Check className="h-4 w-4" />
                      承認
                    </button>
                    <Dialog
                      open={isDialogOpen && selectedReview?.id === review.id}
                      onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (open) setSelectedReview(review);
                        else {
                          setSelectedReview(null);
                          setFeedback("");
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <button className="inline-flex items-center gap-2 rounded-lg border border-white/[0.06] bg-neutral-900 px-3 py-2 text-sm font-bold text-white hover:bg-neutral-800 transition-all">
                          <MessageSquare className="h-4 w-4" />
                          修正依頼
                        </button>
                      </DialogTrigger>
                      <DialogContent className="border border-white/[0.06] bg-neutral-950">
                        <DialogHeader>
                          <DialogTitle className="text-white font-bold">修正依頼</DialogTitle>
                          <DialogDescription className="text-neutral-500 font-bold">
                            修正内容を入力してください
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="feedback" className="text-white font-bold">修正内容</Label>
                            <Textarea
                              id="feedback"
                              placeholder="修正してほしい内容を入力..."
                              value={feedback}
                              onChange={(e) => setFeedback(e.target.value)}
                              rows={5}
                              className="border border-white/[0.06] bg-neutral-900"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <button
                            className="rounded-lg border border-white/[0.06] bg-neutral-900 px-4 py-2 text-sm font-bold text-white hover:bg-neutral-800 transition-all"
                            onClick={() => {
                              setIsDialogOpen(false);
                              setFeedback("");
                            }}
                          >
                            キャンセル
                          </button>
                          <button
                            className="rounded-lg border border-amber-500/30 bg-amber-500/20 px-4 py-2 text-sm font-bold text-amber-400 hover:bg-amber-500/30 transition-all"
                            onClick={handleRequestRevision}
                            disabled={requestRevision.isPending}
                          >
                            修正依頼
                          </button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <button
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/20 px-3 py-2 text-sm font-bold text-rose-400 hover:bg-rose-500/30 transition-all"
                      onClick={() => {
                        setSelectedReview(review);
                        setIsDialogOpen(true);
                      }}
                    >
                      <X className="h-4 w-4" />
                      却下
                    </button>
                  </div>
                )}

                {review.reviewedAt && (
                  <p className="text-xs text-neutral-500 font-bold">
                    審査日時: {new Date(review.reviewedAt).toLocaleString("ja-JP")}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}

        {(!reviews || reviews.length === 0) && (
          <div className="fade-in-up bg-neutral-950 rounded-lg border border-white/[0.06]">
            <div className="flex items-center justify-center h-32">
              <p className="text-neutral-500 font-bold">審査待ちのコンテンツはありません</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
