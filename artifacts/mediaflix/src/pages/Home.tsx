import { useEffect, useState } from "react";
import { Play, Film, ChartColumn, Radar, Tv, Download, ArrowDownToLine } from "lucide-react";
import { useGetConfig, useGetActivity, useGetDownloads, useGetRequests, useGetServiceStatus, useGetPosters } from "@workspace/api-client-react";

const FALLBACK_POSTERS = [
  "https://image.tmdb.org/t/p/w780/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
  "https://image.tmdb.org/t/p/w780/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg",
  "https://image.tmdb.org/t/p/w780/3bhkrj58Vtu7enYsLegHnDmni7.jpg",
  "https://image.tmdb.org/t/p/w780/saHP97rTPS5eLmrLQEcANmKrsFl.jpg",
  "https://image.tmdb.org/t/p/w780/8kSerJrhrJWKLk1LViesGcnrUPE.jpg",
  "https://image.tmdb.org/t/p/w780/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
  "https://image.tmdb.org/t/p/w780/oU7Oq2kFAAlGqbU4VoAE36g4hoI.jpg",
  "https://image.tmdb.org/t/p/w780/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg",
  "https://image.tmdb.org/t/p/w780/gNBCvtYyGPbjd0XknR3n2gMCOmg.jpg",
  "https://image.tmdb.org/t/p/w780/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
  "https://image.tmdb.org/t/p/w780/ow3wq89wM8qd5X7hWKxiRfsFf9C.jpg",
  "https://image.tmdb.org/t/p/w780/rSPw7tgCH9c6NqICZef4kZjFOQ5.jpg",
];

type ServiceKey = "plex" | "overseerr" | "tautulli" | "radarr" | "sonarr" | "sabnzbd" | "qbittorrent";

type LucideIcon = React.ComponentType<{ className?: string }>;

const SERVICE_META: Record<ServiceKey, { name: string; description: string; defaultPort: string; icon: LucideIcon; color: string; glow: string }> = {
  plex: {
    name: "Plex",
    description: "Stream your media",
    defaultPort: "32400",
    icon: Play,
    color: "from-amber-500 to-orange-600",
    glow: "shadow-amber-500/20",
  },
  overseerr: {
    name: "Overseerr",
    description: "Request content",
    defaultPort: "5055",
    icon: Film,
    color: "from-purple-500 to-indigo-600",
    glow: "shadow-purple-500/20",
  },
  tautulli: {
    name: "Tautulli",
    description: "Watch statistics",
    defaultPort: "8181",
    icon: ChartColumn,
    color: "from-teal-500 to-cyan-600",
    glow: "shadow-teal-500/20",
  },
  radarr: {
    name: "Radarr",
    description: "Movie management",
    defaultPort: "7878",
    icon: Radar,
    color: "from-yellow-500 to-amber-600",
    glow: "shadow-yellow-500/20",
  },
  sonarr: {
    name: "Sonarr",
    description: "TV show management",
    defaultPort: "8989",
    icon: Tv,
    color: "from-sky-500 to-blue-600",
    glow: "shadow-sky-500/20",
  },
  sabnzbd: {
    name: "SABnzbd",
    description: "Usenet downloads",
    defaultPort: "8080",
    icon: Download,
    color: "from-green-500 to-emerald-600",
    glow: "shadow-green-500/20",
  },
  qbittorrent: {
    name: "qBittorrent",
    description: "Torrent downloads",
    defaultPort: "8080",
    icon: ArrowDownToLine,
    color: "from-blue-500 to-indigo-600",
    glow: "shadow-blue-500/20",
  },
};

const SERVICE_ORDER: ServiceKey[] = ["plex", "overseerr", "tautulli", "radarr", "sonarr", "sabnzbd", "qbittorrent"];

