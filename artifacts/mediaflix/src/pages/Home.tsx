import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Play, Film, ChartColumn, Radar, Tv, Download, ArrowDownToLine, Server } from "lucide-react";
import {
  useGetConfig, useGetActivity, useGetDownloads, useGetRequests, useGetServiceStatus, useGetPosters, useGetDiskSpace,
  getGetPostersQueryKey, getGetActivityQueryKey, getGetDownloadsQueryKey, getGetRequestsQueryKey, getGetServiceStatusQueryKey, getGetDiskSpaceQueryKey,
} from "@workspace/api-client-react";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { NowWatchingCard } from "../components/home/NowWatchingCard";
import { DownloadsCard } from "../components/home/DownloadsCard";
import { RecentRequestsCard } from "../components/home/RecentRequestsCard";
import { ServiceHealthBar } from "../components/home/ServiceHealthBar";
import { DiskUsageCard } from "../components/home/DiskUsageCard";
import { useDashboardSSE } from "../hooks/useDashboardSSE";

const FALLBACK_POSTERS = [
  "https://image.tmdb.org/t/p/w1280/s3TBrRGB1iav7gFOCNx3H31MoES.jpg",
  "https://image.tmdb.org/t/p/w1280/hkBaDkMWbLaf8B1lsWsKX7Ew3Xq.jpg",
  "https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
  "https://image.tmdb.org/t/p/w1280/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg",
  "https://image.tmdb.org/t/p/w1280/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
  "https://image.tmdb.org/t/p/w1280/9BBTo108Khn9VM37E0hOeGCLMiU.jpg",
  "https://image.tmdb.org/t/p/w1280/Ab8mkHmkYADjU7wQiOkia9BzGvS.jpg",
  "https://image.tmdb.org/t/p/w1280/3P52oz9HPQWxcwHOwxtyrVV1LKi.jpg",
];

type ServiceKey = "plex" | "overseerr" | "tautulli" | "radarr" | "sonarr" | "sabnzbd" | "qbittorrent";
type LucideIcon = React.ComponentType<{ className?: string }>;

const SERVICE_META: Record<ServiceKey, { name: string; description: string; icon: LucideIcon; color: string; glow: string }> = {
  plex:        { name: "Plex",         description: "Stream your media",      icon: Play,           color: "from-amber-500 to-orange-600",   glow: "shadow-amber-500/20" },
  overseerr:   { name: "Overseerr",    description: "Request content",        icon: Film,           color: "from-purple-500 to-indigo-600",  glow: "shadow-purple-500/20" },
  tautulli:    { name: "Tautulli",     description: "Watch statistics",       icon: ChartColumn,    color: "from-teal-500 to-cyan-600",      glow: "shadow-teal-500/20" },
  radarr:      { name: "Radarr",       description: "Movie management",       icon: Radar,          color: "from-yellow-500 to-amber-600",   glow: "shadow-yellow-500/20" },
  sonarr:      { name: "Sonarr",       description: "TV show management",     icon: Tv,             color: "from-sky-500 to-blue-600",       glow: "shadow-sky-500/20" },
  sabnzbd:     { name: "SABnzbd",      description: "Usenet downloads",       icon: Download,       color: "from-green-500 to-emerald-600",  glow: "shadow-green-500/20" },
  qbittorrent: { name: "qBittorrent",  description: "Torrent downloads",      icon: ArrowDownToLine,color: "from-blue-500 to-indigo-600",    glow: "shadow-blue-500/20" },
};

const SERVICE_ORDER: ServiceKey[] = ["plex", "overseerr", "tautulli", "radarr", "sonarr", "sabnzbd", "qbittorrent"];

