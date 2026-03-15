import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type Mode = "loading" | "setup" | "login";

// Shared input class following the design spec
const inputClass = [
  "w-full h-12 px-4",
  "bg-white/[0.04] border border-white/[0.08] rounded-xl",
  "text-white text-[14px] placeholder:text-neutral-500",
  "outline-none transition-all duration-150",
  "focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20",
].join(" ");

// Shared submit button class
const buttonBase = [
  "w-full h-12 rounded-xl font-medium text-[14px] text-white",
  "bg-emerald-500 hover:bg-emerald-400",
  "transition-colors duration-150",
  "disabled:opacity-40 disabled:cursor-not-allowed",
  "flex items-center justify-center gap-2",
].join(" ");

// Shared page wrapper
function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 relative overflow-hidden">
      {/* Subtle emerald radial glow at center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(16,185,129,0.03) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 w-full flex justify-center px-4">
        {children}
      </div>
    </div>
  );
}

// Logo mark
function Logo() {
  return (
    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
      <span className="text-white text-[18px] font-semibold tracking-tight">
        S
      </span>
    </div>
  );
}

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<Mode>("loading");

  // Login mode state
  const [username, setUsername] = useState("");
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
    if (!username) {
      setError("ユーザーIDを入力してください");
      return;
    }
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
        body: JSON.stringify({ username, password }),
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

  // Loading state
  if (mode === "loading") {
    return (
      <PageWrapper>
        <Loader2 className="w-5 h-5 text-neutral-600 animate-spin" />
      </PageWrapper>
    );
  }

  // Password setup mode
  if (mode === "setup") {
    return (
      <PageWrapper>
        <div
          className="w-full max-w-[380px] bg-neutral-900/50 border border-white/[0.08] rounded-2xl backdrop-blur p-8"
          style={{ backdropFilter: "blur(12px)" }}
        >
          <form onSubmit={handleSetupSubmit}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <Logo />
              <span className="text-xl font-medium text-white tracking-tight">
                SNS Marketing
              </span>
            </div>

            <h2 className="text-[15px] font-medium text-white mb-6">
              パスワードを設定
            </h2>

            <div className="space-y-3">
              <input
                type="password"
                placeholder="新しいパスワード（6文字以上）"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setSetupError("");
                }}
                className={inputClass}
                autoFocus
              />

              <input
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
                <p className="text-rose-400 text-[13px] pt-1">{setupError}</p>
              )}

              {setupSuccess && (
                <p className="text-emerald-400 text-[13px] pt-1">
                  {setupSuccess}
                </p>
              )}

              <button
                type="submit"
                disabled={setupLoading || !newPassword || !confirmPassword}
                className={`${buttonBase} mt-2`}
              >
                {setupLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "設定する"
                )}
              </button>
            </div>
          </form>
        </div>
      </PageWrapper>
    );
  }

  // Login mode
  return (
    <PageWrapper>
      <div
        className="w-full max-w-[380px] bg-neutral-900/50 border border-white/[0.08] rounded-2xl backdrop-blur p-8"
        style={{ backdropFilter: "blur(12px)" }}
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <Logo />
            <span className="text-xl font-medium text-white tracking-tight">
              SNS Marketing
            </span>
          </div>

          <h2 className="text-[15px] font-medium text-white mb-6">
            サインイン
          </h2>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="ユーザーID"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError("");
              }}
              className={inputClass}
              autoComplete="username"
              autoFocus
            />

            <input
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              className={inputClass}
              autoComplete="current-password"
            />

            {error && (
              <p className="text-rose-400 text-[13px] pt-1">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className={`${buttonBase} mt-2`}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "続ける"
              )}
            </button>
          </div>

          <p className="text-[11px] text-neutral-700 text-center mt-6">
            Authorized personnel only
          </p>
        </form>
      </div>
    </PageWrapper>
  );
}
