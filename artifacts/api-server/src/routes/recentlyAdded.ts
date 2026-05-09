import { Router, type IRouter } from "express";
import { GetRecentlyAddedResponse } from "@workspace/api-zod";
import { loadSettings } from "../lib/settings";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function loadTautulliSettings(): { url: string; apiKey: string } {
  const envKey = process.env.TAUTULLI_API_KEY?.trim();
  const parsed = loadSettings();
  const services = (parsed.services as Record<string, string>) ?? {};
  const tautulli = (parsed.tautulli as Record<string, string>) ?? {};
  return {
    url: services.tautulli?.trim() ?? "",
    apiKey: envKey ?? tautulli.api_key?.trim() ?? "",
  };
}

router.get("/recently-added", async (_req, res): Promise<void> => {
  const { url, apiKey } = loadTautulliSettings();

  if (!url || !apiKey) {
    res.json(GetRecentlyAddedResponse.parse({ items: [], configured: false }));
    return;
  }

  try {
    const apiUrl = `${url}/api/v2?apikey=${encodeURIComponent(apiKey)}&cmd=get_recently_added&count=24`;
    const response = await fetch(apiUrl, { signal: AbortSignal.timeout(5000) });

    if (!response.ok) {
      logger.warn({ status: response.status }, "Tautulli recently-added returned non-OK");
      res.json(GetRecentlyAddedResponse.parse({ items: [], configured: true }));
      return;
    }

    const data = (await response.json()) as {
      response?: {
        data?: {
          recently_added?: Array<Record<string, unknown>>;
        };
      };
    };

    const raw = data?.response?.data?.recently_added ?? [];

    const items = raw.map((item) => {
      const mediaType = String(item.media_type ?? "movie");
      const thumb = String(item.thumb ?? item.grandparent_thumb ?? "");
      const thumbUrl = thumb
        ? `${url}/api/v2?apikey=${encodeURIComponent(apiKey)}&cmd=pms_image_proxy&img=${encodeURIComponent(thumb)}&width=150&height=225&fallback=poster`
        : null;
      return {
        title: String(item.title ?? "Unknown"),
        grandparent_title: String(item.grandparent_title ?? ""),
        parent_title: String(item.parent_title ?? ""),
        media_type: mediaType,
        thumb_url: thumbUrl,
        added_at: parseInt(String(item.added_at ?? "0"), 10),
        year: item.year != null ? parseInt(String(item.year), 10) : null,
      };
    });

    res.json(GetRecentlyAddedResponse.parse({ items, configured: true }));
  } catch (err) {
    logger.error({ err }, "Failed to fetch Tautulli recently added");
    res.json(GetRecentlyAddedResponse.parse({ items: [], configured: true }));
  }
});

export default router;
