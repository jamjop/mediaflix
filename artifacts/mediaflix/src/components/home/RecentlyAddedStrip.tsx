import { useGetRecentlyAdded, getGetRecentlyAddedQueryKey } from "@workspace/api-client-react";

type RecentlyAddedItem = {
  title: string;
  grandparent_title: string;
  parent_title: string;
  media_type: string;
  thumb_url?: string | null;
  added_at: number;
  year?: number | null;
};

function getDisplayTitle(item: RecentlyAddedItem): { primary: string; secondary: string } {
  if (item.media_type === "episode" && item.grandparent_title) {
    return { primary: item.grandparent_title, secondary: item.title };
  }
  return { primary: item.title, secondary: item.year ? String(item.year) : "" };
}

function ItemCard({ item }: { item: RecentlyAddedItem }) {
  const { primary, secondary } = getDisplayTitle(item);
  const isEpisode = item.media_type === "episode";

  return (
    <div className="flex-shrink-0 w-[100px] group cursor-default">
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-white/[0.06] mb-2">
        {item.thumb_url ? (
          <img
            src={item.thumb_url}
            alt={primary}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              {isEpisode ? (
                <>
                  <rect x="2" y="7" width="20" height="15" rx="2" />
                  <path d="M16 3l-4 4-4-4" />
                </>
              ) : (
                <>
                  <rect x="2" y="2" width="20" height="20" rx="2" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </div>
        )}
        <div className="absolute top-1.5 left-1.5">
          <span className={`text-[9px] font-semibold px-1 py-0.5 rounded backdrop-blur-sm border ${
            isEpisode
              ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
              : "bg-amber-500/20 text-amber-300 border-amber-500/30"
          }`}>
            {isEpisode ? "TV" : "Movie"}
          </span>
        </div>
      </div>
      <p className="text-white/70 text-[11px] font-medium leading-tight line-clamp-2 text-center">{primary}</p>
      {secondary && (
        <p className="text-white/30 text-[10px] mt-0.5 line-clamp-1 text-center">{secondary}</p>
      )}
    </div>
  );
}

function StripSkeleton() {
  return (
    <section className="max-w-6xl mx-auto px-4 pb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-5 w-36 bg-white/[0.06] rounded animate-pulse" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[100px]">
            <div className="aspect-[2/3] rounded-lg bg-white/[0.06] animate-pulse mb-2" />
            <div className="h-3 w-full bg-white/[0.06] rounded animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function RecentlyAddedStrip() {
  const { data, isLoading } = useGetRecentlyAdded({
    query: { queryKey: getGetRecentlyAddedQueryKey(), refetchInterval: 5 * 60_000 },
  });

  if (isLoading) return <StripSkeleton />;
  if (!data?.configured || data.items.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 pb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
        <h2 className="text-white/90 font-semibold text-sm">Recently Added</h2>
        <span className="text-white/30 text-xs ml-1">{data.items.length} titles</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {data.items.map((item, i) => (
          <ItemCard key={i} item={item} />
        ))}
      </div>
    </section>
  );
}
