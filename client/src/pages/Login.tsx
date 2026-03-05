import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Lock } from "lucide-react";
import { useState } from "react";

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");
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
        setError(data.message || "\u30ED\u30B0\u30A4\u30F3\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
      }
    } catch {
      setError("\u30B5\u30FC\u30D0\u30FC\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-[#111]">
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="bg-[#FFFDF7] dark:bg-[#1A1A1A] border-2 border-[#1A1A1A] dark:border-[#333] rounded-lg shadow-[8px_8px_0_#1A1A1A] dark:shadow-[8px_8px_0_#000] p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-lg bg-[#FFD700] border-2 border-[#1A1A1A] flex items-center justify-center shadow-[4px_4px_0_#1A1A1A] mb-4">
              <Lock className="w-7 h-7 text-[#1A1A1A]" />
            </div>
            <h1 className="text-xl font-bold text-[#1A1A1A] dark:text-white">{"\u7BA1\u7406\u30ED\u30B0\u30A4\u30F3"}</h1>
            <p className="text-[12px] text-[#6B6B6B] font-bold mt-1">SNS Marketing Platform</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder={"\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5165\u529B"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                className="border-2 border-[#1A1A1A] dark:border-[#333] text-[14px] rounded-lg font-bold bg-[#FFFDF7] dark:bg-[#222] dark:text-white focus:ring-2 focus:ring-[#FFD700] h-11"
                autoFocus
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-[#FF6B6B] border-2 border-[#1A1A1A] text-[12px] text-[#1A1A1A] font-bold">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !password}
              className="w-full h-11 text-[14px] font-bold bg-[#FFD700] hover:bg-[#FFD700] text-[#1A1A1A] border-2 border-[#1A1A1A] rounded-lg shadow-[4px_4px_0_#1A1A1A] hover:shadow-[2px_2px_0_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Lock className="h-4 w-4 mr-2" />
              )}
              {"\u30ED\u30B0\u30A4\u30F3"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