export default function Home() {
  const [currentPoster, setCurrentPoster] = useState(0);
  const [nextPoster, setNextPoster] = useState(1);
  const [fading, setFading] = useState(false);

  const { data: config, isLoading } = useGetConfig();
  const { data: postersData } = useGetPosters({ query: { staleTime: 6 * 60 * 60 * 1000 } });
  const { data: activity } = useGetActivity({ query: { refetchInterval: 30_000 } });
  const { data: downloads } = useGetDownloads({ query: { refetchInterval: 30_000 } });
  const { data: requestsData } = useGetRequests({ query: { refetchInterval: 60_000 } });
  const { data: serviceStatus } = useGetServiceStatus({ query: { refetchInterval: 30_000 } });

  const moviePosters = postersData?.posters?.length ? postersData.posters : FALLBACK_POSTERS;

  useEffect(() => {
    if (config?.branding?.name) {
      const name = config.branding.name;
      document.title = name.charAt(0).toUpperCase() + name.slice(1);
    }
  }, [config?.branding?.name]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setCurrentPoster((prev) => (prev + 1) % moviePosters.length);
        setNextPoster((prev) => (prev + 1) % moviePosters.length);
        setFading(false);
      }, 1200);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const background = config?.background;
  const branding = config?.branding;
  const services = config?.services;
  const links = config?.links;
  const access = config?.access;

  const useGradient = background?.style === "gradient";

  const siteName = branding?.name ?? "mediaflix";
  const gradientPart = siteName.slice(0, Math.ceil(siteName.length / 2));
  const plainPart = siteName.slice(Math.ceil(siteName.length / 2));

  const activeServices = SERVICE_ORDER;

  const requestUrl = access?.request_url?.trim() ?? "";
  const requestLabel = access?.request_label ?? "Request Media";
  const accessUrl = access?.access_url?.trim() ?? "";
  const accessLabel = access?.access_label ?? "Request Access";

  const tautulliUrl = (links?.tautulli?.trim() || services?.tautulli?.trim()) ?? "";
  const qbittorrentUrl = (links?.qbittorrent?.trim() || services?.qbittorrent?.trim()) ?? "";
  const sabnzbdUrl = (links?.sabnzbd?.trim() || services?.sabnzbd?.trim()) ?? "";
  const overseerrLinkUrl = (links?.overseerr?.trim() || services?.overseerr?.trim()) ?? "";

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden relative">
      {/* Background */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        {useGradient ? (
          <>
            <div className="absolute inset-0 bg-[#0a0a0f]" />
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 120% 70% at 50% -10%, rgba(168,85,247,0.18) 0%, transparent 60%)" }} />
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 80% 80%, rgba(236,72,153,0.08) 0%, transparent 55%)" }} />
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 10% 60%, rgba(99,102,241,0.07) 0%, transparent 50%)" }} />
          </>
        ) : (
          <>
            <div
              className="absolute inset-0 transition-opacity duration-[1200ms] ease-in-out"
              style={{ opacity: fading ? 0 : 1 }}
            >
              <PosterGrid posterIndex={currentPoster} posters={moviePosters} />
            </div>
            <div
              className="absolute inset-0 transition-opacity duration-[1200ms] ease-in-out"
              style={{ opacity: fading ? 1 : 0 }}
            >
              <PosterGrid posterIndex={nextPoster} posters={moviePosters} />
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/80 via-[#0a0a0f]/70 to-[#0a0a0f]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/60 via-transparent to-[#0a0a0f]/60" />
          </>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Nav */}
        <nav className="flex items-center justify-between px-8 py-5" />

        {/* Hero */}
        <section className="flex flex-col items-center text-center px-6 pt-12 pb-16">
          <div className="mb-6">
            {isLoading ? (
              <div className="h-20 w-72 bg-white/5 rounded-2xl animate-pulse" />
            ) : (
              <h1 className="text-7xl font-black tracking-tight leading-none select-none">
                <span
                  className="text-transparent bg-clip-text"
                  style={{ backgroundImage: "linear-gradient(135deg, #a855f7 0%, #ec4899 40%, #f97316 70%, #eab308 100%)" }}
                >
                  {gradientPart}
                </span>
                <span className="text-white">{plainPart}</span>
              </h1>
            )}
          </div>

          <p className="text-white/70 text-lg max-w-md leading-relaxed mb-8">
            {isLoading ? (
              <span className="inline-block h-6 w-80 bg-white/5 rounded animate-pulse" />
            ) : (
              branding?.tagline
            )}
          </p>

          {/* Hero buttons */}
          <div className="flex items-center gap-3 flex-wrap justify-center">
            {/* Request Media / primary CTA */}
            {(requestUrl || !isLoading) && (
              <a
                href={requestUrl || undefined}
                target={requestUrl ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold px-7 py-3.5 rounded-full transition-all duration-200 shadow-lg shadow-purple-900/40 hover:shadow-purple-800/60 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                {requestLabel}
              </a>
            )}

            {/* Request Access / secondary CTA */}
            {(accessUrl || !isLoading) && (
              <a
                href={accessUrl || undefined}
                target={accessUrl ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-semibold px-7 py-3.5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
                {accessLabel}
              </a>
            )}
          </div>
        </section>

        {/* Quick Access */}
        {(isLoading || activeServices.length > 0) && (
          <section className="px-4 py-8">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-center text-2xl font-bold text-white/90 mb-6">Quick Access</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {isLoading
                  ? Array.from({ length: 7 }).map((_, i) => (
                      <div key={i} className="h-28 rounded-2xl bg-white/[0.04] border border-white/[0.05] animate-pulse" />
                    ))
                  : activeServices.map((key) => {
                      const meta = SERVICE_META[key];
                      const internalUrl = services?.[key]?.trim() ?? "";
                      const linkUrl = links?.[key]?.trim() ?? "";
                      const href = linkUrl || internalUrl;
                      const hasUrl = href !== "";
                      const isConfigured = internalUrl !== "" || linkUrl !== "";
                      const Icon = meta.icon;
                      const Tag = hasUrl ? "a" : "div";
                      if (!isConfigured) return null;
                      return (
                        <Tag
                          key={key}
                          {...(hasUrl ? { href, target: "_blank", rel: "noopener noreferrer" } : {})}
                          className={`rounded-2xl p-5 flex flex-col items-center gap-3 cursor-pointer group transition-shadow hover:shadow-xl bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.09] ${meta.glow}`}
                        >
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-sm text-white">{meta.name}</p>
                            <p className="text-xs text-white/50 mt-0.5">{meta.description}</p>
                          </div>
                        </Tag>
                      );
                    })}
              </div>
            </div>
          </section>
        )}

        {/* Live Dashboard */}
        <section className="max-w-4xl mx-auto px-4 py-8">
          <h2 className="text-center text-2xl font-bold text-white/90 mb-6">Live Dashboard</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Now Watching */}
            <NowWatchingCard activity={activity} tautulliUrl={tautulliUrl} />

            {/* Downloads */}
            <DownloadsCard downloads={downloads} sabnzbdUrl={sabnzbdUrl} qbittorrentUrl={qbittorrentUrl} />

            {/* Recent Requests */}
            <RecentRequestsCard requestsData={requestsData} overseerrUrl={overseerrLinkUrl} />
          </div>

          {/* Service Health */}
          <div className="flex justify-center mt-6">
            <ServiceHealthBar health={serviceStatus} />
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center pb-8 text-white/20 text-xs">
          <p>{siteName} · Your Personal Media Universe</p>
        </footer>
      </div>
    </div>
  );
}

