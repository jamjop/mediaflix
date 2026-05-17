type DiskDrive = {
  label: string;
  path: string;
  freeGb: number;
  totalGb: number;
  usedPercent: number;
  source: string;
};

type DiskSpaceData = {
  drives: DiskDrive[];
  configured: boolean;
};

function barColor(pct: number): string {
  if (pct >= 90) return "from-red-500 to-rose-500";
  if (pct >= 75) return "from-amber-500 to-orange-500";
  return "from-blue-400 to-cyan-400";
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm p-6 lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-28 bg-white/[0.06] rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-32 bg-white/[0.06] rounded animate-pulse" />
            <div className="h-1.5 w-full bg-white/[0.06] rounded-full animate-pulse" />
            <div className="h-3 w-24 bg-white/[0.06] rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DiskUsageCard({ diskSpace }: { diskSpace?: DiskSpaceData }) {
  if (!diskSpace) return <CardSkeleton />;
  if (!diskSpace.configured || diskSpace.drives.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm p-6 lg:col-span-2">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-2 h-2 rounded-full bg-cyan-400" />
        <span className="text-white/90 font-semibold text-sm">Storage</span>
        <span className="text-white/30 text-xs ml-1">· Radarr &amp; Sonarr</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {diskSpace.drives.map((drive) => {
          const color = barColor(drive.usedPercent);
          const isRadarr = drive.source === "radarr";
          return (
            <div key={drive.path}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${
                    isRadarr
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-sky-500/20 text-sky-400"
                  }`}>
                    {isRadarr ? "Movies" : "TV"}
                  </span>
                  <span className="text-white/70 text-xs font-medium truncate">{drive.label}</span>
                </div>
                <span className={`text-xs font-semibold flex-shrink-0 ml-2 ${
                  drive.usedPercent >= 90 ? "text-red-400" :
                  drive.usedPercent >= 75 ? "text-amber-400" :
                  "text-white/50"
                }`}>
                  {drive.usedPercent}%
                </span>
              </div>

              <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
                  style={{ width: `${drive.usedPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between mt-1.5 text-white/30 text-xs">
                <span>{drive.freeGb} GB free</span>
                <span>{drive.totalGb} GB total</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
