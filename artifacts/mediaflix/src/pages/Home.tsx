import { useEffect, useState } from "react";
import { useGetConfig } from "@workspace/api-client-react";

const MOVIE_POSTERS = [
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

const SERVICE_META: Record<ServiceKey, { name: string; description: string; defaultPort: string; icon: React.ReactNode }> = {
  plex: {
    name: "Plex",
    description: "Stream your media",
    defaultPort: "32400",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
        <rect width="40" height="40" rx="8" fill="#E5A00D" />
        {/* Plex chevron arrow */}
        <path d="M10 9L28 20L10 31L10 25L20 20L10 15Z" fill="white" />
      </svg>
    ),
  },
  overseerr: {
    name: "Overseerr",
    description: "Request content",
    defaultPort: "5055",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
        <rect width="40" height="40" rx="8" fill="#7C3AED" />
        {/* Film clapperboard */}
        <rect x="8" y="17" width="24" height="15" rx="2" fill="white" />
        <rect x="8" y="11" width="24" height="7" rx="2" fill="white" />
        <path d="M14 11L11 18M19.5 11L16.5 18M25 11L22 18M30 11L27 18" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="11" y="20" width="18" height="2" rx="1" fill="#7C3AED" />
        <rect x="11" y="24" width="12" height="2" rx="1" fill="#7C3AED" />
        <rect x="11" y="28" width="15" height="2" rx="1" fill="#7C3AED" />
      </svg>
    ),
  },
  tautulli: {
    name: "Tautulli",
    description: "Watch statistics",
    defaultPort: "8181",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
        <rect width="40" height="40" rx="8" fill="#0D9488" />
        <rect x="8" y="24" width="5" height="8" rx="1" fill="white" />
        <rect x="17" y="18" width="5" height="14" rx="1" fill="white" />
        <rect x="26" y="10" width="5" height="22" rx="1" fill="white" />
      </svg>
    ),
  },
  radarr: {
    name: "Radarr",
    description: "Movie management",
    defaultPort: "7878",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
        <rect width="40" height="40" rx="8" fill="#F59E0B" />
        {/* Radar scope: crosshairs */}
        <line x1="20" y1="8" x2="20" y2="32" stroke="white" strokeWidth="0.8" strokeOpacity="0.35" />
        <line x1="8" y1="20" x2="32" y2="20" stroke="white" strokeWidth="0.8" strokeOpacity="0.35" />
        {/* Concentric rings */}
        <circle cx="20" cy="20" r="11" stroke="white" strokeWidth="1.2" strokeOpacity="0.4" fill="none" />
        <circle cx="20" cy="20" r="7" stroke="white" strokeWidth="1.2" strokeOpacity="0.6" fill="none" />
        <circle cx="20" cy="20" r="3.5" stroke="white" strokeWidth="1.2" strokeOpacity="0.8" fill="none" />
        {/* Sweep line */}
        <line x1="20" y1="20" x2="30" y2="10" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        {/* Blip */}
        <circle cx="27" cy="13" r="1.8" fill="white" />
        {/* Center dot */}
        <circle cx="20" cy="20" r="2" fill="white" />
      </svg>
    ),
  },
  sonarr: {
    name: "Sonarr",
    description: "TV show management",
    defaultPort: "8989",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
        <rect width="40" height="40" rx="8" fill="#3B82F6" />
        {/* TV body */}
        <rect x="7" y="14" width="26" height="18" rx="3" fill="white" />
        {/* TV screen (blue cutout) */}
        <rect x="10" y="17" width="20" height="12" rx="1.5" fill="#3B82F6" />
        {/* Antenna left */}
        <line x1="15" y1="14" x2="11" y2="7" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        {/* Antenna right */}
        <line x1="25" y1="14" x2="29" y2="7" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        {/* Stand base */}
        <rect x="16" y="32" width="8" height="2.5" rx="1" fill="white" />
        <rect x="13" y="34.5" width="14" height="2" rx="1" fill="white" />
      </svg>
    ),
  },
  sabnzbd: {
    name: "SABnzbd",
    description: "Usenet downloads",
    defaultPort: "8080",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
        <rect width="40" height="40" rx="8" fill="#22C55E" />
        {/* Arrow shaft */}
        <rect x="18" y="9" width="4" height="14" rx="2" fill="white" />
        {/* Arrow head */}
        <path d="M12 23L20 31L28 23Z" fill="white" />
        {/* Tray */}
        <rect x="10" y="32" width="20" height="3.5" rx="1.75" fill="white" />
      </svg>
    ),
  },
  qbittorrent: {
    name: "qBittorrent",
    description: "Torrent downloads",
    defaultPort: "8080",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
        <rect width="40" height="40" rx="8" fill="#2563EB" />
        <path d="M20 11V22M20 22L15 17M20 22L25 17" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 27H28" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
};

const SERVICE_ORDER: ServiceKey[] = ["plex", "overseerr", "tautulli", "radarr", "sonarr", "sabnzbd", "qbittorrent"];

