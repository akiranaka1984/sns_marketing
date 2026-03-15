import { Loader2, User, Lock, KeyRound, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

type Mode = "loading" | "setup" | "login";

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden">
      {/* Animated gradient orbs */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-[0.07] blur-[120px]"
        style={{
          background: "radial-gradient(circle, #10B981 0%, transparent 70%)",
          top: "-200px",
          right: "-100px",
          animation: "float 8s ease-in-out infinite",
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full opacity-[0.05] blur-[100px]"
        style={{
          background: "radial-gradient(circle, #4ECDC4 0%, transparent 70%)",
          bottom: "-150px",
          left: "-50px",
          animation: "float 10s ease-in-out infinite reverse",
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative z-10 w-full flex flex-col items-center px-4">
        {children}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
      `}</style>
    </div>
  );
}

function LogoSection() {
  return (
    <div className="text-center mb-10">
      {/* Logo with glow */}
      <div className="relative inline-flex mb-5">
        <div className="absolute inset-0 bg-emerald-500 rounded-2xl blur-xl opacity-30" />
        <div className="relative w-14 h-14 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <span className="text-white text-[24px] font-bold tracking-tight">S</span>
        </div>
      </div>
      <h1 className="text-2xl font-semibold text-white tracking-tight mb-1">
        SNS Marketing
      </h1>
      <p className="text-[13px] text-neutral-500">
        Automation Platform
      </p>
    </div>
  );
}

function InputField({
  icon: Icon,
  type,
  placeholder,
  value,
  onChange,
  autoComplete,
  autoFocus,
}: {
  icon: typeof User;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      className={`
        relative flex items-center gap-3 h-13 px-4
        bg-white/[0.03] rounded-xl border transition-all duration-200
        ${focused
          ? "border-emerald-500/50 shadow-[0_0_16px_rgba(16,185,129,0.08)]"
          : "border-white/[0.06] hover:border-white/[0.12]"
        }
      `}
    >
      <Icon
        className={`w-4 h-4 flex-shrink-0 transition-colors duration-200 ${
          focused ? "text-emerald-400" : "text-neutral-600"
        }`}
      />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        className="flex-1 bg-transparent text-white text-[14px] placeholder:text-neutral-600 outline-none h-full py-3"
      />
    </div>
  );
}

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<Mode>("loading");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [setupError, setSetupError] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupSuccess, setSetupSuccess] = useState("");

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
    if (!username) { setError("ユーザーIDを入力してください"); return; }
    if (!password) { setError("パスワードを入力してください"); return; }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) { onSuccess(); }
      else { setError(data.message || "ログインに失敗しました"); }
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

    if (newPassword.length < 6) { setSetupError("パスワードは6文字以上で入力してください"); return; }
    if (newPassword !== confirmPassword) { setSetupError("パスワードが一致しません"); return; }

    setSetupLoading(true);

    try {
      const res = await fetch("/api/admin/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setSetupSuccess("パスワードを設定しました");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => { setMode("login"); setSetupSuccess(""); }, 1500);
      } else {
        setSetupError(data.message || "パスワードの設定に失敗しました");
      }
    } catch {
      setSetupError("サーバーに接続できません");
    } finally {
      setSetupLoading(false);
    }
  };

  if (mode === "loading") {
    return (
      <PageWrapper>
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500 rounded-full blur-lg opacity-20 animate-pulse" />
          <Loader2 className="relative w-6 h-6 text-emerald-400 animate-spin" />
        </div>
      </PageWrapper>
    );
  }

  if (mode === "setup") {
    return (
      <PageWrapper>
        <LogoSection />
        <div className="w-full max-w-[400px]">
          <div
            className="relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 overflow-hidden"
            style={{ backdropFilter: "blur(20px)" }}
          >
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

            <form onSubmit={handleSetupSubmit}>
              <div className="flex items-center gap-2 mb-6">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <h2 className="text-[15px] font-medium text-white">
                  パスワードを設定
                </h2>
              </div>

              <div className="space-y-3">
                <InputField
                  icon={Lock}
                  type="password"
                  placeholder="新しいパスワード（6文字以上）"
                  value={newPassword}
                  onChange={(v) => { setNewPassword(v); setSetupError(""); }}
                  autoFocus
                />
                <InputField
                  icon={Lock}
                  type="password"
                  placeholder="パスワードを確認"
                  value={confirmPassword}
                  onChange={(v) => { setConfirmPassword(v); setSetupError(""); }}
                />

                {setupError && (
                  <p className="text-rose-400 text-[13px] pl-1">{setupError}</p>
                )}
                {setupSuccess && (
                  <p className="text-emerald-400 text-[13px] pl-1">{setupSuccess}</p>
                )}

                <button
                  type="submit"
                  disabled={setupLoading || !newPassword || !confirmPassword}
                  className="w-full h-12 mt-2 rounded-xl font-medium text-[14px] text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
                >
                  {setupLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      設定する
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <LogoSection />
      <div className="w-full max-w-[400px]">
        <div
          className="relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 overflow-hidden"
          style={{ backdropFilter: "blur(20px)" }}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

          <form onSubmit={handleSubmit}>
            <h2 className="text-[15px] font-medium text-neutral-400 mb-6">
              サインイン
            </h2>

            <div className="space-y-3">
              <InputField
                icon={User}
                type="text"
                placeholder="ユーザーID"
                value={username}
                onChange={(v) => { setUsername(v); setError(""); }}
                autoComplete="username"
                autoFocus
              />
              <InputField
                icon={Lock}
                type="password"
                placeholder="パスワード"
                value={password}
                onChange={(v) => { setPassword(v); setError(""); }}
                autoComplete="current-password"
              />

              {error && (
                <p className="text-rose-400 text-[13px] pl-1">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full h-12 mt-2 rounded-xl font-medium text-[14px] text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    続ける
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-neutral-700 text-center mt-8 tracking-wider uppercase">
              Authorized personnel only
            </p>
          </form>
        </div>
      </div>
    </PageWrapper>
  );
}
