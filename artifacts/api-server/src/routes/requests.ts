import { Router, type IRouter } from "express";
import { GetRequestsResponse } from "@workspace/api-zod";
import { loadSettings } from "../lib/settings";
import { logger } from "../lib/logger";
import { isValidServiceUrl } from "../lib/validateUrl";

const router: IRouter = Router();

function loadOverseerrSettings(): { url: string; apiKey: string } {
  const envKey = process.env.OVERSEERR_API_KEY?.trim();
  const parsed = loadSettings();
  const services = (parsed.services as Record<string, string>) ?? {};
  const overseerr = (parsed.overseerr as Record<string, string>) ?? {};
  return {
    url: services.overseerr?.trim() ?? "",
    apiKey: envKey ?? overseerr.api_key?.trim() ?? "",
  };
}

const detailCache = new Map<string, { data: unknown; expiry: number }>();
const DETAIL_TTL_MS = 10 * 60_000;

async function fetchOverseerr(url: string, apiKey: string, path: string) {
  const res = await fetch(`${url}${path}`, {
    headers: { "X-Api-Key": apiKey, Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Overseerr ${path} returned ${res.status}`);
  return res.json();
}

router.get("/requests", async (_req, res): Promise<void> => {
  const { url, apiKey } = loadOverseerrSettings();

  if (!url || !apiKey || !isValidServiceUrl(url)) {
    res.json(GetRequestsResponse.parse({ requests: [], configured: false }));
    return;
  }

  try {
    const data = (await fetchOverseerr(
      url,
      apiKey,
      "/api/v1/request?take=20&skip=0&sort=added&filter=all",
    )) as {
      results?: Array<{
        id: number;
        status: number;
        type: string;
        requestedBy?: { displayName?: string; username?: string };
        media: {
          tmdbId?: number;
          status: number;
          posterPath?: string;
        };
      }>;
    };

    const results = data.results ?? [];

    const details = await Promise.allSettled(
      results.map((r) => {
        const mediaType = r.type === "tv" ? "tv" : "movie";
        const tmdbId = r.media.tmdbId;
        if (!tmdbId) return Promise.resolve(null);
        const cacheKey = `${mediaType}/${tmdbId}`;
        const cached = detailCache.get(cacheKey);
        if (cached && Date.now() < cached.expiry) return Promise.resolve(cached.data);
        return fetchOverseerr(url, apiKey, `/api/v1/${mediaType}/${tmdbId}`).then((data) => {
          detailCache.set(cacheKey, { data, expiry: Date.now() + DETAIL_TTL_MS });
          return data;
        });
      }),
    );

    const requests = results.map((r, i) => {
      const detail =
        details[i].status === "fulfilled"
          ? (details[i].value as Record<string, unknown> | null)
          : null;
      const title = String(detail?.title ?? detail?.name ?? "") || "Unknown Title";
      const posterPath = String(detail?.posterPath ?? r.media.posterPath ?? "");
      return {
        id: r.id,
        title,
        poster_path: posterPath,
        media_type: r.type,
        request_status: r.status,
        media_status: r.media.status,
        requested_by: String(r.requestedBy?.displayName ?? r.requestedBy?.username ?? "Unknown"),
      };
    });

    res.json(GetRequestsResponse.parse({ requests, configured: true }));
  } catch (err) {
    logger.error({ err }, "Failed to fetch Overseerr requests");
    res.json(GetRequestsResponse.parse({ requests: [], configured: true }));
  }
});

export default router;
