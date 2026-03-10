import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, Loader2, LogIn, Shield } from "lucide-react";
import { useEffect, useState } from "react";

type Mode = "loading" | "setup" | "login";

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<Mode>("loading");

  // Login mode state
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Setup mode state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [setupError, setSetupError] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupSuccess, setSetupSuccess] = useState("");

  // Check password status on mount
  useEffect(() => {
    const checkPasswordStatus = async () => {
      try {
        const res = await fetch("/api/admin/password-status");
        const data = await res.json();
        setMode(data.isSet ? "login" : "setup");
      } catch {
        // Fallback to login mode if endpoint is unreachable
        setMode("login");
      }
    };

    checkPasswordStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("パスワードを入力してください");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (data.success) {
        onSuccess();
      } else {
        setError(data.message || "ログインに失敗しました");
      }
    } catch {
      setError("サーバーに接続できません");
    } finally {
      setLoading(false);
    }
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError("");
    setSetupSuccess("");

    if (newPassword.length < 6) {
      setSetupError("パスワードは6文字以上で入力してください");
      return;
    }

    if (newPassword !== confirmPassword) {
      setSetupError("パスワードが一致しません");
      return;
    }

    setSetupLoading(true);

    try {
      const res = await fetch("/api/admin/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();

      if (data.success) {
        setSetupSuccess("パスワードを設定しました。ログインしてください。");
        setNewPassword("");
        setConfirmPassword("");
        // Switch to login mode after a short delay
        setTimeout(() => {
          setMode("login");
          setSetupSuccess("");
        }, 1500);
      } else {
        setSetupError(data.message || "パスワードの設定に失敗しました");
      }
    } catch {
      setSetupError("サーバーに接続できません");
    } finally {
      setSetupLoading(false);
    }
  };

  const backgroundDecoration = (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl" />
    </div>
  );

  // Loading state
  if (mode === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {backgroundDecoration}
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          <p className="text-[13px] text-slate-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  // Password setup mode
  if (mode === "setup") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {backgroundDecoration}

        <div className="w-full max-w-sm relative z-10 px-4">
          <form
            onSubmit={handleSetupSubmit}
            className="bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 shadow-2xl shadow-black/20"
          >
            {/* Logo / Icon */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mb-5 shadow-lg shadow-blue-500/25">
                <KeyRound className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-[22px] font-semibold text-white tracking-tight">
                パスワード設定
              </h1>
              <p className="text-[13px] text-slate-400 mt-1.5">
                管理パネルのパスワードを設定してください
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="新しいパスワード"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setSetupError("");
                  }}
                  className="h-12 bg-white/[0.06] border-white/[0.08] text-white placeholder:text-slate-500 rounded-xl text-[14px] focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                  autoFocus
                />
              </div>

              <div>
                <Input
                  type="password"
                  placeholder="パスワードを確認"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setSetupError("");
                  }}
                  className="h-12 bg-white/[0.06] border-white/[0.08] text-white placeholder:text-slate-500 rounded-xl text-[14px] focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                />
              </div>

              {setupError && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[13px] text-red-300 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  {setupError}
                </div>
              )}

              {setupSuccess && (
                <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[13px] text-emerald-300 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  {setupSuccess}
                </div>
              )}

              <Button
                type="submit"
                disabled={setupLoading || !newPassword || !confirmPassword}
                className="w-full h-12 text-[14px] font-medium bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white rounded-xl border-0 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200 disabled:opacity-40"
              >
                {setupLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <KeyRound className="h-4 w-4 mr-2" />
                )}
                パスワードを設定
              </Button>
            </div>

            <p className="text-center text-[11px] text-slate-600 mt-6">
              初回設定のみ表示されます
            </p>
          </form>
        </div>
      </div>
    );
  }

  // Login mode (default)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {backgroundDecoration}

      <div className="w-full max-w-sm relative z-10 px-4">
        <form
          onSubmit={handleSubmit}
          className="bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 shadow-2xl shadow-black/20"
        >
          {/* Logo / Icon */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mb-5 shadow-lg shadow-blue-500/25">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-[22px] font-semibold text-white tracking-tight">
              SNS Marketing
            </h1>
            <p className="text-[13px] text-slate-400 mt-1.5">
              管理パネルにログイン
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="パスワード"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                className="h-12 bg-white/[0.06] border-white/[0.08] text-white placeholder:text-slate-500 rounded-xl text-[14px] focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                autoFocus
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[13px] text-red-300 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !password}
              className="w-full h-12 text-[14px] font-medium bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white rounded-xl border-0 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200 disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <LogIn className="h-4 w-4 mr-2" />
              )}
              ログイン
            </Button>
          </div>

          <p className="text-center text-[11px] text-slate-600 mt-6">
            Authorized personnel only
          </p>
        </form>
      </div>
    </div>
  );
}
