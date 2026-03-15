import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, Loader2, LogIn, ArrowRight } from "lucide-react";
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

  const inputClass =
    "h-12 bg-transparent border-0 border-b border-white/10 rounded-none text-white placeholder:text-neutral-600 text-[15px] focus:ring-0 focus:border-white/30 transition-colors px-0";

  // Loading state
  if (mode === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-5 h-5 text-neutral-600 animate-spin" />
        </div>
      </div>
    );
  }

  // Password setup mode
  if (mode === "setup") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 relative">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="w-full max-w-[360px] relative z-10 px-6">
          <form onSubmit={handleSetupSubmit}>
            {/* Header */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center">
                  <KeyRound className="w-4.5 h-4.5 text-neutral-950" />
                </div>
                <span className="text-[13px] font-medium text-neutral-500 tracking-wide uppercase">
                  Initial Setup
                </span>
              </div>
              <h1 className="text-[32px] font-light text-white tracking-tight leading-tight">
                パスワードを
                <br />
                設定してください
              </h1>
              <p className="text-[14px] text-neutral-500 mt-3 leading-relaxed">
                管理パネルへのアクセスに使用します
              </p>
            </div>

            <div className="space-y-6">
              <Input
                type="password"
                placeholder="新しいパスワード"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setSetupError("");
                }}
                className={inputClass}
                autoFocus
              />

              <Input
                type="password"
                placeholder="パスワードを確認"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setSetupError("");
                }}
                className={inputClass}
              />

              {setupError && (
                <p className="text-[13px] text-red-400">{setupError}</p>
              )}

              {setupSuccess && (
                <p className="text-[13px] text-emerald-400">{setupSuccess}</p>
              )}

              <Button
                type="submit"
                disabled={setupLoading || !newPassword || !confirmPassword}
                className="w-full h-12 text-[14px] font-medium bg-white hover:bg-neutral-200 text-neutral-950 rounded-lg border-0 transition-colors duration-150 disabled:opacity-30 disabled:bg-white mt-2"
              >
                {setupLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    設定する
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Login mode
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 relative">
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="w-full max-w-[360px] relative z-10 px-6">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center">
                <LogIn className="w-4.5 h-4.5 text-neutral-950" />
              </div>
              <span className="text-[13px] font-medium text-neutral-500 tracking-wide uppercase">
                SNS Marketing
              </span>
            </div>
            <h1 className="text-[32px] font-light text-white tracking-tight">
              ログイン
            </h1>
            <p className="text-[14px] text-neutral-500 mt-3">
              管理パネルにアクセス
            </p>
          </div>

          <div className="space-y-6">
            <Input
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              className={inputClass}
              autoFocus
            />

            {error && <p className="text-[13px] text-red-400">{error}</p>}

            <Button
              type="submit"
              disabled={loading || !password}
              className="w-full h-12 text-[14px] font-medium bg-white hover:bg-neutral-200 text-neutral-950 rounded-lg border-0 transition-colors duration-150 disabled:opacity-30 disabled:bg-white mt-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  ログイン
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>

          <div className="mt-12 pt-6 border-t border-white/[0.04]">
            <p className="text-[11px] text-neutral-700 text-center">
              Authorized personnel only
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
