import { Router, type IRouter } from "express";
import { GetActivityResponse } from "@workspace/api-zod";
import { loadSettings } from "../lib/settings";
import { logger } from "../lib/logger";
import { isValidServiceUrl } from "../lib/validateUrl";

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

router.get("/activity", async (_req, res): Promise<void> => {
  const { url, apiKey } = loadTautulliSettings();

  if (!url || !apiKey || !isValidServiceUrl(url)) {
    res.json(GetActivityResponse.parse({ stream_count: 0, sessions: [], configured: false }));
    return;
  }

  try {
    const apiUrl = `${url}/api/v2?apikey=${encodeURIComponent(apiKey)}&cmd=get_activity`;
    const response = await fetch(apiUrl, { signal: AbortSignal.timeout(5000) });

    if (!response.ok) {
      logger.warn({ status: response.status }, "Tautulli API returned non-OK status");
      res.json(GetActivityResponse.parse({ stream_count: 0, sessions: [], configured: true }));
      return;
    }

    const data = (await response.json()) as {
      response?: {
        data?: {
          stream_count?: string | number;
          sessions?: Array<Record<string, unknown>>;
        };
      };
    };

    const tData = data?.response?.data ?? {};
    const rawSessions = tData.sessions ?? [];
    const streamCount = parseInt(String(tData.stream_count ?? "0"), 10);

    const sessions = rawSessions.map((s) => ({
      user: String(s.user ?? s.friendly_name ?? "Unknown"),
      title: String(s.title ?? "Unknown"),
      parent_title: String(s.parent_title ?? ""),
      grandparent_title: String(s.grandparent_title ?? ""),
      media_type: String(s.media_type ?? "movie"),
      progress_percent: String(s.progress_percent ?? "0"),
      state: String(s.state ?? "playing"),
      player: String(s.player ?? ""),
      duration: parseInt(String(s.duration ?? "0"), 10),
      view_offset: parseInt(String(s.view_offset ?? "0"), 10),
    }));

    res.json(GetActivityResponse.parse({ stream_count: streamCount, sessions, configured: true }));
  } catch (err) {
    logger.error({ err }, "Failed to fetch Tautulli activity");
    res.json(GetActivityResponse.parse({ stream_count: 0, sessions: [], configured: true }));
  }
});

export default router;
