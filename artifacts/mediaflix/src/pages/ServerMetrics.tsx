import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Cpu, HardDrive, MemoryStick, Network, Clock, Thermometer, Activity, LogOut } from "lucide-react";
import { useGetConfig, useGetServerMetrics, getGetServerMetricsQueryKey, useGetAuthMe, getGetAuthMeQueryKey, useAuthLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

// ── Formatters ────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatRate(bps: number): string {
  if (bps < 1024) return `${bps.toFixed(0)} B/s`;
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
  return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function usageColor(pct: number): string {
  if (pct >= 90) return "from-red-500 to-rose-500";
  if (pct >= 70) return "from-amber-500 to-orange-500";
  return "from-blue-500 to-cyan-500";
}

function tempColor(c: number): string {
  if (c >= 80) return "text-red-400";
  if (c >= 65) return "text-amber-400";
  return "text-emerald-400";
}

// ── Sub-components ────────────────────────────────────────────

function StatCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="text-white/40">{icon}</div>
        <span className="text-white/70 font-semibold text-sm uppercase tracking-wider">{title}</span>
      </div>
      {children}
    </div>
  );
}

function UsageBar({ pct, label, sublabel }: { pct: number; label: string; sublabel?: string }) {
  const color = usageColor(pct);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-white/80 text-sm font-medium truncate">{label}</span>
        {sublabel && <span className="text-white/40 text-xs flex-shrink-0 ml-2">{sublabel}</span>}
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-1">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="text-white/30 text-xs">{pct.toFixed(1)}%</div>
    </div>
  );
}

