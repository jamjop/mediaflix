export type StreamSession = {
  user: string;
  title: string;
  parent_title: string;
  grandparent_title: string;
  media_type: string;
  progress_percent: string;
  state: string;
  player: string;
  duration: number;
  view_offset: number;
};

export type ActivityData = {
  stream_count: number;
  sessions: StreamSession[];
  configured: boolean;
};

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-28 bg-white/[0.06] rounded animate-pulse" />
        <div className="h-3 w-20 bg-white/[0.06] rounded animate-pulse" />
      </div>
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-white/[0.06] animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 bg-white/[0.06] rounded animate-pulse" />
              <div className="h-1.5 w-full bg-white/[0.06] rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NowWatchingCard({ activity, tautulliUrl }: { activity?: ActivityData; tautulliUrl: string }) {
  if (!activity) return <CardSkeleton />;

  const sessions = activity.sessions ?? [];
  const streamCount = activity.stream_count ?? 0;
  const configured = activity.configured ?? false;

  const tickerItems = sessions.map((s) => {
    const displayTitle = s.grandparent_title ? `${s.grandparent_title} · ${s.title}` : s.title;
    const stateIcon = s.state === "playing" ? "▶" : "⏸";
    return `${s.user}  ${stateIcon}  ${displayTitle}  ·  ${s.progress_percent}%`;
  });
  const tickerText = tickerItems.join("          ");

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${streamCount > 0 ? "bg-green-400 animate-pulse" : "bg-white/20"}`} />
          <span className="text-white/90 font-semibold text-sm">Now Watching</span>
        </div>
        <div className="flex items-center gap-1.5 text-white/40 text-xs">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          {streamCount} active stream{streamCount !== 1 ? "s" : ""}
        </div>
      </div>

      {streamCount > 0 && tickerText && (
        <div className="mb-4 overflow-hidden rounded-lg bg-green-500/10 border border-green-500/20 py-2">
          <div className="flex whitespace-nowrap" style={{ animation: "marquee 24s linear infinite" }}>
            <span className="text-green-300/80 text-xs px-4 flex-shrink-0">{tickerText}</span>
            <span className="text-green-300/80 text-xs px-4 flex-shrink-0" aria-hidden>{tickerText}</span>
          </div>
        </div>
      )}

      {sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions.map((s, i) => {
            const displayTitle = s.grandparent_title ? s.grandparent_title : s.title;
            const subtitle = s.grandparent_title ? s.title : s.player;
            const progress = parseInt(s.progress_percent, 10) || 0;
            const initials = s.user.slice(0, 2).toUpperCase();
            const isPlaying = s.state === "playing";
            return (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-purple-300 text-xs font-bold">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white/90 text-sm font-medium truncate">{displayTitle}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-md flex-shrink-0 font-medium ${isPlaying ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                      {isPlaying ? "▶ Playing" : "⏸ Paused"}
                    </span>
                  </div>
                  {subtitle && <p className="text-white/40 text-xs mb-2 truncate">{subtitle}</p>}
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-700"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-white/30 text-xs mt-1">{progress}% · {s.player}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-10 text-center">
          <p className="text-white/30 text-sm">
            {!configured ? "Configure Tautulli to see live streams." : "Nothing streaming right now."}
          </p>
          {tautulliUrl && (
            <a href={tautulliUrl} className="text-xs text-purple-400/70 hover:text-purple-400 transition-colors mt-2 inline-block">
              Open Tautulli →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
