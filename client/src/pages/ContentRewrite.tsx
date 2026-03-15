import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Wand2, Copy, Check } from "lucide-react";

export default function ContentRewrite() {
  const [originalContent, setOriginalContent] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [rewrittenContent, setRewrittenContent] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: agents } = trpc.agents.list.useQuery();
  const { data: rewrites, refetch: refetchRewrites } = trpc.contentRewrite.listRewrites.useQuery({ limit: 20 });

  const rewriteContent = trpc.contentRewrite.rewriteContent.useMutation({
    onSuccess: (data) => {
      toast.success("コンテンツをリライトしました");
      setRewrittenContent(data.rewrittenContent);
      refetchRewrites();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const handleRewrite = () => {
    if (!originalContent.trim()) {
      toast.error("リライトするコンテンツを入力してください");
      return;
    }
    if (!selectedAgentId) {
      toast.error("エージェントを選択してください");
      return;
    }

    rewriteContent.mutate({
      originalContent,
      agentId: parseInt(selectedAgentId),
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(rewrittenContent);
    setCopied(true);
    toast.success("コピーしました");
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    if (status === "completed") return <span className="inline-flex items-center rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">完了</span>;
    if (status === "pending") return <span className="inline-flex items-center rounded-lg border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-400">処理中</span>;
    if (status === "failed") return <span className="inline-flex items-center rounded-lg border border-rose-500/30 bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-400">失敗</span>;
    return <span className="inline-flex items-center rounded-lg border border-white/[0.06] bg-neutral-800 px-2 py-0.5 text-xs font-bold text-neutral-400">{status}</span>;
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="fade-in-up page-header">
        <div>
          <h2 className="text-lg font-bold text-white">AIコンテンツリライト</h2>
          <p className="text-xs text-neutral-500 mt-0.5 font-bold">
            既存のコンテンツをエージェントのペルソナに合わせてリライトします
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Input Section */}
        <div className="fade-in-up bg-neutral-950 rounded-lg border border-white/[0.06] p-4">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">元のコンテンツ</h3>
            <p className="text-xs text-neutral-500 font-bold mt-0.5">リライトしたいコンテンツを入力してください</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agent" className="font-bold text-xs text-neutral-500">エージェント選択</Label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger className="border border-white/[0.06] bg-neutral-900 font-bold">
                  <SelectValue placeholder="エージェントを選択" />
                </SelectTrigger>
                <SelectContent>
                  {agents?.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id.toString()}>
                      {agent.name} ({agent.tone} / {agent.style})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="content" className="font-bold text-xs text-neutral-500">コンテンツ</Label>
              <Textarea
                id="content"
                placeholder="リライトしたいコンテンツを入力..."
                value={originalContent}
                onChange={(e) => setOriginalContent(e.target.value)}
                rows={10}
                className="border border-white/[0.06] bg-neutral-900 font-bold"
              />
            </div>
            <Button
              onClick={handleRewrite}
              disabled={rewriteContent.isPending}
              className="w-full bg-emerald-500 hover:bg-emerald-500 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] text-white border border-white/[0.06] font-bold"
            >
              <Wand2 className="mr-2 h-4 w-4" />
              {rewriteContent.isPending ? "リライト中..." : "リライト"}
            </Button>
          </div>
        </div>

        {/* Output Section */}
        <div className="fade-in-up bg-neutral-950 rounded-lg border border-white/[0.06] p-4">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">リライト結果</h3>
            <p className="text-xs text-neutral-500 font-bold mt-0.5">AIがリライトしたコンテンツ</p>
          </div>
          <div className="space-y-4">
            {rewrittenContent ? (
              <>
                <div className="space-y-2">
                  <Label className="font-bold text-xs text-neutral-500">リライト済みコンテンツ</Label>
                  <Textarea
                    value={rewrittenContent}
                    readOnly
                    rows={10}
                    className="bg-neutral-900 border border-white/[0.06] font-bold"
                  />
                </div>
                <Button onClick={handleCopy} className="w-full bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 border border-teal-500/30 font-bold">
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      コピー済み
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      コピー
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="flex items-center justify-center h-64 text-neutral-500 font-bold">
                <p>リライト結果がここに表示されます</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rewrite History */}
      <div className="fade-in-up">
        <h3 className="text-sm font-bold text-white mb-3">リライト履歴</h3>
        <div className="grid gap-3">
          {rewrites?.map((rewrite) => (
            <div key={rewrite.id} className="bg-neutral-950 rounded-lg border border-white/[0.06] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-white">リライト #{rewrite.id}</span>
                <div className="flex items-center gap-2">
                  {getStatusBadge(rewrite.status)}
                  <span className="text-xs text-neutral-500 font-bold">
                    {new Date(rewrite.createdAt).toLocaleString("ja-JP")}
                  </span>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="font-bold text-xs mb-2 text-neutral-500">元のコンテンツ:</p>
                  <p className="text-sm text-neutral-400 bg-neutral-900 p-3 rounded-lg border border-white/[0.06] font-bold">
                    {rewrite.originalContent}
                  </p>
                </div>
                <div>
                  <p className="font-bold text-xs mb-2 text-neutral-500">リライト結果:</p>
                  <p className="text-sm text-neutral-400 bg-neutral-900 p-3 rounded-lg border border-white/[0.06] font-bold">
                    {rewrite.rewrittenContent || "処理中..."}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