function BigGauge({ pct, label }: { pct: number; label: string }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const filled = (Math.min(pct, 100) / 100) * circ;
  const color = pct >= 90 ? "#f87171" : pct >= 70 ? "#fb923c" : "#38bdf8";
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
          <circle
            cx="60" cy="60" r={r} fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={`${filled} ${circ - filled}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.7s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-white font-bold text-2xl leading-none">{pct.toFixed(0)}%</span>
          <span className="text-white/40 text-xs mt-1">{label}</span>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function ServerMetrics() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: authStatus, isLoading: checkingAuth } = useGetAuthMe({
    query: { queryKey: getGetAuthMeQueryKey(), retry: false },
  });

  const logout = useAuthLogout({
    mutation: {
      onSuccess() {
        queryClient.clear();
        navigate("/login");
      },
    },
  });

  const { data: config } = useGetConfig();
  const { data: metrics, isLoading, dataUpdatedAt } = useGetServerMetrics({
    query: {
      queryKey: getGetServerMetricsQueryKey(),
      refetchInterval: 5_000,
      enabled: authStatus?.authenticated === true,
    },
  });

  const siteName = config?.branding?.name ?? "MediaFlix";
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : null;

  useEffect(() => {
    if (!checkingAuth && authStatus?.authenticated === false) {
      navigate("/login");
    }
  }, [checkingAuth, authStatus, navigate]);

  if (checkingAuth || !authStatus?.authenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-[#0d0d18] to-slate-950 pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              {siteName}
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/30 text-xs">
                {lastUpdated ? `Updated ${lastUpdated}` : "Refreshing every 5s"}
              </span>
            </div>
            <button
              onClick={() => logout.mutate()}
              className="flex items-center gap-1.5 text-white/25 hover:text-white/50 transition-colors text-xs"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-1">Server</h1>
        <p className="text-white/40 text-sm mb-8">Live system metrics — refreshes every 5 seconds</p>

        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex items-center gap-3 text-white/40">
              <Activity className="w-5 h-5 animate-pulse" />
              <span>Reading system metrics…</span>
            </div>
          </div>
        )}

        {metrics && (
          <div className="space-y-4">
            {/* Row 1: CPU + Memory */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CPU */}
              <StatCard icon={<Cpu className="w-4 h-4" />} title="CPU">
                <div className="flex items-start gap-6">
                  <BigGauge pct={metrics.cpu.usage_percent} label="usage" />
                  <div className="flex-1 space-y-3 pt-1">
                    <div>
                      <div className="text-white/40 text-xs mb-0.5">Processor</div>
                      <div className="text-white/80 text-sm font-medium leading-snug">{metrics.cpu.brand}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <div className="text-white/40 text-xs mb-0.5">Cores</div>
                        <div className="text-white/80 text-sm font-semibold">{metrics.cpu.cores}</div>
                      </div>
                      {metrics.cpu.temp_celsius !== null && metrics.cpu.temp_celsius !== undefined && (
                        <div>
                          <div className="text-white/40 text-xs mb-0.5 flex items-center gap-1">
                            <Thermometer className="w-3 h-3" /> Temp
                          </div>
                          <div className={`text-sm font-semibold ${tempColor(metrics.cpu.temp_celsius)}`}>
                            {metrics.cpu.temp_celsius}°C
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-white/40 text-xs mb-1">Load average</div>
                      <div className="flex gap-3 text-xs">
                        <span className="text-white/60"><span className="text-white/30">1m </span>{metrics.cpu.load_1m}</span>
                        <span className="text-white/60"><span className="text-white/30">5m </span>{metrics.cpu.load_5m}</span>
                        <span className="text-white/60"><span className="text-white/30">15m </span>{metrics.cpu.load_15m}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </StatCard>

              {/* Memory */}
              <StatCard icon={<MemoryStick className="w-4 h-4" />} title="Memory">
                <div className="flex items-start gap-6">
                  <BigGauge pct={metrics.memory.usage_percent} label="used" />
                  <div className="flex-1 space-y-3 pt-1">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      <div>
                        <div className="text-white/40 text-xs mb-0.5">Total</div>
                        <div className="text-white/80 text-sm font-semibold">{formatBytes(metrics.memory.total_bytes)}</div>
                      </div>
                      <div>
                        <div className="text-white/40 text-xs mb-0.5">Used</div>
                        <div className="text-white/80 text-sm font-semibold">{formatBytes(metrics.memory.used_bytes)}</div>
                      </div>
                      <div>
                        <div className="text-white/40 text-xs mb-0.5">Available</div>
                        <div className="text-white/80 text-sm font-semibold">{formatBytes(metrics.memory.free_bytes)}</div>
                      </div>
                    </div>
                    <div className="pt-1">
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${usageColor(metrics.memory.usage_percent)} transition-all duration-700`}
                          style={{ width: `${Math.min(metrics.memory.usage_percent, 100)}%` }}
                        />
                      </div>
                      <div className="text-white/30 text-xs mt-1">{metrics.memory.usage_percent.toFixed(1)}% used</div>
                    </div>
                  </div>
                </div>
              </StatCard>
            </div>

            {/* Row 2: Disk */}
            {metrics.disks.length > 0 && (
              <StatCard icon={<HardDrive className="w-4 h-4" />} title="Disk">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                  {metrics.disks.map((disk, i) => (
                    <UsageBar
                      key={i}
                      pct={disk.use_percent}
                      label={disk.mount}
                      sublabel={`${formatBytes(disk.used_bytes)} / ${formatBytes(disk.size_bytes)}`}
                    />
                  ))}
                </div>
              </StatCard>
            )}

            {/* Row 3: Network + Uptime */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Network */}
              <StatCard icon={<Network className="w-4 h-4" />} title="Network">
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-white/30 mb-2">
                    <span>Interface: <span className="text-white/50 font-mono">{metrics.network.iface}</span></span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-4 text-center">
                      <div className="text-white/40 text-xs mb-1 flex items-center justify-center gap-1">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                          <polyline points="17 6 23 6 23 12" />
                        </svg>
                        Download
                      </div>
                      <div className="text-white font-semibold text-lg">{formatRate(metrics.network.rx_bytes_per_sec)}</div>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-4 text-center">
                      <div className="text-white/40 text-xs mb-1 flex items-center justify-center gap-1">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                          <polyline points="17 18 23 18 23 12" />
                        </svg>
                        Upload
                      </div>
                      <div className="text-white font-semibold text-lg">{formatRate(metrics.network.tx_bytes_per_sec)}</div>
                    </div>
                  </div>
                  <p className="text-white/20 text-xs text-center">Rates calculated between refreshes</p>
                </div>
              </StatCard>

              {/* Uptime */}
              <StatCard icon={<Clock className="w-4 h-4" />} title="Uptime">
                <div className="flex flex-col items-center justify-center py-4">
                  <div className="text-4xl font-bold text-white tracking-tight mb-2">
                    {formatUptime(metrics.uptime_seconds)}
                  </div>
                  <div className="text-white/30 text-sm">
                    {(metrics.uptime_seconds / 86400).toFixed(1)} days
                  </div>
                </div>
              </StatCard>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
