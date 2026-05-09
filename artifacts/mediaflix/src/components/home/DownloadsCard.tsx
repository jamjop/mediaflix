import { useState } from "react";

export type DownloadSlot = {
  filename: string;
  percentage: string;
  size: string;
  sizeleft: string;
  status: string;
  timeleft: string;
  cat: string;
  source: string;
};

export type DownloadHistorySlot = {
  filename: string;
  size: string;
  source: string;
  completed_at?: number | null;
};

export type DownloadsData = {
  speed: string;
  kbpersec: string;
  mb: string;
  mbleft: string;
  diskspace1: string;
  noofslots: number;
  slots: DownloadSlot[];
  history: DownloadHistorySlot[];
  configured: boolean;
  qbt_configured: boolean;
};

function formatCompletedAt(ts: number | null | undefined): string {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  const now = new Date();
  const diffHours = (now.getTime() - d.getTime()) / 3600000;
  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-24 bg-white/[0.06] rounded animate-pulse" />
        <div className="h-3 w-28 bg-white/[0.06] rounded animate-pulse" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-full bg-white/[0.06] rounded animate-pulse" />
            <div className="h-1.5 w-full bg-white/[0.06] rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DownloadsCard({
  downloads,
  sabnzbdUrl,
  qbittorrentUrl,
}: {
  downloads?: DownloadsData;
  sabnzbdUrl: string;
  qbittorrentUrl: string;
}) {
  const [showHistory, setShowHistory] = useState(false);

  if (!downloads) return <CardSkeleton />;

  const slots = downloads.slots ?? [];
  const history = downloads.history ?? [];
  const configured = downloads.configured ?? false;
  const speed = downloads.speed ?? "0";
  const kbpersec = parseFloat(downloads.kbpersec ?? "0");
  const diskspace1 = parseFloat(downloads.diskspace1 ?? "0");
  const isDownloading = kbpersec > 0;
  const diskGB = diskspace1 > 0 ? diskspace1.toFixed(1) : null;
  const speedDisplay = speed && speed !== "0" ? `${speed}B/s` : "0 B/s";

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isDownloading ? "bg-blue-400 animate-pulse" : "bg-white/20"}`} />
          <span className="text-white/90 font-semibold text-sm">Downloads</span>
        </div>
        <div className="flex items-center gap-3 text-white/40 text-xs">
          {configured && (
            <>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
                {speedDisplay}
              </span>
              {diskGB && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                  </svg>
                  {diskGB} GB free
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {slots.length > 0 ? (
        <div className="space-y-3">
          {slots.slice(0, 5).map((slot, i) => {
            const pct = parseFloat(slot.percentage) || 0;
            const isActive = slot.status === "Downloading";
            const isQbt = slot.source === "qbittorrent";
            const barColor = isQbt
              ? "bg-gradient-to-r from-green-400 to-emerald-400"
              : "bg-gradient-to-r from-blue-400 to-cyan-400";
            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span className="text-white/80 text-xs font-medium truncate">{slot.filename}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-[10px] px-1 py-0.5 rounded font-semibold uppercase tracking-wide ${
                      isQbt ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"
                    }`}>
                      {isQbt ? "QBT" : "SAB"}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${
                      isActive ? "bg-blue-500/20 text-blue-400" : "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      {slot.status}
                    </span>
                  </div>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-1">
                  <div className={`h-full rounded-full ${barColor} transition-all duration-700`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between text-white/30 text-xs">
                  <span>{pct.toFixed(0)}% · {slot.sizeleft} remaining</span>
                  <span>{slot.timeleft}</span>
                </div>
              </div>
            );
          })}
          {slots.length > 5 && (
            <p className="text-white/30 text-xs text-center pt-1">+{slots.length - 5} more in queue</p>
          )}
        </div>
      ) : (
        <div className="py-6 text-center">
          <p className="text-white/30 text-sm">
            {!configured ? "Configure SABnzbd or qBittorrent to see live downloads." : "Queue is empty."}
          </p>
          {(qbittorrentUrl || sabnzbdUrl) && (
            <div className="flex items-center justify-center gap-3 mt-2">
              {qbittorrentUrl && (
                <a href={qbittorrentUrl} className="text-xs text-emerald-400/70 hover:text-emerald-400 transition-colors">
                  qBittorrent →
                </a>
              )}
              {sabnzbdUrl && (
                <a href={sabnzbdUrl} className="text-xs text-blue-400/70 hover:text-blue-400 transition-colors">
                  SABnzbd →
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-1.5 text-white/30 hover:text-white/60 transition-colors text-xs w-full"
          >
            <svg
              className={`w-3 h-3 transition-transform ${showHistory ? "rotate-90" : ""}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            {showHistory ? "Hide" : "Show"} recent completions ({history.length})
          </button>
          {showHistory && (
            <div className="mt-2 space-y-1.5">
              {history.map((h, i) => {
                const isQbt = h.source === "qbittorrent";
                const whenStr = formatCompletedAt(h.completed_at);
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`text-[10px] px-1 py-0.5 rounded font-semibold uppercase tracking-wide flex-shrink-0 ${
                      isQbt ? "bg-emerald-500/10 text-emerald-500/70" : "bg-blue-500/10 text-blue-500/70"
                    }`}>
                      {isQbt ? "QBT" : "SAB"}
                    </span>
                    <span className="text-white/50 text-xs truncate flex-1">{h.filename}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0 text-white/30 text-xs">
                      <span>{h.size}</span>
                      {whenStr && <span className="text-white/20">· {whenStr}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
