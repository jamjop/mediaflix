import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Server, Eye, EyeOff } from "lucide-react";
import { useGetAuthMe, useAuthLogin, getGetAuthMeQueryKey } from "@workspace/api-client-react";

export default function Login() {
  const [, navigate] = useLocation();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: authStatus, isLoading: checkingAuth } = useGetAuthMe({
    query: { queryKey: getGetAuthMeQueryKey(), retry: false },
  });

  const login = useAuthLogin({
    mutation: {
      onSuccess(data) {
        if (data.success) {
          navigate("/server");
        } else {
          setError(data.message);
        }
      },
      onError() {
        setError("Incorrect password.");
      },
    },
  });

  useEffect(() => {
    if (authStatus?.authenticated) {
      navigate("/server");
    }
  }, [authStatus, navigate]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    login.mutate({ data: { password } });
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-[#0d0d18] to-slate-950 pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center mb-4">
            <Server className="w-5 h-5 text-white/60" />
          </div>
          <h1 className="text-xl font-semibold text-white">Server Metrics</h1>
          <p className="text-white/40 text-sm mt-1">Enter the password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm p-6 space-y-4">
          <div>
            <label className="block text-white/50 text-xs font-medium mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                autoComplete="current-password"
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 py-3 pr-10 text-white placeholder-white/20 text-sm outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400/80 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!password || login.isPending}
            className="w-full bg-white/10 hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm font-medium transition-all"
          >
            {login.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
                Checking…
              </span>
            ) : (
              "Sign in"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
