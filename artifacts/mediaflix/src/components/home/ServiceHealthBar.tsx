import { useState } from "react";

type ServiceStatusEntry = { ok: boolean; latency_ms: number; configured: boolean };

export type HealthCheckData = {
  plex: ServiceStatusEntry;
  overseerr: ServiceStatusEntry;
  tautulli: ServiceStatusEntry;
  radarr: ServiceStatusEntry;
  sonarr: ServiceStatusEntry;
  sabnzbd: ServiceStatusEntry;
  qbittorrent: ServiceStatusEntry;
};

const SERVICE_LABELS: { key: keyof HealthCheckData; name: string }[] = [
  { key: "plex", name: "Plex" },
  { key: "overseerr", name: "Overseerr" },
  { key: "tautulli", name: "Tautulli" },
  { key: "radarr", name: "Radarr" },
  { key: "sonarr", name: "Sonarr" },
  { key: "sabnzbd", name: "SABnzbd" },
  { key: "qbittorrent", name: "qBittorrent" },
];

export function ServiceHealthBar({ health }: { health?: HealthCheckData }) {
  const [open, setOpen] = useState(false);

  if (!health) {
    return (
      <div className="h-5 w-48 bg-white/[0.04] rounded-full animate-pulse" />
    );
  }

  const configured = SERVICE_LABELS.filter((s) => health[s.key]?.configured);
  const onlineCount = configured.filter((s) => health[s.key]?.ok).length;

  if (configured.length === 0) return null;

  const allOnline = onlineCount === configured.length;
  const summaryColor = allOnline ? "text-green-400" : onlineCount === 0 ? "text-red-400" : "text-amber-400";

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="flex items-center gap-2 cursor-default select-none">
        <div className="flex items-center gap-1">
          {configured.map(({ key }) => {
            const s = health?.[key];
            return (
              <div
                key={key}
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  s?.ok ? "bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.7)]" : "bg-red-500"
                }`}
              />
            );
          })}
        </div>
        <span className={`text-xs font-medium ${summaryColor}`}>
          {onlineCount}/{configured.length} online
        </span>
      </div>

      {open && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 min-w-[200px] bg-black/90 border border-white/10 rounded-xl p-3 z-50 backdrop-blur-md shadow-2xl">
          <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-2.5">Services</p>
          <div className="space-y-1.5">
            {configured.map(({ key, name }) => {
              const s = health![key];
              return (
                <div key={key} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.ok ? "bg-green-400" : "bg-red-500"}`} />
                    <span className="text-white/70 text-xs">{name}</span>
                  </div>
                  <span className={`text-[11px] font-mono ${s.ok ? "text-white/40" : "text-red-400/70"}`}>
                    {s.ok ? `${s.latency_ms}ms` : "down"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