export default function Home() {
  const [currentPoster, setCurrentPoster] = useState(0);
  const [nextPoster, setNextPoster] = useState(1);
  const [fading, setFading] = useState(false);

  const { data: config, isLoading } = useGetConfig();

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
        setCurrentPoster((prev) => (prev + 1) % MOVIE_POSTERS.length);
        setNextPoster((prev) => (prev + 1) % MOVIE_POSTERS.length);
        setFading(false);
      }, 1200);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const branding = config?.branding;
  const services = config?.services;
  const access = config?.access;

  const siteName = branding?.name ?? "mediaflix";
  const gradientPart = siteName.slice(0, Math.ceil(siteName.length / 2));
  const plainPart = siteName.slice(Math.ceil(siteName.length / 2));

  const activeServices = SERVICE_ORDER;

  const requestUrl = access?.request_url?.trim() ?? "";
  const requestLabel = access?.request_label ?? "Request Media";
  const accessUrl = access?.access_url?.trim() ?? "";
  const accessLabel = access?.access_label ?? "Request Access";

  const tautulliUrl = services?.tautulli?.trim() ?? "";
  const qbittorrentUrl = services?.qbittorrent?.trim() ?? "";
  const sabnzbdUrl = services?.sabnzbd?.trim() ?? "";

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden relative">
      {/* Background poster mosaic */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0 transition-opacity duration-[1200ms] ease-in-out"
          style={{ opacity: fading ? 0 : 1 }}
        >
          <PosterGrid posterIndex={currentPoster} />
        </div>
        <div
          className="absolute inset-0 transition-opacity duration-[1200ms] ease-in-out"
          style={{ opacity: fading ? 1 : 0 }}
        >
          <PosterGrid posterIndex={nextPoster} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/80 via-[#0a0a0f]/70 to-[#0a0a0f]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/60 via-transparent to-[#0a0a0f]/60" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Nav */}
        <nav className="flex items-center justify-between px-8 py-5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-sm text-white/60 font-medium tracking-wide">Media Command Center</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-sm text-white/60">Crimson</span>
          </div>
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
          <section className="max-w-4xl mx-auto px-6 pb-16">
            <h2 className="text-center text-2xl font-semibold text-white/90 mb-8 tracking-wide">Quick Access</h2>
            <div className={`grid gap-3 ${activeServices.length <= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-4"}`}>
              {isLoading
                ? Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="h-28 rounded-2xl bg-white/[0.04] border border-white/[0.05] animate-pulse" />
                  ))
                : activeServices.map((key) => {
                    const meta = SERVICE_META[key];
                    const url = services?.[key]?.trim() ?? "";
                    const hasUrl = url !== "";
                    const Tag = hasUrl ? "a" : "div";
                    return (
                      <Tag
                        key={key}
                        {...(hasUrl ? { href: url, target: "_blank", rel: "noopener noreferrer" } : {})}
                        className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.09] hover:border-white/[0.15] transition-all duration-200 group cursor-pointer"
                      >
                        <div className="transition-transform duration-200 group-hover:scale-110">
                          {meta.icon}
                        </div>
                        <div className="text-center">
                          <div className="text-white font-medium text-sm">{meta.name}</div>
                          <div className="text-white/50 text-xs mt-0.5">{meta.description}</div>
                        </div>
                      </Tag>
                    );
                  })}
            </div>
          </section>
        )}

        {/* Live Dashboard */}
        <section className="max-w-4xl mx-auto px-6 pb-20">
          <h2 className="text-center text-2xl font-semibold text-white/90 mb-8 tracking-wide">Live Dashboard</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Now Watching */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-white/90 font-semibold text-sm">Now Watching</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/40 text-xs">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  0 active streams
                </div>
              </div>
              <div className="h-24 flex flex-col items-center justify-center gap-2">
                <p className="text-white/30 text-sm">Nothing streaming right now.</p>
                {tautulliUrl && (
                  <a href={tautulliUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400/70 hover:text-purple-400 transition-colors">
                    Open Tautulli →
                  </a>
                )}
              </div>
            </div>

            {/* Downloads */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-white/90 font-semibold text-sm">Downloads</span>
                </div>
                <div className="flex items-center gap-3 text-white/40 text-xs">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      <polyline points="17 6 23 6 23 12" />
                    </svg>
                    0 KB/s
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                    4903.9 GB free
                  </span>
                </div>
              </div>
              <div className="h-24 flex flex-col items-center justify-center gap-2">
                <p className="text-white/30 text-sm">Queue is empty.</p>
                <div className="flex items-center gap-3">
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
              </div>
            </div>

            {/* Recent Additions */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm p-6 sm:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-400" />
                  <span className="text-white/90 font-semibold text-sm">Recent Additions</span>
                </div>
                <span className="text-white/40 text-xs">Last 7 days</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {MOVIE_POSTERS.slice(0, 6).map((poster, i) => (
                  <div key={i} className="aspect-[2/3] rounded-lg overflow-hidden bg-white/[0.06]">
                    <img
                      src={poster}
                      alt=""
                      className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity duration-200"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
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

function PosterGrid({ posterIndex }: { posterIndex: number }) {
  const posters = [];
  for (let i = 0; i < 12; i++) {
    posters.push(MOVIE_POSTERS[(posterIndex + i) % MOVIE_POSTERS.length]);
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
