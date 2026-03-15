import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function NewAccount() {
  const [, setLocation] = useLocation();
  const [platform, setPlatform] = useState<'twitter' | 'tiktok' | 'instagram' | 'facebook'>('twitter');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const utils = trpc.useUtils();

  const createMutation = trpc.accounts.create.useMutation({
    onSuccess: async () => {
      toast.success("アカウントを作成しました");
      utils.accounts.list.invalidate();
      setLocation('/accounts');
    },
    onError: (error: any) => {
      // Check if this is a duplicate account error
      if (error.data?.code === 'CONFLICT' && error.data?.cause?.accountId) {
        const accountId = error.data.cause.accountId;
        toast.error(
          `このアカウントは既に存在します。`,
          {
            action: {
              label: '詳細を見る',
              onClick: () => setLocation(`/accounts/${accountId}`)
            },
            duration: 5000
          }
        );
      } else {
        toast.error(`アカウントの作成に失敗しました: ${error.message}`);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error("すべての項目を入力してください");
      return;
    }

    createMutation.mutate({
      platform,
      username,
      password,
    });
  };

  const isLoading = createMutation.isPending;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="fade-in-up">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">新規アカウント追加</h1>
          <p className="text-sm text-neutral-500 font-bold mt-1">SNSアカウントの認証情報を入力して追加します</p>
        </div>
      </div>

      <div className="fade-in-up bg-neutral-900 rounded-lg border border-white/[0.06] p-4">
        <h3 className="text-sm font-bold text-white mb-1">アカウント情報</h3>
        <p className="text-xs text-neutral-500 font-bold mb-3">認証情報は安全に保存され、自動登録にのみ使用されます</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="platform" className="text-sm font-bold text-white">プラットフォーム</Label>
            <Select
              value={platform}
              onValueChange={(value) => setPlatform(value as typeof platform)}
            >
              <SelectTrigger id="platform" className="border border-white/[0.06] bg-neutral-950 rounded-lg font-bold">
                <SelectValue placeholder="プラットフォームを選択" />
              </SelectTrigger>
              <SelectContent className="border border-white/[0.06] bg-neutral-900">
                <SelectItem value="twitter">X Twitter</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-bold text-white">ユーザー名またはメールアドレス</Label>
            <Input
              id="username"
              type="text"
              placeholder="ユーザー名またはメールアドレスを入力"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              className="border border-white/[0.06] bg-neutral-950 rounded-lg font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-bold text-white">パスワード</Label>
            <Input
              id="password"
              type="password"
              placeholder="パスワードを入力"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="border border-white/[0.06] bg-neutral-950 rounded-lg font-bold"
            />
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border border-white/[0.06] text-white font-bold bg-neutral-950 hover:bg-neutral-900 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] rounded-lg"
              onClick={() => setLocation('/accounts')}
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              className="flex-1 gap-2 bg-emerald-500 hover:bg-emerald-600 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] text-white font-bold border border-white/[0.06] rounded-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  作成中...
                </>
              ) : (
                'アカウントを追加'
              )}
            </Button>
          </div>
        </form>
      </div>

      <div className="fade-in-up bg-neutral-900 rounded-lg border border-white/[0.06] p-4">
        <h3 className="text-sm font-bold text-white mb-1">ご利用の流れ</h3>
        <div className="space-y-3 text-sm font-bold text-neutral-500 mt-3">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold border border-amber-500/30">
              1
            </div>
            <div>
              <p className="font-bold text-white">認証情報を入力</p>
              <p>SNSプラットフォームのユーザー名/メールアドレスとパスワードを入力します</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold border border-teal-500/30">
              2
            </div>
            <div>
              <p className="font-bold text-white">デバイスを割り当て</p>
              <p>アカウント詳細画面からクラウドデバイスを割り当て、手動でログインします</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold border border-emerald-500/30">
              3
            </div>
            <div>
              <p className="font-bold text-white">管理開始</p>
              <p>ログイン完了後、アカウントの管理やマーケティング戦略の生成が可能になります</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
