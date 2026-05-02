import { useEffect, useState, useRef } from "react";

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

interface ServiceUrls {
  plex: string;
  overseerr: string;
  tautulli: string;
  radarr: string;
  sonarr: string;
  sabnzbd: string;
  qbittorrent: string;
}

const DEFAULT_URLS: ServiceUrls = {
  plex: "",
  overseerr: "",
  tautulli: "",
  radarr: "",
  sonarr: "",
  sabnzbd: "",
  qbittorrent: "",
};

const STORAGE_KEY = "mediaflix_service_urls";

function loadUrls(): ServiceUrls {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_URLS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_URLS };
}

function saveUrls(urls: ServiceUrls) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(urls));
}

const SERVICE_DEFS: {
  key: ServiceKey;
  name: string;
  description: string;
  defaultPort: string;
  placeholder: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "plex",
    name: "Plex",
    description: "Stream your media",
    defaultPort: "32400",
    placeholder: "http://192.168.1.x:32400",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
        <rect width="40" height="40" rx="8" fill="#E5A00D" />
        <path d="M20 8L32 20L20 32L8 20L20 8Z" fill="white" />
      </svg>
    ),
  },
  {
    key: "overseerr",
    name: "Overseerr",
    description: "Request content",
    defaultPort: "5055",
    placeholder: "http://192.168.1.x:5055",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
        <rect width="40" height="40" rx="8" fill="#7C3AED" />
        <circle cx="20" cy="20" r="8" fill="white" fillOpacity="0.9" />
        <circle cx="20" cy="20" r="4" fill="#7C3AED" />
      </svg>
    ),
  },
  {
    key: "tautulli",
    name: "Tautulli",
    description: "Watch statistics",
    defaultPort: "8181",
    placeholder: "http://192.168.1.x:8181",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
        <rect width="40" height="40" rx="8" fill="#0D9488" />
        <rect x="8" y="24" width="5" height="8" rx="1" fill="white" />
        <rect x="17" y="18" width="5" height="14" rx="1" fill="white" />
        <rect x="26" y="10" width="5" height="22" rx="1" fill="white" />
      </svg>
    ),
  },
  {
    key: "radarr",
    name: "Radarr",
    description: "Movie management",
    defaultPort: "7878",
    placeholder: "http://192.168.1.x:7878",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
        <rect width="40" height="40" rx="8" fill="#F59E0B" />
        <path d="M20 10C20 10 30 15 30 20C30 25 20 30 20 30C20 30 10 25 10 20C10 15 20 10 20 10Z" fill="white" fillOpacity="0.9" />
        <circle cx="20" cy="20" r="4" fill="#F59E0B" />
      </svg>
    ),
  },
  {
    key: "sonarr",
    name: "Sonarr",
    description: "TV show management",
    defaultPort: "8989",
    placeholder: "http://192.168.1.x:8989",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
        <rect width="40" height="40" rx="8" fill="#3B82F6" />
        <rect x="8" y="14" width="24" height="3" rx="1.5" fill="white" />
        <rect x="8" y="20" width="18" height="3" rx="1.5" fill="white" />
        <rect x="8" y="26" width="13" height="3" rx="1.5" fill="white" />
      </svg>
    ),
  },
  {
    key: "sabnzbd",
    name: "SABnzbd",
    description: "Usenet downloads",
    defaultPort: "8080",
    placeholder: "http://192.168.1.x:8080",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
        <rect width="40" height="40" rx="8" fill="#22C55E" />
        <path d="M20 10L26 20H14L20 10Z" fill="white" />
        <path d="M20 30L14 20H26L20 30Z" fill="white" fillOpacity="0.7" />
      </svg>
    ),
  },
  {
    key: "qbittorrent",
    name: "qBittorrent",
    description: "Torrent downloads",
    defaultPort: "8080",
    placeholder: "http://192.168.1.x:8080",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
        <rect width="40" height="40" rx="8" fill="#2563EB" />
        <path d="M20 11V22M20 22L15 17M20 22L25 17" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 27H28" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

function SettingsModal({
  open,
  onClose,
  urls,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  urls: ServiceUrls;
  onSave: (urls: ServiceUrls) => void;
}) {
  const [draft, setDraft] = useState<ServiceUrls>(urls);
  const [saved, setSaved] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setDraft(urls);
  }, [open, urls]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  function handleSave() {
    onSave(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
    >
      <div className="relative w-full max-w-lg bg-[#13131a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
          <div>
            <h2 className="text-white font-bold text-lg">Service URLs</h2>
            <p className="text-white/40 text-xs mt-0.5">Enter the local address for each service. Saved in your browser.</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.12] transition-colors text-white/60 hover:text-white"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Fields */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {SERVICE_DEFS.map((svc) => {
            const val = draft[svc.key];
            const isSet = val.trim() !== "";
            return (
              <div key={svc.key} className="flex items-center gap-3">
                <div className="shrink-0">{svc.icon}</div>
                <div className="flex-1">
                  <label className="block text-white/80 text-xs font-medium mb-1">
                    {svc.name}
                    <span className="ml-1.5 text-white/30 font-normal">:{svc.defaultPort}</span>
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={val}
                      onChange={(e) => setDraft((d) => ({ ...d, [svc.key]: e.target.value }))}
                      placeholder={svc.placeholder}
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-purple-500/60 focus:bg-white/[0.08] transition-all pr-8"
                    />
                    {isSet && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between gap-3">
          <p className="text-white/30 text-xs">URLs are stored locally and never sent to any server.</p>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
              saved
                ? "bg-green-600 text-white"
                : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white hover:scale-105 active:scale-95"
            }`}
          >
            {saved ? (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Saved!
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [currentPoster, setCurrentPoster] = useState(0);
  const [nextPoster, setNextPoster] = useState(1);
  const [fading, setFading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [urls, setUrls] = useState<ServiceUrls>(loadUrls);

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

  function handleSaveUrls(newUrls: ServiceUrls) {
    setUrls(newUrls);
    saveUrls(newUrls);
  }

  const configuredCount = Object.values(urls).filter((v) => v.trim() !== "").length;

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

      {/* Settings Modal */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        urls={urls}
        onSave={handleSaveUrls}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Nav */}
        <nav className="flex items-center justify-between px-8 py-5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-sm text-white/60 font-medium tracking-wide">Media Command Center</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-sm text-white/60">Crimson</span>
            </div>
            <button
              onClick={() => setSettingsOpen(true)}
              title="Configure service URLs"
              className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.07] hover:bg-white/[0.14] border border-white/[0.08] transition-all duration-200 text-white/50 hover:text-white/90"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              {configuredCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-purple-600 rounded-full text-[9px] font-bold text-white">
                  {configuredCount}
                </span>
              )}
            </button>
          </div>
        </nav>

        {/* Hero */}
        <section className="flex flex-col items-center text-center px-6 pt-12 pb-16">
          <div className="mb-6">
            <h1 className="text-7xl font-black tracking-tight leading-none select-none">
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: "linear-gradient(135deg, #a855f7 0%, #ec4899 40%, #f97316 70%, #eab308 100%)" }}
              >
                media
              </span>
              <span className="text-white">flix</span>
            </h1>
          </div>

          <p className="text-white/70 text-lg max-w-md leading-relaxed mb-8">
            Your personal streaming universe — all your media services, stats, and downloads in one beautiful dashboard.
          </p>

          <div className="flex items-center gap-3 flex-wrap justify-center">
            <button
              onClick={() => {
                const url = urls.overseerr.trim();
                if (url) window.open(url, "_blank");
                else setSettingsOpen(true);
              }}
              className="flex items-center gap-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold px-7 py-3.5 rounded-full transition-all duration-200 shadow-lg shadow-purple-900/40 hover:shadow-purple-800/60 hover:scale-105 active:scale-95"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              Request Media
            </button>
            {configuredCount === 0 && (
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-2 text-white/50 hover:text-white/80 text-sm transition-colors border border-white/[0.08] hover:border-white/[0.18] px-4 py-3.5 rounded-full"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Configure services
              </button>
            )}
          </div>
        </section>

        {/* Quick Access */}
        <section className="max-w-4xl mx-auto px-6 pb-16">
          <div className="flex items-center justify-center gap-3 mb-8">
            <h2 className="text-2xl font-semibold text-white/90 tracking-wide">Quick Access</h2>
            {configuredCount > 0 && (
              <span className="text-xs text-white/30 bg-white/[0.06] px-2.5 py-1 rounded-full">
                {configuredCount} of {SERVICE_DEFS.length} configured
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SERVICE_DEFS.map((svc) => {
              const url = urls[svc.key].trim();
              const isConfigured = url !== "";
              return (
                <a
                  key={svc.key}
                  href={isConfigured ? url : undefined}
                  target={isConfigured ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  onClick={!isConfigured ? (e) => { e.preventDefault(); setSettingsOpen(true); } : undefined}
                  className={`relative flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all duration-200 group cursor-pointer ${
                    isConfigured
                      ? "border-white/[0.10] bg-white/[0.06] hover:bg-white/[0.10] hover:border-white/[0.18]"
                      : "border-white/[0.05] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.10] opacity-70 hover:opacity-100"
                  }`}
                >
                  {isConfigured && (
                    <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-green-400" />
                  )}
                  <div className="transition-transform duration-200 group-hover:scale-110">
                    {svc.icon}
                  </div>
                  <div className="text-center">
                    <div className="text-white font-medium text-sm">{svc.name}</div>
                    <div className="text-white/50 text-xs mt-0.5">{svc.description}</div>
                  </div>
                  {!isConfigured && (
                    <div className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <span className="text-[10px] text-purple-400 font-medium">click to configure</span>
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        </section>

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
                {urls.tautulli && (
                  <a href={urls.tautulli} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400/70 hover:text-purple-400 transition-colors">
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
                  {urls.qbittorrent && (
                    <a href={urls.qbittorrent} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400/70 hover:text-blue-400 transition-colors">
                      qBittorrent →
                    </a>
                  )}
                  {urls.sabnzbd && (
                    <a href={urls.sabnzbd} target="_blank" rel="noopener noreferrer" className="text-xs text-green-400/70 hover:text-green-400 transition-colors">
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
          <p>MediaFlix · Your Personal Media Universe</p>
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
