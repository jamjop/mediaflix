export type MediaRequest = {
  id: number;
  title: string;
  poster_path: string;
  media_type: string;
  request_status: number;
  media_status: number;
  requested_by: string;
};

export type RequestsData = {
  requests: MediaRequest[];
  configured: boolean;
};

function getStatusMeta(req: MediaRequest): { label: string; color: string; pulse: boolean } {
  if (req.request_status === 3) return { label: "Declined", color: "bg-red-500/30 text-red-300 border-red-500/40", pulse: false };
  if (req.media_status === 5) return { label: "Available", color: "bg-green-500/30 text-green-300 border-green-500/40", pulse: false };
  if (req.media_status === 4) return { label: "Partial", color: "bg-teal-500/30 text-teal-300 border-teal-500/40", pulse: false };
  if (req.media_status === 3) return { label: "Processing", color: "bg-blue-500/30 text-blue-300 border-blue-500/40", pulse: true };
  if (req.request_status === 2) return { label: "Approved", color: "bg-purple-500/30 text-purple-300 border-purple-500/40", pulse: false };
  return { label: "Pending", color: "bg-white/10 text-white/50 border-white/10", pulse: false };
}

const TMDB_IMG = "https://image.tmdb.org/t/p/w300";

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm p-6 sm:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-32 bg-white/[0.06] rounded animate-pulse" />
        <div className="h-3 w-20 bg-white/[0.06] rounded animate-pulse" />
      </div>
      <div className="flex gap-2.5 overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[90px] aspect-[2/3] rounded-lg bg-white/[0.06] animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export function RecentRequestsCard({
  requestsData,
  overseerrUrl,
}: {
  requestsData?: RequestsData;
  overseerrUrl: string;
}) {
  if (!requestsData) return <CardSkeleton />;

  const requests = requestsData.requests ?? [];
  const configured = requestsData.configured ?? false;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm p-6 sm:col-span-2">
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

      {!configured ? (
        <p className="text-center text-sm text-white/30 py-10">Configure Overseerr to see recent requests.</p>
      ) : requests.length === 0 ? (
        <p className="text-center text-sm text-white/30 py-10">No requests yet.</p>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
          {requests.map((req) => {
            const { label, color, pulse } = getStatusMeta(req);
            const posterUrl = req.poster_path ? `${TMDB_IMG}${req.poster_path}` : null;
            return (
              <div key={req.id} className="group relative flex-shrink-0 w-[90px] aspect-[2/3] rounded-lg overflow-hidden bg-white/[0.06]">
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
                <div className="absolute top-1.5 right-1.5">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border backdrop-blur-sm flex items-center gap-1 ${color}`}>
                    {pulse && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />}
                    {label}
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                  <p className="text-white text-[11px] font-semibold leading-tight line-clamp-2">{req.title}</p>
                  <p className="text-white/50 text-[10px] mt-0.5 truncate">{req.requested_by}</p>
                </div>
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