type ServiceStatusEntry = { ok: boolean; latency_ms: number; configured: boolean };
type HealthCheckData = {
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

function ServiceHealthBar({ health }: { health?: HealthCheckData }) {
  const [open, setOpen] = useState(false);

  if (!health) return null;

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
      {/* Dot cluster + summary label */}
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

      {/* Hover panel */}
      {open && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 min-w-[200px] bg-black/90 border border-white/10 rounded-xl p-3 z-50 backdrop-blur-md shadow-2xl">
          <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-2.5">
            Services
          </p>
          <div className="space-y-1.5">
            {configured.map(({ key, name }) => {
              const s = health![key];
              return (
                <div key={key} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        s.ok ? "bg-green-400" : "bg-red-500"
                      }`}
                    />
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

type MediaRequest = {
  id: number;
  title: string;
  poster_path: string;
  media_type: string;
  request_status: number;
  media_status: number;
  requested_by: string;
};

type RequestsData = {
  requests: MediaRequest[];
  configured: boolean;
};

// request_status: 1=PENDING 2=APPROVED 3=DECLINED
// media_status:   1=UNKNOWN 2=PENDING  3=PROCESSING 4=PARTIALLY_AVAILABLE 5=AVAILABLE
function getStatusMeta(req: MediaRequest): { label: string; color: string; pulse: boolean } {
  if (req.request_status === 3) return { label: "Declined", color: "bg-red-500/30 text-red-300 border-red-500/40", pulse: false };
  if (req.media_status === 5) return { label: "Available", color: "bg-green-500/30 text-green-300 border-green-500/40", pulse: false };
  if (req.media_status === 4) return { label: "Partial", color: "bg-teal-500/30 text-teal-300 border-teal-500/40", pulse: false };
  if (req.media_status === 3) return { label: "Processing", color: "bg-blue-500/30 text-blue-300 border-blue-500/40", pulse: true };
  if (req.request_status === 2) return { label: "Approved", color: "bg-purple-500/30 text-purple-300 border-purple-500/40", pulse: false };
  return { label: "Pending", color: "bg-white/10 text-white/50 border-white/10", pulse: false };
}

const TMDB_IMG = "https://image.tmdb.org/t/p/w300";

function RecentRequestsCard({
  requestsData,
  overseerrUrl,
}: {
  requestsData?: RequestsData;
  overseerrUrl: string;
}) {
  const requests = requestsData?.requests ?? [];
  const configured = requestsData?.configured ?? false;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm p-6 sm:col-span-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-400" />
          <span className="text-white/90 font-semibold text-sm">Recent Requests</span>
        </div>
        <div className="flex items-center gap-3">
          {requests.length > 0 && (
            <span className="text-white/40 text-xs">{requests.length} request{requests.length !== 1 ? "s" : ""}</span>
          )}
          {overseerrUrl && (
            <a
              href={overseerrUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-400/70 hover:text-purple-400 transition-colors"
            >
              Open Overseerr →
            </a>
          )}
        </div>
      </div>

      {/* Content */}
      {!configured ? (
        <p className="text-center text-sm text-white/30 py-10">Configure Overseerr to see recent requests.</p>
      ) : requests.length === 0 ? (
        <p className="text-center text-sm text-white/30 py-10">No requests yet.</p>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {requests.map((req) => {
            const { label, color, pulse } = getStatusMeta(req);
            const posterUrl = req.poster_path ? `${TMDB_IMG}${req.poster_path}` : null;
            return (
              <div key={req.id} className="group relative aspect-[2/3] rounded-lg overflow-hidden bg-white/[0.06]">
                {/* Poster */}
                {posterUrl ? (
                  <img
                    src={posterUrl}
                    alt={req.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/[0.04]">
                    <svg className="w-8 h-8 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="2" y="2" width="20" height="20" rx="2" />
                      <path d="M8 10l2 2 4-4" />
                    </svg>
                  </div>
                )}

                {/* Status badge — top right */}
                <div className="absolute top-1.5 right-1.5">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border backdrop-blur-sm flex items-center gap-1 ${color}`}>
                    {pulse && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />}
                    {label}
                  </span>
                </div>

                {/* Bottom overlay: title + requestedBy */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                  <p className="text-white text-[11px] font-semibold leading-tight line-clamp-2">{req.title}</p>
                  <p className="text-white/50 text-[10px] mt-0.5 truncate">{req.requested_by}</p>
                </div>

                {/* Always-visible title strip at bottom (non-hover fallback) */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-6 pb-1.5 px-1.5 group-hover:opacity-0 transition-opacity duration-200">
                  <p className="text-white/80 text-[10px] font-medium leading-tight line-clamp-1">{req.title}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type StreamSession = {
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

type ActivityData = {
  stream_count: number;
  sessions: StreamSession[];
  configured: boolean;
};

type DownloadSlot = {
  filename: string;
  percentage: string;
  size: string;
  sizeleft: string;
  status: string;
  timeleft: string;
  cat: string;
};

type DownloadsData = {
  speed: string;
  kbpersec: string;
  mb: string;
  mbleft: string;
  diskspace1: string;
  noofslots: number;
  slots: DownloadSlot[];
  configured: boolean;
};

function DownloadsCard({
  downloads,
  sabnzbdUrl,
  qbittorrentUrl,
}: {
  downloads?: DownloadsData;
  sabnzbdUrl: string;
  qbittorrentUrl: string;
}) {
  const slots = downloads?.slots ?? [];
  const configured = downloads?.configured ?? false;
  const speed = downloads?.speed ?? "0";
  const kbpersec = parseFloat(downloads?.kbpersec ?? "0");
  const diskspace1 = parseFloat(downloads?.diskspace1 ?? "0");
  const isDownloading = kbpersec > 0;
  const diskGB = diskspace1 > 0 ? diskspace1.toFixed(1) : null;
  const speedDisplay = speed && speed !== "0" ? `${speed}B/s` : "0 B/s";

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm p-6">
      {/* Header */}
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

      {/* Slot list */}
      {slots.length > 0 ? (
        <div className="space-y-3">
          {slots.slice(0, 4).map((slot, i) => {
            const pct = parseFloat(slot.percentage) || 0;
            const isActive = slot.status === "Downloading";
            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span className="text-white/80 text-xs font-medium truncate">{slot.filename}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-md flex-shrink-0 font-medium ${
                    isActive ? "bg-blue-500/20 text-blue-400" : "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {slot.status}
                  </span>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-1">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-white/30 text-xs">
                  <span>{pct.toFixed(0)}% · {slot.sizeleft} remaining</span>
                  <span>{slot.timeleft}</span>
                </div>
              </div>
            );
          })}
          {slots.length > 4 && (
            <p className="text-white/30 text-xs text-center pt-1">+{slots.length - 4} more in queue</p>
          )}
        </div>
      ) : (
        <div className="py-10 text-center">
          <p className="text-white/30 text-sm">{!configured ? "Configure SABnzbd to see live downloads." : "Queue is empty."}</p>
          {(qbittorrentUrl || sabnzbdUrl) && (
            <div className="flex items-center justify-center gap-3 mt-2">
              {qbittorrentUrl && (
                <a href={qbittorrentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400/70 hover:text-blue-400 transition-colors">
                  qBittorrent →
                </a>
              )}
              {sabnzbdUrl && (
                <a href={sabnzbdUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-green-400/70 hover:text-green-400 transition-colors">
                  SABnzbd →
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NowWatchingCard({ activity, tautulliUrl }: { activity?: ActivityData; tautulliUrl: string }) {
  const sessions = activity?.sessions ?? [];
  const streamCount = activity?.stream_count ?? 0;
  const configured = activity?.configured ?? false;

  const tickerItems = sessions.map((s) => {
    const displayTitle = s.grandparent_title ? `${s.grandparent_title} · ${s.title}` : s.title;
    const stateIcon = s.state === "playing" ? "▶" : "⏸";
    return `${s.user}  ${stateIcon}  ${displayTitle}  ·  ${s.progress_percent}%`;
  });

  const tickerText = tickerItems.join("          ");

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm p-6">
      {/* Header */}
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

      {/* Scrolling ticker when streams are active */}
      {streamCount > 0 && tickerText && (
        <div className="mb-4 overflow-hidden rounded-lg bg-green-500/10 border border-green-500/20 py-2">
          <div
            className="flex whitespace-nowrap"
            style={{ animation: "marquee 24s linear infinite" }}
          >
            <span className="text-green-300/80 text-xs px-4 flex-shrink-0">{tickerText}</span>
            <span className="text-green-300/80 text-xs px-4 flex-shrink-0" aria-hidden>{tickerText}</span>
          </div>
        </div>
      )}

      {/* Session list */}
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
                {/* Avatar */}
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
                  {subtitle && (
                    <p className="text-white/40 text-xs mb-2 truncate">{subtitle}</p>
                  )}
                  {/* Progress bar */}
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
          <p className="text-white/30 text-sm">{!configured ? "Configure Tautulli to see live streams." : "Nothing streaming right now."}</p>
          {tautulliUrl && (
            <a href={tautulliUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400/70 hover:text-purple-400 transition-colors mt-2 inline-block">
              Open Tautulli →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function PosterGrid({ posterIndex, posters: allPosters }: { posterIndex: number; posters: string[] }) {
  const posters = [];
  for (let i = 0; i < 12; i++) {
    posters.push(allPosters[(posterIndex + i) % allPosters.length]);
  }
  return (
    <div className="w-full h-full grid grid-cols-4 gap-1 scale-110 blur-[2px]" style={{ gridTemplateRows: "repeat(3, 1fr)" }}>
      {posters.map((src, i) => (
        <div key={i} className="overflow-hidden bg-gray-900">
          <img src={src} alt="" className="w-full h-full object-cover opacity-60" style={{ objectPosition: "center top" }} />
        </div>
      ))}
    </div>
  );
}