export default function Home() {
  const [currentPoster, setCurrentPoster] = useState(0);
  const [nextPoster, setNextPoster] = useState(1);
  const [fading, setFading] = useState(false);

  const { data: config, isLoading } = useGetConfig();
  const { data: postersData } = useGetPosters({ query: { queryKey: getGetPostersQueryKey(), staleTime: 6 * 60 * 60 * 1000 } });
  // activity, downloads, serviceStatus are kept fresh by the SSE hook below
  const { data: activity } = useGetActivity({ query: { queryKey: getGetActivityQueryKey() } });
  const { data: downloads } = useGetDownloads({ query: { queryKey: getGetDownloadsQueryKey() } });
  const { data: requestsData } = useGetRequests({ query: { queryKey: getGetRequestsQueryKey(), refetchInterval: 60_000 } });
  const { data: serviceStatus } = useGetServiceStatus({ query: { queryKey: getGetServiceStatusQueryKey() } });
  const { data: diskSpace } = useGetDiskSpace({ query: { queryKey: getGetDiskSpaceQueryKey(), staleTime: 60_000, refetchInterval: 5 * 60_000 } });

  useDashboardSSE();

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
  }, [moviePosters.length]);

  const background = config?.background;
  const branding = config?.branding;
  const links = config?.links;
  const access = config?.access;

  const useGradient = background?.style === "gradient";

  const siteName = branding?.name ?? "NoahFlix";
  const gradientPart = siteName.slice(0, Math.ceil(siteName.length / 2));
  const plainPart = siteName.slice(Math.ceil(siteName.length / 2));

  const requestUrl = access?.request_url?.trim() ?? "";
  const requestLabel = access?.request_label ?? "Request Media";
  const accessUrl = access?.access_url?.trim() ?? "";
  const accessLabel = access?.access_label ?? "Request Access";

  const tautulliUrl = links?.tautulli?.trim() ?? "";
  const qbittorrentUrl = links?.qbittorrent?.trim() ?? "";
  const sabnzbdUrl = links?.sabnzbd?.trim() ?? "";
  const overseerrLinkUrl = links?.overseerr?.trim() ?? "";

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
            <img
              key={currentPoster}
              src={moviePosters[currentPoster]}
              alt=""
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms] ease-in-out"
              style={{ opacity: fading ? 0 : 1 }}
            />
            <img
              key={`next-${nextPoster}`}
              src={moviePosters[nextPoster]}
              alt=""
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms] ease-in-out"
              style={{ opacity: fading ? 1 : 0 }}
            />
            <div className="absolute inset-0 bg-black/60" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/30 to-transparent" />
          </>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Nav */}
        <nav className="flex items-center justify-between px-8 py-5">
          <div />
          <Link href="/server" className="flex items-center gap-1.5 text-white/30 hover:text-white/60 transition-colors text-sm">
            <Server className="w-3.5 h-3.5" />
            Server
          </Link>
        </nav>

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

          <div className="flex items-center gap-3 flex-wrap justify-center">
            {(requestUrl || !isLoading) && (
              <a
                href={requestUrl || undefined}
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
            {(accessUrl || !isLoading) && (
              <a
                href={accessUrl || undefined}
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
        {(isLoading || SERVICE_ORDER.length > 0) && (
          <section className="px-4 py-8">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-center text-2xl font-bold text-white/90 mb-6">Quick Access</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {isLoading
                  ? Array.from({ length: 7 }).map((_, i) => (
                      <div key={i} className="h-28 rounded-2xl bg-white/[0.04] border border-white/[0.05] animate-pulse" />
                    ))
                  : SERVICE_ORDER.map((key) => {
                      const meta = SERVICE_META[key];
                      const href = links?.[key]?.trim() ?? "";
                      const hasUrl = href !== "";
                      const Icon = meta.icon;
                      const Tag = hasUrl ? "a" : "div";
                      return (
                        <Tag
                          key={key}
                          {...(hasUrl ? { href } : {})}
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
        <section className="max-w-6xl mx-auto px-4 py-8">
          <h2 className="text-center text-2xl font-bold text-white/90 mb-6">Live Dashboard</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ErrorBoundary label="NowWatching">
              <NowWatchingCard activity={activity} tautulliUrl={tautulliUrl} />
            </ErrorBoundary>
            <ErrorBoundary label="Downloads">
              <DownloadsCard downloads={downloads} sabnzbdUrl={sabnzbdUrl} qbittorrentUrl={qbittorrentUrl} />
            </ErrorBoundary>
            <ErrorBoundary label="RecentRequests">
              <RecentRequestsCard requestsData={requestsData} overseerrUrl={overseerrLinkUrl} />
            </ErrorBoundary>
            <ErrorBoundary label="DiskUsage">
              <DiskUsageCard diskSpace={diskSpace} />
            </ErrorBoundary>
          </div>

          <div className="flex justify-center mt-6">
            <ErrorBoundary label="ServiceHealth">
              <ServiceHealthBar health={serviceStatus} />
            </ErrorBoundary>
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
